/**
 * 굿즈 판매 장부 (/goods) — 전시장 굿즈 담당 스태프용
 *
 *  - 굿즈를 눌러 담고 결제 방법을 고른 뒤 '판매 기록'을 누르면 한 건으로 쌓인다
 *  - 상품별 판매 개수 · 총 판매금액을 오늘 / 전체로 본다. 잘못 누른 건 '취소'로 지운다 (시트에는 '취소'로 남는다)
 *  - 기록은 구글 시트(Apps Script 웹앱, docs/apps-script/goods.gs)에 저장된다. 여러 휴대폰이 같은 장부를 본다
 *  - 지하라 신호가 끊겨도 기록은 휴대폰에 먼저 쌓였다가, 연결되면 자동으로 보낸다 (판매번호로 중복 방지)
 *  - GOODS_ENDPOINT 가 비어 있으면 '연습 모드': 이 휴대폰에만 저장한다
 */
(function () {
  'use strict';

  /* ▼ Apps Script 웹앱 주소 (docs/apps-script/goods.gs 를 배포한 뒤 붙여 넣는다) */
  var GOODS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzj5BtE_6bPV7ZN26QfzlRUNrIlCU3K7v6ZprFwpvweLlVhILfYnwCj6d1cjej7JTJhGg/exec';
  // 테스트에서 가짜 주소를 넣거나('' 로) 비워 연습 모드를 시험할 수 있게
  var ENDPOINT = '__GOODS_ENDPOINT__' in window ? window.__GOODS_ENDPOINT__ : GOODS_ENDPOINT;
  var DEMO = !ENDPOINT;

  var PAYS = ['현금', '계좌이체'];
  var DEMO_ITEMS = [
    { name: 'THE WONDER BOX', price: 25000 },
    { name: '아트 엽서', price: 3000 },
    { name: '엽서 4장 세트', price: 10000 },
    { name: '아트 마그넷', price: 15000 },
    { name: '아트 책갈피', price: 8000 },
    { name: '작가 아크릴 키링', price: 18000 },
    { name: '앨리스의 열쇠 (골드)', price: 25000 },
    { name: '앨리스의 열쇠 (실버)', price: 18000 }
  ];
  var POLL_MS = 20000; // 다른 휴대폰에서 기록한 판매를 가져오는 간격
  var KEY = { pin: 'alo.goods.pin', queue: 'alo.goods.queue', demo: 'alo.goods.demo', pay: 'alo.goods.pay' };

  /* ── 저장소 (사생활 보호 모드 등에서 막혀도 페이지는 돌아가게) ── */
  function load(k, d) {
    try {
      var v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  }
  function store(k, v) {
    try {
      if (v == null) localStorage.removeItem(k);
      else localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  }

  var $ = function (id) {
    return document.getElementById(id);
  };
  var won = function (n) {
    return Number(n || 0).toLocaleString('ko-KR');
  };

  /* ── 한국 시간 ── */
  var DAY_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' });
  var TIME_FMT = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  var WEEK = ['일', '월', '화', '수', '목', '금', '토'];
  function dayKey(iso) {
    return DAY_FMT.format(new Date(iso)); // 2026-11-14
  }
  function dayLabel(key) {
    var p = key.split('-');
    var w = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
    return +p[1] + '월 ' + +p[2] + '일 (' + WEEK[w] + ')';
  }

  /* ── 상태 ── */
  var items = DEMO ? DEMO_ITEMS : []; // [{name, price}]
  var sales = []; // 시트에 저장된 판매 [{id, at, pay, lines:[{name,price,qty}], amount, cancelled}]
  var queue = load(KEY.queue, []); // 아직 못 보낸 기록 [{type:'sale'|'cancel', ...}]
  var cart = {}; // 상품 이름 → 개수
  var pay = PAYS.indexOf(load(KEY.pay, '')) >= 0 ? load(KEY.pay, '') : PAYS[0];
  var range = 'today';
  var pin = load(KEY.pin, '');
  var online = true; // 마지막 통신이 성공했는지
  var syncedAt = null;
  var flushing = false;

  /* 시트의 판매 + 아직 못 보낸 판매 · 취소를 합친 화면용 목록 */
  function view() {
    var list = sales.map(function (s) {
      return Object.assign({}, s);
    });
    var byId = {};
    list.forEach(function (s) {
      byId[s.id] = s;
    });
    queue.forEach(function (op) {
      if (op.type === 'sale' && !byId[op.id]) {
        var s = {
          id: op.id,
          at: op.at,
          pay: op.pay,
          lines: op.lines,
          amount: amountOf(op.lines),
          cancelled: false,
          pending: true
        };
        byId[s.id] = s;
        list.push(s);
      } else if (op.type === 'cancel' && byId[op.id]) {
        byId[op.id].cancelled = true;
        byId[op.id].pending = true;
      }
    });
    return list.sort(function (a, b) {
      return a.at < b.at ? 1 : a.at > b.at ? -1 : 0;
    });
  }
  function amountOf(lines) {
    return lines.reduce(function (t, l) {
      return t + l.price * l.qty;
    }, 0);
  }
  function priceOf(name) {
    for (var i = 0; i < items.length; i++) if (items[i].name === name) return items[i].price;
    return null;
  }

  /* ── 서버 ── */
  function getState() {
    if (DEMO) {
      var d = load(KEY.demo, { sales: [] });
      return Promise.resolve({ ok: true, items: DEMO_ITEMS, sales: d.sales });
    }
    return fetch(ENDPOINT + '?type=state&pin=' + encodeURIComponent(pin), { cache: 'no-store' }).then(function (r) {
      return r.json();
    });
  }
  function send(op) {
    if (DEMO) {
      var d = load(KEY.demo, { sales: [] });
      if (op.type === 'sale') {
        var dup = d.sales.some(function (s) {
          return s.id === op.id;
        });
        if (!dup)
          d.sales.push({
            id: op.id,
            at: op.at,
            pay: op.pay,
            lines: op.lines,
            amount: amountOf(op.lines),
            cancelled: false
          });
      } else {
        d.sales.forEach(function (s) {
          if (s.id === op.id) s.cancelled = true;
        });
      }
      store(KEY.demo, d);
      return Promise.resolve({ ok: true });
    }
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // 미리 묻는 요청(preflight) 없이 보내려고
      body: JSON.stringify(Object.assign({ pin: pin }, op))
    }).then(function (r) {
      return r.json();
    });
  }

  function refresh() {
    return getState()
      .then(function (r) {
        if (!r || r.ok === false) {
          if (r && r.error === 'pin') return lock('비밀번호가 맞지 않아요.');
          throw new Error('state');
        }
        items = r.items || [];
        sales = r.sales || [];
        online = true;
        syncedAt = new Date();
        unlock();
        render();
      })
      .catch(function () {
        online = false;
        if (!$('lock').hidden) $('lockMsg').textContent = '연결이 안 돼요. 신호를 확인하고 다시 눌러 주세요.';
        renderSync();
      });
  }

  /* 쌓인 기록을 순서대로 보낸다. 신호가 없으면 멈췄다가 다음에 다시 */
  function flush() {
    if (flushing || !queue.length) return Promise.resolve();
    flushing = true;
    var op = queue[0];
    return send(op)
      .then(function (r) {
        if (r && r.error === 'pin') {
          flushing = false;
          return lock('비밀번호가 바뀌었어요. 다시 입력해 주세요.');
        }
        queue.shift();
        store(KEY.queue, queue);
        if (r && r.ok === false) {
          var why = { item: '시트에 없는 굿즈이거나 가격이 비어 있어요.' }[r.error] || '시트가 받지 않았어요.';
          toast('기록하지 못한 판매가 있어요: ' + why, 4000);
        }
        online = true;
        flushing = false;
        return queue.length ? flush() : refresh();
      })
      .catch(function () {
        online = false;
        flushing = false;
        renderSync();
      });
  }

  function newId() {
    return 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ── 화면: 합계 ── */
  function render() {
    renderSummary();
    renderItems();
    renderCart();
    renderRecent();
    renderSync();
  }

  function inRange(s) {
    return range === 'all' || dayKey(s.at) === dayKey(new Date().toISOString());
  }

  function renderSummary() {
    var list = view().filter(function (s) {
      return !s.cancelled && inRange(s);
    });
    var perItem = {};
    var perPay = {};
    var perDay = {};
    var qty = 0;
    var total = 0;
    list.forEach(function (s) {
      total += s.amount;
      perPay[s.pay] = (perPay[s.pay] || 0) + s.amount;
      var dk = dayKey(s.at);
      perDay[dk] = perDay[dk] || { qty: 0, amount: 0 };
      perDay[dk].amount += s.amount;
      s.lines.forEach(function (l) {
        qty += l.qty;
        perDay[dk].qty += l.qty;
        perItem[l.name] = perItem[l.name] || { qty: 0, amount: 0 };
        perItem[l.name].qty += l.qty;
        perItem[l.name].amount += l.qty * l.price;
      });
    });

    $('sumLabel').textContent =
      range === 'today' ? dayLabel(dayKey(new Date().toISOString())) + ' 판매금액' : '전시 전체 판매금액';
    $('sumTotal').textContent = won(total);
    $('sumSub').textContent = '굿즈 ' + qty + '개 · 판매 ' + list.length + '건';

    // 시트의 상품 순서대로, 상품표에서 빠진 굿즈의 지난 판매도 함께 보인다
    var names = items.map(function (i) {
      return i.name;
    });
    Object.keys(perItem).forEach(function (n) {
      if (names.indexOf(n) < 0) names.push(n);
    });
    var rows = names
      .map(function (n) {
        var p = perItem[n] || { qty: 0, amount: 0 };
        return '<tr><td>' + esc(n) + '</td><td>' + p.qty + '개</td><td>' + won(p.amount) + '원</td></tr>';
      })
      .join('');
    $('byItem').innerHTML = '<tr><th>굿즈</th><th>판매 개수</th><th>금액</th></tr>' + rows;

    $('byPay').textContent = PAYS.filter(function (p) {
      return perPay[p];
    })
      .map(function (p) {
        return p + ' ' + won(perPay[p]) + '원';
      })
      .join(' · ');

    var days = Object.keys(perDay).sort();
    $('byDay').hidden = range !== 'all' || !days.length;
    $('byDay').innerHTML =
      '<tr><th>날짜</th><th>판매 개수</th><th>금액</th></tr>' +
      days
        .map(function (d) {
          return (
            '<tr><td>' +
            dayLabel(d) +
            '</td><td>' +
            perDay[d].qty +
            '개</td><td>' +
            won(perDay[d].amount) +
            '원</td></tr>'
          );
        })
        .join('');
  }

  /* ── 화면: 굿즈 버튼 ── */
  function renderItems() {
    var box = $('items');
    if (!items.length) {
      box.innerHTML = '<p class="empty">시트의 \'굿즈 상품\' 탭에 굿즈와 가격을 적어 주세요.</p>';
      return;
    }
    box.innerHTML = '';
    items.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'item' + (cart[it.name] ? ' in' : '');
      b.dataset.name = it.name;
      var priced = typeof it.price === 'number' && it.price >= 0;
      b.disabled = !priced;
      b.innerHTML =
        '<b>' +
        esc(it.name) +
        '</b><span>' +
        (priced ? won(it.price) + '원' : '가격 미정') +
        '</span>' +
        (cart[it.name] ? '<em class="badge">' + cart[it.name] + '</em>' : '');
      b.addEventListener('click', function () {
        cart[it.name] = (cart[it.name] || 0) + 1;
        render();
      });
      box.appendChild(b);
    });
  }

  /* ── 화면: 담은 굿즈 ── */
  function cartLines() {
    // 굿즈 버튼 순서대로
    return items
      .map(function (i) {
        return i.name;
      })
      .filter(function (n) {
        return cart[n] > 0 && priceOf(n) != null;
      })
      .map(function (n) {
        return { name: n, price: priceOf(n), qty: cart[n] };
      });
  }
  function renderCart() {
    var lines = cartLines();
    $('cart').hidden = !lines.length;
    if (!lines.length) return;
    var ul = $('cartLines');
    ul.innerHTML = '';
    lines.forEach(function (l) {
      var li = document.createElement('li');
      li.innerHTML =
        '<span class="nm">' +
        esc(l.name) +
        '</span><span class="step"><button type="button" aria-label="' +
        esc(l.name) +
        ' 하나 빼기">−</button><output>' +
        l.qty +
        '</output><button type="button" aria-label="' +
        esc(l.name) +
        ' 하나 더">+</button></span><span class="sub">' +
        won(l.price * l.qty) +
        '원</span>';
      var bs = li.querySelectorAll('button');
      bs[0].addEventListener('click', function () {
        cart[l.name] -= 1;
        if (cart[l.name] <= 0) delete cart[l.name];
        render();
      });
      bs[1].addEventListener('click', function () {
        cart[l.name] += 1;
        render();
      });
      ul.appendChild(li);
    });
    var pays = $('pays');
    pays.innerHTML = '';
    PAYS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(p === pay));
      b.textContent = p;
      b.addEventListener('click', function () {
        pay = p;
        store(KEY.pay, p);
        renderCart();
      });
      pays.appendChild(b);
    });
    $('cartSubmit').textContent = won(amountOf(lines)) + '원 판매 기록';
  }

  $('cartClear').addEventListener('click', function () {
    cart = {};
    render();
  });
  $('cartSubmit').addEventListener('click', function () {
    var lines = cartLines();
    if (!lines.length) return;
    var op = { type: 'sale', id: newId(), at: new Date().toISOString(), pay: pay, lines: lines };
    queue.push(op);
    store(KEY.queue, queue);
    cart = {};
    render();
    toast(won(amountOf(lines)) + '원 · ' + pay + ' 기록했어요');
    flush();
  });

  /* ── 화면: 판매 기록 ── */
  function renderRecent() {
    var list = view().filter(inRange).slice(0, 200);
    $('recentTitle').textContent = range === 'today' ? '오늘 판매 기록' : '전체 판매 기록';
    var ol = $('recent');
    ol.innerHTML = list.length ? '' : '<li class="empty">아직 판매 기록이 없어요.</li>';
    list.forEach(function (s) {
      var li = document.createElement('li');
      li.className = (s.cancelled ? 'cancelled ' : '') + (s.pending ? 'pending' : '');
      var when = range === 'all' ? dayLabel(dayKey(s.at)).replace(/ \(.\)$/, '') + ' ' : '';
      li.innerHTML =
        '<time>' +
        when +
        TIME_FMT.format(new Date(s.at)) +
        '</time><span class="what">' +
        esc(
          s.lines
            .map(function (l) {
              return l.name + ' ' + l.qty;
            })
            .join(', ')
        ) +
        '<small>' +
        esc(s.pay) +
        (s.cancelled ? ' · 취소됨' : '') +
        '</small></span><span class="amt">' +
        won(s.amount) +
        '원</span>';
      if (!s.cancelled) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = '취소';
        b.addEventListener('click', function () {
          // 실수로 누르지 않게 두 번 눌러야 취소된다
          if (!b.classList.contains('sure')) {
            b.classList.add('sure');
            b.textContent = '정말 취소';
            setTimeout(function () {
              b.classList.remove('sure');
              b.textContent = '취소';
            }, 3000);
            return;
          }
          cancel(s.id);
        });
        li.querySelector('.amt').appendChild(b);
      }
      ol.appendChild(li);
    });
  }

  function cancel(id) {
    // 아직 못 보낸 판매는 보낼 목록에서 빼기만 한다
    var i = -1;
    queue.forEach(function (op, k) {
      if (op.type === 'sale' && op.id === id) i = k;
    });
    if (i >= 0 && !(flushing && i === 0)) {
      queue.splice(i, 1);
    } else {
      queue.push({ type: 'cancel', id: id });
    }
    store(KEY.queue, queue);
    render();
    toast('판매를 취소했어요');
    flush();
  }

  /* ── 화면: 연결 상태 ── */
  function renderSync() {
    var el = $('sync');
    var waiting = queue.length;
    el.classList.toggle('wait', !!waiting || !online);
    if (DEMO) el.textContent = '연습 모드';
    else if (waiting) el.textContent = '전송 대기 ' + waiting + '건';
    else if (!online) el.textContent = '연결 끊김';
    else el.textContent = syncedAt ? '저장됨 ' + TIME_FMT.format(syncedAt) : '불러오는 중';
  }

  /* ── 잠금 ── */
  function lock(msg) {
    $('app').hidden = true;
    $('cart').hidden = true;
    $('lock').hidden = false;
    $('lockMsg').textContent = msg || '';
    $('pin').focus();
  }
  function unlock() {
    $('lock').hidden = true;
    $('app').hidden = false;
  }
  $('lock').addEventListener('submit', function (e) {
    e.preventDefault();
    pin = $('pin').value.trim();
    store(KEY.pin, pin);
    $('lockMsg').textContent = '확인하는 중…';
    refresh().then(flush);
  });
  $('logout').addEventListener('click', function () {
    pin = '';
    store(KEY.pin, null);
    $('pin').value = '';
    lock();
  });

  /* ── 기간 탭 ── */
  Array.prototype.forEach.call(document.querySelectorAll('.tabs button'), function (b) {
    b.addEventListener('click', function () {
      range = b.dataset.range;
      Array.prototype.forEach.call(document.querySelectorAll('.tabs button'), function (x) {
        x.setAttribute('aria-selected', String(x === b));
      });
      render();
    });
  });

  /* ── 알림 ── */
  var toastTimer;
  function toast(msg, ms) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove('on');
    }, ms || 1800);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── 시작 ── */
  if (DEMO) {
    $('demoNote').hidden = false;
    $('logout').hidden = true;
    $('demoReset').addEventListener('click', function () {
      store(KEY.demo, null);
      queue = [];
      store(KEY.queue, queue);
      refresh();
    });
    unlock();
    refresh().then(flush);
  } else if (!pin) {
    lock();
  } else {
    refresh().then(flush);
  }

  setInterval(function () {
    if (document.hidden || !$('lock').hidden) return;
    if (queue.length) flush();
    else refresh();
  }, POLL_MS);
  window.addEventListener('online', function () {
    flush();
  });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && $('lock').hidden) queue.length ? flush() : refresh();
  });
})();

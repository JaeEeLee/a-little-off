/**
 * 굿즈 판매 장부 (/goods) — 전시장 굿즈 담당 스태프용
 *
 *  - 굿즈를 눌러 담고 결제 방법을 고른 뒤 'xx원 판매'를 누르면 한 건으로 쌓인다
 *  - 상품별 판매 개수 · 총 판매금액을 오늘 / 전체로 본다. 잘못 누른 건 '취소'로 지운다 (시트에는 '취소'로 남는다)
 *  - 기록은 구글 시트(Apps Script 웹앱, docs/apps-script/goods.gs)에 저장된다. 여러 휴대폰이 같은 장부를 본다
 *  - 지하라 신호가 끊겨도 기록은 휴대폰에 먼저 쌓였다가, 연결되면 자동으로 보낸다 (판매번호로 중복 방지)
 *  - GOODS_ENDPOINT 가 비어 있거나 전시 시작(OPEN_AT) 전이면 '연습 모드': 이 휴대폰에만 저장한다.
 *    전시가 시작되는 순간 페이지가 저절로 새로 고쳐져 실제 장부로 바뀐다 (연습 기록은 실제 장부로 넘어가지 않는다)
 */
(function () {
  'use strict';

  /* ▼ Apps Script 웹앱 주소 (docs/apps-script/goods.gs 를 배포한 뒤 붙여 넣는다) */
  var GOODS_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbzj5BtE_6bPV7ZN26QfzlRUNrIlCU3K7v6ZprFwpvweLlVhILfYnwCj6d1cjej7JTJhGg/exec';
  // 테스트에서 가짜 주소를 넣거나('' 로) 비워 연습 모드를 시험할 수 있게
  var ENDPOINT = '__GOODS_ENDPOINT__' in window ? window.__GOODS_ENDPOINT__ : GOODS_ENDPOINT;

  /* ▼ 전시 시작 시각. 이 전에는 시트에 적지 않고 연습 모드로만 돈다 (테스트에서 바꿀 수 있게) */
  var OPEN_AT = new Date(
    '__GOODS_OPEN_AT__' in window ? window.__GOODS_OPEN_AT__ : '2026-11-12T13:00:00+09:00'
  ).getTime();
  var BEFORE_OPEN = !!ENDPOINT && Date.now() < OPEN_AT;
  // 시작 전이라도 실제로 사 가는 손님이 있으면, 위쪽 '연습 모드' 칩을 눌러 이 휴대폰만 실제 장부로 바꿀 수 있다
  var EARLY_KEY = 'alo.goods.live';
  var EARLY = false;
  try {
    if (!BEFORE_OPEN)
      localStorage.removeItem(EARLY_KEY); // 전시가 시작되면 필요 없는 표시
    else EARLY = localStorage.getItem(EARLY_KEY) === '1';
  } catch (e) {}
  var PREOPEN = BEFORE_OPEN && !EARLY;
  var DEMO = !ENDPOINT || PREOPEN;
  // 연습 모드는 기본 바탕, 실제 장부일 때만 포스터 색 바탕 (지금 어느 쪽인지 한눈에 알 수 있게)
  document.documentElement.classList.toggle('practice', DEMO);

  var PAYS = ['현금', '계좌이체'];
  var DEMO_ITEMS = [
    { name: 'THE WONDER BOX', price: 25000 },
    { name: '아트 엽서', price: 3000 },
    { name: '엽서 4장 세트', price: 10000 },
    { name: '아트 마그넷', price: 15000 },
    { name: '아트 책갈피', price: 8000 },
    { name: '작가 아크릴 키링', price: 12000 },
    { name: '앨리스의 열쇠 (골드)', price: 25000 },
    { name: '앨리스의 열쇠 (실버)', price: 18000 },
    { name: '앨리스의 열쇠 (빈티지)', price: 15000 }
  ];
  var POLL_MS = 20000; // 다른 휴대폰에서 기록한 판매를 가져오는 간격
  var KEY = {
    pin: 'alo.goods.pin',
    queue: 'alo.goods.queue',
    demo: 'alo.goods.demo',
    pay: 'alo.goods.pay',
    device: 'alo.goods.device'
  };
  // 연습 기록이 실제 장부로 보내지지 않게, 연습 모드는 보낼 목록을 따로 쓴다
  if (DEMO) KEY.queue = 'alo.goods.demo.queue';

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
  if (!DEMO) {
    // 전시 시작 전에 눌러 둔 판매가 남아 있으면 실제 장부로 보내지 않고 버린다
    var before = queue.length;
    // (칩으로 일부러 실제 장부로 바꿔 기록한 판매(early)는 진짜 판매라 그대로 보낸다)
    queue = queue.filter(function (op) {
      return !(op.type === 'sale' && !op.early && new Date(op.at).getTime() < OPEN_AT);
    });
    if (queue.length !== before) store(KEY.queue, queue);
  }
  var cart = {}; // 상품 이름 → 개수
  var pay = PAYS.indexOf(load(KEY.pay, '')) >= 0 ? load(KEY.pay, '') : PAYS[0];
  var range = 'today';
  // 비밀번호는 입력한 때부터 48시간 동안만 이 휴대폰에 기억한다
  var PIN_TTL = 48 * 60 * 60 * 1000;
  function loadPin() {
    var v = load(KEY.pin, '');
    if (typeof v === 'string') {
      // 예전 방식(기한 없이 저장)으로 남은 비밀번호는 지금부터 48시간으로 바꿔 둔다
      if (v) store(KEY.pin, { v: v, exp: Date.now() + PIN_TTL });
      return v;
    }
    if (v && v.v && v.exp > Date.now()) return v.v;
    store(KEY.pin, null);
    return '';
  }
  function pinExpired() {
    var v = load(KEY.pin, null);
    return !!pin && !(v && v.exp > Date.now());
  }
  var pin = loadPin();
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
  /* 재고: '굿즈 상품' 탭 재고 칸 - 지금까지 팔린 개수(취소 제외). 재고 칸이 비어 있으면 null(제한 없음) */
  function soldCounts() {
    var n = {};
    view().forEach(function (s) {
      if (s.cancelled) return;
      s.lines.forEach(function (l) {
        n[l.name] = (n[l.name] || 0) + l.qty;
      });
    });
    return n;
  }
  function leftOf(name, sold) {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.name === name) return typeof it.stock === 'number' ? Math.max(0, it.stock - (sold[name] || 0)) : null;
    }
    return null;
  }
  // 장바구니에 하나 더 담을 수 있나 (재고를 넘지 않게)
  function canAdd(name, sold) {
    var left = leftOf(name, sold || soldCounts());
    return left == null || (cart[name] || 0) < left;
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
        if (r && r.error === 'not_open') {
          // 휴대폰 시계가 조금 빨라 시트가 아직 전시 전이라고 할 때: 버리지 않고 잠시 뒤 다시 보낸다
          flushing = false;
          online = true;
          renderSync();
          return;
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
    // 재고를 적은 굿즈가 하나라도 있으면 '남은 재고' 열을 붙인다 (오늘 · 전체 탭과 상관없이 지금 남은 수)
    var hasStock = items.some(function (i) {
      return typeof i.stock === 'number';
    });
    var sold = soldCounts();
    var rows = names
      .map(function (n) {
        var p = perItem[n] || { qty: 0, amount: 0 };
        var left = '';
        if (hasStock) {
          var l = leftOf(n, sold);
          left =
            l == null
              ? '<td class="left">–</td>'
              : '<td class="left' +
                (l === 0 ? ' out' : l <= 3 ? ' low' : '') +
                '">' +
                (l === 0 ? '품절' : l + '개') +
                '</td>';
        }
        return '<tr><td>' + esc(n) + '</td><td>' + p.qty + '개</td><td>' + won(p.amount) + '원</td>' + left + '</tr>';
      })
      .join('');
    $('byItem').innerHTML =
      '<tr><th>굿즈</th><th>판매 개수</th><th>금액</th>' + (hasStock ? '<th>남은 재고</th>' : '') + '</tr>' + rows;

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
    var sold = soldCounts();
    items.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button';
      var left = leftOf(it.name, sold);
      var soldOut = left === 0;
      b.className = 'item' + (cart[it.name] ? ' in' : '') + (soldOut ? ' out' : '');
      b.dataset.name = it.name;
      var priced = typeof it.price === 'number' && it.price >= 0;
      b.disabled = !priced || soldOut;
      var stockText =
        left == null
          ? ''
          : soldOut
            ? '<i class="stock">품절</i>'
            : '<i class="stock' + (left <= 3 ? ' low' : '') + '">남은 ' + left + '개</i>';
      b.innerHTML =
        '<b>' +
        esc(it.name) +
        '</b><span>' +
        (priced ? won(it.price) + '원' : '가격 미정') +
        '</span>' +
        stockText +
        (cart[it.name] ? '<em class="badge">' + cart[it.name] + '</em>' : '');
      b.addEventListener('click', function () {
        if (!canAdd(it.name)) {
          toast('남은 재고가 없어요');
          return;
        }
        cart[it.name] = (cart[it.name] || 0) + 1;
        hideDone(); // 다음 손님 주문: 알림이 장바구니 버튼을 가리지 않게 바로 닫는다
        buzz();
        render();
        // 방금 누른 버튼의 개수 표시를 톡 튀게
        var badge = document.querySelector('.item[data-name="' + cssEsc(it.name) + '"] .badge');
        if (badge) badge.classList.add('pop');
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
  /* 묶음 상품: 담긴 굿즈가 묶음 구성과 같으면 묶음으로 바꾸라고 알려 준다 (손님에게 더 싸다)
     name 은 '굿즈 상품' 탭 이름 일부만 맞아도 된다 (예: 'THE WONDER BOX 이상한 나라의 작은 수집함') */
  var BUNDLES = [
    {
      match: /wonder\s*box/i,
      parts: [
        ['아트 엽서', 2],
        ['아트 마그넷', 1],
        ['아트 책갈피', 1]
      ]
    }
  ];
  // 지금 장바구니에서 바꿀 수 있는 묶음 하나 (몇 세트 · 얼마 아끼는지)
  function bundleOffer() {
    for (var b = 0; b < BUNDLES.length; b++) {
      var B = BUNDLES[b];
      var box = null;
      for (var i = 0; i < items.length; i++) if (B.match.test(items[i].name) && items[i].price != null) box = items[i];
      if (!box) continue;
      var sets = Infinity;
      var partsPrice = 0;
      B.parts.forEach(function (p) {
        var price = priceOf(p[0]);
        if (price == null) sets = 0;
        else partsPrice += price * p[1];
        sets = Math.min(sets, Math.floor((cart[p[0]] || 0) / p[1]));
      });
      // 묶음 재고가 모자라면 남은 만큼만
      var left = leftOf(box.name, soldCounts());
      if (left != null) sets = Math.min(sets, left - (cart[box.name] || 0));
      if (sets > 0 && sets !== Infinity && box.price < partsPrice) {
        return { box: box, parts: B.parts, sets: sets, save: (partsPrice - box.price) * sets };
      }
    }
    return null;
  }
  function renderBundle() {
    var el = $('bundle');
    var o = bundleOffer();
    el.hidden = !o;
    if (!o) return;
    var short = o.box.name.replace(/^(THE WONDER BOX).*/i, '$1');
    $('bundleText').innerHTML =
      '<b>' +
      esc(short) +
      ' 구성</b>이 담겼어요 (' +
      o.parts
        .map(function (p) {
          return esc(p[0].replace(/^아트 /, '')) + ' ' + p[1] * o.sets;
        })
        .join(' · ') +
      '). 바꾸면 손님이 <b>' +
      won(o.save) +
      '원</b> 아껴요.';
    $('bundleBtn').textContent =
      short + (o.sets > 1 ? ' ' + o.sets + '개' : '') + ' ' + won(o.box.price * o.sets) + '원으로 바꾸기';
    $('bundleBtn').onclick = function () {
      o.parts.forEach(function (p) {
        cart[p[0]] -= p[1] * o.sets;
        if (cart[p[0]] <= 0) delete cart[p[0]];
      });
      cart[o.box.name] = (cart[o.box.name] || 0) + o.sets;
      buzz();
      render();
      toast(short + '로 바꿨어요');
    };
  }

  function renderCart() {
    var lines = cartLines();
    $('cart').hidden = !lines.length;
    if (!lines.length) {
      fitCart();
      return;
    }
    renderBundle();
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
        '원</span><button type="button" class="del" aria-label="' +
        esc(l.name) +
        ' 모두 빼기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
      var bs = li.querySelectorAll('button');
      bs[0].addEventListener('click', function () {
        cart[l.name] -= 1;
        if (cart[l.name] <= 0) delete cart[l.name];
        render();
      });
      if (!canAdd(l.name)) bs[1].disabled = true;
      // 휴지통: 수량과 상관없이 이 굿즈를 한 번에 뺀다
      bs[2].addEventListener('click', function () {
        delete cart[l.name];
        buzz();
        render();
      });
      bs[1].addEventListener('click', function () {
        if (!canAdd(l.name)) return;
        cart[l.name] += 1;
        buzz();
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
    $('cartSubmit').textContent = won(amountOf(lines)) + '원 판매';
    fitCart();
  }

  // 장바구니가 아래 굿즈를 가리지 않게, 그 높이만큼 페이지 아래에 여백을 둔다
  function fitCart() {
    var c = $('cart');
    document.body.style.paddingBottom = c.hidden ? '' : c.offsetHeight + 16 + 'px';
  }

  // 누를 때 짧은 진동 (안드로이드만. 아이폰은 조용히 넘어간다)
  function buzz() {
    try {
      if (navigator.vibrate) navigator.vibrate(12);
    } catch (e) {}
  }
  function cssEsc(v) {
    return window.CSS && CSS.escape ? CSS.escape(v) : String(v).replace(/"/g, '\\"');
  }

  $('cartClear').addEventListener('click', function () {
    cart = {};
    render();
  });
  $('cartSubmit').addEventListener('click', function () {
    var lines = cartLines();
    if (!lines.length) return;
    var op = { type: 'sale', id: newId(), at: new Date().toISOString(), pay: pay, lines: lines };
    if (touring) {
      // 사용법 따라하기: 판매가 된 것처럼 보여 주기만 하고 아무 데도 적지 않는다
      cart = {};
      buzz();
      render();
      showDone(op);
      return;
    }
    practicePing('sale');
    if (EARLY) op.early = true; // 시트가 전시 시작 전 판매를 받아 주도록
    queue.push(op);
    store(KEY.queue, queue);
    cart = {};
    buzz();
    render();
    showDone(op);
    flush();
  });

  /* 기록 직후 5초 동안: 무엇을 얼마에 기록했는지 + 되돌리기 (담았던 굿즈는 장바구니로 돌아온다) */
  var doneTimer;
  function showDone(op) {
    var bar = $('done');
    var what = op.lines
      .map(function (l) {
        return l.name + (l.qty > 1 ? ' ' + l.qty + '개' : '');
      })
      .join(', ');
    $('doneTitle').textContent = won(amountOf(op.lines)) + '원 · ' + op.pay + ' 기록 완료';
    $('doneSub').textContent = touring ? what + ' · 따라하기라 저장하지 않았어요' : what;
    bar.hidden = false;
    bar.classList.remove('run');
    void bar.offsetWidth;
    bar.classList.add('run');
    $('doneUndo').onclick = function () {
      clearTimeout(doneTimer);
      bar.hidden = true;
      op.lines.forEach(function (l) {
        cart[l.name] = (cart[l.name] || 0) + l.qty;
      });
      if (touring) {
        render();
        toast('되돌렸어요. 굿즈를 장바구니에 다시 담았어요');
        return;
      }
      cancel(op.id, '되돌렸어요. 굿즈를 장바구니에 다시 담았어요');
    };
    clearTimeout(doneTimer);
    bar.classList.toggle('hold', touring); // 따라하기 중에는 설명을 읽도록 저절로 닫지 않는다
    if (!touring) doneTimer = setTimeout(hideDone, 5000);
  }
  function hideDone() {
    clearTimeout(doneTimer);
    $('done').hidden = true;
  }
  $('doneClose').addEventListener('click', hideDone);

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

  function cancel(id, msg) {
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
    toast(msg || '판매를 취소했어요');
    flush();
  }

  /* ── 화면: 연결 상태 ── */
  function renderSync() {
    var el = $('sync');
    var waiting = queue.length;
    el.classList.toggle('wait', !!waiting || !online);
    if (DEMO) el.textContent = BEFORE_OPEN ? '연습 모드 ⇄' : '연습 모드';
    else if (waiting) el.textContent = '전송 대기 ' + waiting + '건';
    else if (EARLY && online) el.textContent = '실제 기록 중 ⇄';
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
    keepAwake();
  }

  // 장부를 연 동안 휴대폰 화면이 꺼지지 않게 (지원하는 브라우저에서만. 다른 앱에 다녀오면 다시 건다)
  var wakeLock = null;
  function keepAwake() {
    if (!('wakeLock' in navigator) || wakeLock || document.hidden || $('app').hidden) return;
    navigator.wakeLock
      .request('screen')
      .then(function (l) {
        wakeLock = l;
        l.addEventListener('release', function () {
          wakeLock = null;
        });
      })
      .catch(function () {});
  }
  $('lock').addEventListener('submit', function (e) {
    e.preventDefault();
    pin = $('pin').value.trim();
    store(KEY.pin, { v: pin, exp: Date.now() + PIN_TTL });
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

  /* ── 연습 현황: 전시 전 연습 모드에서 '이 휴대폰이 연습했다'만 시트에 알린다 (이름 · 판매 내용은 보내지 않는다) ── */
  function practicePing(ev) {
    if (!PREOPEN) return;
    var device = load(KEY.device, '');
    if (!/^[a-z0-9]{6,24}$/.test(device)) {
      device = (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 16);
      store(KEY.device, device);
    }
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ type: 'practice', device: device, event: ev })
      }).catch(function () {});
    } catch (e) {}
  }

  /* ── 확대 막기: 판매 중 손가락이 닿아 화면이 커지지 않게 (아이폰 사파리는 viewport 설정을 무시해서 여기서 막는다) ── */
  ['gesturestart', 'gesturechange'].forEach(function (t) {
    document.addEventListener(t, function (e) {
      e.preventDefault();
    });
  });
  document.addEventListener(
    'touchmove',
    function (e) {
      if (e.touches && e.touches.length > 1) e.preventDefault(); // 두 손가락 벌리기
    },
    { passive: false }
  );

  /* ── 연습 모드 ⇄ 실제 장부 (전시 시작 전에만) ── */
  if (BEFORE_OPEN) {
    var chip = $('sync');
    chip.classList.add('switch');
    chip.setAttribute('role', 'button');
    chip.tabIndex = 0;
    chip.setAttribute('aria-label', EARLY ? '연습 모드로 돌아가기' : '실제 판매 기록으로 바꾸기');
    chip.textContent = EARLY ? '실제 기록 중 ⇄' : '연습 모드 ⇄'; // 잠금 화면에서도 보이게
    var flip = function () {
      var ok = EARLY
        ? window.confirm('연습 모드로 돌아갈까요?\n\n이 휴대폰에서 누르는 판매가 다시 실제 장부에 남지 않아요.')
        : window.confirm(
            '실제 판매를 기록할까요?\n\n전시 시작 전이지만, 지금부터 이 휴대폰에서 기록하는 판매는 실제 장부(시트)에 남아요.\n실제로 결제한 손님이 있을 때만 바꿔 주세요.'
          );
      if (!ok) return;
      try {
        if (EARLY) localStorage.removeItem(EARLY_KEY);
        else localStorage.setItem(EARLY_KEY, '1');
      } catch (e) {}
      location.reload();
    };
    chip.addEventListener('click', flip);
    chip.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        flip();
      }
    });
    if (EARLY) chip.classList.add('live'); // 배너 대신 칩 색으로 실제 기록 중임을 알린다
  }

  /* ── 사용법 따라하기 (goods-tour.js 가 켜고 끈다) ── */
  var touring = false;
  window.goodsTour = {
    start: function () {
      touring = true;
      cart = {};
      hideDone();
      render();
    },
    end: function () {
      touring = false;
      cart = {};
      hideDone();
      render();
    }
  };

  /* ── 시작 ── */
  if (DEMO) {
    $('demoNote').hidden = false;
    if (PREOPEN) {
      $('demoText').innerHTML =
        '<b>연습 모드</b> · 전시가 시작되는 <b>11월 12일 (목) 13:00</b> 전까지는 기록이 이 휴대폰에만 남고 실제 장부에는 적히지 않아요. 13:00가 되면 저절로 실제 장부로 바뀌어요.';
      // 전시 시작 시각이 되면 실제 장부로 다시 연다 (열어 둔 채로 기다려도 바뀌게)
      practicePing('open');
      var wait = OPEN_AT - Date.now();
      if (wait < 864e5) setTimeout(reopenIfStarted, wait + 500);
    }
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

  // 48시간이 지나면 열어 둔 화면도 잠근다 (아직 못 보낸 기록은 휴대폰에 남았다가 다시 열면 보낸다)
  function checkPinAge() {
    if (DEMO || !pinExpired()) return false;
    pin = '';
    store(KEY.pin, null);
    $('pin').value = '';
    lock('48시간이 지나 다시 잠겼어요. 비밀번호를 입력해 주세요.');
    return true;
  }
  function reopenIfStarted() {
    if (!PREOPEN || Date.now() < OPEN_AT) return false;
    location.reload();
    return true;
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !reopenIfStarted() && !checkPinAge()) keepAwake();
  });
  window.addEventListener('resize', fitCart);

  setInterval(function () {
    if (reopenIfStarted() || checkPinAge()) return;
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

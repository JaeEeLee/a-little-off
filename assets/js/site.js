/* ═══════════════════════════════════════════════════════════════
   조금 이상한 우리들 — 메인 · 작가 · 예약 페이지 동작
   index.html 맨 아래에서 불러온다 (DOM 이 다 그려진 뒤 실행)
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ANIM = document.documentElement.classList.contains('anim');

  /* ── 작가 전용 주소 ──
     /jessie 처럼 들어오면 그 작가의 페이지로 바뀐다 (작품 섹션이 열리고, 이름이 강조되고,
     예약·한마디에 미리 골라진다). 링크 끝의 #이름이 있으면 그쪽이 먼저다 */
  var PAGE_ARTISTS = { jessie: '이재이' };
  /* 관람 예약 전용 주소 (/jessie/visit). 작가 페이지와 같은 작가로 열리되, 그림 카드는 빼고
     포스터를 작게 줄인 뒤 전시 안내 → 예약 → 인사말 → 쪽지 → 질문 → 감사 인사 순으로 보여 준다 */
  var PAGE_VISITS = { 'jessie/visit': '이재이' };
  var PAGE_PATH = location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  var IS_VISIT = !!PAGE_VISITS[PAGE_PATH];
  var PAGE_ARTIST = PAGE_ARTISTS[PAGE_PATH] || PAGE_VISITS[PAGE_PATH] || '';
  /* 작가 이름은 두 가지다. 화면에는 작가명(정연·재이), 시트와 링크에는 본명(배정연·이재이).
     명단의 <li data-name="본명">작가명</li> 에서 짝을 읽는다. 작가명이 본명과 같으면 data-name 이 없다 */
  var ARTIST_LABEL = {},
    ARTIST_BY_LABEL = {};
  Array.prototype.forEach.call(document.querySelectorAll('.artists li'), function (li) {
    var label = li.textContent.trim();
    var name = li.getAttribute('data-name') || label;
    ARTIST_LABEL[name] = label;
    ARTIST_BY_LABEL[label] = name;
  });
  // 쪽지를 자기 페이지 게시판에 보여 주기로 한 작가 (Apps Script 의 BOARD_ARTISTS 와 같아야 한다)
  var BOARD_ARTISTS = { 이재이: true };

  function artistName(li) {
    return li.getAttribute('data-name') || li.textContent.trim();
  }
  function artistLabel(name) {
    return ARTIST_LABEL[name] || name;
  }

  // 링크의 #이름은 본명(#이재이)이든 작가명(#재이)이든 본명으로 돌려준다
  function sharedArtist() {
    var raw = '';
    try {
      raw = decodeURIComponent((location.hash || '').slice(1)).trim();
    } catch (e) {
      raw = (location.hash || '').slice(1).trim();
    }
    raw = raw || PAGE_ARTIST;
    return ARTIST_BY_LABEL[raw] || raw;
  }
  /* 메인: 디데이는 히어로 카드 대신 전시 안내 '전시 기간' 줄 오른쪽 끝에 붙인다 */
  if (!PAGE_ARTIST) {
    (function () {
      var num = document.getElementById('ddayNum');
      var heroDday = document.querySelector('.hero .dday');
      var period = null;
      Array.prototype.forEach.call(document.querySelectorAll('#infoSection .row'), function (r) {
        var dt = r.querySelector('dt');
        if (dt && dt.textContent.trim() === '전시 기간') period = r;
      });
      if (!num || !period) return;
      // 날짜는 한 줄을 다 쓰고, 그 아래 '엿새간 열립니다' 줄의 오른쪽 끝에 디데이를 둔다
      var dd = period.querySelector('dd');
      var sub = dd && dd.querySelector('.sub');
      var foot = document.createElement('span');
      foot.className = 'period-foot';
      if (sub) foot.appendChild(sub);
      var badge = document.createElement('span');
      badge.className = 'dday-badge';
      badge.appendChild(num);
      foot.appendChild(badge);
      dd.appendChild(foot);
      period.classList.add('has-dday');
      if (heroDday) heroDday.hidden = true;
    })();
  }

  if (PAGE_ARTIST) {
    document.title = artistLabel(PAGE_ARTIST) + (IS_VISIT ? ' · 관람 예약' : '') + ' · 조금 이상한 우리들';
    // 작가 개인 페이지는 검색에 나오지 않게 한다 (_headers 의 X-Robots-Tag 와 같은 뜻을 페이지에도 적어 둔다)
    var robots = document.querySelector('meta[name="robots"]');
    if (robots) robots.setAttribute('content', 'noindex, follow');
    var workSec = document.getElementById('workSection');
    if (workSec) workSec.hidden = IS_VISIT; // 예약 페이지에서는 그림 카드를 빼 둔다
    document.documentElement.classList.add('artist-page');
    if (IS_VISIT) document.documentElement.classList.add('visit-page');

    // 디데이 숫자를 카드에서 꺼내 '초대합니다' 문구 바로 아래에 글자로 둔다 (숫자는 그대로 매일 바뀐다)
    var ddayNum = document.getElementById('ddayNum');
    var invite = document.getElementById('inviteLine');
    if (ddayNum && invite) {
      var ddayText = document.createElement('p');
      ddayText.className = 'dday-text hero-el';
      ddayText.appendChild(ddayNum);
      invite.parentNode.insertBefore(ddayText, invite.nextSibling);
      /* 예약 페이지: 맨 위 한 줄에 전시 제목(왼쪽)과 초대 문구(오른쪽).
         영문 제목 덩어리는 빼고, 디데이는 전시 안내 카드 제목줄 오른쪽으로 옮긴다 */
      if (IS_VISIT) {
        var topRow = document.createElement('div');
        topRow.className = 'visit-top hero-el';
        invite.parentNode.insertBefore(topRow, invite);
        var h1 = document.querySelector('.hero h1');
        if (h1) topRow.appendChild(h1);
        topRow.appendChild(invite);
        var tb = document.querySelector('.hero .title-block');
        if (tb) tb.hidden = true;
        var infoHead = document.querySelector('#infoSection .section-head');
        if (infoHead) {
          ddayText.className = 'dday-text info-dday';
          infoHead.appendChild(ddayText);
        }
      }
    }

    // 작가 인사말은 그림 카드가 아니라 맨 위 소개 문구 자리에 둔다
    var hello = document.querySelector('#workSection .work-hello');
    var titleCopy = document.querySelector('.hero .title-copy');
    var subtitle = titleCopy && titleCopy.querySelector('.subtitle');
    if (hello && titleCopy) {
      if (subtitle) subtitle.hidden = true;
      // 예약 페이지에서는 인사말을 맨 위가 아니라 예약 카드 아래의 따로 된 카드에 둔다
      var helloSec = document.getElementById('helloSection');
      if (IS_VISIT && helloSec) {
        helloSec.appendChild(hello);
        // 예약 페이지에는 그림이 없으니 '그림을 걸어 두었다'는 말은 빼고, 짧게 줄인 인사말을 쓴다
        var hp = hello.querySelectorAll('p');
        if (hp[0])
          hp[0].textContent =
            '취미 미술 학원에서 그려 온 그림으로 단체전을 열게 됐어요. 꼭 와야 한다는 부담은 갖지 않아도 괜찮아요. 제가 전시를 한다는 걸 알아 주는 것만으로도 충분히 기뻐요.';
        if (hp[1])
          hp[1].innerHTML =
            '<strong class="q">언제 가면 만날 수 있나요?</strong> <em>11월 14일 토요일</em>에는 하루 종일 있어요. 다른 날도 퇴근하고 언제든 달려갈게요.';
        if (hp[2])
          hp[2].innerHTML =
            '<strong class="q">전시장에서는 또 뭘 즐길 수 있나요?</strong> <strong>스무 명의 그림</strong>과 QR로 듣는 <strong>도슨트</strong>, <strong>굿즈</strong>와 <strong>포토 스팟</strong>, <strong>웰컴 드링크</strong>까지 준비돼 있어요!';
        helloSec.hidden = false;
      } else {
        titleCopy.appendChild(hello);
      }
    }

    // 전시가 끝나면 서버가 이 작가의 도슨트 글을 내준다. 그 전에는 아무것도 보이지 않는다
    // 전시 전에 미리 보려면 /jessie?k=도슨트열쇠 로 연다
    var previewKey = new URLSearchParams(location.search).get('k') || '';
    if (!IS_VISIT)
      fetch(
        '/after-docent?artist=' +
          encodeURIComponent(PAGE_ARTIST) +
          (previewKey ? '&k=' + encodeURIComponent(previewKey) : ''),
        { cache: 'no-store' }
      )
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (d) {
          if (!d || !d.paragraphs) return;
          var sec = document.getElementById('afterDocent');
          var body = document.getElementById('afterDocentBody');
          d.paragraphs.forEach(function (t, i) {
            var p = document.createElement('p');
            p.textContent = t;
            if (i === d.paragraphs.length - 1 && /^“|^"/.test(t)) p.className = 'after-q';
            body.appendChild(p);
          });
          sec.hidden = false;
          var soon = document.getElementById('docentSoon');
          if (soon) soon.hidden = true; // 공개된 뒤에는 '곧 공개' 안내를 치운다
        })
        .catch(function () {});

    // 포스터에 작가 그림을 살짝 겹쳐 붙인다
    var ARTIST_COVER = { 이재이: '/works/jessie/01-s.jpg' };
    var posterFrame = document.querySelector('.hero .frame');
    if (posterFrame && ARTIST_COVER[PAGE_ARTIST]) {
      var cover = document.createElement('span');
      cover.className = 'frame-work';
      cover.style.backgroundImage = 'url("' + ARTIST_COVER[PAGE_ARTIST] + '")';
      cover.setAttribute('aria-hidden', 'true');
      posterFrame.classList.add('has-work');
      posterFrame.appendChild(cover);
    }

    // 작가 전용 페이지에서는 상단 학원 표기도 숨긴다 (학원 링크는 모든 페이지에서 맨 아래 '주최'에 있다)
    var eyebrow = document.querySelector('.hero .eyebrow');
    if (eyebrow) eyebrow.hidden = true;

    /* 카드 순서: 그림 → 쪽지(게시판 + 쓰는 칸) → 질문 → 전시 안내 → 지금 전시장에는 → 예약
       참여 작가·작가에게 한마디·함께 보기 카드는 숨긴다. 받는 사람은 이 작가로 정해져 있다 */
    var footer = document.querySelector('footer');
    var ORDER = IS_VISIT
      ? ['infoSection', 'visitSection', 'helloSection', 'boardSection', 'questSection', 'thanksSection']
      : ['workSection', 'afterDocent', 'boardSection', 'questSection', 'infoSection', 'ondutySection', 'visitSection'];
    ORDER.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && footer) footer.parentNode.insertBefore(el, footer);
    });
    var HIDE = ['artistsSection', 'noteSection', 'shareSection', 'aboutSection']; // 전시 소개는 메인 전용
    if (IS_VISIT) {
      HIDE = HIDE.concat(['workSection', 'afterDocent', 'ondutySection']);
      ['questLead', 'thanksSection'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.hidden = false;
      });
    }
    HIDE.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.hidden = true;
    });
    var slot = document.getElementById('boardWriteSlot');
    var noteBody = document.getElementById('noteBody');
    if (slot && noteBody) slot.appendChild(noteBody);
    var change = document.getElementById('noteChange');
    if (change) change.hidden = true;
  }

  /* ── 예약 페이지: 한 화면에 한 장면씩, 스크롤이 장면마다 툭툭 걸린다 ──
     ① 표지 ② 전시 안내 ③ 예약 ④ 인사말 ⑤ 작가에게 한마디 ⑥ 질문 ⑦ 감사 인사(+ 하단 정보) */
  if (IS_VISIT)
    (function () {
      var MEET_DAY = 14; // 작가가 하루 종일 전시장에 있는 날 (11월)

      /* 전시 안내: 기간 줄은 달력으로, 주소 줄은 지우고 주소 복사 버튼과 지도 버튼은 장소 줄로 */
      var info = document.getElementById('infoSection');
      var dl = info && info.querySelector('dl');
      if (dl) {
        var rowBy = function (label) {
          var rs = dl.querySelectorAll('.row');
          for (var i = 0; i < rs.length; i++) {
            var dt = rs[i].querySelector('dt');
            if (dt && dt.textContent.trim() === label) return rs[i];
          }
          return null;
        };
        var periodRow = rowBy('전시 기간'),
          placeRow = rowBy('장소'),
          addrRow = rowBy('주소'),
          hoursRow = rowBy('관람 시간');
        // 관람 시간의 첫날 개관 · 마지막 날 마감 작은 글씨는 뺀다 (예약할 때 날짜 목록에 적혀 있다)
        var hoursSub = hoursRow && hoursRow.querySelector('dd .sub');
        if (hoursSub) hoursSub.remove();
        dl.parentNode.insertBefore(buildCalendar(), dl);
        if (periodRow) periodRow.remove();
        if (placeRow && addrRow) {
          var placeDd = placeRow.querySelector('dd');
          var copyBtn = document.getElementById('copyAddr');
          var link = placeDd.querySelector('.place-link');
          if (copyBtn && link) link.parentNode.insertBefore(copyBtn, link.nextSibling);
          var maps = addrRow.querySelector('.map-links');
          if (maps) {
            // 지도 앱은 글자 없이 아이콘만 (이름은 화면 읽기 프로그램용으로 남아 있다)
            maps.classList.add('icon-only');
            Array.prototype.forEach.call(maps.querySelectorAll('a'), function (a) {
              Array.prototype.slice.call(a.childNodes).forEach(function (n) {
                if (n.nodeType === 3) n.remove();
              });
              a.title = a.getAttribute('aria-label') || '';
            });
            // 영문 장소명(Pieces Archive) 자리에 지도 아이콘을 둔다
            var enSub = placeDd.querySelector('.sub');
            if (enSub) enSub.remove();
            maps.classList.add('in-dd');
            placeDd.appendChild(maps);
          }
          addrRow.remove();
        }
      }

      function buildCalendar() {
        var START = 12,
          END = 17,
          FIRST = 8,
          LAST = 21; // 2026년 11월, 8일(일)~21일(토) 두 주만 보여 준다
        var now = new Date(),
          today = now.getFullYear() === 2026 && now.getMonth() === 10 ? now.getDate() : 0;
        var box = document.createElement('div');
        box.className = 'cal';
        box.setAttribute('role', 'group');
        box.setAttribute('aria-label', '전시 기간 2026년 11월 12일 목요일부터 17일 화요일까지');
        var head = document.createElement('div');
        head.className = 'cal-head';
        head.innerHTML =
          '<span class="cal-month">2026. 11</span><span class="cal-range">12 (목) — 17 (화) · 엿새</span>';
        box.appendChild(head);
        var tip = document.createElement('p');
        tip.className = 'cal-tip';
        tip.innerHTML =
          '오실 날짜를 누르면 바로 예약으로 넘어가요<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 13l5 5 5-5M12 6v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        box.appendChild(tip);
        var grid = document.createElement('div');
        grid.className = 'cal-grid';
        '일월화수목금토'.split('').forEach(function (d, i) {
          var s = document.createElement('span');
          s.setAttribute('aria-hidden', 'true');
          s.className = 'cal-dow' + (i === 0 ? ' sun' : '');
          s.textContent = d;
          grid.appendChild(s);
        });
        for (var d = FIRST; d <= LAST; d++) {
          var col = (d - FIRST) % 7;
          var inRange = d >= START && d <= END;
          var c = document.createElement(inRange ? 'button' : 'span');
          var cls = ['cal-day'];
          if (col === 0) cls.push('sun');
          if (col === 6) cls.push('sat');
          if (d >= START && d <= END) cls.push('in');
          if (d === START) cls.push('start');
          if (d === END) cls.push('end');
          if (d === MEET_DAY) cls.push('meet');
          if (d === today) cls.push('today');
          c.className = cls.join(' ');
          c.innerHTML = '<b>' + d + '</b>';
          if (inRange) {
            c.type = 'button';
            c.dataset.day = d;
            c.setAttribute(
              'aria-label',
              '11월 ' +
                d +
                '일 ' +
                '일월화수목금토'[col] +
                '요일에 관람 예약하기' +
                (d === MEET_DAY ? ' (' + artistLabel(PAGE_ARTIST) + '가 하루 종일 있는 날)' : '')
            );
            c.addEventListener('click', function () {
              pickDate(+this.dataset.day, true);
            });
          } else {
            c.setAttribute('aria-hidden', 'true');
          }
          grid.appendChild(c);
        }
        box.appendChild(grid);
        var legend = document.createElement('p');
        legend.className = 'cal-legend';
        legend.innerHTML =
          '<i class="cal-dot" aria-hidden="true"></i>' + artistLabel(PAGE_ARTIST) + '가 하루 종일 전시장에 있는 날';
        box.appendChild(legend);
        return box;
      }

      /* 예약 안내 문구 끝에 작가가 상주하는 날을 덧붙인다 */
      var visitLead = document.getElementById('visitLead');
      if (visitLead) {
        var stay = document.createElement('strong');
        stay.className = 'visit-stay';
        stay.textContent = '저는 토요일날 상주합니다!';
        visitLead.appendChild(document.createElement('br'));
        visitLead.appendChild(stay);
      }

      /* 쪽지: 게시판은 빼고 쓰는 칸만. 제목도 그에 맞게 */
      var boardSec = document.getElementById('boardSection');
      if (boardSec) {
        var h2 = boardSec.querySelector('.section-head h2'),
          en = boardSec.querySelector('.section-head .en');
        if (h2) h2.textContent = '작가에게 한마디';
        if (en) en.textContent = 'LEAVE A NOTE';
        // 쪽지 게시판은 작가 페이지에 있다. 그 페이지의 게시판 위치로 바로 데려간다
        var head = boardSec.querySelector('.section-head');
        var artistPath = Object.keys(PAGE_ARTISTS).filter(function (k) {
          return PAGE_ARTISTS[k] === PAGE_ARTIST;
        })[0];
        if (head && artistPath) {
          var boardLink = document.createElement('a');
          boardLink.className = 'board-link';
          boardLink.href = '/' + artistPath + '?to=board';
          boardLink.innerHTML =
            '게시판 보러가기<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          head.appendChild(boardLink);
        }
        ['board', 'boardEmpty', 'boardMoreRow'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) {
            el.hidden = true;
            el.style.display = 'none';
          }
        });
      }

      /* 장면으로 묶는다 */
      var hero = document.querySelector('.hero');
      var footer = document.querySelector('footer');
      var SCENES = [
        { name: '표지', els: [hero], cls: 'scene-cover' },
        { name: '전시 안내', els: ['infoSection'] },
        { name: '관람 예약', els: ['visitSection'] },
        { name: '인사말', els: ['helloSection'] },
        { name: '작가에게 한마디', els: ['boardSection'] },
        { name: '조금 이상한 질문', els: ['questSection'] },
        { name: '고맙습니다', els: ['thanksSection', footer], cls: 'scene-last' }
      ];
      var scenes = [];
      SCENES.forEach(function (s) {
        var box = document.createElement('div');
        box.className = 'scene' + (s.cls ? ' ' + s.cls : '');
        box.setAttribute('aria-label', s.name);
        var first = null;
        s.els.forEach(function (x) {
          var el = typeof x === 'string' ? document.getElementById(x) : x;
          if (!el) return;
          if (!first) {
            first = el;
            el.parentNode.insertBefore(box, el);
          }
          box.appendChild(el);
        });
        if (first) scenes.push(box);
      });

      // 표지 맨 아래: 넘겨 보라는 작은 안내
      var hint = document.createElement('button');
      hint.type = 'button';
      hint.className = 'scene-hint';
      hint.setAttribute('aria-label', '아래로 넘겨 보세요');
      hint.innerHTML =
        '<span class="hint-text">아래로 넘겨 보세요</span>' +
        '<span class="chevrons" aria-hidden="true">' +
        '<svg viewBox="0 0 24 12"><path d="M5 2l7 7 7-7"/></svg>' +
        '<svg viewBox="0 0 24 12"><path d="M5 2l7 7 7-7"/></svg>' +
        '<svg viewBox="0 0 24 12"><path d="M5 2l7 7 7-7"/></svg>' +
        '</span>';
      // 누르면 표지의 클릭으로 이어져 다음 장면으로 넘어간다
      if (hero) hero.appendChild(hint);
      // 첫 진입 때만: 표지 맨 아래 1px 진행 막대. 다 차면 전시 안내로 넘어간다
      var introBar = document.createElement('div');
      introBar.className = 'intro-bar';
      introBar.setAttribute('aria-hidden', 'true');
      introBar.innerHTML = '<i></i>';
      if (hero) hero.appendChild(introBar);
      var introText = document.createElement('p');
      introText.className = 'intro-text';
      introText.textContent = '잠시 뒤 전시 안내로 넘어가요';
      if (hero) hero.appendChild(introText);

      /* ── 장면 넘기기: 모든 장면 사이를 스크롤이 아니라 페이드로 오간다 ──
       장면은 화면에 겹쳐 고정돼 있고 한 번에 하나만 보인다.
       아래로 스크롤·스와이프·키 → 다음 장면, 위로 → 이전 장면.
       장면이 화면보다 길면 그 안에서 먼저 스크롤되고, 끝에 닿은 뒤 한 번 더 밀어야 넘어간다.
       첫 진입 때만 표지가 잠깐 보였다가 저절로 전시 안내로 넘어간다 */
      var root = document.documentElement;
      var FADE = 450; // 장면이 바뀌는 페이드 시간 (CSS --scene-fade 와 같은 값)
      root.style.setProperty('--scene-fade', FADE + 'ms');
      var AUTO_HIDE = 3000 - FADE; // 표지가 나타나 머무는 시간. 사라지는 FADE 까지 합쳐 3초 (사진·글꼴을 다 받은 뒤부터)
      var current = -1,
        busyUntil = 0,
        autoTimer = null,
        loading = true;

      // 오른쪽 점: 지금 몇 번째 장면인지. 누르면 그 장면으로
      var nav = document.createElement('nav');
      nav.className = 'scene-dots';
      nav.setAttribute('aria-label', '장면 이동');
      var dots = scenes.map(function (sc, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', i + 1 + '. ' + sc.getAttribute('aria-label'));
        b.addEventListener('click', function () {
          go(i, true);
        });
        nav.appendChild(b);
        return b;
      });
      document.body.appendChild(nav);

      function go(i, force) {
        if (loading) return;
        i = Math.max(0, Math.min(scenes.length - 1, i));
        if (i === current) return;
        var now = Date.now();
        if (!force && now < busyUntil) return; // 바뀌는 도중의 관성 스크롤로 여러 장 건너뛰지 않게
        busyUntil = now + FADE + 150;
        clearTimeout(autoTimer);
        var prev = current;
        current = i;
        scenes.forEach(function (sc, k) {
          var on = k === i;
          sc.classList.toggle('is-active', on);
          if (on) {
            sc.removeAttribute('inert');
            sc.removeAttribute('aria-hidden');
          } else {
            sc.setAttribute('inert', '');
            sc.setAttribute('aria-hidden', 'true');
          }
        });
        // 앞으로 넘어가면 그 장면의 맨 위부터, 뒤로 돌아오면 맨 아래부터 보이게
        var sc = scenes[i];
        sc.scrollTop = prev > i ? sc.scrollHeight : 0;
        Array.prototype.forEach.call(sc.querySelectorAll('.reveal'), function (el) {
          el.classList.add('in');
        });
        dots.forEach(function (b, k) {
          b.classList.toggle('on', k === i);
          if (k === i) b.setAttribute('aria-current', 'step');
          else b.removeAttribute('aria-current');
        });
        nav.classList.toggle('on-cover', i === 0);
        // 첫 진입의 표지에서는 '아래로 넘겨 보세요'를 숨겨 두고, 한 번 넘어간 뒤부터 보여 준다
        if (i !== 0 && prev === 0) root.classList.add('intro-done');
      }
      function next() {
        go(current + 1);
      }
      function goToVisit() {
        var k = scenes.indexOf(document.getElementById('visitSection').parentNode);
        if (k > -1) go(k, true);
      }

      /* 달력에서 날짜를 누르면: 예약 폼의 방문 날짜를 그 날로 골라 두고 예약 장면으로 */
      var dateSel = document.getElementById('visitDate');
      function markPicked() {
        var v = dateSel ? dateSel.value : '';
        Array.prototype.forEach.call(document.querySelectorAll('.cal-day[data-day]'), function (c) {
          var on = !!v && v.indexOf('11/' + c.dataset.day + '(') === 0;
          c.classList.toggle('picked', on);
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      }
      function pickDate(day, jump) {
        if (!dateSel) return;
        for (var k = 0; k < dateSel.options.length; k++) {
          if (dateSel.options[k].value.indexOf('11/' + day + '(') === 0) {
            dateSel.selectedIndex = k;
            break;
          }
        }
        dateSel.dispatchEvent(new Event('change', { bubbles: true }));
        if (jump) goToVisit();
      }
      if (dateSel) dateSel.addEventListener('change', markPicked);
      // 방문 날짜는 처음부터 작가가 상주하는 날(MEET_DAY)로 골라 둔다.
      // 날짜 목록은 아래 '관람 예약' 코드가 채우므로 그 뒤에 고른다
      setTimeout(function () {
        if (dateSel && !dateSel.value) pickDate(MEET_DAY, false);
      }, 0);
      window.addEventListener('visit-reset', function () {
        setTimeout(function () {
          pickDate(MEET_DAY, false);
        }, 0);
      });

      /* 예약 입력을 가볍게: 초대한 작가는 이미 정해져 있으니 숨기고,
       함께 오는 사람은 접어 두었다가 누르면 펼친다 */
      var artistField = document.getElementById('visitArtist');
      if (artistField && artistField.closest('.field')) artistField.closest('.field').hidden = true;
      var partySel = document.getElementById('visitParty');
      var partyField = partySel && partySel.closest('.field');
      if (partyField) {
        partyField.hidden = true;
        var more = document.createElement('button');
        more.type = 'button';
        more.className = 'party-toggle';
        more.textContent = '+ 함께 오는 사람이 있어요';
        more.addEventListener('click', function () {
          partyField.hidden = false;
          more.hidden = true;
          partySel.focus();
        });
        partyField.parentNode.insertBefore(more, partyField);
        // '한 번 더 예약하기'로 폼을 비우면 다시 접는다
        window.addEventListener('visit-reset', function () {
          partyField.hidden = true;
          more.hidden = false;
          markPicked();
        });
      }

      /* 화면 아래에 떠 있는 '관람 예약하기' 버튼: 표지와 예약 장면을 뺀 모든 장면에서.
       예약을 마치면 '예약 완료'로 바뀐다 */
      /* 각 장면의 카드 바로 아래(16px)에 붙여, 카드와 함께 나타나고 사라지게 한다 */
      var visitSec = document.getElementById('visitSection');
      var ctas = [];
      scenes.forEach(function (sc, k) {
        if (k === 0 || (visitSec && sc.contains(visitSec))) return;
        var cards = sc.querySelectorAll(':scope > section.card');
        var last = cards[cards.length - 1];
        if (!last) return;
        var cta = document.createElement('button');
        cta.type = 'button';
        cta.className = 'visit-cta';
        cta.textContent = '관람 예약하기';
        cta.addEventListener('click', goToVisit);
        last.parentNode.insertBefore(cta, last.nextSibling);
        ctas.push(cta);
      });
      window.addEventListener('visit-done', function () {
        ctas.forEach(function (c) {
          c.textContent = '예약 완료 ✓';
          c.classList.add('is-done');
        });
      });
      window.addEventListener('visit-reset', function () {
        ctas.forEach(function (c) {
          c.textContent = '관람 예약하기';
          c.classList.remove('is-done');
        });
      });
      function prev() {
        go(current - 1);
      }

      function atTop(sc) {
        return sc.scrollTop <= 1;
      }
      function atBottom(sc) {
        return sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2;
      }
      function typing() {
        return root.classList.contains('is-typing');
      }

      // 휠 · 트랙패드: 장면 끝에 닿아 있을 때만 넘긴다.
      // 트랙패드는 손을 뗀 뒤에도 관성으로 휠 신호가 1초 넘게 이어지므로,
      // 한 번 넘긴 뒤에는 휠 신호가 잠깐(220ms) 끊길 때까지 다음 넘기기를 받지 않는다
      var wheelLocked = false,
        wheelQuiet = null;
      window.addEventListener(
        'wheel',
        function (e) {
          if (loading) {
            if (e.deltaY > 4) {
              e.preventDefault();
              skipIntro();
            }
            return;
          } // 받는 중이라도 내리면 바로 전시 안내로
          if (typing()) return;
          var sc = scenes[current];
          if (!sc) return;
          var down = e.deltaY > 0 && atBottom(sc),
            up = e.deltaY < 0 && atTop(sc);
          if (!down && !up) return; // 장면 안에서 스크롤 중
          e.preventDefault();
          clearTimeout(wheelQuiet);
          wheelQuiet = setTimeout(function () {
            wheelLocked = false;
          }, 220);
          if (wheelLocked || Math.abs(e.deltaY) < 4) return;
          wheelLocked = true;
          if (down) next();
          else prev();
        },
        { passive: false }
      );

      // 손가락: 밀기 시작할 때 장면 끝에 닿아 있었다면, 충분히 밀었을 때 넘긴다
      var t0 = null,
        startTop = false,
        startBottom = false;
      window.addEventListener(
        'touchstart',
        function (e) {
          var sc = scenes[current];
          t0 = e.touches[0].clientY;
          startTop = sc ? atTop(sc) : true;
          startBottom = sc ? atBottom(sc) : true;
        },
        { passive: true }
      );
      window.addEventListener(
        'touchmove',
        function (e) {
          if (t0 === null || typing()) return;
          var dy = e.touches[0].clientY - t0; // - : 위로 밀기(= 다음), + : 아래로 밀기(= 이전)
          if (loading) {
            e.preventDefault();
            if (dy < -45) {
              t0 = null;
              skipIntro();
            }
            return;
          }
          // 끝에 닿은 쪽으로 더 밀면 화면이 고무줄처럼 끌려가지 않게 막는다
          if ((dy < 0 && startBottom) || (dy > 0 && startTop)) e.preventDefault();
          if (dy < -45 && startBottom) {
            t0 = null;
            next();
          } else if (dy > 45 && startTop) {
            t0 = null;
            prev();
          }
        },
        { passive: false }
      );
      window.addEventListener(
        'touchend',
        function () {
          t0 = null;
        },
        { passive: true }
      );

      // 키보드
      document.addEventListener('keydown', function (e) {
        if (typing() || e.altKey || e.ctrlKey || e.metaKey) return;
        if (loading) {
          if (/^(ArrowDown|PageDown| |Enter)$/.test(e.key)) {
            e.preventDefault();
            skipIntro();
          }
          return;
        }
        var sc = scenes[current];
        if (/^(ArrowDown|PageDown| )$/.test(e.key) && (!sc || atBottom(sc))) {
          e.preventDefault();
          next();
        } else if (/^(ArrowUp|PageUp)$/.test(e.key) && (!sc || atTop(sc))) {
          e.preventDefault();
          prev();
        } else if (e.key === 'Home') {
          e.preventDefault();
          go(0, true);
        } else if (e.key === 'End') {
          e.preventDefault();
          go(scenes.length - 1, true);
        }
      });

      // 표지는 누르기만 해도 다음으로
      scenes[0].addEventListener('click', function (e) {
        if (!e.target.closest('a')) next();
      });

      // 장면 안의 링크·버튼이 다른 장면의 요소로 초점을 옮기면 그 장면으로 넘어간다 (탭 키 이동 등)
      document.addEventListener('focusin', function (e) {
        for (var k = 0; k < scenes.length; k++) {
          if (scenes[k].contains(e.target)) {
            if (k !== current) go(k, true);
            break;
          }
        }
      });

      /* 첫 진입: 사진·글꼴이 다 받아질 때까지는 뒷배경만. 준비되면 표지가 스르륵 나타나고,
       AUTO_HIDE 뒤 저절로 전시 안내로 넘어간다. 받는 동안에는 '불러오는 중' 막대가 흐른다.
       네트워크가 끊긴 듯 아주 오래 걸리면(20초) 그때는 기다리지 않고 시작한다 */
      function whenImage(src) {
        return new Promise(function (res) {
          var im = new Image();
          im.onload = im.onerror = function () {
            (im.decode ? im.decode() : Promise.resolve()).then(res, res);
          };
          im.src = src;
        });
      }
      var waits = [
        new Promise(function (res) {
          if (document.readyState === 'complete') res();
          else window.addEventListener('load', res);
        }),
        whenImage('/assets/img/poster-hero.jpg')
      ];
      var coverImg = document.querySelector('.frame-work');
      var m = coverImg && /url\("?([^")]+)"?\)/.exec(coverImg.style.backgroundImage);
      if (m) waits.push(whenImage(m[1]));
      if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
      var started = false;
      /* 받는 중에 사용자가 먼저 내리면: 표지 소개는 건너뛰고 곧장 전시 안내로 (사진은 뒤에서 계속 받는다) */
      function skipIntro() {
        if (started) return;
        started = true;
        loading = false;
        root.classList.remove('visit-loading');
        root.classList.add('intro-done');
        go(1, true);
      }
      function start() {
        if (started) return;
        started = true;
        // 두 프레임 기다렸다가 떼야 멈춰 있던 애니메이션이 첫 장면부터 매끄럽게 재생된다
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            loading = false;
            root.classList.remove('visit-loading');
            go(0, true);
            root.style.setProperty('--intro-ms', AUTO_HIDE + 'ms');
            root.classList.add('intro-run'); // 진행 막대가 AUTO_HIDE 동안 왼쪽에서 오른쪽으로 찬다
            autoTimer = setTimeout(function () {
              if (current === 0) go(1, true);
            }, AUTO_HIDE);
          });
        });
      }
      Promise.all(waits).then(start, start);
      setTimeout(start, 20000);

      /* 글을 입력하는 동안은 넘기기를 멈춘다 (키보드가 올라오며 화면이 바뀔 때 엉뚱한 장면으로 넘어가지 않게) */
      var typingOff = null;
      document.addEventListener('focusin', function (e) {
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
          clearTimeout(typingOff);
          root.classList.add('is-typing');
        }
      });
      document.addEventListener('focusout', function () {
        clearTimeout(typingOff);
        typingOff = setTimeout(function () {
          root.classList.remove('is-typing');
        }, 400);
      });
    })();

  // 작품 사진을 누르면 화면 가득 크게 본다
  (function () {
    var viewer = document.getElementById('workViewer');
    if (!viewer) return;
    var track = document.getElementById('viewerTrack');
    var countEl = document.getElementById('viewerCount');
    var prevBtn = document.getElementById('viewerPrev');
    var nextBtn = document.getElementById('viewerNext');
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.work-zoom'));

    // 페이지에 있는 작품 사진을 차례대로 한 줄로 늘어놓는다 (같은 사진은 한 번만)
    var srcs = [];
    buttons.forEach(function (b) {
      var src = b.getAttribute('data-src');
      if (srcs.indexOf(src) !== -1) return;
      srcs.push(src);
      var slide = document.createElement('div');
      slide.className = 'viewer-slide';
      var im = document.createElement('img');
      im.alt = (b.querySelector('img') || {}).alt || '';
      im.dataset.src = src; // 열 때 불러온다
      slide.appendChild(im);
      track.appendChild(slide);
    });
    var slides = track.children;

    function current() {
      return Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
    }
    // 원본은 무거워서, 지금 보는 사진과 바로 옆 사진만 받아 둔다. 나머지는 넘길 때 받는다
    function loadAround(i) {
      for (var k = i - 1; k <= i + 1; k++) {
        var im = slides[k] && slides[k].querySelector('img');
        if (im && !im.getAttribute('src')) im.src = im.dataset.src;
      }
    }
    function update() {
      var i = current();
      loadAround(i);
      countEl.textContent = i + 1 + ' / ' + slides.length;
      prevBtn.disabled = i <= 0;
      nextBtn.disabled = i >= slides.length - 1;
    }
    function go(i, smooth) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: i * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
      update();
    }
    function open(src) {
      loadAround(srcs.indexOf(src));
      viewer.hidden = false;
      document.body.style.overflow = 'hidden';
      go(srcs.indexOf(src), false);
    }
    function close() {
      viewer.hidden = true;
      document.body.style.overflow = '';
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        open(b.getAttribute('data-src'));
      });
    });
    var t = null;
    track.addEventListener(
      'scroll',
      function () {
        clearTimeout(t);
        t = setTimeout(update, 60);
      },
      { passive: true }
    );
    prevBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      go(current() - 1, true);
    });
    nextBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      go(current() + 1, true);
    });
    viewer.querySelector('.work-close').addEventListener('click', close);
    // 사진 밖 어두운 곳을 누르면 닫는다 (사진을 누르거나 밀 때는 닫히지 않는다)
    track.addEventListener('click', function (e) {
      if (e.target.classList.contains('viewer-slide')) close();
    });
    window.addEventListener('resize', function () {
      if (!viewer.hidden) go(current(), false);
    });

    // 가까이 보기 점 표시: 지금 보이는 사진 위치를 따라간다
    var strip = document.querySelector('.work-strip');
    if (strip) {
      var cards = strip.querySelectorAll('.work-zoom');
      var dots = document.createElement('div');
      dots.className = 'work-dots';
      dots.setAttribute('aria-hidden', 'true');
      for (var d = 0; d < cards.length; d++) dots.appendChild(document.createElement('span'));
      strip.parentNode.insertBefore(dots, strip.nextSibling);
      var mark = function () {
        var step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : 1;
        var maxScroll = strip.scrollWidth - strip.clientWidth;
        var i = strip.scrollLeft >= maxScroll - 2 ? cards.length - 1 : Math.round(strip.scrollLeft / step);
        Array.prototype.forEach.call(dots.children, function (el, k) {
          el.classList.toggle('on', k === i);
        });
      };
      var ticking = false;
      strip.addEventListener(
        'scroll',
        function () {
          if (ticking) return;
          ticking = true;
          setTimeout(function () {
            ticking = false;
            mark();
          }, 60);
        },
        { passive: true }
      );
      mark();
    }
    document.addEventListener('keydown', function (e) {
      if (viewer.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(current() + 1, true);
      else if (e.key === 'ArrowLeft') go(current() - 1, true);
    });
  })();

  /* 배경 그라데이션이 풀리기 시작하는 지점을 히어로 높이에 맞춘다 */
  function syncHeroHeight() {
    var hero = document.querySelector('.hero');
    if (!hero) return;
    document.documentElement.style.setProperty('--hero-h', Math.round(hero.offsetHeight) + 'px');
  }
  syncHeroHeight();
  window.addEventListener('resize', syncHeroHeight);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncHeroHeight).catch(function () {});
  }
  window.addEventListener('load', syncHeroHeight);

  /* ── D-DAY ── */
  var OPEN = new Date(2026, 10, 12); // 2026-11-12
  var CLOSE = new Date(2026, 10, 17, 20, 0, 0); // 2026-11-17 20:00 마감
  var DAY = 86400000;

  function countTo(el, target, prefix) {
    if (!ANIM || !window.requestAnimationFrame) {
      el.textContent = prefix + target;
      return;
    }
    var dur = 1000,
      start = null;
    el.textContent = prefix + '0';
    requestAnimationFrame(function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
    });
    // 화면에 보이지 않는 탭에서는 애니메이션이 멈추므로, 시간이 지나면 최종 숫자를 확실히 넣는다
    setTimeout(function () {
      el.textContent = prefix + target;
    }, dur + 300);
  }

  function updateDday() {
    var numEl = document.getElementById('ddayNum');
    var labEl = document.getElementById('ddayLabel');
    if (!numEl || !labEl) return;

    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var diff = Math.round((OPEN - today) / DAY);

    if (diff > 0) {
      labEl.textContent = '전시 오픈까지';
      if (ANIM) {
        numEl.textContent = 'D-0';
        setTimeout(function () {
          countTo(numEl, diff, 'D-');
        }, 860);
      } else {
        numEl.textContent = 'D-' + diff;
      }
    } else if (now <= CLOSE) {
      var n = Math.round((today - OPEN) / DAY) + 1;
      numEl.textContent = n + '일차';
      labEl.textContent = '전시가 열리고 있습니다';
    } else {
      numEl.textContent = '종료';
      labEl.textContent = '찾아와 주셔서 감사합니다';
    }
  }
  updateDday();

  /* ── 복사 ── */
  var ADDRESS = '서울 마포구 신촌로 48 (홍대 피시스 아카이브)';

  var toastTimer = null;
  function toast(msg) {
    var prev = document.querySelector('.toast');
    if (prev) prev.remove();
    if (toastTimer) clearTimeout(toastTimer);
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    toastTimer = setTimeout(function () {
      if (el.parentNode) el.remove();
    }, 2600);
  }

  function selectFallback(text, okMsg) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand && document.execCommand('copy');
      ta.remove();
      toast(ok ? okMsg : '복사가 막혀 있습니다. 길게 눌러 직접 복사해 주세요');
    } catch (e) {
      toast('복사가 막혀 있습니다. 길게 눌러 직접 복사해 주세요');
    }
  }

  function copy(text, okMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(function () {
          toast(okMsg);
        })
        .catch(function () {
          selectFallback(text, okMsg);
        });
    } else {
      selectFallback(text, okMsg);
    }
  }

  var addrBtn = document.getElementById('copyAddr');
  if (addrBtn)
    addrBtn.addEventListener('click', function () {
      copy(ADDRESS, '주소를 복사했습니다');
    });

  // 지금 보고 있는 주소를 그대로 복사한다 (#작가 공유 링크로 들어왔다면 그것까지)
  var linkBtn = document.getElementById('copyLink');
  if (linkBtn)
    linkBtn.addEventListener('click', function () {
      copy(location.href, '링크를 복사했습니다');
    });

  /* ▼ 구글 Apps Script 웹앱 주소. '작가에게 한마디'와 '관람 예약'이 함께 쓴다.
       비어 있으면 두 섹션 모두 숨는다. */
  var SHEET_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbz9oZZXBoCEBRYiXmML2QEUPuuK5gb1a4UqKDBBFDMhnSH3ud0gHYFVxLN8EM4yfnGEXg/exec';

  /* ── 작가에게 한마디 ── */
  (function () {
    var ENDPOINT = SHEET_ENDPOINT;

    var sec = document.getElementById('noteSection');
    var form = document.getElementById('noteForm');
    var wrap = document.getElementById('noteFormWrap');
    var done = document.getElementById('noteDone');
    var msgEl = document.getElementById('noteMessage');
    var cntEl = document.getElementById('noteCount');
    var statEl = document.getElementById('noteStatus');
    var btn = document.getElementById('noteSubmit');
    var again = document.getElementById('noteAgain');
    var intro = document.getElementById('noteIntro');
    var body = document.getElementById('noteBody');
    var toEl = document.getElementById('noteTo');
    var change = document.getElementById('noteChange');
    var allBtn = document.getElementById('noteAll');
    if (!sec || !form) return;

    if (ENDPOINT.indexOf('http') !== 0) {
      sec.hidden = true;
      return;
    }

    var MAX = 300;
    var COOLDOWN = 20000; // 같은 사람이 연달아 보내는 것을 막는다

    /* 연락처와 광고를 거른다. 서버 쪽에서도 같은 검사를 한 번 더 한다 */
    var BLOCKED = [
      { re: /[\w.+-]+@[\w-]+\.[\w.]{2,}/, msg: '이메일 주소는 적지 않으셔도 됩니다.' },
      { re: /01[016-9][-.\s]?\d{3,4}[-.\s]?\d{4}/, msg: '전화번호는 적지 않으셔도 됩니다.' },
      { re: /\d{9,}/, msg: '긴 숫자는 적지 않으셔도 됩니다.' },
      { re: /(https?:\/\/|www\.)/i, msg: '링크는 넣을 수 없습니다.' },
      { re: /\.(com|net|org|kr|io|me|shop|link|xyz|top|biz)\b/i, msg: '링크는 넣을 수 없습니다.' },
      {
        re: /(카지노|토토|바카라|먹튀|슬롯|대출|상위노출|홍보대행|부업|재택알바|비아그라|오픈채팅|오픈카톡|텔레그램|디비판매|코인리딩)/,
        msg: '전시와 관련 없는 내용은 보낼 수 없습니다.'
      }
    ];

    function screen(text) {
      for (var i = 0; i < BLOCKED.length; i++) {
        if (BLOCKED[i].re.test(text)) return BLOCKED[i].msg;
      }
      return '';
    }

    function setStatus(text) {
      if (statEl) statEl.textContent = text || '';
    }

    // 글자 수
    if (msgEl && cntEl) {
      var updateCount = function () {
        cntEl.textContent = msgEl.value.length + ' / ' + MAX;
      };
      msgEl.addEventListener('input', updateCount);
      updateCount();
    }

    function lastSent() {
      try {
        return parseInt(localStorage.getItem('note-sent') || '0', 10) || 0;
      } catch (e) {
        return 0;
      }
    }
    function markSent() {
      try {
        localStorage.setItem('note-sent', String(Date.now()));
      } catch (e) {}
    }

    function showDone() {
      if (wrap) wrap.hidden = true;
      if (done) done.hidden = false;
    }

    /* ── 작가를 고르면 본문이 펼쳐진다 ── */
    var items = document.querySelectorAll('.artists li');

    function markPicked(name) {
      Array.prototype.forEach.call(items, function (li) {
        li.classList.toggle('picked', artistName(li) === name);
      });
    }

    function slideOpenBody() {
      if (!body.hidden) return;
      body.hidden = false;
      if (!ANIM) return;

      body.style.overflow = 'hidden';
      body.style.height = 'auto';
      var target = body.offsetHeight;

      body.style.height = '0px';
      body.style.opacity = '0';
      void body.offsetHeight;

      body.style.transition = 'height .5s cubic-bezier(.22,.61,.36,1), opacity .4s ease .1s';
      body.style.height = target + 'px';
      body.style.opacity = '1';

      setTimeout(function () {
        body.style.transition = '';
        body.style.height = '';
        body.style.overflow = '';
        body.style.opacity = '';
      }, 560);
    }

    // quiet: 공유 링크(#이름)로 미리 골라 둘 때. 화면을 끌어내리거나 입력칸에 커서를 두지 않는다
    // 게시판을 연 작가에게 쓰는 쪽지는 그 작가 페이지에 붙는다고 알려 준다
    var privacyEl = document.getElementById('notePrivacy');
    var doneSubEl = document.getElementById('noteDoneSub');
    var PRIVATE_TEXT = privacyEl ? privacyEl.textContent : '';
    var PRIVATE_DONE = doneSubEl ? doneSubEl.textContent : '';
    function notePrivacy(name) {
      var open = !!BOARD_ARTISTS[name];
      var label = artistLabel(name);
      if (open && PAGE_ARTIST === name) {
        // 작가 전용 페이지에서는 자기 이름을 부르지 않는다
        if (privacyEl) {
          if (IS_VISIT) {
            // 예약 페이지: 게시판 안내 아래 줄에 감상평 부탁을 덧붙인다
            privacyEl.textContent = '남겨 주신 쪽지는 작가 페이지의 쪽지 게시판에 붙어요.';
            privacyEl.appendChild(document.createElement('br'));
            var ask = document.createElement('span');
            ask.className = 'note-ask';
            ask.textContent = '전시를 보고 난 뒤에 감상평을 남겨 주시면 정말 기쁠 거예요!';
            privacyEl.appendChild(ask);
          } else {
            privacyEl.textContent = '남겨 주신 쪽지는 이 페이지 게시판에 붙어요.';
          }
        }
        if (doneSubEl)
          doneSubEl.textContent = IS_VISIT
            ? '작가 페이지 게시판에 붙었어요. 고마워요!'
            : '게시판에 붙었어요. 고마워요!';
        return;
      }
      if (privacyEl)
        privacyEl.textContent = open
          ? label + ' 작가에게 남긴 쪽지는 ' + label + ' 작가 페이지의 쪽지 게시판에 붙어요.'
          : PRIVATE_TEXT;
      if (doneSubEl) doneSubEl.textContent = open ? label + ' 작가 페이지 게시판에 붙었어요.' : PRIVATE_DONE;
    }

    function pickArtist(name, quiet) {
      var first = body.hidden;

      form.artist.value = name;
      if (toEl && PAGE_ARTIST && name === PAGE_ARTIST) {
        toEl.textContent = '작가에게 한마디'; // 작가 전용 페이지에서는 자기 이름을 부르지 않는다
      } else if (toEl) {
        toEl.innerHTML = '';
        var em = document.createElement('em');
        em.textContent = name === '전체' ? '참여 작가 모두' : artistLabel(name);
        toEl.appendChild(em);
        toEl.appendChild(document.createTextNode(name === '전체' ? '에게' : ' 작가에게'));
      }
      markPicked(name);
      notePrivacy(name);

      // 다 쓴 상태였다면 폼으로 되돌린다
      if (done && !done.hidden) {
        form.reset();
        form.artist.value = name;
        if (cntEl) cntEl.textContent = '0 / ' + MAX;
        setStatus('');
        done.hidden = true;
        if (wrap) wrap.hidden = false;
      }

      if (intro) intro.hidden = true;
      slideOpenBody();
      if (quiet) return;

      setTimeout(
        function () {
          sec.scrollIntoView({ behavior: ANIM ? 'smooth' : 'auto', block: 'start' });
          if (first && msgEl)
            setTimeout(function () {
              msgEl.focus();
            }, 420);
        },
        first && ANIM ? 180 : 0
      );
    }

    Array.prototype.forEach.call(items, function (li) {
      var name = artistName(li); // 시트에는 본명으로 간다
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-label', artistLabel(name) + ' 작가에게 한마디 남기기');
      li.addEventListener('click', function () {
        pickArtist(name);
      });
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pickArtist(name);
        }
      });
    });

    if (allBtn)
      allBtn.addEventListener('click', function () {
        pickArtist('전체');
      });

    // 링크 끝에 작가 이름(#이재이)이 있으면 받는 사람으로 미리 골라 둔다
    function pickFromHash() {
      var raw = sharedArtist();
      for (var i = 0; i < items.length; i++) {
        if (raw && artistName(items[i]) === raw) {
          pickArtist(raw, true);
          return;
        }
      }
    }
    pickFromHash();
    window.addEventListener('hashchange', pickFromHash);

    // 받는 사람을 다시 고르러 명단으로 돌려보낸다
    if (change) {
      change.addEventListener('click', function () {
        var artists = document.getElementById('artistsSection') || document.querySelector('.artists');
        if (artists) {
          artists.scrollIntoView({ behavior: ANIM ? 'smooth' : 'auto', block: 'center' });
        }
      });
    }

    if (again) {
      again.addEventListener('click', function () {
        var keep = form.artist.value; // 받는 사람은 그대로 둔다
        form.reset();
        form.artist.value = keep;
        if (cntEl) cntEl.textContent = '0 / ' + MAX;
        setStatus('');
        if (done) done.hidden = true;
        if (wrap) wrap.hidden = false;
        if (msgEl) msgEl.focus();
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      setStatus('');

      var trap = form.nickname ? form.nickname.value : '';
      if (trap) {
        showDone();
        return;
      } // 자동 프로그램은 조용히 흘려보낸다

      var message = (msgEl ? msgEl.value : '').trim();
      if (!message) {
        setStatus('남기고 싶은 말을 적어 주세요.');
        if (msgEl) msgEl.focus();
        return;
      }
      if (message.length > MAX) {
        setStatus(MAX + '자까지 적을 수 있습니다.');
        return;
      }

      var blocked = screen(message) || screen(form.sender ? form.sender.value : '');
      if (blocked) {
        setStatus(blocked);
        if (msgEl) msgEl.focus();
        return;
      }
      if (Date.now() - lastSent() < COOLDOWN) {
        setStatus('방금 하나를 보냈습니다. 잠시 뒤에 다시 시도해 주세요.');
        return;
      }

      var payload = {
        artist: form.artist ? form.artist.value : '전체',
        message: message,
        sender: form.sender ? form.sender.value.trim() : '',
        at: new Date().toISOString()
      };

      if (btn) {
        btn.disabled = true;
        btn.textContent = '전하는 중…';
      }

      // text/plain 으로 보내면 사전 확인 요청 없이 바로 전달된다
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      })
        .then(function () {
          markSent();
          showDone();
          window.dispatchEvent(new CustomEvent('note-sent', { detail: payload }));
        })
        .catch(function () {
          // 응답을 읽지 못해도 전달 자체는 되는 경우가 많다. 한 번 더 시도한다
          return fetch(ENDPOINT, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
          })
            .then(function () {
              markSent();
              showDone();
            })
            .catch(function () {
              setStatus('전하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.');
            });
        })
        .then(function () {
          if (btn) {
            btn.disabled = false;
            btn.textContent = '전하기';
          }
        });
    });
  })();

  /* ── 작가 쪽지 게시판 (/jessie) ──
     Apps Script 에서 그 작가에게 온 쪽지만 받아 메모지처럼 붙인다 */
  (function () {
    var sec = document.getElementById('boardSection');
    if (!sec || !PAGE_ARTIST || !BOARD_ARTISTS[PAGE_ARTIST]) return;
    if (SHEET_ENDPOINT.indexOf('http') !== 0) return;
    sec.hidden = false;
    if (IS_VISIT) return; // 예약 페이지: 쪽지 보드는 빼고 쓰는 칸만 둔다

    // 손글씨 느낌 글꼴은 이 페이지에서만 불러온다
    var font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&display=swap';
    document.head.appendChild(font);

    var board = document.getElementById('board');
    var empty = document.getElementById('boardEmpty');
    var PAPERS = ['#FFF4A8', '#FFD9E4', '#D7F0FF', '#DDF5D2', '#FFE3C2', '#EADCFF'];
    var total = 0;
    var PAGE = 12; // 처음에 보여 줄 장수, '더 보기'를 누를 때마다 이만큼 더
    var shown = PAGE;
    /* 이 글자 수를 넘는 쪽지는 접어 두고, 누르면 펼친다.
       고정값이 아니라 쪽지를 불러올 때마다 다시 정한다:
       가장 긴 쪽지 하나를 뺀 나머지의 평균 글자 수 + CLAMP_EXTRA.
       쪽지가 2개 미만이면 CLAMP_DEFAULT 를 쓴다 */
    var CLAMP_DEFAULT = 20;
    var CLAMP_EXTRA = 8;
    var CLAMP = CLAMP_DEFAULT;
    function setClamp(notes) {
      var lens = notes.map(function (n) {
        return Array.from((n.message || '').trim()).length;
      });
      if (lens.length < 2) {
        CLAMP = CLAMP_DEFAULT;
        return;
      }
      lens.sort(function (a, b) {
        return a - b;
      });
      lens.pop(); // 가장 긴 쪽지 하나는 평균에서 뺀다
      var sum = 0;
      for (var i = 0; i < lens.length; i++) sum += lens[i];
      var avg = Math.round(sum / lens.length);
      CLAMP = avg + CLAMP_EXTRA;
      try {
        console.log('쪽지 평균 ' + avg + '자 (가장 긴 쪽지 제외, ' + lens.length + '개) → ' + CLAMP + '자 넘으면 접음');
      } catch (e) {}
    }
    var HEART_SENDERS = { 다진고기: true }; // 보낸 사람 이름이 이와 같으면 하트 쪽지 (접지 않음)
    var moreRow = document.getElementById('boardMoreRow');
    var moreBtn = document.getElementById('boardMore');

    function paginate() {
      var all = board.querySelectorAll('.sticky');
      for (var i = 0; i < all.length; i++) all[i].hidden = i >= shown;
      var rest = all.length - shown;
      moreRow.hidden = rest <= 0;
      if (rest > 0) moreBtn.textContent = '쪽지 더 보기';
      fitHearts();
    }

    // 하트는 크기가 정해져 있으니, 글이 넘치면 넘치지 않을 때까지 글씨를 조금씩 줄인다
    function fitHearts() {
      var hs = board.querySelectorAll('.sticky.is-heart');
      for (var i = 0; i < hs.length; i++) {
        var h = hs[i];
        if (h.hidden) continue;
        var fs = 1.0;
        h.style.removeProperty('width');
        h.style.removeProperty('max-width');
        h.style.setProperty('--heart-fs', fs + 'rem');
        while (h.scrollHeight > h.clientHeight + 1 && fs > 0.74) {
          fs = Math.round((fs - 0.04) * 100) / 100;
          h.style.setProperty('--heart-fs', fs + 'rem');
        }
        // 글씨를 더 줄이면 읽기 어려우니, 그래도 넘치면 비율은 그대로 두고 하트를 조금씩 키운다
        var w = h.offsetWidth,
          limit = board.clientWidth - 20;
        while (h.scrollHeight > h.clientHeight + 1 && w < limit) {
          w = Math.min(limit, w + 12);
          h.style.width = w + 'px';
          h.style.maxWidth = 'none';
        }
      }
    }
    var fitTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(fitTimer);
      fitTimer = setTimeout(fitHearts, 150);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHearts).catch(function () {});
    moreBtn.addEventListener('click', function () {
      shown += PAGE;
      paginate();
    });

    // 같은 쪽지는 늘 같은 색·기울기로 붙도록 글자로 값을 정한다
    function seed(str) {
      var h = 0;
      for (var i = 0; i < str.length; i++) {
        h = (h * 31 + str.charCodeAt(i)) | 0;
      }
      return Math.abs(h);
    }

    /* 내용이 거의 없는 쪽지인지 가늠한다. 지우지는 않고 작게만 붙인다.
       - ㅋㅋ·ㅎㅎ·ㅠㅠ 같은 자음·모음, 문장부호, 이모지를 걷어 내고 남는 글자가 3자 미만
       - 몇 글자만 계속 되풀이 (하하하하하, 와와와와)
       - 영문 자판 두드리기 (asdf, qwerty, 모음 없는 영문 덩어리) */
    function isFluff(text) {
      var s = (text || '').replace(/\s+/g, '');
      if (!s) return true;
      var core = s.replace(/[^가-힣a-zA-Z0-9]/g, '');
      if (core.length < 3) return true;
      var uniq = {},
        n = 0;
      for (var i = 0; i < core.length; i++) {
        if (!uniq[core[i]]) {
          uniq[core[i]] = 1;
          n++;
        }
      }
      if (core.length >= 5 && n <= 2) return true;
      if (/^[a-zA-Z]+$/.test(core)) {
        if (/asdf|sdfg|qwer|wert|zxcv|hjkl|jkl/i.test(core)) return true;
        if (core.length >= 4 && !/[aeiouy]/i.test(core)) return true;
      }
      return false;
    }

    function note(n, fresh) {
      var el = document.createElement('article');
      el.className = 'sticky' + (fresh ? ' is-new' : '') + (isFluff(n.message) ? ' is-small' : '');
      var k = seed((n.message || '') + (n.at || ''));
      el.style.setProperty('--paper', PAPERS[k % PAPERS.length]);
      el.style.setProperty('--r', (k % 9) - 4 + 'deg');
      el.style.setProperty('--t', ((k % 7) - 3) * 2 + 'deg');
      el.style.setProperty('--y', (k % 5) * 3 + 'px');
      var msg = document.createElement('p');
      msg.className = 'sticky-msg';
      // 20자가 넘으면 앞부분만 보이고 말줄임표를 붙인다. 쪽지를 누르면 펼치고, 다시 누르면 접는다
      var full = n.message || '';
      var chars = Array.from(full); // 이모지가 반쪽으로 잘리지 않게 글자 단위로 센다
      // 특별한 사람의 쪽지는 하트 모양으로, 늘 펼친 채로 붙인다
      var special = HEART_SENDERS[(n.sender || '').trim()];
      if (special) {
        el.classList.add('is-heart');
        el.classList.remove('is-small');
      }
      if (!special && chars.length > CLAMP) {
        var short = chars.slice(0, CLAMP).join('').replace(/\s+$/, '') + '…';
        msg.textContent = short;
        el.classList.add('is-clamped');
        el.tabIndex = 0;
        el.setAttribute('role', 'button');
        el.setAttribute('aria-expanded', 'false');
        el.setAttribute('aria-label', full);
        var toggle = function () {
          var open = el.classList.toggle('is-open');
          msg.textContent = open ? full : short;
          el.setAttribute('aria-expanded', open ? 'true' : 'false');
        };
        el.addEventListener('click', toggle);
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        });
      } else {
        msg.textContent = full;
      }
      var meta = document.createElement('div');
      meta.className = 'sticky-meta';
      var who = document.createElement('span');
      who.textContent = '- ' + (n.sender || '익명');
      var when = document.createElement('span');
      when.textContent = n.at || '';
      meta.appendChild(who);
      meta.appendChild(when);
      el.appendChild(msg);
      el.appendChild(meta);
      return el;
    }

    function setCount() {
      // 쪽지 수는 보여 주지 않는다
      empty.hidden = total > 0;
    }

    // 예약 페이지의 '게시판 보러가기'(/jessie?to=board)로 들어왔으면 게시판으로 내려간다.
    // 쪽지가 다 붙은 뒤에 움직여야 위치가 어긋나지 않는다
    var wantBoard = new URLSearchParams(location.search).get('to') === 'board';
    function jumpToBoard() {
      if (!wantBoard) return;
      wantBoard = false;
      setTimeout(function () {
        sec.classList.add('in');
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
    if (wantBoard) sec.style.scrollMarginTop = '16px';
    board.innerHTML = '<span class="board-loading">쪽지를 가져오는 중…</span>';
    fetch(SHEET_ENDPOINT + '?type=board&artist=' + encodeURIComponent(PAGE_ARTIST))
      .then(function (r) {
        return r.json();
      })
      .then(function (r) {
        board.innerHTML = '';
        var notes = (r && r.ok && r.notes) || [];
        setClamp(notes);
        notes.forEach(function (n) {
          board.appendChild(note(n));
        });
        total = notes.length;
        setCount();
        paginate();
        jumpToBoard();
      })
      .catch(function () {
        jumpToBoard();
        board.innerHTML = '';
        empty.textContent = '쪽지를 불러오지 못했어요. 잠시 뒤에 다시 들러 주세요.';
        empty.hidden = false;
      });

    // 이 페이지에서 쪽지를 보내면 바로 맨 앞에 붙인다
    window.addEventListener('note-sent', function (e) {
      var p = e.detail || {};
      if (p.artist !== PAGE_ARTIST) return;
      var d = new Date();
      board.insertBefore(
        note({ message: p.message, sender: p.sender, at: d.getMonth() + 1 + '/' + d.getDate() }, true),
        board.firstChild
      );
      total++;
      shown++; // 방금 붙인 쪽지 때문에 다른 쪽지가 밀려 사라지지 않게
      setCount();
      paginate();
    });
  })();

  /* ── 관람 예약 ──
     Apps Script가 예약 시트의 해당 작가 칸에 한 줄씩 채운다.
     결제 방법·입장여부·메모는 운영진이 직접 적는 칸이라 받지 않는다 */
  (function () {
    var sec = document.getElementById('visitSection');
    if (!sec) return;
    if (SHEET_ENDPOINT.indexOf('http') !== 0) {
      sec.hidden = true;
      return;
    }

    var form = document.getElementById('visitForm');
    var wrap = document.getElementById('visitFormWrap');
    var done = document.getElementById('visitDone');
    var doneSub = document.getElementById('visitDoneSub');
    var again = document.getElementById('visitAgain');
    var statEl = document.getElementById('visitStatus');
    var btn = document.getElementById('visitSubmit');
    var dateEl = document.getElementById('visitDate');
    var artEl = document.getElementById('visitArtist');

    var COOLDOWN = 20000;

    // 값은 예약 시트 '방문 날짜' 드롭다운과 똑같아야 한다
    var DAYS = [
      { v: '11/12(목)', label: '11월 12일 (목) · 13:00 개관' },
      { v: '11/13(금)', label: '11월 13일 (금)' },
      { v: '11/14(토)', label: '11월 14일 (토)' },
      { v: '11/15(일)', label: '11월 15일 (일)' },
      { v: '11/16(월)', label: '11월 16일 (월)' },
      { v: '11/17(화)', label: '11월 17일 (화) · 20:00 마감' }
    ];
    DAYS.forEach(function (d) {
      dateEl.appendChild(new Option(d.label, d.v));
    });

    // 작가 명단은 위 '참여 작가'에서 그대로 가져온다
    Array.prototype.forEach.call(document.querySelectorAll('.artists li'), function (li) {
      var name = artistName(li);
      artEl.appendChild(new Option(artistLabel(name), name));
    });

    // 공유 링크(#이름)로 들어왔다면 그 작가를 미리 골라 둔다
    var hashName = sharedArtist();
    for (var i = 0; i < artEl.options.length; i++) {
      if (hashName && artEl.options[i].value === hashName) {
        artEl.selectedIndex = i;
        break;
      }
    }

    var BLOCKED = /([\w.+-]+@[\w-]+\.[\w.]{2,}|01[016-9][-.\s]?\d{3,4}[-.\s]?\d{4}|\d{9,}|https?:\/\/|www\.)/i;

    function setStatus(t) {
      statEl.textContent = t || '';
    }
    function lastSent() {
      try {
        return parseInt(localStorage.getItem('visit-sent') || '0', 10) || 0;
      } catch (e) {
        return 0;
      }
    }
    function markSent() {
      try {
        localStorage.setItem('visit-sent', String(Date.now()));
      } catch (e) {}
    }

    function showDone(date) {
      var day = DAYS.filter(function (d) {
        return d.v === date;
      })[0];
      doneSub.textContent = (day ? day.label.split(' · ')[0] : date) + '에 오시는 걸로 적어 두었어요.';
      wrap.hidden = true;
      done.hidden = false;
      window.dispatchEvent(new CustomEvent('visit-done', { detail: { date: date } }));
    }

    again.addEventListener('click', function () {
      var keepArtist = artEl.value;
      form.reset();
      artEl.value = keepArtist;
      setStatus('');
      done.hidden = true;
      wrap.hidden = false;
      window.dispatchEvent(new CustomEvent('visit-reset'));
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      setStatus('');

      if (form.nickname.value) {
        showDone(dateEl.value);
        return;
      }

      var name = form.name.value.trim();
      if (!name) {
        setStatus('입구에서 확인할 수 있도록 성함을 적어 주세요.');
        form.name.focus();
        return;
      }
      if (!dateEl.value) {
        setStatus('방문 날짜를 골라 주세요.');
        dateEl.focus();
        return;
      }
      if (BLOCKED.test(name)) {
        setStatus('성함만 적어 주세요. 연락처나 링크는 넣을 수 없습니다.');
        return;
      }
      if (Date.now() - lastSent() < COOLDOWN) {
        setStatus('방금 예약을 남겼습니다. 잠시 뒤에 다시 시도해 주세요.');
        return;
      }

      var payload = {
        type: 'reservation',
        name: name,
        date: dateEl.value,
        artist: artEl.value, // 비어 있으면 워크인 칸으로 간다
        companions: form.companions.value // 예약자를 뺀 인원. 비어 있으면 시트에도 비워 둔다
      };

      btn.disabled = true;
      btn.textContent = '남기는 중…';

      fetch(SHEET_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().catch(function () {
            return { ok: true };
          });
        })
        .then(function (r) {
          if (r && r.ok === false) {
            var msg = {
              blocked: '보낼 수 없는 표현이 들어 있습니다. 다시 확인해 주세요.',
              bad_date: '고를 수 없는 날짜입니다. 다시 골라 주세요.',
              rate_limited: '지금 예약이 몰려 있습니다. 잠시 뒤에 다시 시도해 주세요.',
              busy: '지금 예약이 몰려 있습니다. 잠시 뒤에 다시 시도해 주세요.'
            }[String(r.reason).replace(/^blocked_.*/, 'blocked')];
            setStatus(msg || '예약을 남기지 못했습니다. 잠시 뒤에 다시 시도해 주세요.');
            return;
          }
          markSent();
          showDone(payload.date);
        })
        .catch(function () {
          setStatus('연결이 원활하지 않습니다. 잠시 뒤에 다시 시도해 주세요.');
        })
        .then(function () {
          btn.disabled = false;
          btn.textContent = '예약하기';
        });
    });
  })();

  /* ── 작가별 공유 링크 (#이름) ── */
  (function () {
    var items = document.querySelectorAll('.artists li');
    var line = document.getElementById('inviteLine');
    var visit = document.getElementById('visitArtist');

    function apply() {
      var raw = sharedArtist();

      var hit = null;
      for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('spotlight');
        if (raw && artistName(items[i]) === raw) hit = items[i];
      }
      if (!hit) {
        if (line) line.hidden = true;
        return;
      }

      hit.classList.add('spotlight');
      if (line) {
        line.textContent = artistLabel(raw) + ' 작가가 초대합니다';
        line.hidden = false;
      }
      if (visit) visit.value = raw; // 관람 예약의 '초대한 작가'도 미리 골라 둔다
    }

    apply();
    // 이미 열린 페이지에서 주소 끝의 #이름만 바꿔도 바로 반영한다
    window.addEventListener('hashchange', apply);
  })();

  /* ── 조금 이상한 질문 ── */
  (function () {
    /* 작품에서 온 질문은 작가와 작품명을 함께 적는다.
       전시 서문·도슨트에서 온 질문은 그 출처를, 그 밖의 것은 비워 둔다. */
    var QUESTIONS = [
      // ── 스무 점의 작품에서 ──
      {
        q: '당신에게도 한때 자신만의 이상한 나라가 있었나요. 그 세계는 지금 어디에 있나요?',
        by: '노정균 〈이상한 나라들의 앨리스〉'
      },
      { q: '당신은 어떤 어른이 되었나요?', by: '정연 〈어떤 어른이 되었나요?〉' },
      { q: '이상한 나라에 가게 된다면 무엇이 되고 싶으신가요?', by: '엄현서 〈이상한 나라의 해바라기〉' },
      { q: '당신의 다음 수는 어디에 두고 싶나요?', by: '재이 〈어디에 둘까요?〉' },
      { q: '모두가 같은 모습으로 살아가야 할까요?', by: '이희지 〈WELCOME TO THE TEA PARTY〉' },
      { q: '누군가의 성취를 보며 진심으로 응원해주지 못했던 적이 있나요?', by: '윤혜진 〈미소 짓는 자리〉' },
      { q: '나의 계절은 정말 늦은 걸까요?', by: '박정은 〈나의 계절은 아직〉' },
      { q: '곁에 있는 사람의 속도를 나의 기준으로 삼은 적이 있나요?', by: '최윤지 〈각자의 촛불을 켜는 시간〉' },
      { q: '이곳이 이상한 걸까요, 아니면 그 안에서 낯설게 느끼는 내가 이상한 걸까요?', by: '최윤아 〈Off-beat〉' },
      { q: '내가 믿어온 성공의 기준은 정말 나의 기준이었나요?', by: '임소라 〈발돋움〉' },
      { q: '앞으로 내가 채워갈 찻잔에는 조금 더 나다운 것이 담길 수 있을까요?', by: '홍성호 〈나를 따르다〉' },
      { q: '잠시 내려놓아도 괜찮은 것이 당신에게 있나요?', by: '남다름 〈꿈과 현실 사이〉' },
      { q: '나는 앞으로 무엇을 선택하며 살아갈까요?', by: '남선주 〈그림자 너머〉' },
      { q: '두려운 채로도 한 걸음 내디뎌 본 적이 있나요?', by: '박수룡 〈경계선 위의 발걸음〉' },
      { q: '아무도 나를 보고 있지 않을 때, 나는 어떤 사람일까요?', by: '이경도 〈바다〉' },
      { q: '아무런 역할을 하지 않고 온전히 자신으로 머물 수 있는 곳이 있나요?', by: '편해연 〈마이 룸 인 원더랜드〉' },
      { q: '지금 다시 불을 붙이고 싶은 꿈은 무엇인가요?', by: '이서현 〈점화〉' },
      { q: '지금까지의 삶은 당신에게 무엇을 남겼나요?', by: '김지현 〈What We Left on the Table〉' },
      { q: '내가 나라고 믿어온 모습 중, 정말 내가 선택한 것은 무엇일까요?', by: '조수연 〈Vase〉' },
      { q: '앞으로의 당신은 또 어떤 모습으로 변해갈까요?', by: '홍림 〈1+1+1=1〉' },

      // ── 전시 서문과 도슨트에서 ──
      { q: '우리는 언제부터 보통이라는 기준을 의식하며 살게 되었을까요?', by: '전시 서문' },
      { q: '내가 조금 이상한 걸까. 이 질문을 마지막으로 떠올린 건 언제였나요?', by: '전시 서문' },
      { q: '이상한 것은 서로 다른 우리일까요, 모두가 같은 속도로 살아야 한다고 믿은 일일까요?', by: '전시 서문' },
      { q: '남들과 다른 길을 걷고 있어도 괜찮다고, 스스로에게 말해준 적이 있나요?', by: '전시 서문' },
      { q: '아직 원하는 모습에 이르지 못했다고 해서, 지금까지의 시간이 의미 없을까요?', by: '전시 서문' },
      { q: '당신은 어떤 사람인가요?', by: 'CHAPTER 02 · WHO ARE YOU?' },
      { q: '나는 사회가 정한 기준에 맞춰 잘 크고 있는 걸까요?', by: '성장측정실' },
      { q: '사람의 성장을 하나의 기준으로 측정할 수 있을까요?', by: '성장측정실' },
      { q: '우리는 여전히 되어가는 중입니다. 당신은 지금 무엇이 되어가고 있나요?', by: 'CHAPTER 03 · STILL BECOMING' },
      { q: '지금의 자신을 너무 서둘러 평가하고 있지는 않나요?', by: '에필로그' },
      { q: '우리는 모두 처음 살아보는 삶을 지나고 있습니다. 당신의 방식은 무엇인가요?', by: '에필로그' },
      { q: '전시를 나설 때 한 문장을 가져갈 수 있다면, 어떤 말이었으면 좋겠나요?', by: '에필로그 · TAKE ME' },

      // ── 작품의 장면에서 ──
      { q: 'DRINK ME라고 적힌 차가 눈앞에 있다면, 한 모금 마셔보시겠어요?' },
      { q: '당신의 이상함을 가지고 티파티 테이블에 앉는다면, 어느 자리에 앉고 싶나요?' },
      { q: '회중시계를 든 토끼가 당신을 재촉한다면, 무엇을 가장 먼저 내려놓겠어요?' },
      { q: '아직 피지 않은 꽃봉오리처럼, 때를 기다리고 있는 것이 당신에게 있나요?' },
      { q: '타인의 발자국으로 내가 얼마나 늦었는지를 재고 있지는 않나요?' },
      { q: '쉬고 있다는 이유만으로 뒤처지고 있다고 느낀 적이 있나요?' },
      { q: '지금 서 있는 자리는 누가 정해준 자리인가요?' },
      { q: '어떤 선택이 후회로 남았더라도, 그 시간이 지금의 나를 만들었다고 생각해 본 적 있나요?' },

      // ── 그 밖에 ──
      { q: '남들은 시시하다고 하는데, 나는 한참을 들여다보게 되는 것이 있나요?' },
      { q: '마지막으로 좀 이상하다는 말을 들은 건 언제였나요. 그때 기분은 어땠나요?' },
      { q: '어릴 때는 아무렇지 않게 했는데, 지금은 하지 않게 된 일이 있나요?' },
      { q: '잘 그리는 것과 나답게 그리는 것, 하나만 고른다면 어느 쪽인가요?' },
      { q: '오늘 하루 중 가장 오래 바라본 것은 무엇이었나요?' },
      { q: '누구에게도 보여주지 않고 혼자 간직하고 있는 것이 있나요?' },
      { q: '지금 눈앞에 있는 것 중 하나를 그린다면, 무엇을 고르시겠어요?' },
      { q: '서툴러서 오히려 좋았던 것이 있나요?' },
      { q: '나를 설명하는 말 중에, 남들은 단점이라 하지만 나는 아끼는 것이 있나요?' },
      { q: '아무것도 답하지 않아도 괜찮습니다. 그냥 한 바퀴 둘러보시겠어요?' }
    ];

    var textEl = document.getElementById('questText');
    var byEl = document.getElementById('questBy');

    // 온점·반점 다음에 띄어쓰기가 오면 그 자리에서 줄을 내린다 (1+1+1=1 같은 건 건드리지 않는다)
    function breakLines(q) {
      return q.replace(/([.,])\s+/g, '$1\n');
    }
    var btn = document.getElementById('questNext');
    if (!textEl || !btn) return;

    /* 이 기기에서 이미 본 질문을 기억해 두고, 아직 안 본 질문을 먼저 보여 준다.
       질문 문장 자체를 열쇠로 쓰므로 목록 순서를 바꾸거나 질문을 추가해도 기록이 어긋나지 않는다.
       전부 다 봤으면 기록을 비우고 처음부터 다시 돈다.
       (사생활 보호 모드 등에서 저장이 막혀 있으면 그냥 매번 새로 섞는다) */
    var SEEN_KEY = 'alo.seenQuestions';
    function loadSeen() {
      try {
        var a = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
        return Array.isArray(a) ? a : [];
      } catch (e) {
        return [];
      }
    }
    function saveSeen(list) {
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(list));
      } catch (e) {}
    }
    var seen = loadSeen();
    var seenSet = {};
    seen.forEach(function (q) {
      seenSet[q] = true;
    });
    function markSeen(q) {
      if (seenSet[q]) return;
      seenSet[q] = true;
      seen.push(q);
      // 지금 목록에 있는 질문을 모두 봤으면 기록을 비운다 (방금 본 질문만 남겨 바로 반복되지 않게)
      var all = true;
      for (var i = 0; i < QUESTIONS.length; i++) {
        if (!seenSet[QUESTIONS[i].q]) {
          all = false;
          break;
        }
      }
      if (all) {
        seen = [q];
        seenSet = {};
        seenSet[q] = true;
      }
      saveSeen(seen);
    }

    function shuffle(a) {
      for (var j = a.length - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        var t = a[j];
        a[j] = a[k];
        a[k] = t;
      }
      return a;
    }

    // 안 본 질문(섞음) → 본 질문(섞음) 순서로 늘어놓고 차례로 넘긴다
    var fresh = [],
      old = [];
    for (var i = 0; i < QUESTIONS.length; i++) (seenSet[QUESTIONS[i].q] ? old : fresh).push(i);
    var order = shuffle(fresh).concat(shuffle(old));
    var cursor = 0;

    /* 링크 끝에 작가 이름(#이재이)이 있으면 그 작가의 질문을 맨 앞에 둔다.
       작가 전용 페이지(/jessie)에서는 그 작가의 질문이 이미 그림 아래에 있으므로, 여기서는 빼고 다른 작가들의 질문만 보여 준다.
       출처에 성을 뺀 이름만 적힌 경우도 있다 (재이 〈…〉, 정연 〈…〉) */
    function artistFirst() {
      var name = sharedArtist();
      if (!name) return false;
      var given = name.slice(1);
      for (var i = 0; i < order.length; i++) {
        var by = QUESTIONS[order[i]].by || '';
        if (by.indexOf(name + ' ') === 0 || (given && by.indexOf(given + ' ') === 0)) {
          var q = order.splice(i, 1)[0];
          if (!(PAGE_ARTIST && name === PAGE_ARTIST)) order.unshift(q);
          cursor = 0;
          return true;
        }
      }
      return false;
    }
    artistFirst();

    /* 가장 긴 질문이 차지하는 높이를 재어 고정한다.
       폭이나 글꼴이 바뀌면 다시 잰다 */
    function lockHeight() {
      var saved = textEl.textContent;
      var root = document.documentElement;
      root.style.removeProperty('--quest-h');
      textEl.style.height = 'auto';

      var max = 0;
      for (var i = 0; i < QUESTIONS.length; i++) {
        textEl.textContent = breakLines(QUESTIONS[i].q);
        if (textEl.scrollHeight > max) max = textEl.scrollHeight;
      }

      textEl.textContent = saved;
      textEl.style.height = '';
      if (max > 0) root.style.setProperty('--quest-h', max + 'px');

      if (byEl) {
        var savedBy = byEl.textContent,
          maxBy = 0;
        root.style.removeProperty('--quest-by-h');
        for (var j = 0; j < QUESTIONS.length; j++) {
          byEl.textContent = QUESTIONS[j].by || '';
          if (byEl.offsetHeight > maxBy) maxBy = byEl.offsetHeight;
        }
        byEl.textContent = savedBy;
        if (maxBy > 0) root.style.setProperty('--quest-by-h', maxBy + 'px');
      }
    }

    function render() {
      var item = QUESTIONS[order[cursor]];
      textEl.textContent = breakLines(item.q);
      markSeen(item.q);
      // 출처가 없어도 자리는 비워 둔다. 지우면 그만큼 카드가 줄어든다
      if (byEl) byEl.textContent = item.by || '';
    }

    var busy = false;
    var parts = byEl ? [textEl, byEl] : [textEl];
    function next() {
      if (busy) return; // 바뀌는 도중에 또 누르면 무시한다 (겹침 방지)
      cursor = (cursor + 1) % order.length;
      if (!ANIM || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        render();
        return;
      }
      busy = true;
      btn.setAttribute('aria-busy', 'true');
      parts.forEach(function (el) {
        el.classList.add('q-out');
      });
      setTimeout(function () {
        render();
        // 아래쪽에서 시작하도록 위치를 옮긴 뒤(전환 없이), 다음 프레임에 떠오르게 한다
        parts.forEach(function (el) {
          el.classList.remove('q-out');
          el.classList.add('q-in');
        });
        void textEl.offsetWidth;
        // 화면에 보이지 않는 탭에서도 멈추지 않도록 requestAnimationFrame 대신 짧은 타이머를 쓴다
        setTimeout(function () {
          parts.forEach(function (el) {
            el.classList.remove('q-in');
          });
        }, 20);
        setTimeout(function () {
          busy = false;
          btn.removeAttribute('aria-busy');
        }, 320);
      }, 210);
    }

    render();
    lockHeight();
    btn.addEventListener('click', next);
    // 열린 페이지에서 #이름만 바꿔도 그 작가의 질문으로 바로 넘어간다
    window.addEventListener('hashchange', function () {
      if (artistFirst()) render();
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(lockHeight).catch(function () {});
    }
    var reflowTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(reflowTimer);
      reflowTimer = setTimeout(lockHeight, 180);
    });
  })();

  /* ── 지금 전시장에는 ──
     ▼ 운영 스케줄. 구글시트의 '스텝 타임테이블' 탭을 그대로 복사해 넣으면 된다.
       (시트에서 범위 선택 → 복사 → 아래 각 줄을 따옴표로 감싸고 쉼표 구분 유지)
       스케줄이 바뀌면 이 부분만 갈아 끼우고 폴더를 다시 올리면 된다.
       ※ 2026-10-14 기준 시트 내용 — 아직 조율 중이므로 확정본으로 교체 필요 */
  (function () {
    var SCHEDULE_CSV = [
      ',기간,,11/12 (목),,,,11/13 (금),,,,11/14 (토),,,,11/15 (일),,,,11/16 (월),,,,11/17 (화),,,',
      ',업무,,입장,브릿지,지하 1층,굿즈(2층),입장,브릿지,지하 1층,굿즈(2층),입장,브릿지,지하 1층,굿즈(2층),입장,브릿지,지하 1층,굿즈(2층),입장,브릿지,지하 1층,굿즈(2층),입장,브릿지,지하 1층,굿즈(2층)',
      ',11:00,,,,,,이서현,김지현,,,이재이,배정연,홍림,노정균,,김지현,,이재이,,김지현,,,,,,',
      ',12:00,,,,,,이서현,김지현,,,이재이,배정연,홍림,노정균,,김지현,,이재이,,김지현,,,,,,',
      ',13:00,,,,,,이서현,김지현,,,이재이,배정연,홍림,이서현,배정연,김지현,,이재이,,김지현,,,,,,',
      ',14:00,,,김지현,,,이서현,,,,이재이,배정연,홍림,이서현,배정연,,이재이,이서현,이서현,노정균,,,노정균,박정은,,이서현',
      ',15:00,,,김지현,,,이서현,,,,이재이,배정연,홍림,이서현,배정연,,이재이,이서현,이서현,노정균,,,노정균,박정은,,이서현',
      ',16:00,,,김지현,,윤혜진,이서현,,,,이재이,,홍림,배정연,배정연,,홍림,이서현,이서현,노정균,박정은,,노정균,박정은,,이서현',
      ',17:00,,,,,윤혜진,이서현,,,,조수연,이재이,,배정연,배정연,,홍림,이서현,이서현,노정균,박정은,,노정균,박정은,,이서현',
      ',18:00,,,,,윤혜진,,,,,조수연,이재이,,배정연,조수연,,홍림,,,노정균,박정은,윤혜진,윤혜진,박정은,,',
      ',19:00,,,박수룡,,,노정균,,,,노정균,이재이,,조수연,조수연,,홍림,,,노정균,박정은,박수룡,배정연,박정은,박수룡,윤혜진',
      ',20:00,,,박수룡,,,노정균,,,,노정균,이재이,,조수연,조수연,,홍림,,,노정균,박정은,박수룡,배정연,박정은,박수룡,윤혜진',
      ',21:00,,,박수룡,,,노정균,,,,노정균,이재이,,조수연,조수연,,홍림,,,노정균,박정은,박수룡,,,,'
    ].join('\n');

    var section = document.getElementById('ondutySection');
    var listEl = document.getElementById('ondutyList');
    var timeEl = document.getElementById('ondutyTime');
    var footEl = document.getElementById('ondutyFoot');
    if (!section || !listEl) return;
    if (IS_VISIT) return; // 예약 페이지에서는 보여 주지 않는다

    // 한국 시간 기준으로 '지금'을 계산한다 — 기기 시계가 다른 곳에 맞춰져 있어도 같은 결과
    function nowKST() {
      var d = new Date();
      var utc = d.getTime() + d.getTimezoneOffset() * 60000;
      return new Date(utc + 9 * 3600000);
    }

    function parseCSV(text) {
      var rows = [];
      text
        .replace(/\r/g, '')
        .split('\n')
        .forEach(function (line) {
          if (!line.trim()) return;
          var cells = [],
            cur = '',
            q = false;
          for (var i = 0; i < line.length; i++) {
            var c = line[i];
            if (c === '"') {
              if (q && line[i + 1] === '"') {
                cur += '"';
                i++;
              } else q = !q;
            } else if (c === ',' && !q) {
              cells.push(cur);
              cur = '';
            } else cur += c;
          }
          cells.push(cur);
          rows.push(
            cells.map(function (s) {
              return s.trim();
            })
          );
        });
      return rows;
    }

    function pad(n) {
      return (n < 10 ? '0' : '') + n;
    }

    (function (text) {
      try {
        var rows = parseCSV(text);
        if (rows.length < 4) return;

        // 교차표를 (월, 일, 시, 구역, 이름) 목록으로 편다.
        // 날짜 행은 병합되어 있어 블록의 첫 칸에만 값이 들어 있다.
        var dateRow = -1;
        for (var r = 0; r < Math.min(rows.length, 20) && dateRow < 0; r++) {
          for (var c = 0; c < rows[r].length; c++) {
            if (/^\d{1,2}\/\d{1,2}/.test(rows[r][c] || '')) {
              dateRow = r;
              break;
            }
          }
        }
        if (dateRow < 0) return;
        var areaRow = dateRow + 1;

        var colDate = [],
          cursor = null;
        for (var c2 = 0; c2 < rows[dateRow].length; c2++) {
          var m = (rows[dateRow][c2] || '').match(/^(\d{1,2})\/(\d{1,2})/);
          if (m) cursor = { mo: +m[1], d: +m[2] };
          colDate[c2] = cursor;
        }

        var schedule = [];
        for (var i = areaRow + 1; i < rows.length; i++) {
          var row = rows[i];
          if (!row) continue;

          var hh = null;
          for (var c3 = 0; c3 < row.length && hh === null; c3++) {
            var hm = (row[c3] || '').match(/^(\d{1,2}):(\d{2})$/);
            if (hm) hh = +hm[1] + +hm[2] / 60;
          }
          if (hh === null) continue;

          for (var c4 = 0; c4 < row.length; c4++) {
            var who = (row[c4] || '').trim();
            if (!who) continue;
            if (/^\d{1,2}:\d{2}$/.test(who)) continue;
            var area = (rows[areaRow][c4] || '').trim();
            var dt = colDate[c4];
            if (!area || !dt) continue;
            schedule.push({ mo: dt.mo, d: dt.d, hour: hh, area: area, name: who });
          }
        }
        if (!schedule.length) return;

        var now = nowKST();
        var curMo = now.getMonth() + 1,
          curD = now.getDate();
        var hour = now.getHours() + now.getMinutes() / 60;

        var onNow = [],
          laterToday = [];
        schedule.forEach(function (x) {
          if (x.mo !== curMo || x.d !== curD) return;
          var entry = { area: x.area, name: x.name, start: x.hour };
          if (hour >= x.hour && hour < x.hour + 1) onNow.push(entry);
          else if (x.hour > hour) laterToday.push(entry);
        });

        if (!onNow.length && !laterToday.length) return; // 오늘 일정이 없으면 숨긴 채로 둔다

        // 같은 사람이 여러 구역에 겹쳐 있으면 한 번만
        var seen = {},
          uniq = [];
        onNow.forEach(function (x) {
          var k = x.name + '|' + x.area;
          if (seen[k]) return;
          seen[k] = 1;
          uniq.push(x);
        });

        listEl.innerHTML = '';
        if (uniq.length) {
          uniq.forEach(function (x) {
            var li = document.createElement('li');
            if (x.area) {
              var tag = document.createElement('span');
              tag.className = 'onduty-area';
              tag.textContent = x.area;
              li.appendChild(tag);
            }
            var nm = document.createElement('span');
            nm.className = 'onduty-name';
            nm.textContent = x.name;
            li.appendChild(nm);
            listEl.appendChild(li);
          });
          if (timeEl) timeEl.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ' 기준';
          if (footEl) footEl.textContent = '전시장을 지키고 있는 작가들입니다. 말을 걸어도 괜찮습니다.';
        } else {
          laterToday.sort(function (a, b) {
            return a.start - b.start;
          });
          var nextH = laterToday[0].start;
          var names = laterToday
            .filter(function (x) {
              return x.start === nextH;
            })
            .map(function (x) {
              return x.name;
            });
          var li2 = document.createElement('li');
          var nm2 = document.createElement('span');
          nm2.className = 'onduty-name';
          nm2.textContent = Math.floor(nextH) + '시부터 ' + names.join(', ');
          li2.appendChild(nm2);
          listEl.appendChild(li2);
          if (timeEl) timeEl.textContent = '오늘';
          if (footEl) footEl.textContent = '아직 교대 전입니다.';
        }

        section.hidden = false;
        section.classList.add('in');
      } catch (e) {
        /* 스케줄 표가 예상과 다르면 섹션은 숨은 채로 둔다 */
      }
    })(SCHEDULE_CSV);
  })();

  /* ── 모션 ── */
  if (ANIM) {
    var frame = document.querySelector('.frame');
    if (frame) {
      frame.addEventListener('animationend', function () {
        frame.classList.add('placed');
      });
    }

    var groups = document.querySelectorAll('.stagger');
    Array.prototype.forEach.call(groups, function (g) {
      Array.prototype.forEach.call(g.children, function (child, i) {
        child.style.setProperty('--i', i * 34 + 'ms');
      });
    });

    var targets = document.querySelectorAll('.reveal, .stagger');
    var show = function (el) {
      el.classList.add('in');
    };

    // 처음부터 화면 안에 있는 것은 기다리지 않고 바로 드러낸다
    Array.prototype.forEach.call(targets, function (t) {
      if (t.getBoundingClientRect().top < window.innerHeight) show(t);
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              show(e.target);
              io.unobserve(e.target);
            }
          });
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
      );
      Array.prototype.forEach.call(targets, function (t) {
        io.observe(t);
      });
    } else {
      Array.prototype.forEach.call(targets, show);
    }

    // 관찰자가 동작하지 않아도 내용은 반드시 드러난다
    setTimeout(function () {
      Array.prototype.forEach.call(targets, show);
    }, 2500);
  }
})();

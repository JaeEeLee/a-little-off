/**
 * 굿즈 장부 사용법 따라하기 (/goods)
 *
 *  - 장부를 처음 연 휴대폰에서 딱 한 번 저절로 뜬다 (끝까지 안 봐도 다시 뜨지 않는다). 맨 아래 '사용법 다시 보기'로 언제든 다시 본다
 *  - 화면의 진짜 버튼을 직접 눌러 보며 익힌다. 따라하는 동안 누른 판매는 어디에도 저장하지 않는다
 *    (goods.js 의 window.goodsTour.start / end 가 판매 버튼을 '보여 주기만' 하게 바꾼다)
 *  - 설명하는 곳만 밝게 뚫어 두고, 나머지는 어둡게 덮어 눌리지 않게 한다
 */
(function () {
  'use strict';

  var DONE_KEY = 'alo.goods.tour';
  function $(id) {
    return document.getElementById(id);
  }
  function q(sel) {
    return document.querySelector(sel);
  }

  /* 단계: 밝힐 곳(target), 설명, 넘어가는 방법(wait: 그곳을 누르면 다음 / 없으면 '다음' 버튼) */
  var STEPS = [
    {
      target: function () {
        return $('items');
      },
      title: '1. 굿즈 담기',
      text: '손님이 고른 굿즈를 눌러요. 두 개면 두 번 누르면 돼요.<br><b>지금 하나 눌러 보세요.</b>',
      wait: '#items .item'
    },
    {
      target: function () {
        return $('cartLines');
      },
      title: '2. 담긴 굿즈',
      text: '아래에 담긴 굿즈가 모여요. <b>+ / −</b>로 개수를 바꾸고, <b>휴지통</b>을 누르면 그 굿즈가 통째로 빠져요.'
    },
    {
      target: function () {
        return $('pays');
      },
      title: '3. 결제 방법',
      text: '손님이 <b>현금</b>으로 냈는지 <b>계좌이체</b>로 냈는지 골라요. 다음 손님도 같은 방법으로 기억해 둬요.<br><b>하나 눌러 보세요.</b>',
      wait: '#pays button',
      skippable: true
    },
    {
      target: function () {
        return $('cartSubmit');
      },
      title: '4. 판매',
      text: '금액을 확인하고 누르면 판매 끝이에요.<br><b>눌러 보세요.</b> 지금은 따라하기라 장부에 남지 않아요.',
      wait: '#cartSubmit'
    },
    {
      target: function () {
        return $('done');
      },
      title: '5. 실수했다면 되돌리기',
      text: '판매하면 5초 동안 이 알림이 떠요. 잘못 눌렀으면 <b>되돌리기</b>, 바로 다음 손님을 받아야 하면 <b>✕</b>로 닫아요.',
      wait: '#doneUndo, #doneClose',
      skippable: true
    },
    {
      target: function () {
        return $('sync');
      },
      title: '6. 저장 상태',
      text: '오른쪽 위에 저장 상태가 보여요. <b>전송 대기</b>나 <b>연결 끊김</b>이 떠도 괜찮아요. 판매는 휴대폰에 먼저 저장했다가 인터넷이 다시 연결되면 알아서 올라가요.'
    },
    {
      target: function () {
        return q('.summary');
      },
      title: '7. 판매 합계',
      text: '오늘 판매금액과 굿즈별 판매 개수가 여기에 보여요. 여러 휴대폰에서 판 것도 함께 모여요.'
    },
    {
      target: function () {
        return $('recent');
      },
      title: '8. 판매 취소',
      text: '한참 뒤에 잘못된 걸 알았다면 판매 기록에서 그 줄의 <b>취소</b>를 눌러요. 실수로 지우지 않게 <b>한 번 더</b> 눌러야 취소돼요.'
    }
  ];

  var INTRO = -1;
  var OUTRO = -2;
  var layer, hole, tip, blockers, step, raf, waitHandler;

  function build() {
    layer = document.createElement('div');
    layer.className = 'tour';
    layer.innerHTML =
      '<div class="tour-block"></div><div class="tour-block"></div><div class="tour-block"></div><div class="tour-block"></div>' +
      '<div class="tour-hole" aria-hidden="true"></div>' +
      '<div class="tour-tip" role="dialog" aria-modal="true" aria-labelledby="tourTitle">' +
      '<p class="tour-count" id="tourCount"></p><h3 id="tourTitle"></h3><p class="tour-text" id="tourText"></p>' +
      '<div class="tour-actions"><button type="button" class="link" id="tourSkip">그만 보기</button>' +
      '<button type="button" class="tour-next" id="tourNext">다음</button></div></div>';
    document.body.appendChild(layer);
    blockers = layer.querySelectorAll('.tour-block');
    hole = layer.querySelector('.tour-hole');
    tip = layer.querySelector('.tour-tip');
    $('tourSkip').addEventListener('click', function () {
      finish(false);
    });
    $('tourNext').addEventListener('click', function () {
      if (step === INTRO) go(0);
      else if (step === OUTRO) close();
      else if (step >= STEPS.length - 1) finish(true);
      else go(step + 1);
    });
  }

  // 처음과 끝은 가운데 카드 하나로
  function card(title, html, next, skip) {
    stopFollow();
    layer.classList.add('center');
    $('tourCount').textContent = '';
    $('tourTitle').textContent = title;
    $('tourText').innerHTML = html;
    $('tourNext').textContent = next;
    $('tourSkip').textContent = skip || '';
    $('tourSkip').hidden = !skip;
    $('tourNext').hidden = false;
    $('tourNext').focus();
  }

  function start() {
    if (!window.goodsTour || $('app').hidden) return;
    if (!layer) build();
    // 저절로 뜨는 건 기기마다 한 번뿐: 띄우는 순간 본 것으로 적어 둔다 (중간에 닫거나 새로 고쳐도 다시 안 뜬다)
    try {
      localStorage.setItem(DONE_KEY, 'done');
    } catch (e) {}
    window.goodsTour.start();
    layer.hidden = false;
    document.body.classList.add('touring');
    step = INTRO;
    card(
      '굿즈 장부 사용법',
      '1분이면 끝나요. 화면의 버튼을 직접 눌러 보며 따라 해 보세요.<br>따라 하는 동안 누른 판매는 <b>장부에 남지 않아요.</b>',
      '시작하기',
      '다음에 볼게요'
    );
  }

  function go(i) {
    step = i;
    var s = STEPS[i];
    var el = s.target();
    if (!el || !el.getClientRects().length) {
      // 보여 줄 곳이 없으면(예: 굿즈가 아직 없음) 건너뛴다
      if (i < STEPS.length - 1) return go(i + 1);
      return finish(true);
    }
    layer.classList.remove('center');
    $('tourCount').textContent = i + 1 + ' / ' + STEPS.length;
    $('tourTitle').textContent = s.title;
    $('tourText').innerHTML = s.text;
    $('tourSkip').textContent = '그만 보기';
    $('tourSkip').hidden = false;
    $('tourNext').textContent = i === STEPS.length - 1 ? '끝' : s.wait && s.skippable ? '건너뛰기' : '다음';
    $('tourNext').hidden = !!s.wait && !s.skippable;
    hole.classList.toggle('pulse', !!s.wait);

    // 화면 밖이면 가운데로 끌어온다 (아래에 고정된 장바구니 · 알림은 그대로)
    var fixed = el.closest('.cart, .done');
    if (!fixed) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    follow();

    if (waitHandler) document.removeEventListener('click', waitHandler, true);
    waitHandler = null;
    if (s.wait) {
      waitHandler = function (e) {
        if (!e.target.closest || !e.target.closest(s.wait)) return;
        document.removeEventListener('click', waitHandler, true);
        waitHandler = null;
        // 장부가 먼저 눌린 결과를 그린 다음에 넘어간다
        setTimeout(function () {
          if (step === i) go(i + 1 < STEPS.length ? i + 1 : i);
        }, 120);
      };
      document.addEventListener('click', waitHandler, true);
    }
  }

  // 밝힐 곳이 움직이거나(스크롤 · 다시 그리기) 커져도 따라간다
  function follow() {
    stopFollow();
    var tick = function () {
      place();
      raf = requestAnimationFrame(tick);
    };
    tick();
  }
  function stopFollow() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function place() {
    var s = STEPS[step];
    var el = s && s.target();
    if (!el) return;
    var r = el.getBoundingClientRect();
    var pad = 6;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var x = Math.max(0, r.left - pad);
    var y = Math.max(0, r.top - pad);
    var w = Math.min(vw, r.right + pad) - x;
    var h = Math.min(vh, r.bottom + pad) - y;
    hole.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px';
    // 밝힌 곳 둘레 네 곳을 막아, 설명하는 곳만 누를 수 있게
    var b = blockers;
    b[0].style.cssText = 'left:0;top:0;width:100%;height:' + y + 'px';
    b[1].style.cssText = 'left:0;top:' + (y + h) + 'px;width:100%;bottom:0';
    b[2].style.cssText = 'left:0;top:' + y + 'px;width:' + x + 'px;height:' + h + 'px';
    b[3].style.cssText = 'left:' + (x + w) + 'px;top:' + y + 'px;right:0;height:' + h + 'px';

    // 말풍선: 밝힌 곳 위가 넓으면 위에, 아니면 아래에
    var th = tip.offsetHeight;
    var above = y > vh - (y + h);
    var top = above ? y - th - 12 : y + h + 12;
    top = Math.max(12, Math.min(top, vh - th - 12));
    tip.style.top = top + 'px';
  }

  // 다 봤거나 그만 보면, 이 휴대폰에서는 다시 저절로 뜨지 않는다
  function finish(showEnd) {
    stopFollow();
    if (waitHandler) document.removeEventListener('click', waitHandler, true);
    waitHandler = null;
    try {
      localStorage.setItem(DONE_KEY, 'done');
    } catch (e) {}
    if (!showEnd) return close();
    step = OUTRO;
    card('이제 판매할 준비 끝!', '사용법은 장부 맨 아래 <b>사용법 다시 보기</b>로 언제든 다시 볼 수 있어요.', '장부로 돌아가기');
  }
  function close() {
    stopFollow();
    if (layer) layer.hidden = true;
    document.body.classList.remove('touring');
    if (window.goodsTour) window.goodsTour.end();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && layer && !layer.hidden) finish(false);
  });

  var again = $('tourAgain');
  if (again) again.addEventListener('click', start);

  // 처음 연 휴대폰이면, 장부가 열리고 굿즈가 그려진 뒤에 한 번 띄운다
  var seen = false;
  try {
    seen = localStorage.getItem(DONE_KEY) === 'done';
  } catch (e) {}
  if (window.__GOODS_TOUR_OFF__) seen = true; // 테스트용
  if (!seen) {
    var check = setInterval(function () {
      if (!$('app').hidden && q('#items .item')) {
        clearInterval(check);
        start();
      }
    }, 400);
  }
})();

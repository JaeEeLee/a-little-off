/* 작가님께 온 편지 (/letters)
 *
 * 이름을 고르면 그 작가에게 온 글 + 모두에게 남긴 글을 편지처럼 본다
 * - 글은 저장소에 두지 않는다. 방명록 Apps Script(Code.gs 에 붙인 docs/apps-script/letters-addon.gs)가 그 작가 글만 내려 준다
 * - 한 번 연 휴대폰은 다음에 바로 열린다 ('이 휴대폰에서 닫기'로 지운다)
 * - 'PDF로 저장하기': 브라우저 인쇄로 편지 종이만 PDF 로 남긴다 (캡처를 먼저 권한다)
 */
(function () {
  'use strict';

  var ENDPOINT =
    'https://script.google.com/macros/s/AKfycbz9oZZXBoCEBRYiXmML2QEUPuuK5gb1a4UqKDBBFDMhnSH3ud0gHYFVxLN8EM4yfnGEXg/exec';
  if ('__LETTERS_ENDPOINT__' in window) ENDPOINT = window.__LETTERS_ENDPOINT__; // 테스트용
  var CLOSING =
    '조금 이상한 우리들을 함께 만들어 주셔서 고맙습니다.\n관람객들이 남긴 마음을 모아 전해 드려요.\n— 조금 이상한 우리들 운영진';

  var ARTISTS = [
    ['노정균', ''],
    ['배정연', '정연'],
    ['엄현서', ''],
    ['이재이', '재이'],
    ['이희지', ''],
    ['윤혜진', ''],
    ['박정은', ''],
    ['최윤지', ''],
    ['최윤아', ''],
    ['임소라', ''],
    ['홍성호', ''],
    ['남다름', ''],
    ['남선주', ''],
    ['박수룡', ''],
    ['이경도', ''],
    ['편해연', ''],
    ['이서현', ''],
    ['조수연', ''],
    ['김지현', ''],
    ['홍림', '']
  ];
  var KEY = 'alo.letters';
  // 앞으로 온 관람객 쪽지가 없는 작가에게는, 운영진이 그 작가에게 쓴 글 한 통을 '운영진' 이름으로 넣는다
  // (관람객인 척하지 않는다. 작가마다 작품 이야기를 담아 겹치지 않게)
  var STAFF_FROM = '조금 이상한 우리들 운영진';
  var STAFF_NOTES = {
    노정균:
      '어린 시절 저마다 품었던 이상한 나라의 꿈을, 이렇게 크고 화사한 화면으로 모아 주셔서 고맙습니다. 그림을 준비하며 보낸 긴 시간에 정말 수고 많으셨어요. 앞으로 펼쳐질 작가님의 이상한 나라들도 기대할게요.',
    배정연:
      '열 살 어린 나에게서 온 편지라는 이야기로, 많은 분들이 "나는 어떤 어른이 되었나" 하고 한 번쯤 멈춰 섰을 거예요. 전시 준비하시느라 정말 고생 많으셨어요. 흔들리면서도 좋아하는 걸 놓지 않는 정연 작가님의 다음 그림을 응원합니다.',
    엄현서:
      '버섯이 된 재은이, 거북이가 된 오빠, 해바라기가 된 작가님까지. 그림 속 이상한 나라가 정말 다정했어요. 전시를 함께 준비해 주셔서 고맙고, 수고 많으셨어요. 언젠가 호박을 맛있게 먹는 날의 그림도 기다릴게요.',
    이재이:
      '체스말을 쥔 앨리스처럼 망설이면서도, 결국 한 획 한 획 직접 골라 그림을 완성해 주셨어요. 전시 사이트까지 챙기느라 누구보다 바쁘셨을 텐데 정말 고생 많으셨습니다. 재이 작가님이 둘 다음 수를 기대할게요.',
    이희지:
      '"나도 이상하고, 당신도 이상합니다." 서로 다른 우리를 한 테이블에 불러 앉혀 주셔서 고맙습니다. 큰 화면을 채우느라 정말 수고 많으셨어요. 그 테이블에 또 어떤 사람들이 앉게 될지 앞으로의 작업도 기대할게요.',
    윤혜진:
      '남의 발자국을 바라보며 미소 짓는 앨리스처럼, 자기 자리를 지키는 마음이 오래 남았어요. 전시를 준비하시느라 정말 고생 많으셨습니다. 작가님만의 속도로 이어질 다음 그림을 응원할게요.',
    박정은:
      '계절마다 건네지는 모자보다, 이제 막 피어나려는 꽃봉오리를 바라보는 앨리스가 참 든든했어요. 전시 준비하시느라 수고 많으셨어요. 작가님의 계절에 피어날 그림들을 기다릴게요.',
    최윤지:
      '하나의 케이크에서 각자의 케이크로, 서로의 촛불을 응원하는 마음이 따뜻하게 전해졌어요. 전시를 함께 만들어 주셔서 고맙고, 정말 수고 많으셨습니다. 작가님만의 길과 속도로 그려 갈 앞날을 응원해요.',
    최윤아:
      '찻잔 속에 몸을 숨긴 모습 덕분에, 북적이는 자리에서 홀로 동떨어진 기분을 아는 많은 분들이 위로받았을 거예요. 전시 준비하시느라 고생 많으셨어요. 정해진 박자에서 살짝 벗어난 작가님만의 리듬을 계속 기대할게요.',
    임소라:
      '"거봐, 별거 없잖아. 그냥 해봐. 너 엄청 용감해." 이 문장을 그림으로 먼저 보여 주셨어요. 새로운 문 앞에서 전시까지 해내느라 정말 수고 많으셨습니다. 굴 속으로 뛰어든 앨리스의 다음 이야기를 응원해요.',
    홍성호:
      '세 개의 찻잔에 담긴, 내 선택을 찾아가는 작은 여정이 섬세한 선으로 오래 남았어요. 전시를 준비하시느라 정말 고생 많으셨어요. 앞으로 채워 갈 찻잔에 작가님다운 것들이 가득 담기길 바랍니다.',
    남다름:
      '토끼굴로 뛰어들던 시절을 지나, 나만의 티 타임을 만들어 가는 서른의 앨리스가 참 반가웠어요. 바쁜 일상 속에 틈을 내어 전시를 준비해 주셔서 고맙고, 수고 많으셨습니다. 작가님이 고른 작은 순간들이 그려 낼 판타지를 기대할게요.',
    남선주:
      '길을 잃을 때마다 나는 누구인가를 묻고, 결국 원하는 방향으로 한 걸음 내딛는 일이 자유라는 이야기가 깊이 남았어요. 전시 준비하시느라 정말 고생 많으셨어요. 오늘도 이상한 나라를 걸으며 그려 갈 작가님의 그림을 응원합니다.',
    박수룡:
      '거대한 기사들 사이로 작은 문을 향해 걸어가는 앨리스의 발걸음이 오래 마음에 남았어요. 전시를 준비하시느라 정말 수고 많으셨습니다. 그 작은 발걸음이 더 큰 울림이 되어 돌아오길 응원할게요.',
    이경도:
      '얼굴 없는 인물과 어두운 정원에 핀 꽃들, 곁을 지키는 강아지까지. 나를 솔직하게 들여다보는 시간이 고요하게 전해졌어요. 전시 준비하시느라 고생 많으셨어요. 작가님이 찾아갈 진짜 나의 모습을 앞으로도 그림으로 만나고 싶어요.',
    편해연:
      '문을 닫고 들어선 나만의 방, 그래도 창밖 세상을 향해 열려 있는 시선이 참 다정했어요. 바쁜 속도 속에서 전시를 준비해 주셔서 고맙고, 수고 많으셨어요. 작가님만의 원더랜드에서 찾아갈 다음 온도를 기대할게요.',
    이서현:
      '오랫동안 멈춰 있던 그림을 다시 시작하며 촛불을 켜신 그 용기가 고스란히 전해졌어요. 전시를 준비하시느라 정말 수고 많으셨습니다. 다시 붙은 불꽃이 앞으로 오래오래 타오르길 응원할게요.',
    조수연:
      '남이 꽂아 준 꽃들 사이에서 진짜 내 모습을 묻는 꽃병이, 많은 분들에게 날카롭고도 따뜻한 질문이 되었을 거예요. 전시 준비하시느라 고생 많으셨어요. 그 질문 끝에 작가님이 찾아갈 모습을 기대합니다.',
    김지현:
      '티파티가 끝난 어질러진 테이블에서 함께 나눈 시간과 대화를 발견하게 해 주셨어요. 긴 화면을 펜으로 채우느라 정말 수고 많으셨습니다. 작가님의 테이블에 앞으로 또 어떤 이야기가 남을지 기대할게요.',
    홍림: '과거와 현재와 미래의 앨리스가 하나의 강물로 이어지는 그림 앞에서, 지금 이 자리도 여정의 한가운데라는 말이 위로가 되었어요. 전시를 준비하시느라 정말 고생 많으셨어요. 작가님의 강이 흘러갈 다음 그림을 응원합니다.'
  };

  var $ = function (id) {
    return document.getElementById(id);
  };
  var chosen = null; // [본명, 표시 이름]
  var data = null;

  function show(which) {
    ['pick', 'letter'].forEach(function (id) {
      $(id).hidden = id !== which;
    });
  }
  function labelOf(a) {
    return a[1] || a[0];
  }
  function save(v) {
    try {
      if (v) localStorage.setItem(KEY, JSON.stringify(v));
      else localStorage.removeItem(KEY);
    } catch (e) {}
  }
  function saved() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  /* 1. 이름 */
  ARTISTS.slice()
    .sort(function (a, b) {
      return labelOf(a).localeCompare(labelOf(b), 'ko');
    })
    .forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = labelOf(a);
      b.addEventListener('click', function () {
        chosen = a;
        open(a, true);
      });
      $('names').appendChild(b);
    });

  function open(a, fromTap) {
    $('state').textContent = '편지를 여는 중…';
    fetch(ENDPOINT + '?type=letters&artist=' + encodeURIComponent(a[0]), {
      cache: 'no-store'
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (r) {
        $('state').textContent = '';
        if (!r || !r.ok) {
          var why =
            {
              closed: '편지함이 닫혔어요. 운영진에게 문의해 주세요.',
              unset: '편지함이 아직 준비되지 않았어요.'
            }[r && r.error] || '편지를 불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.';
          save(null);
          show('pick');
          $('state').textContent = why;
          return;
        }
        save({ artist: a[0] });
        if (!r.notes || !r.notes.length) {
          r.notes = [];
          if (STAFF_NOTES[a[0]]) r.staffNote = { message: STAFF_NOTES[a[0]], sender: STAFF_FROM, at: '' };
        }
        data = r;
        chosen = a;
        render();
        show('letter');
        window.scrollTo(0, 0);
      })
      .catch(function () {
        $('state').textContent = '연결이 안 돼요. 잠시 뒤에 다시 시도해 주세요.';
        if (!fromTap) show('pick');
      });
  }

  /* 3. 편지 */
  function when(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var p = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' }).format(d);
    return p.replace(/\s/g, ' ').replace(/\.$/, '');
  }
  // 쪽지 한 장. staff 가 참이면 운영진 글 (모양을 조금 다르게)
  function card(n, staff) {
    var li = document.createElement('li');
    li.className = 'note-card' + (staff ? ' staff' : '');
    var from = document.createElement('p');
    from.className = 'note-from';
    from.textContent = 'From. ' + (n.sender || '익명');
    var m = document.createElement('p');
    m.className = 'note-msg';
    m.textContent = n.message;
    li.appendChild(from);
    li.appendChild(m);
    var d = when(n.at);
    if (d) {
      var meta = document.createElement('p');
      meta.className = 'note-meta';
      meta.textContent = d;
      li.appendChild(meta);
    }
    return li;
  }
  function render() {
    var label = data.label || labelOf(chosen);
    $('toName').textContent = label;
    var mine = data.notes || [];
    var all = data.all || [];
    $('count').textContent =
      (mine.length ? '받은 글 ' + mine.length + '통' : '운영진이 전하는 글') +
      (all.length ? ' · 모두에게 남긴 글 ' + all.length + '통' : '');
    var ol = $('mine');
    ol.innerHTML = '';
    mine.forEach(function (n) {
      ol.appendChild(card(n));
    });
    if (!mine.length && data.staffNote) ol.appendChild(card(data.staffNote, true));
    $('all').innerHTML = '';
    all.forEach(function (n) {
      $('all').appendChild(card(n));
    });
    $('allWrap').hidden = !all.length;
    $('closing').textContent = CLOSING;
    if (data.until) {
      var u = new Date(data.until);
      $('until').textContent =
        '이 편지함은 ' + (u.getMonth() + 1) + '월 ' + u.getDate() + '일까지 열려 있어요. 그 전에 캡처해 두세요.';
    }
  }

  $('logout').addEventListener('click', function () {
    save(null);
    data = null;
    show('pick');
  });

  /* ── PDF로 저장: 휴대폰 브라우저의 인쇄 → PDF 저장을 쓴다 (편지 종이만 찍히게 letters.css 의 @media print) ── */
  var ua = navigator.userAgent || '';
  var IOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document);
  $('pdfTip').textContent = IOS
    ? '아이폰: 뜨는 화면에서 공유(⬆) → 프린트 → 오른쪽 위 공유(⬆) → "파일에 저장"'
    : /Android/.test(ua)
      ? '안드로이드: 뜨는 화면 위쪽 프린터를 "PDF로 저장"으로 고른 뒤 저장(⬇)'
      : '인쇄 창에서 대상(프린터)을 "PDF로 저장"으로 고른 뒤 저장';
  $('savePdf').addEventListener('click', function () {
    if (!data) return;
    var old = document.title;
    // 저장될 파일 이름 (브라우저가 제목을 파일 이름으로 쓴다)
    document.title = '조금이상한우리들_' + (data.label || labelOf(chosen)) + '_편지';
    window.print();
    setTimeout(function () {
      document.title = old;
    }, 1000);
  });

  /* 시작: 한 번 연 휴대폰이면 바로 연다 */
  var s = saved();
  var a0 =
    s &&
    ARTISTS.filter(function (a) {
      return a[0] === s.artist;
    })[0];
  if (a0) {
    chosen = a0;
    show('');
    open(a0, false);
  } else show('pick');
})();

/* 도슨트에서 작가에게 한마디 (/docent)
   - 작가 작품을 듣는 중이면 플레이어에 '✉ 한마디' 버튼이 뜨고, 누르면 그 작가에게 남긴다
   - 목록 맨 아래 버튼은 참여 작가 모두에게
   - 메인 페이지 '작가에게 한마디'와 같은 시트 · 같은 형식({artist, message, sender, at})으로 보낸다 */
(function () {
  var ENDPOINT =
    'https://script.google.com/macros/s/AKfycbz9oZZXBoCEBRYiXmML2QEUPuuK5gb1a4UqKDBBFDMhnSH3ud0gHYFVxLN8EM4yfnGEXg/exec';
  if ('__NOTE_ENDPOINT__' in window) ENDPOINT = window.__NOTE_ENDPOINT__; // 테스트용
  var BOARD_ARTISTS = { 이재이: true }; // 쪽지가 작가 페이지 게시판에 공개로 붙는 작가 (site.js 와 같게)
  var MAX = 300;
  var COOLDOWN = 20000;
  var SENT_KEY = 'alo.docent.noteSent';

  var $ = function (id) {
    return document.getElementById(id);
  };
  var sheet = $('noteSheet');
  if (!sheet) return;
  var btn = $('noteBtn');
  var current = null; // 지금 듣는 작가 { name, label }
  var target = { name: '전체', label: '' };

  // 메인 페이지와 같은 걸름 (서버에서도 한 번 더 거른다)
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
  function screen(t) {
    for (var i = 0; i < BLOCKED.length; i++) if (BLOCKED[i].re.test(t)) return BLOCKED[i].msg;
    return '';
  }
  function lastSent() {
    try {
      return Number(localStorage.getItem(SENT_KEY)) || 0;
    } catch (e) {
      return 0;
    }
  }
  function markSent() {
    try {
      localStorage.setItem(SENT_KEY, String(Date.now()));
    } catch (e) {}
  }

  function follow(t) {
    t = t || {};
    current = t.name ? { name: t.name, label: t.label || t.name } : null;
    btn.hidden = !current;
    if (current) btn.setAttribute('aria-label', current.label + ' 작가에게 한마디 남기기');
  }
  window.addEventListener('docent-track', function (e) {
    follow(e.detail);
  });
  if (window.docentNow) follow(window.docentNow);

  function open(to) {
    target = to;
    var all = to.name === '전체';
    $('noteTitle').textContent = all ? '참여 작가 모두에게 한마디' : to.label + ' 작가에게 한마디';
    $('notePrivacy').textContent = BOARD_ARTISTS[to.name]
      ? to.label + ' 작가에게 남긴 쪽지는 ' + to.label + ' 작가 페이지의 쪽지 게시판에 붙어요.'
      : '쪽지는 작가에게만 전해져요.';
    $('noteDone').hidden = true;
    $('noteForm').hidden = false;
    $('noteStatus').textContent = '';
    sheet.hidden = false;
    document.documentElement.classList.add('note-open');
    setTimeout(function () {
      $('noteMsg').focus();
    }, 50);
  }
  function close() {
    sheet.hidden = true;
    document.documentElement.classList.remove('note-open');
  }

  btn.addEventListener('click', function () {
    if (current) open(current);
  });
  $('noteAll').addEventListener('click', function () {
    open({ name: '전체', label: '' });
  });
  $('noteClose').addEventListener('click', close);
  $('noteDoneClose').addEventListener('click', close);
  sheet.addEventListener('click', function (e) {
    if (e.target === sheet) close(); // 바깥 어두운 곳을 누르면 닫힌다
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !sheet.hidden) close();
  });
  $('noteMsg').addEventListener('input', function () {
    $('noteCount').textContent = $('noteMsg').value.length + ' / ' + MAX;
  });

  $('noteForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var status = $('noteStatus');
    var done = function () {
      markSent();
      $('noteForm').reset();
      $('noteCount').textContent = '0 / ' + MAX;
      $('noteForm').hidden = true;
      $('noteDoneSub').textContent =
        target.name === '전체'
          ? '참여 작가 모두에게 전할게요.'
          : BOARD_ARTISTS[target.name]
            ? target.label + ' 작가 페이지 게시판에 붙었어요.'
            : target.label + ' 작가에게 전할게요.';
      $('noteDone').hidden = false;
    };
    if ($('noteTrap').value) return done(); // 자동 프로그램은 조용히 흘려보낸다
    var message = $('noteMsg').value.trim();
    var sender = $('noteFrom').value.trim();
    if (!message) {
      status.textContent = '남기고 싶은 말을 적어 주세요.';
      return $('noteMsg').focus();
    }
    var blocked = screen(message) || screen(sender);
    if (blocked) {
      status.textContent = blocked;
      return;
    }
    if (Date.now() - lastSent() < COOLDOWN) {
      status.textContent = '방금 하나를 보냈습니다. 잠시 뒤에 다시 시도해 주세요.';
      return;
    }
    var send = $('noteSend');
    send.disabled = true;
    send.textContent = '전하는 중…';
    var body = JSON.stringify({ artist: target.name, message: message, sender: sender, at: new Date().toISOString() });
    var post = function (mode) {
      return fetch(ENDPOINT, {
        method: 'POST',
        mode: mode,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: body
      });
    };
    post('cors')
      .catch(function () {
        return post('no-cors'); // 응답을 못 읽어도 전달은 되는 경우가 많다. 한 번 더
      })
      .then(done)
      .catch(function () {
        status.textContent = '전하지 못했어요. 신호를 확인하고 다시 눌러 주세요.';
      })
      .then(function () {
        send.disabled = false;
        send.textContent = '전하기';
      });
  });
})();

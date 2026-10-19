/* 도슨트 점검 페이지 (/docent/debug). 상태는 /docent/__status, 순서표는 docent-tracks.js */
(function () {
  var $ = function (id) {
    return document.getElementById(id);
  };

  function badge(text, kind) {
    return '<span class="badge ' + kind + '">' + text + '</span>';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function loadStatus(extra) {
    return fetch('/docent/__status' + (extra || ''), { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) {
        return r.json();
      })
      .then(function (s) {
        var gateKind = /^open/.test(s.gate) ? 'ok' : /^need_qr/.test(s.gate) ? 'warn' : 'bad';
        var p = s.pass;
        var rows = [
          ['한국 시간', esc(s.nowKst)],
          ['/docent 결과', badge(esc(s.gate), gateKind)],
          ['DOCENT_KEY', badge(esc(s.settings.DOCENT_KEY), s.settings.DOCENT_KEY === '설정됨' ? 'ok' : 'bad')],
          ['DOCENT_SECRET', badge(esc(s.settings.DOCENT_SECRET), s.settings.DOCENT_SECRET === '설정됨' ? 'ok' : 'bad')],
          [
            '리허설 모드',
            badge(
              esc(s.settings.DOCENT_ALWAYS_OPEN),
              /^true/.test(s.settings.DOCENT_ALWAYS_OPEN)
                ? 'warn'
                : /무시됨/.test(s.settings.DOCENT_ALWAYS_OPEN)
                  ? 'warn'
                  : 'ok'
            )
          ],
          [
            '지금 운영 시간',
            s.hours.openNow
              ? badge('운영 중', 'ok')
              : badge('운영 시간 아님', 'warn') +
                (s.hours.today ? ' 오늘 ' + s.hours.today.join('–') : ' 오늘은 전시일 아님')
          ],
          [
            '입장권',
            badge(p.valid ? '유효' : p.present ? '무효' : '없음', p.valid ? 'ok' : 'warn') +
              ' ' +
              esc(p.reason) +
              (p.valid ? '<br>' + esc(p.expiresKst) + '까지 · ' + p.remainingMin + '분 남음' : '')
          ]
        ];
        $('statusList').innerHTML = rows
          .map(function (r) {
            return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>';
          })
          .join('');
        $('raw').textContent = JSON.stringify(s, null, 2);
        $('fileNote').textContent = p.valid
          ? '입장권이 있어서 실제 파일을 확인했습니다.'
          : '입장권이 없어 파일 요청이 잠금에 막힙니다. 위 2번에서 QR로 들어간 뒤 다시 확인하세요.';
        return s;
      })
      .catch(function (e) {
        $('statusList').innerHTML =
          '<dt>오류</dt><dd>' + badge('상태를 불러오지 못함', 'bad') + ' ' + esc(e.message) + '</dd>';
      });
  }

  // ── 음성 파일 확인: 실제로 받아서 오디오인지, 길이가 얼마인지 본다
  var queue = [];
  CHAPTERS.forEach(function (ch) {
    ch.tracks.forEach(function (t) {
      queue.push({ label: t.label || t.name, name: t.name, file: (t.file || t.name) + '.mp3', no: t.no });
    });
  });
  queue.forEach(function (t) {
    if (t.name) $('who').appendChild(new Option(t.label, t.name));
  });

  function checkFiles() {
    $('files').innerHTML = queue
      .map(function (t, i) {
        return (
          '<tr><td class="num">' +
          (t.no ? ('0' + t.no).slice(-2) : '·') +
          '</td><td>' +
          esc(t.label) +
          '</td><td>' +
          esc(t.file) +
          '</td><td id="st' +
          i +
          '">확인 중…</td><td class="num" id="du' +
          i +
          '"></td></tr>'
        );
      })
      .join('');
    queue.forEach(function (t, i) {
      var url = AUDIO_DIR + encodeURIComponent(t.file.replace(/\.mp3$/, '')) + '.mp3';
      fetch(url, { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' })
        .then(function (r) {
          var type = r.headers.get('Content-Type') || '';
          var st = $('st' + i);
          if (r.status === 403 || r.status === 503) {
            st.innerHTML = badge('잠김 ' + r.status, 'warn');
            return;
          }
          if (!/^audio\//.test(type) && !/mpeg|mp4/.test(type)) {
            st.innerHTML = badge('파일 없음', 'bad');
            return;
          }
          st.innerHTML = badge('있음', 'ok') + ' <span style="color:var(--soft)">' + esc(type) + '</span>';
          var a = new Audio();
          a.preload = 'metadata';
          a.onloadedmetadata = function () {
            var s = Math.round(a.duration);
            $('du' + i).textContent = Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
          };
          a.onerror = function () {
            $('du' + i).innerHTML = badge('재생 불가', 'bad');
          };
          a.src = url;
        })
        .catch(function () {
          $('st' + i).innerHTML = badge('요청 실패', 'bad');
        });
    });
  }

  $('refresh').addEventListener('click', function () {
    loadStatus();
  });
  $('toggleRaw').addEventListener('click', function () {
    $('raw').hidden = !$('raw').hidden;
  });
  $('checkFiles').addEventListener('click', checkFiles);

  $('enter').addEventListener('click', function () {
    var k = $('key').value.trim();
    if (!k) {
      $('key').focus();
      return;
    }
    var who = $('who').value;
    location.href = '/docent/?k=' + encodeURIComponent(k) + (who ? '#' + encodeURIComponent(who) : '');
  });
  $('who').addEventListener('change', function () {
    $('open').href = '/docent/' + ($('who').value ? '#' + encodeURIComponent($('who').value) : '');
  });
  $('logout').addEventListener('click', function () {
    loadStatus('?logout=1').then(function () {
      loadStatus();
      checkFiles();
    });
  });

  $('checkAt').addEventListener('click', function () {
    var v = $('at').value;
    fetch('/docent/__status?at=' + encodeURIComponent(v), { cache: 'no-store' })
      .then(function (r) {
        return r.json();
      })
      .then(function (s) {
        var c = s.checkAt || {};
        $('atResult').innerHTML = c.error
          ? badge(c.error, 'bad')
          : c.at + ' → ' + (c.open ? badge('열림', 'ok') : badge('닫힘', 'warn'));
      });
  });

  loadStatus().then(checkFiles);
})();

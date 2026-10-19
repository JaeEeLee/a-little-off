/* 도슨트 플레이어 (/docent). 순서표 CHAPTERS · AUDIO_DIR 는 docent-tracks.js 에 있다 */
(function () {
  var audio = document.getElementById('audio');
  var list = document.getElementById('list');
  var $ = function (id) {
    return document.getElementById(id);
  };
  var nowLabel = $('nowLabel'),
    nowName = $('nowName'),
    hint = $('hint');
  var bar = $('bar'),
    cur = $('cur'),
    dur = $('dur');
  var toggle = $('toggle'),
    iconPlay = $('iconPlay'),
    iconPause = $('iconPause');
  var speedBtn = $('speed');

  // 챕터를 펼쳐 한 줄로 이어 듣는 순서를 만든다
  var queue = [];
  CHAPTERS.forEach(function (ch) {
    ch.tracks.forEach(function (t) {
      t.chapter = ch;
      t.label = t.label || t.name;
      t.src = AUDIO_DIR + encodeURIComponent(t.file || t.name) + '.mp3';
      queue.push(t);
    });
  });

  var index = -1;
  var continuous = true; // 한 작품이 끝나면 다음 작품으로 이어 간다

  function fmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    s = Math.floor(s);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  /* ── 목록 그리기 ── */
  var n = 0;
  CHAPTERS.forEach(function (ch) {
    var sec = document.createElement('section');
    sec.className = 'chapter';
    sec.innerHTML =
      '<div class="chapter-head"><span class="chapter-no"></span><h2 class="chapter-title"></h2><p class="chapter-sub"></p></div><ul class="tracks"></ul>';
    sec.querySelector('.chapter-no').textContent = ch.no;
    sec.querySelector('.chapter-title').textContent = ch.title;
    sec.querySelector('.chapter-sub').textContent = ch.sub || '';
    var ul = sec.querySelector('.tracks');
    ch.tracks.forEach(function (t) {
      var i = n++;
      var desc = t.work ? '〈' + t.work + '〉' : t.sub || '';
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'track';
      b.innerHTML =
        '<span class="track-no"><span class="num"></span><span class="bars" aria-hidden="true"><i></i><i></i><i></i></span></span>' +
        '<span><span class="track-name"></span><span class="track-work"></span></span>' +
        '<span class="track-time"></span>';
      b.querySelector('.num').textContent = t.no ? ('0' + t.no).slice(-2) : '·';
      b.querySelector('.track-name').textContent = t.label;
      b.querySelector('.track-work').textContent = desc;
      if (!t.no) b.classList.add('is-extra');
      b.setAttribute('aria-label', t.label + (t.work ? ', ' + t.work : '') + ' 듣기');
      b.addEventListener('click', function () {
        load(i, true);
      });
      t.el = b;
      li.appendChild(b);
      ul.appendChild(li);

      // 길이를 미리 읽어 목록에 적는다. 파일이 아직 없으면 '준비 중'
      var probe = new Audio();
      probe.preload = 'metadata';
      probe.addEventListener('loadedmetadata', function () {
        b.querySelector('.track-time').textContent = fmt(probe.duration);
      });
      probe.addEventListener('error', function () {
        t.missing = true;
        b.classList.add('is-missing');
        b.querySelector('.track-time').textContent = '준비 중';
      });
      probe.src = t.src;
    });
    list.appendChild(sec);
  });

  /* ── 재생 ── */
  function setPlaying(on) {
    // svg 요소에는 .hidden 속성이 없어서 속성을 직접 붙였다 뗀다
    iconPlay.toggleAttribute('hidden', on);
    iconPause.toggleAttribute('hidden', !on);
    toggle.setAttribute('aria-label', on ? '일시정지' : '재생');
    queue.forEach(function (t) {
      t.el.classList.toggle('is-paused', !on);
    });
  }

  function mark() {
    queue.forEach(function (t, i) {
      t.el.classList.toggle('is-current', i === index);
    });
    var t = queue[index];
    nowLabel.textContent = t.chapter.no + ' · ' + t.chapter.title;
    nowName.textContent = t.label + (t.work ? ' 〈' + t.work + '〉' : '');
    $('prev').disabled = index <= 0;
    $('next').disabled = index >= queue.length - 1;
    document.title = t.label + ' · 조금 이상한 우리들';

    // 잠금 화면·이어폰 버튼에서도 제목이 보이고 조작되도록
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.label + (t.work ? ' 〈' + t.work + '〉' : ''),
        artist: '조금 이상한 우리들 · 도슨트',
        album: t.chapter.no + ' ' + t.chapter.title,
        artwork: [{ src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
      });
    }
  }

  function load(i, play) {
    if (i < 0 || i >= queue.length) return;
    index = i;
    hint.textContent = '';
    audio.src = queue[i].src;
    mark();
    queue[i].el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (play) start();
  }

  function start() {
    var p = audio.play();
    if (p && p.catch)
      p.catch(function (err) {
        // 브라우저는 사용자가 한 번 누르기 전에는 소리 재생을 막는다
        if (err && err.name === 'NotAllowedError') {
          hint.textContent = '▶ 재생 버튼을 눌러 시작해 주세요';
        }
      });
  }

  function nextPlayable(from, step) {
    for (var i = from + step; i >= 0 && i < queue.length; i += step) {
      if (!queue[i].missing) return i;
    }
    return -1;
  }

  // 다음 곡으로 넘어갈 때 'pause'가 'play'보다 늦게 올 수 있어서, 이벤트 종류 대신 실제 상태를 본다
  function sync() {
    setPlaying(!audio.paused);
    if (!audio.paused) hint.textContent = '';
  }
  ['play', 'playing', 'pause'].forEach(function (ev) {
    audio.addEventListener(ev, sync);
  });
  audio.addEventListener('loadedmetadata', function () {
    bar.max = audio.duration || 0;
    dur.textContent = fmt(audio.duration);
  });
  audio.addEventListener('timeupdate', function () {
    if (!bar.matches(':active')) bar.value = audio.currentTime;
    cur.textContent = fmt(audio.currentTime);
  });
  audio.addEventListener('ended', function () {
    setPlaying(false);
    if (!continuous) return;
    var i = nextPlayable(index, 1);
    if (i !== -1) load(i, true);
    else hint.textContent = '도슨트가 모두 끝났어요. 함께해 주셔서 고맙습니다.';
  });
  audio.addEventListener('error', function () {
    if (index < 0) return;
    queue[index].missing = true;
    queue[index].el.classList.add('is-missing');
    hint.textContent = '이 작품의 도슨트는 아직 준비 중이에요.';
    setPlaying(false);
  });

  bar.addEventListener('input', function () {
    audio.currentTime = +bar.value;
  });

  toggle.addEventListener('click', function () {
    if (index < 0) {
      load(Math.max(nextPlayable(-1, 1), 0), true);
      return;
    }
    if (audio.paused) start();
    else audio.pause();
  });
  $('prev').addEventListener('click', function () {
    load(index - 1, true);
  });
  $('next').addEventListener('click', function () {
    load(index + 1, true);
  });
  $('playAll').addEventListener('click', function () {
    continuous = true;
    load(Math.max(nextPlayable(-1, 1), 0), true);
  });

  var SPEEDS = [1, 1.25, 1.5, 0.75];
  var sp = 0;
  speedBtn.addEventListener('click', function () {
    sp = (sp + 1) % SPEEDS.length;
    audio.playbackRate = SPEEDS[sp];
    speedBtn.textContent = SPEEDS[sp] + '×';
  });

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', start);
    navigator.mediaSession.setActionHandler('pause', function () {
      audio.pause();
    });
    navigator.mediaSession.setActionHandler('previoustrack', function () {
      load(index - 1, true);
    });
    navigator.mediaSession.setActionHandler('nexttrack', function () {
      load(index + 1, true);
    });
  }

  /* ── #작가이름 으로 들어오면 그 작가의 도슨트부터 ── */
  function fromHash() {
    var name = '';
    try {
      name = decodeURIComponent(location.hash.slice(1)).trim();
    } catch (e) {}
    if (!name) return;
    for (var i = 0; i < queue.length; i++) {
      // 본명(#이재이)으로도, 작가명(#재이)으로도 찾는다. 현장 QR에는 본명이 들어 있다
      if (queue[i].name && (queue[i].name === name || queue[i].label === name)) {
        load(i, true);
        return;
      }
    }
  }
  fromHash();
  window.addEventListener('hashchange', fromHash);
})();

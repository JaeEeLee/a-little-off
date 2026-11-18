/* 작가님께 온 편지 (/letters)
 *
 * 1. 이름을 고른다  2. 운영진에게 받은 열쇠(6자리)를 넣는다  3. 그 작가에게 온 글 + 모두에게 남긴 글을 편지처럼 본다
 * - 글은 저장소에 두지 않는다. Apps Script(docs/apps-script/goods.gs 의 readLetters)가 열쇠를 확인한 뒤 그 작가 글만 내려 준다
 * - 한 번 연 휴대폰은 다음에 바로 열린다 ('이 휴대폰에서 닫기'로 지운다)
 * - '이미지로 저장하기': 편지를 몇 장의 이미지로 나눠 만들어 사진첩에 저장하거나 공유한다
 */
(function () {
  'use strict';

  var ENDPOINT =
    'https://script.google.com/macros/s/AKfycbzj5BtE_6bPV7ZN26QfzlRUNrIlCU3K7v6ZprFwpvweLlVhILfYnwCj6d1cjej7JTJhGg/exec';
  if ('__LETTERS_ENDPOINT__' in window) ENDPOINT = window.__LETTERS_ENDPOINT__; // 테스트용
  var H2C = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  var PER_IMAGE = 8; // 이미지 한 장에 담을 글 수
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

  var $ = function (id) {
    return document.getElementById(id);
  };
  var chosen = null; // [본명, 표시 이름]
  var data = null;

  function show(which) {
    ['pick', 'key', 'letter'].forEach(function (id) {
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
        $('keyName').textContent = labelOf(a);
        $('keyMsg').textContent = '';
        $('code').value = '';
        show('key');
        $('code').focus();
      });
      $('names').appendChild(b);
    });

  /* 2. 열쇠 */
  $('keyBack').addEventListener('click', function () {
    show('pick');
  });
  $('key').addEventListener('submit', function (e) {
    e.preventDefault();
    var code = $('code').value.trim().toUpperCase();
    if (code.length < 6) {
      $('keyMsg').textContent = '열쇠 6자리를 모두 넣어 주세요.';
      return;
    }
    open(chosen, code, true);
  });

  function open(a, code, fromForm) {
    var btn = $('keyOpen');
    btn.disabled = true;
    btn.textContent = '여는 중…';
    $('state').textContent = fromForm ? '' : '편지를 여는 중…';
    fetch(ENDPOINT + '?type=letters&artist=' + encodeURIComponent(a[0]) + '&code=' + encodeURIComponent(code), {
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
              code: '열쇠가 맞지 않아요. 운영진에게 받은 열쇠를 다시 확인해 주세요.',
              closed: '편지함이 닫혔어요. 운영진에게 문의해 주세요.',
              unset: '편지함이 아직 준비되지 않았어요.'
            }[r && r.error] || '편지를 불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.';
          if (!fromForm) {
            save(null);
            show('pick');
            $('state').textContent = why;
          } else $('keyMsg').textContent = why;
          return;
        }
        save({ artist: a[0], code: code });
        data = r;
        chosen = a;
        render();
        show('letter');
        window.scrollTo(0, 0);
      })
      .catch(function () {
        var why = '연결이 안 돼요. 잠시 뒤에 다시 시도해 주세요.';
        if (fromForm) $('keyMsg').textContent = why;
        else $('state').textContent = why;
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = '편지 열기';
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
  function card(n) {
    var li = document.createElement('li');
    li.className = 'note-card';
    var m = document.createElement('p');
    m.className = 'note-msg';
    m.textContent = n.message;
    var meta = document.createElement('p');
    meta.className = 'note-meta';
    meta.textContent = [n.sender ? 'From. ' + n.sender : '', when(n.at)].filter(Boolean).join(' · ');
    li.appendChild(m);
    li.appendChild(meta);
    return li;
  }
  function render() {
    var label = data.label || labelOf(chosen);
    $('toName').textContent = label;
    var mine = data.notes || [];
    var all = data.all || [];
    $('count').textContent =
      '받은 글 ' + mine.length + '통' + (all.length ? ' · 모두에게 남긴 글 ' + all.length + '통' : '');
    var ol = $('mine');
    ol.innerHTML = '';
    if (!mine.length) {
      var p = document.createElement('p');
      p.className = 'empty';
      p.textContent = '작가님 앞으로 남겨진 글은 아직 없어요. 아래 모두에게 남긴 글을 읽어 주세요.';
      ol.appendChild(p);
    } else
      mine.forEach(function (n) {
        ol.appendChild(card(n));
      });
    $('all').innerHTML = '';
    all.forEach(function (n) {
      $('all').appendChild(card(n));
    });
    $('allWrap').hidden = !all.length;
    $('closing').textContent = CLOSING;
    if (data.until) {
      var u = new Date(data.until);
      $('until').textContent =
        '이 편지함은 ' +
        (u.getMonth() + 1) +
        '월 ' +
        u.getDate() +
        '일까지 열려 있어요. 그 전에 이미지로 저장해 두세요.';
    }
  }

  $('logout').addEventListener('click', function () {
    save(null);
    data = null;
    show('pick');
  });

  /* 이미지로 저장: 글을 PER_IMAGE 개씩 나눠 한 장씩 그린다 */
  function loadH2C() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = H2C;
      s.onload = function () {
        resolve(window.html2canvas);
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  function pages() {
    var label = data.label || labelOf(chosen);
    var items = (data.notes || [])
      .map(function (n) {
        return { n: n, all: false };
      })
      .concat(
        (data.all || []).map(function (n) {
          return { n: n, all: true };
        })
      );
    var out = [];
    for (var i = 0; i < Math.max(items.length, 1); i += PER_IMAGE) out.push(items.slice(i, i + PER_IMAGE));
    return out.map(function (chunk, idx) {
      var sheet = document.createElement('div');
      sheet.className = 'sheet';
      var head = document.createElement('div');
      head.className = 'sheet-head';
      head.innerHTML = '<p class="to"><b></b> 작가님께</p><p class="count"></p>';
      head.querySelector('b').textContent = label;
      head.querySelector('.count').textContent = '조금 이상한 우리들 · 2026. 11. 12 – 17';
      sheet.appendChild(head);
      var lastAll = null;
      var ol = null;
      chunk.forEach(function (it) {
        if (it.all !== lastAll) {
          if (it.all) {
            var h = document.createElement('h2');
            h.className = 'sub';
            h.textContent = '참여 작가 모두에게 남긴 글';
            sheet.appendChild(h);
          }
          ol = document.createElement('ol');
          ol.className = 'notes';
          sheet.appendChild(ol);
          lastAll = it.all;
        }
        ol.appendChild(card(it.n));
      });
      if (idx === out.length - 1) {
        var c = document.createElement('p');
        c.className = 'closing';
        c.textContent = CLOSING;
        sheet.appendChild(c);
      }
      if (out.length > 1) {
        var no = document.createElement('p');
        no.className = 'page-no';
        no.textContent = idx + 1 + ' / ' + out.length;
        sheet.appendChild(no);
      }
      return sheet;
    });
  }
  $('saveImg').addEventListener('click', function () {
    if (!data) return;
    var btn = $('saveImg');
    var msg = $('saveMsg');
    btn.disabled = true;
    msg.textContent = '이미지를 만드는 중…';
    var box = document.createElement('div');
    box.className = 'export';
    document.body.appendChild(box);
    var label = data.label || labelOf(chosen);
    loadH2C()
      .then(function (h2c) {
        var sheets = pages();
        var files = [];
        var chain = (document.fonts && document.fonts.ready) || Promise.resolve();
        sheets.forEach(function (sh, i) {
          chain = chain.then(function () {
            box.innerHTML = '';
            box.appendChild(sh);
            return h2c(sh, { scale: 2, backgroundColor: '#fffdf8', useCORS: true, logging: false }).then(function (cv) {
              return new Promise(function (res) {
                cv.toBlob(function (blob) {
                  var name = '조금이상한우리들_' + label + '_편지' + (sheets.length > 1 ? '_' + (i + 1) : '') + '.png';
                  files.push(new File([blob], name, { type: 'image/png' }));
                  res();
                }, 'image/png');
              });
            });
          });
        });
        return chain.then(function () {
          return files;
        });
      })
      .then(function (files) {
        // 휴대폰: 공유 창 → '이미지 저장'으로 사진첩에. 안 되면 하나씩 내려받기
        if (navigator.canShare && navigator.canShare({ files: files })) {
          msg.textContent = '공유 창에서 "이미지 저장"을 눌러 주세요.';
          return navigator
            .share({ files: files, title: '조금 이상한 우리들 · 작가님께 온 편지' })
            .catch(function () {});
        }
        files.forEach(function (f) {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(f);
          a.download = f.name;
          document.body.appendChild(a);
          a.click();
          setTimeout(function () {
            a.remove(); // 바로 지우면 브라우저가 파일 이름을 놓칠 수 있다
          }, 1000);
        });
        msg.textContent = '이미지 ' + files.length + '장을 내려받았어요.';
      })
      .catch(function () {
        msg.textContent = '이미지를 만들지 못했어요. 화면을 캡처해 주세요.';
      })
      .then(function () {
        box.remove();
        btn.disabled = false;
      });
  });

  /* 시작: 한 번 연 휴대폰이면 바로 연다 */
  var s = saved();
  var a0 =
    s &&
    ARTISTS.filter(function (a) {
      return a[0] === s.artist;
    })[0];
  if (a0 && s.code) {
    chosen = a0;
    show('');
    open(a0, s.code, false);
  } else show('pick');
})();

/* 작가님께 온 편지 (/letters)
 *
 * 이름을 고르면 그 작가에게 온 글 + 모두에게 남긴 글을 편지처럼 본다
 * - 글은 저장소에 두지 않는다. 방명록 Apps Script(Code.gs 에 붙인 docs/apps-script/letters-addon.gs)가 그 작가 글만 내려 준다
 * - 한 번 연 휴대폰은 다음에 바로 열린다 ('이 휴대폰에서 닫기'로 지운다)
 * - '이미지로 저장하기': 편지를 몇 장의 이미지로 나눠 만들어 사진첩에 저장하거나 공유한다
 */
(function () {
  'use strict';

  var ENDPOINT =
    'https://script.google.com/macros/s/AKfycbz9oZZXBoCEBRYiXmML2QEUPuuK5gb1a4UqKDBBFDMhnSH3ud0gHYFVxLN8EM4yfnGEXg/exec';
  if ('__LETTERS_ENDPOINT__' in window) ENDPOINT = window.__LETTERS_ENDPOINT__; // 테스트용
  var H2C = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  var PER_IMAGE = 6; // 이미지 한 장에 담을 글 수
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
  // 앞으로 온 쪽지가 하나도 없는 작가에게는 이 쪽지 한 통이 익명으로 들어간다 (운영진이 남기는 글)
  var FALLBACK_NOTE = {
    message:
      '작품 앞에 한참을 머물다 갑니다. 전시를 준비하며 쏟은 시간과 마음이 그림 곳곳에서 느껴졌어요.\n정말 수고 많으셨어요. 앞으로 그려 갈 그림들도 계속 기대하고 응원할게요!',
    sender: '',
    at: ''
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
        if (!r.notes || !r.notes.length) r.notes = [FALLBACK_NOTE];
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
  // 쪽지 한 장. forImage 가 참이면 이미지용(저장 버튼 없음)
  function card(n, forImage) {
    var li = document.createElement('li');
    li.className = 'note-card';
    var from = document.createElement('p');
    from.className = 'note-from';
    from.textContent = 'From. ' + (n.sender || '익명');
    var m = document.createElement('p');
    m.className = 'note-msg';
    m.textContent = n.message;
    var meta = document.createElement('div');
    meta.className = 'note-meta';
    var date = document.createElement('span');
    date.textContent = when(n.at);
    meta.appendChild(date);
    if (!forImage) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'note-save';
      b.textContent = '이 쪽지 저장';
      b.__note = n;
      meta.appendChild(b);
    }
    li.appendChild(from);
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

  /* ── 이미지로 저장 ──
     - '이미지로 저장하기': 편지 전체를 글 PER_IMAGE 개씩 나눠 1080px 폭 이미지로 만든다
     - 쪽지마다 '이 쪽지 저장': 그 쪽지 한 장만 이미지로
     - 만든 이미지는 화면에 모아 보여 준다: 길게 눌러 사진에 저장(휴대폰) · '모두 저장'(공유 창 또는 내려받기) */
  var EXPORT_W = 540; // CSS 폭. 2배로 그려 1080px
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
  function sheetHead(label) {
    var head = document.createElement('div');
    head.className = 'sheet-head';
    head.innerHTML = '<p class="to"><b></b> 작가님께</p><p class="count"></p>';
    head.querySelector('b').textContent = label;
    head.querySelector('.count').textContent = '조금 이상한 우리들 · 2026. 11. 12 – 17';
    return head;
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
      sheet.appendChild(sheetHead(label));
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
        ol.appendChild(card(it.n, true));
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
  function onePage(n) {
    var sheet = document.createElement('div');
    sheet.className = 'sheet single';
    sheet.appendChild(sheetHead(data.label || labelOf(chosen)));
    var ol = document.createElement('ol');
    ol.className = 'notes';
    ol.appendChild(card(n, true));
    sheet.appendChild(ol);
    return sheet;
  }

  // 종이(sheet)들을 차례로 이미지 파일로
  function draw(sheets, baseName) {
    var box = document.createElement('div');
    box.className = 'export';
    box.style.width = EXPORT_W + 'px';
    document.body.appendChild(box);
    return loadH2C()
      .then(function (h2c) {
        var files = [];
        var chain = (document.fonts && document.fonts.ready) || Promise.resolve();
        sheets.forEach(function (sh, i) {
          chain = chain.then(function () {
            box.innerHTML = '';
            box.appendChild(sh);
            return h2c(sh, {
              scale: 1080 / EXPORT_W,
              backgroundColor: '#fffdf8',
              useCORS: true,
              logging: false
            }).then(function (cv) {
              return new Promise(function (res) {
                cv.toBlob(function (blob) {
                  var name = baseName + (sheets.length > 1 ? '_' + (i + 1) : '') + '.png';
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
      .then(
        function (files) {
          box.remove();
          return files;
        },
        function (e) {
          box.remove();
          throw e;
        }
      );
  }

  /* 만든 이미지 모아 보기 */
  var shown = [];
  function gallery(files) {
    shown.forEach(function (u) {
      URL.revokeObjectURL(u);
    });
    shown = [];
    var list = $('galleryList');
    list.innerHTML = '';
    files.forEach(function (f) {
      var url = URL.createObjectURL(f);
      shown.push(url);
      var img = document.createElement('img');
      img.src = url;
      img.alt = f.name;
      list.appendChild(img);
    });
    $('galleryCount').textContent = '이미지 ' + files.length + '장';
    $('galleryAll').onclick = function () {
      saveAll(files);
    };
    $('gallery').hidden = false;
    document.documentElement.classList.add('gallery-open');
  }
  function closeGallery() {
    $('gallery').hidden = true;
    document.documentElement.classList.remove('gallery-open');
  }
  $('galleryClose').addEventListener('click', closeGallery);
  function saveAll(files) {
    var msg = $('galleryMsg');
    if (navigator.canShare && navigator.canShare({ files: files })) {
      return navigator
        .share({ files: files, title: '조금 이상한 우리들 · 작가님께 온 편지' })
        .then(function () {
          msg.textContent = '';
        })
        .catch(function () {});
    }
    files.forEach(function (f, i) {
      setTimeout(function () {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(f);
        a.download = f.name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          a.remove();
        }, 1000);
      }, i * 300); // 여러 장을 한꺼번에 내려받으면 브라우저가 막을 수 있어 조금씩 띄운다
    });
    msg.textContent = '이미지 ' + files.length + '장을 내려받았어요.';
  }

  function make(sheets, baseName, btn) {
    var msg = $('saveMsg');
    var label0 = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = '만드는 중…';
    }
    msg.textContent = '';
    return draw(sheets, baseName)
      .then(gallery)
      .catch(function () {
        msg.textContent = '이미지를 만들지 못했어요. 화면을 캡처해 주세요.';
      })
      .then(function () {
        if (btn) {
          btn.disabled = false;
          btn.textContent = label0;
        }
      });
  }
  $('saveImg').addEventListener('click', function () {
    if (!data) return;
    make(pages(), '조금이상한우리들_' + (data.label || labelOf(chosen)) + '_편지', $('saveImg'));
  });
  // 쪽지 한 장만 저장 (card() 가 단 버튼)
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.note-save');
    if (!b || !data) return;
    var n = b.__note;
    make([onePage(n)], '조금이상한우리들_' + (data.label || labelOf(chosen)) + '_쪽지', b);
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

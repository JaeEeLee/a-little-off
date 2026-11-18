/* ════════════════════════════════════════════════════════════════
   작가님께 온 편지 (/letters) — 방명록 Code.gs 맨 아래에 그대로 붙여 넣는다
   그리고 기존 doGet(e) 맨 첫 줄에 이 한 줄을 넣는다:

     if (e && e.parameter && e.parameter.type === 'letters') return lettersDoGet_(e);

   - 기존 함수 · 변수와 겹치지 않게 이름은 모두 letters 로 시작한다
   - 쪽지 탭은 머리줄(작가 · 메시지 열)을 보고 찾는다. 못 찾으면 LETTERS_NOTES_TAB 에 탭 이름을 적는다
   - '전달' 체크 열이 있으면 체크 해제한 글은 뺀다 (lettersSetup 을 한 번 실행하면 생긴다. 선택)
   - 시험 글(보낸 사람 '테스트', '시험용'으로 시작)은 뺀다. LETTERS_UNTIL 이 지나면 닫는다
   ════════════════════════════════════════════════════════════════ */

const LETTERS_UNTIL = new Date('2026-12-31T23:59:59+09:00');
const LETTERS_FROM = new Date('2026-10-01T00:00:00+09:00'); // 이보다 오래된 시험 글은 뺀다
const LETTERS_NOTES_TAB = ''; // 쪽지 탭 이름 (비워 두면 자동으로 찾는다)
const LETTERS_ARTISTS = {
  노정균: '', 배정연: '정연', 엄현서: '', 이재이: '재이', 이희지: '',
  윤혜진: '', 박정은: '', 최윤지: '', 최윤아: '', 임소라: '',
  홍성호: '', 남다름: '', 남선주: '', 박수룡: '', 이경도: '',
  편해연: '', 이서현: '', 조수연: '', 김지현: '', 홍림: ''
};

function lettersDoGet_(e) {
  const artist = String((e.parameter && e.parameter.artist) || '').trim();
  return ContentService.createTextOutput(JSON.stringify(lettersRead_(artist))).setMimeType(
    ContentService.MimeType.JSON
  );
}

function lettersRead_(artist) {
  if (new Date() > LETTERS_UNTIL) return { ok: false, error: 'closed' };
  if (!(artist in LETTERS_ARTISTS)) return { ok: false, error: 'artist' };
  const t = lettersNotesTab_();
  if (!t) return { ok: false, error: 'notes' };
  const c = t.col;
  const sh = t.sheet;
  const values = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues() : [];
  const mine = [];
  const all = [];
  values.forEach(function (r) {
    if (c.send >= 0 && r[c.send] === false) return; // 운영진이 뺀 글
    const message = String(r[c.message] || '').trim();
    const sender = c.sender >= 0 ? String(r[c.sender] || '').trim() : '';
    if (!message || sender === '테스트' || /^시험용/.test(message)) return;
    const raw = c.at >= 0 ? r[c.at] : '';
    const at = raw instanceof Date ? raw : raw ? new Date(raw) : null;
    if (at && !isNaN(at) && at < LETTERS_FROM) return;
    const to = String(r[c.artist] || '').trim();
    const note = { message: message, sender: sender, at: at && !isNaN(at) ? at.toISOString() : '' };
    if (to === artist) mine.push(note);
    else if (to === '' || to === '전체' || to === '모두') all.push(note);
  });
  return {
    ok: true,
    artist: artist,
    label: LETTERS_ARTISTS[artist] || artist,
    notes: mine,
    all: all,
    until: LETTERS_UNTIL.toISOString()
  };
}

function lettersNotesTab_() {
  const ss = SpreadsheetApp.getActive() || SpreadsheetApp.openById('15t_YTUhzkAqSxealdi97ldYUTH3exo-Fpk3TtdjcqiA'); // 방명록 시트
  const sheets = LETTERS_NOTES_TAB ? [ss.getSheetByName(LETTERS_NOTES_TAB)] : ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const sh = sheets[i];
    if (!sh || sh.getLastRow() < 1 || sh.getLastColumn() < 1) continue;
    const head = sh
      .getRange(1, 1, 1, sh.getLastColumn())
      .getValues()[0]
      .map(function (h) {
        return String(h).trim().toLowerCase();
      });
    const find = function (words) {
      return head.findIndex(function (h) {
        return words.some(function (w) {
          return h.indexOf(w) >= 0;
        });
      });
    };
    const col = {
      artist: find(['artist', '작가', '받는']),
      message: find(['message', '메시지', '내용', '쪽지', '한마디']),
      sender: find(['sender', '보낸', '닉네임', 'from']),
      at: head.indexOf('at') >= 0 ? head.indexOf('at') : find(['시각', '시간', '날짜', 'time', 'date']),
      send: head.indexOf('전달')
    };
    if (col.artist >= 0 && col.message >= 0) return { sheet: sh, col: col };
  }
  return null;
}

// (선택) 한 번 실행: 쪽지 탭에 '전달' 체크 열을 만들고 모두 체크한다. 빼고 싶은 글만 체크를 해제하면 된다
function lettersSetup() {
  const t = lettersNotesTab_();
  if (!t) throw new Error('쪽지 탭을 찾지 못했어요. LETTERS_NOTES_TAB 에 탭 이름을 적어 주세요.');
  Logger.log('쪽지 탭: ' + t.sheet.getName() + ' / 열 위치(0부터): ' + JSON.stringify(t.col));
  if (t.col.send >= 0) return Logger.log("'전달' 열이 이미 있어요.");
  const c = t.sheet.getLastColumn() + 1;
  t.sheet.getRange(1, c).setValue('전달');
  const last = t.sheet.getLastRow();
  if (last > 1) t.sheet.getRange(2, c, last - 1, 1).insertCheckboxes().check();
  Logger.log("'전달' 열을 " + c + '번째 열에 만들었어요.');
}

// (점검) 실행하면 재이 편지에 몇 통이 들어가는지 로그로 보여 준다. 아무것도 바꾸지 않는다
function lettersCheck() {
  const t = lettersNotesTab_();
  Logger.log(t ? '쪽지 탭: ' + t.sheet.getName() + ' / 열: ' + JSON.stringify(t.col) : '쪽지 탭을 못 찾음');
  const r = lettersRead_('이재이');
  Logger.log(r.ok ? '재이: 받은 글 ' + r.notes.length + '통, 모두에게 ' + r.all.length + '통' : '실패: ' + r.error);
}

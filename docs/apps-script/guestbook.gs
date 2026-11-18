/**
 * 방명록 Apps Script 웹앱 — 메인 · 작가 페이지 · 도슨트의 '작가에게 한마디'와 작가 게시판이 쓴다
 * (사이트의 SHEET_ENDPOINT: …/macros/s/AKfycbz9oZZXBo…/exec)
 *
 * 처음 코드가 저장소에 없어 2026-11-18 에 사이트가 주고받는 형식(docs/SPEC.md 4.1)대로 다시 짰다.
 * 굿즈 장부 · 도슨트 재생 수 · 작가 편지는 다른 프로젝트(goods.gs)다. 이 파일을 거기에 붙여 넣지 않는다.
 *
 * 주고받는 내용
 *  POST {artist, message, sender, at}                      → { ok }   쪽지 한 줄 (artist 가 비면 '전체')
 *  POST {type:'reservation', name, date, artist, companions} → { ok:false, reason:'closed' }   예약은 전시가 끝나 닫았다
 *  GET  ?type=board&artist=<본명>                           → { ok, notes:[{message, sender, at}] }   새 쪽지부터
 *       게시판은 BOARD_ARTISTS 에 있는 작가만 연다 (사이트 site.js 의 BOARD_ARTISTS 와 같아야 한다)
 *
 * 쪽지 탭은 머리줄에 '작가'(받는 사람) · '메시지' 같은 열이 있는 탭을 찾아 쓴다. 없으면 '쪽지' 탭을 새로 만든다.
 * 다른 열(예: '전달' 체크)은 건드리지 않고, 아는 열에만 값을 넣는다.
 */

const SHEET_ID = '15t_YTUhzkAqSxealdi97ldYUTH3exo-Fpk3TtdjcqiA'; // 방명록 시트
const NOTES_TAB = ''; // 쪽지 탭 이름을 정확히 알면 적는다. 비워 두면 머리줄을 보고 찾는다
const BOARD_ARTISTS = { 이재이: true };
const MAX_LEN = 300;

// 사이트에서 거르는 것과 같은 걸름 (브라우저를 거치지 않고 바로 보내는 경우 대비)
const BLOCKED = [
  /[\w.+-]+@[\w-]+\.[\w.]{2,}/, // 이메일
  /01[016-9][-.\s]?\d{3,4}[-.\s]?\d{4}/, // 전화번호
  /\d{9,}/, // 긴 숫자 (계좌 등)
  /(https?:\/\/|www\.)/i, // 링크
  /\.(com|net|org|kr|io|me|shop|link|xyz|top|biz)\b/i,
  /(카지노|토토|바카라|먹튀|슬롯|대출|상위노출|홍보대행|부업|재택알바|비아그라|오픈채팅|오픈카톡|텔레그램|디비판매|코인리딩)/
];

function book() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActive();
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.type === 'board') return out(readBoard(String(p.artist || '').trim()));
  return out({ ok: true });
}

function doPost(e) {
  let b;
  try {
    b = JSON.parse(e.postData.contents);
  } catch (x) {
    return out({ ok: false, reason: 'body' });
  }
  if (b.type === 'reservation') return out({ ok: false, reason: 'closed' });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return out({ ok: false, reason: 'busy' });
  try {
    return out(addNote(b));
  } finally {
    lock.releaseLock();
  }
}

/* ── 쪽지 ── */

function addNote(b) {
  const message = String(b.message || '')
    .trim()
    .slice(0, MAX_LEN);
  const sender = String(b.sender || '')
    .trim()
    .slice(0, 20);
  const artist =
    String(b.artist || '')
      .trim()
      .slice(0, 20) || '전체';
  if (!message) return { ok: false, reason: 'empty' };
  if (BLOCKED.some((re) => re.test(message) || re.test(sender))) return { ok: false, reason: 'blocked' };

  // 같은 글을 짧은 사이에 두 번 받으면 (사이트가 응답을 못 읽고 한 번 더 보낸 경우) 한 번만 적는다
  const cache = CacheService.getScriptCache();
  const key =
    'n:' +
    Utilities.base64Encode(
      Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, artist + '|' + sender + '|' + message)
    );
  if (cache.get(key)) return { ok: true, dup: true };
  cache.put(key, '1', 120);

  const t = notesTab(true);
  const width = t.sheet.getLastColumn();
  const row = new Array(width).fill('');
  if (t.col.at >= 0) row[t.col.at] = new Date();
  row[t.col.artist] = artist;
  row[t.col.message] = message;
  if (t.col.sender >= 0) row[t.col.sender] = sender;
  if (t.col.send >= 0) row[t.col.send] = true; // '전달' 체크 열이 있으면 기본으로 체크
  t.sheet.appendRow(row);
  return { ok: true };
}

function readBoard(artist) {
  if (!BOARD_ARTISTS[artist]) return { ok: false, notes: [] };
  const t = notesTab(false);
  if (!t || t.sheet.getLastRow() < 2) return { ok: true, notes: [] };
  const c = t.col;
  const values = t.sheet.getRange(2, 1, t.sheet.getLastRow() - 1, t.sheet.getLastColumn()).getValues();
  const notes = [];
  values.forEach((r) => {
    if (String(r[c.artist]).trim() !== artist) return;
    if (c.send >= 0 && r[c.send] === false) return; // 운영진이 뺀 글은 게시판에도 붙이지 않는다
    const message = String(r[c.message] || '').trim();
    if (!message) return;
    const at = c.at >= 0 && r[c.at] ? new Date(r[c.at]) : null;
    notes.push({
      message: message,
      sender: c.sender >= 0 ? String(r[c.sender] || '').trim() : '',
      at: at && !isNaN(at) ? at.toISOString() : ''
    });
  });
  notes.reverse(); // 새 쪽지부터
  return { ok: true, notes: notes };
}

// 쪽지 탭 찾기: 머리줄에 받는 작가 · 메시지 열이 있는 탭. create 가 참이면 없을 때 '쪽지' 탭을 만든다
function notesTab(create) {
  const ss = book();
  const sheets = NOTES_TAB ? [ss.getSheetByName(NOTES_TAB)] : ss.getSheets();
  for (const sh of sheets) {
    if (!sh || sh.getLastRow() < 1 || sh.getLastColumn() < 1) continue;
    const head = sh
      .getRange(1, 1, 1, sh.getLastColumn())
      .getValues()[0]
      .map((h) => String(h).trim().toLowerCase());
    const find = (words) => head.findIndex((h) => words.some((w) => h.indexOf(w) >= 0));
    const col = {
      artist: find(['artist', '작가', '받는']),
      message: find(['message', '메시지', '내용', '쪽지', '한마디']),
      // '보낸 사람' · '보내는 사람' · '작성자' · '닉네임' · '이름'(받는 작가 열이 아닌 것)
      sender: (function () {
        const i = find(['sender', '보낸', '보내', '작성자', '닉네임', '닉', 'from']);
        if (i >= 0) return i;
        return head.findIndex(function (h, k) {
          return h.indexOf('이름') >= 0 && h.indexOf('작가') < 0 && h.indexOf('받는') < 0;
        });
      })(),
      at: head.indexOf('at') >= 0 ? head.indexOf('at') : find(['시각', '시간', '날짜', 'time', 'date']),
      send: head.indexOf('전달')
    };
    // 예약 탭(이름 · 방문 날짜)과 헷갈리지 않게 메시지 열이 있는 탭만
    if (col.artist >= 0 && col.message >= 0) return { sheet: sh, col: col };
  }
  if (!create) return null;
  const sh = ss.insertSheet('쪽지');
  sh.appendRow(['시각', '받는 작가', '메시지', '보낸 사람']);
  sh.setFrozenRows(1);
  sh.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
  return { sheet: sh, col: { at: 0, artist: 1, message: 2, sender: 3, send: -1 } };
}

// 편집기에서 ▶ 실행해 보는 점검: 어느 탭을 쪽지 탭으로 찾았는지 로그에 남긴다 (아무것도 바꾸지 않는다)
function check() {
  const t = notesTab(false);
  if (!t) return Logger.log('쪽지 탭을 찾지 못했어요. 맨 위 NOTES_TAB 에 탭 이름을 적어 주세요.');
  Logger.log(
    '쪽지 탭: ' +
      t.sheet.getName() +
      ' / 열 위치(0부터): ' +
      JSON.stringify(t.col) +
      ' / 줄 수: ' +
      (t.sheet.getLastRow() - 1)
  );
  Logger.log('재이 게시판 쪽지 수: ' + readBoard('이재이').notes.length);
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

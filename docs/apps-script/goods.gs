/**
 * 굿즈 판매 장부 — Google Apps Script 웹앱 (사이트의 /goods 페이지가 쓴다)
 *
 * 설치 (처음 한 번, 컴퓨터에서 하는 게 편하다)
 *  방명록 시트에 함께 쓰는 경우 (지금 설정)
 *   - 방명록 시트에는 이미 방명록 Apps Script가 붙어 있어 함수 이름이 겹친다. 그래서 이 코드는
 *     시트의 '확장 프로그램'이 아니라 script.google.com 에서 '새 프로젝트'로 따로 만든다.
 *   - 아래 SHEET_ID 로 방명록 시트를 찾아가 '굿즈 판매내역' · '굿즈 상품' · '굿즈 요약' 탭에 쓴다.
 *  따로 새 시트를 쓰는 경우: 그 시트의 확장 프로그램 → Apps Script 에 붙이고 SHEET_ID 를 '' 로 둔다.
 *
 *  1. script.google.com → 새 프로젝트 → 이 파일 내용을 통째로 붙여 넣는다
 *  2. 비밀번호는 같은 숫자 4개(1111 ~ 9999, 0000 제외)면 무엇이든 열린다. 바꾸려면 아래 pinOk 를 고친다
 *  3. 위쪽 함수 목록에서 setup 을 골라 ▶ 실행 → 권한 허용
 *     → '굿즈 판매내역'(비어 있으면 머리글을 채움) · '굿즈 상품' · '굿즈 요약' 탭이 준비된다
 *  4. '굿즈 상품' 탭에 굿즈 8개와 가격이 채워졌는지 확인한다 (가격이 빈 굿즈는 페이지에서 누를 수 없다)
 *  5. 배포 → 새 배포 → 유형: 웹 앱 / 실행: 나 / 액세스: 모든 사용자 → 배포
 *  6. 나온 웹앱 주소(…/exec)를 assets/js/goods.js 의 GOODS_ENDPOINT 에 넣는다
 *
 * 나중에 이 코드를 고치면: 배포 → 배포 관리 → 연필 → 버전 '새 버전' → 배포 (주소는 그대로)
 * 굿즈나 가격만 바꿀 때는 '굿즈 상품' 탭만 고치면 된다. 다시 배포할 필요 없다.
 *
 * 주고받는 내용
 *  GET  ?type=state&pin=     → { ok, items:[{name,price}], sales:[{id,at,pay,lines,amount,cancelled}] }
 *  POST {type:'sale', pin, id, at, pay, lines:[{name,qty}], early?}  → { ok }   같은 id 는 한 번만 적는다
 *       전시 시작 전에는 early:true (스태프가 '실제 판매 기록'으로 바꾼 휴대폰) 판매만 받는다
 *  POST {type:'cancel', pin, id}                              → { ok }   그 판매의 상태를 '취소'로
 *  POST {type:'practice', device, event:'open'|'sale'}         → { ok }   전시 전 연습 현황 (비밀번호 없음, 익명)
 *  POST {type:'docent_play', order, name, work, how, device}  → { ok }   도슨트 재생 1회 (비밀번호 없음, 익명)
 *       how: 'tap' 이름을 눌러서 · 'qr' 작품 옆 QR로 · 'next' 이어 듣기/처음부터/이전·다음
 *  비밀번호(같은 숫자 4개, 0000 제외)가 아니면 { ok:false, error:'pin' }
 */

// 스태프 비밀번호: 같은 숫자 4개(1111, 2222 … 9999)면 연다. 0000 은 막는다
// 외우기 쉬운 대신 맞히기도 쉬우므로, 장부 주소(/goods)는 스태프끼리만 공유한다
function pinOk(pin) {
  return /^([1-9])\1{3}$/.test(String(pin || ''));
}

// 판매 기록을 쌓을 스프레드시트. 비우면('') 이 스크립트가 붙은 시트를 쓴다
const SHEET_ID = '15t_YTUhzkAqSxealdi97ldYUTH3exo-Fpk3TtdjcqiA'; // 방명록 시트
const SALES = '굿즈 판매내역';
const ITEMS = '굿즈 상품';
const SUMMARY = '굿즈 요약';
const PRACTICE = '굿즈 연습 현황'; // 전시 전 연습 모드를 쓴 휴대폰 수 (누구인지는 남기지 않는다)
const PRACTICE_HEAD = ['휴대폰(익명)', '처음 연습', '마지막 연습', '열어 본 횟수', '연습 판매 수'];

function book() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActive();
}
const PAYS = ['현금', '계좌이체'];

// setup 을 처음 실행할 때 '굿즈 상품' 탭에 채워 넣는 굿즈 [이름, 가격, 메모, 재고]
// 재고는 비워 두면 제한 없이 팔 수 있다. 숫자를 적으면 장부에 '남은 n개'가 나오고 다 팔리면 버튼이 꺼진다
// 이름이 휴대폰 버튼에 그대로 나오므로 짧게 둔다. 나중에는 '상품' 탭에서 바로 고치면 된다
const GOODS = [
  ['THE WONDER BOX', 25000, '아트 엽서 2장 + 마그넷 1개 + 책갈피 1개 (이상한 나라의 작은 수집함)', ''],
  ['아트 엽서', 3000, '', ''],
  ['엽서 4장 세트', 10000, '', ''],
  ['아트 마그넷', 15000, '', ''],
  ['아트 책갈피', 8000, '', ''],
  ['작가 아크릴 키링', 18000, '', ''],
  ['앨리스의 열쇠 (골드)', 25000, '', ''],
  ['앨리스의 열쇠 (실버)', 18000, '', '']
];
const HEAD = ['시각', '판매번호', '굿즈', '단가', '개수', '금액', '결제', '상태'];

function setup() {
  const ss = book();

  const s = ss.getSheetByName(SALES) || ss.insertSheet(SALES);
  // 이미 다른 내용이 적혀 있으면 덮어쓰지 않고 멈춘다
  if (s.getLastRow() > 0 && String(s.getRange(1, 1).getValue()) !== HEAD[0]) {
    throw new Error("'" + SALES + "' 탭이 비어 있지 않아요. 비우거나 1행을 지운 뒤 다시 실행해 주세요.");
  }
  if (s.getLastRow() === 0) {
    s.appendRow(HEAD);
    s.setFrozenRows(1);
    s.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
    s.getRange('D:D').setNumberFormat('#,##0');
    s.getRange('F:F').setNumberFormat('#,##0');
  }

  const it = ss.getSheetByName(ITEMS) || ss.insertSheet(ITEMS);
  if (it.getLastRow() === 0) {
    it.appendRow(['굿즈', '가격', '메모', '재고']);
    GOODS.forEach((g) => it.appendRow(g));
    it.setFrozenRows(1);
    it.getRange('B:B').setNumberFormat('#,##0');
    it.setColumnWidth(1, 180);
    it.setColumnWidth(3, 260);
  }

  buildSummary();
}

/* '굿즈 요약' 탭: 맨 위에 전체 합계, 아래에 굿즈별 판매 개수 · 금액, 오른쪽에 날짜별 합계.
   모두 수식이라 판매가 들어오면 저절로 바뀐다. 취소된 판매는 빼고 센다.
   이 함수만 다시 실행해도 요약 탭을 새로 그린다 (판매내역 · 상품 탭은 건드리지 않는다) */
function buildSummary() {
  const ss = book();
  // 날짜를 한국 기준으로 묶는다. 시트 시간대가 다른 나라면 자정 직후 판매가 전날로 들어간다
  if (ss.getSpreadsheetTimeZone() !== 'Asia/Seoul') ss.setSpreadsheetTimeZone('Asia/Seoul');
  const sum = ss.getSheetByName(SUMMARY) || ss.insertSheet(SUMMARY);
  sum.clear();
  const S = "'" + SALES + "'";
  const I = "'" + ITEMS + "'";
  const ok = S + '!H:H, "정상"';

  // 전체 합계
  sum.getRange('A1:B2').setValues([
    ['전체 판매금액', '=SUMIFS(' + S + '!F:F, ' + ok + ')'],
    ['전체 판매 개수', '=SUMIFS(' + S + '!E:E, ' + ok + ')']
  ]);
  sum.getRange('A1:A2').setFontWeight('bold');
  sum.getRange('B1:B2').setFontWeight('bold').setFontSize(13);
  sum.getRange('B1').setNumberFormat('#,##0"원"');
  sum.getRange('B2').setNumberFormat('#,##0"개"');

  // 굿즈별: '굿즈 상품' 탭의 굿즈를 모두 줄로 세우고, 안 팔린 굿즈는 0
  sum.getRange('A4:E4').setValues([['굿즈', '가격', '판매 개수', '판매 금액', '남은 재고']]).setFontWeight('bold').setBackground('#F0EFEC');
  sum.getRange('A5').setFormula('=FILTER(' + I + '!A2:B, ' + I + '!A2:A<>"")');
  // SUMIFS 는 ARRAYFORMULA 로 여러 줄을 한 번에 세지 않으므로, MAP 으로 굿즈마다 따로 센다
  sum.getRange('C5').setFormula('=MAP(A5:A, LAMBDA(n, IF(n="", "", SUMIFS(' + S + '!E:E, ' + S + '!C:C, n, ' + ok + '))))');
  sum.getRange('D5').setFormula('=MAP(A5:A, LAMBDA(n, IF(n="", "", SUMIFS(' + S + '!F:F, ' + S + '!C:C, n, ' + ok + '))))');
  // 남은 재고 = '굿즈 상품' 재고 칸 - 판매 개수 (재고 칸이 비어 있으면 빈칸)
  sum.getRange('E5').setFormula('=MAP(A5:A, C5:C, LAMBDA(n, c, IF(n="", "", LET(s, IFERROR(XLOOKUP(n, ' + I + '!A2:A, ' + I + '!D2:D), ""), IF(s="", "", s - c)))))');
  sum.getRange('B5:B').setNumberFormat('#,##0');
  sum.getRange('C5:C').setNumberFormat('#,##0');
  sum.getRange('D5:D').setNumberFormat('#,##0');

  // 날짜별 (판매가 없으면 안내 문구)
  // 날짜는 TEXT 로 글자로 만든다. 칸 서식에 맡기면 서식이 바뀌거나 빠질 때 46337, ₩46,337 처럼 숫자로 보인다
  sum.getRange('G4').setFormula(
    '=IFERROR(LET(q, QUERY(' + S + "!A:H, \"select toDate(A), sum(E), sum(F) where H = '정상' group by toDate(A) label toDate(A) '', sum(E) '', sum(F) ''\", 0), " +
      '{"날짜", "판매 개수", "금액"; ARRAYFORMULA(TEXT(CHOOSECOLS(q, 1), "yyyy-mm-dd (ddd)")), CHOOSECOLS(q, 2), CHOOSECOLS(q, 3)}), ' +
      '"아직 판매 기록이 없어요")'
  );
  sum.getRange('G4:I4').setFontWeight('bold');
  sum.getRange('G5:G').setNumberFormat('@').setHorizontalAlignment('left');
  sum.getRange('H5:H').setNumberFormat('#,##0"개"');
  sum.getRange('I5:I').setNumberFormat('#,##0"원"');

  sum.setFrozenRows(4);
  sum.setColumnWidth(1, 170);
  sum.setColumnWidths(2, 4, 90);
  sum.setColumnWidth(7, 110);
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (!pinOk(p.pin)) return out({ ok: false, error: 'pin' });
  return out({ ok: true, items: readItems(), sales: readSales() });
}

function doPost(e) {
  let b;
  try {
    b = JSON.parse(e.postData.contents);
  } catch (x) {
    return out({ ok: false, error: 'body' });
  }

  // 도슨트 재생 횟수도 비밀번호 없이 받는다 (관람객 휴대폰에서 온다). 매출 시트와는 상관없다
  if (b.type === 'docent_play') {
    const dl = LockService.getScriptLock();
    if (!dl.tryLock(10000)) return out({ ok: false, error: 'busy' });
    try {
      return out(logDocentPlay(b));
    } finally {
      dl.releaseLock();
    }
  }

  // 연습 현황은 비밀번호 없이 받는다 (연습 모드는 비밀번호 없이 열리므로). 매출 시트와는 상관없다
  if (b.type === 'practice') {
    const pl = LockService.getScriptLock();
    if (!pl.tryLock(10000)) return out({ ok: false, error: 'busy' });
    try {
      return out(logPractice(b));
    } finally {
      pl.releaseLock();
    }
  }

  if (!pinOk(b.pin)) return out({ ok: false, error: 'pin' });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return out({ ok: false, error: 'busy' });
  try {
    if (b.type === 'sale') return out(addSale(b));
    if (b.type === 'cancel') return out(cancelSale(String(b.id || '')));
    return out({ ok: false, error: 'type' });
  } finally {
    lock.releaseLock();
  }
}

function readItems() {
  const sh = book().getSheetByName(ITEMS);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh
    .getRange(2, 1, sh.getLastRow() - 1, 4) // 굿즈 · 가격 · 메모 · 재고
    .getValues()
    .filter((r) => String(r[0]).trim())
    .map((r) => ({
      name: String(r[0]).trim(),
      price: r[1] === '' || isNaN(Number(r[1])) ? null : Number(r[1]),
      stock: r[3] === '' || isNaN(Number(r[3])) ? null : Number(r[3]) // 비어 있으면 제한 없음
    }));
}

function readSales() {
  const sh = book().getSheetByName(SALES);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, HEAD.length).getValues();
  const byId = {};
  const list = [];
  rows.forEach((r) => {
    const id = String(r[1]);
    if (!id) return;
    let s = byId[id];
    if (!s) {
      s = byId[id] = {
        id: id,
        at: (r[0] instanceof Date ? r[0] : new Date(r[0])).toISOString(),
        pay: String(r[6]),
        lines: [],
        amount: 0,
        cancelled: false
      };
      list.push(s);
    }
    const qty = Number(r[4]) || 0;
    const price = Number(r[3]) || 0;
    s.lines.push({ name: String(r[2]), price: price, qty: qty });
    s.amount += price * qty;
    if (String(r[7]) === '취소') s.cancelled = true;
  });
  return list;
}

// 전시 시작 전에는 판매를 받지 않는다 (사이트도 그 전에는 연습 모드라 보내지 않는다. 혹시 모를 시험 기록 막기)
const OPEN_AT = new Date('2026-11-12T13:00:00+09:00');

function addSale(b) {
  // 시작 전이라도 스태프가 '실제 판매 기록'으로 바꿔서 보낸 판매(early)는 받는다
  if (new Date() < OPEN_AT && b.early !== true) return { ok: false, error: 'not_open' };
  const id = String(b.id || '');
  if (!/^[\w-]{6,40}$/.test(id)) return { ok: false, error: 'id' };
  const sh = book().getSheetByName(SALES);
  // 신호가 끊겼다 다시 보낸 같은 판매는 한 번만 적는다
  if (sh.getLastRow() > 1 && sh.getRange('B2:B').createTextFinder(id).matchEntireCell(true).findNext()) {
    return { ok: true, dup: true };
  }

  // 가격은 휴대폰이 보낸 값이 아니라 '상품' 탭의 값을 쓴다
  const price = {};
  readItems().forEach((i) => (price[i.name] = i.price));
  const lines = Array.isArray(b.lines) ? b.lines : [];
  if (!lines.length) return { ok: false, error: 'item' };
  for (const l of lines) {
    const q = Number(l.qty);
    if (price[l.name] == null || !(q >= 1 && q <= 999 && Math.floor(q) === q)) return { ok: false, error: 'item' };
  }

  // 판매 시각: 휴대폰에서 누른 시각 (신호가 없어 늦게 도착해도 판매한 때로 남게). 이상하면 지금
  const now = new Date();
  let at = new Date(b.at);
  if (isNaN(at) || at > new Date(now.getTime() + 5 * 60e3) || now - at > 3 * 864e5) at = now;
  const pay = PAYS.indexOf(b.pay) >= 0 ? b.pay : PAYS[0];

  const rows = lines.map((l) => [
    at,
    id,
    l.name,
    price[l.name],
    Number(l.qty),
    price[l.name] * Number(l.qty),
    pay,
    '정상'
  ]);
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEAD.length).setValues(rows);
  return { ok: true };
}

function cancelSale(id) {
  const sh = book().getSheetByName(SALES);
  if (!id || sh.getLastRow() < 2) return { ok: true, found: 0 };
  const ids = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues();
  let found = 0;
  ids.forEach((r, i) => {
    if (String(r[0]) === id) {
      sh.getRange(i + 2, 8).setValue('취소');
      found++;
    }
  });
  return { ok: true, found: found };
}

// 휴대폰마다 한 줄: 처음 · 마지막 연습 시각, 열어 본 횟수, 연습 판매 수. 전시가 시작되면 더 받지 않는다
function logPractice(b) {
  if (new Date() >= OPEN_AT) return { ok: false, error: 'open' };
  const device = String(b.device || '');
  if (!/^[a-z0-9]{6,24}$/.test(device)) return { ok: false, error: 'device' };
  const ev = b.event === 'sale' ? 'sale' : 'open';

  const ss = book();
  let sh = ss.getSheetByName(PRACTICE);
  if (!sh) {
    sh = ss.insertSheet(PRACTICE);
    sh.appendRow(PRACTICE_HEAD);
    sh.setFrozenRows(1);
    sh.getRange('B:C').setNumberFormat('mm/dd hh:mm');
    sh.setColumnWidths(1, 5, 110);
  }
  const now = new Date();
  const hit = sh.getLastRow() > 1 && sh.getRange('A2:A').createTextFinder(device).matchEntireCell(true).findNext();
  if (!hit) {
    sh.appendRow([device, now, now, ev === 'open' ? 1 : 0, ev === 'sale' ? 1 : 0]);
  } else {
    const r = hit.getRow();
    const v = sh.getRange(r, 4, 1, 2).getValues()[0];
    sh.getRange(r, 3).setValue(now);
    if (ev === 'open') sh.getRange(r, 4).setValue((Number(v[0]) || 0) + 1);
    else sh.getRange(r, 5).setValue((Number(v[1]) || 0) + 1);
  }
  return { ok: true };
}

/* ── 도슨트 재생 횟수 ──
   '도슨트 재생 기록': 한 번 들을 때마다 한 줄 (시각 · 순서 · 이름 · 작품 · 어떻게 · 휴대폰(익명))
   '도슨트 재생 요약': 작품마다 한 줄, 어떻게 들었는지별 횟수와 합계 + 막대 차트 (처음 기록이 들어올 때 만든다) */
const PLAY_LOG = '도슨트 재생 기록';
const PLAY_SUM = '도슨트 재생 요약';
const PLAY_HOW = { tap: '이름 눌러서', qr: 'QR로', next: '이어 듣기' };
const PLAY_SUM_HEAD = ['순서', '이름', '작품', '이름 눌러서', 'QR로', '이어 듣기', '합계'];

function logDocentPlay(b) {
  const now = new Date();
  if (now < OPEN_AT) return { ok: false, error: 'not_open' }; // 개관 전 점검 · 리허설 재생은 세지 않는다
  const name = String(b.name || '').trim().slice(0, 20);
  const work = String(b.work || '').trim().slice(0, 60);
  const order = Math.floor(Number(b.order));
  const how = PLAY_HOW[b.how] ? b.how : 'next';
  const device = /^[a-z0-9]{6,24}$/.test(String(b.device || '')) ? String(b.device) : '';
  if (!name || !(order >= 0 && order < 100)) return { ok: false, error: 'track' };

  const ss = book();
  let log = ss.getSheetByName(PLAY_LOG);
  if (!log) {
    log = ss.insertSheet(PLAY_LOG);
    log.appendRow(['시각', '순서', '이름', '작품', '어떻게', '휴대폰(익명)']);
    log.setFrozenRows(1);
    log.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
  }
  log.appendRow([now, order + 1, name, work, PLAY_HOW[how], device]);

  const sum = playSummary(ss);
  const col = { tap: 4, qr: 5, next: 6 }[how];
  const hit = sum.getLastRow() > 1 && sum.getRange('B2:B').createTextFinder(name).matchEntireCell(true).findNext();
  if (hit) {
    const r = hit.getRow();
    const cell = sum.getRange(r, col);
    cell.setValue((Number(cell.getValue()) || 0) + 1);
  } else {
    const row = [order + 1, name, work, 0, 0, 0];
    row[col - 1] = 1;
    sum.appendRow(row);
    const r = sum.getLastRow();
    sum.getRange(r, 7).setFormula('=SUM(D' + r + ':F' + r + ')');
    sum.getRange(2, 1, r - 1, PLAY_SUM_HEAD.length).sort(1); // 도슨트 순서대로
  }
  return { ok: true };
}

function playSummary(ss) {
  let sum = ss.getSheetByName(PLAY_SUM);
  if (sum) return sum;
  sum = ss.insertSheet(PLAY_SUM);
  sum.appendRow(PLAY_SUM_HEAD);
  sum.setFrozenRows(1);
  sum.getRange('A1:G1').setFontWeight('bold').setBackground('#F0EFEC');
  // 작품별 재생 횟수 막대 차트 (이름 눌러서 · QR로 · 이어 듣기를 쌓아서). 26줄까지 넉넉히 잡는다
  const chart = sum
    .newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(sum.getRange('B1:B27'))
    .addRange(sum.getRange('D1:F27'))
    .setNumHeaders(1)
    .setOption('title', '도슨트 작품별 재생 횟수')
    .setOption('isStacked', true)
    .setOption('legend', { position: 'top' })
    .setOption('colors', ['#1e56b8', '#c8553d', '#b9b3a8'])
    .setOption('height', 620)
    .setOption('width', 560)
    .setPosition(1, 9, 0, 0)
    .build();
  sum.insertChart(chart);
  return sum;
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

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
 *  2. 아래 PIN 을 스태프 비밀번호로 바꾼다 (이 저장소에는 올리지 않는다)
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
 *  POST {type:'sale', pin, id, at, pay, lines:[{name,qty}]}  → { ok }   같은 id 는 한 번만 적는다
 *  POST {type:'cancel', pin, id}                              → { ok }   그 판매의 상태를 '취소'로
 *  비밀번호가 틀리면 { ok:false, error:'pin' }
 */

const PIN = '0000'; // ← 스태프 비밀번호로 바꾸세요

// 판매 기록을 쌓을 스프레드시트. 비우면('') 이 스크립트가 붙은 시트를 쓴다
const SHEET_ID = '15t_YTUhzkAqSxealdi97ldYUTH3exo-Fpk3TtdjcqiA'; // 방명록 시트
const SALES = '굿즈 판매내역';
const ITEMS = '굿즈 상품';
const SUMMARY = '굿즈 요약';

function book() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActive();
}
const PAYS = ['현금', '계좌이체'];

// setup 을 처음 실행할 때 '굿즈 상품' 탭에 채워 넣는 굿즈 [이름, 가격, 메모]
// 이름이 휴대폰 버튼에 그대로 나오므로 짧게 둔다. 나중에는 '상품' 탭에서 바로 고치면 된다
const GOODS = [
  ['THE WONDER BOX', 25000, '아트 엽서 2장 + 마그넷 1개 + 책갈피 1개 (이상한 나라의 작은 수집함)'],
  ['아트 엽서', 3000, ''],
  ['엽서 4장 세트', 10000, ''],
  ['아트 마그넷', 15000, ''],
  ['아트 책갈피', 8000, ''],
  ['작가 아크릴 키링', 18000, ''],
  ['앨리스의 열쇠 (골드)', 25000, ''],
  ['앨리스의 열쇠 (실버)', 18000, '']
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
    it.appendRow(['굿즈', '가격', '메모']);
    GOODS.forEach((g) => it.appendRow(g));
    it.setFrozenRows(1);
    it.getRange('B:B').setNumberFormat('#,##0');
    it.setColumnWidth(1, 180);
    it.setColumnWidth(3, 260);
  }

  // 시트에서 바로 보는 합계 (취소된 판매는 빼고)
  // 판매가 하나도 없으면 QUERY가 숫자 열을 글자로 봐서 #VALUE! 가 나므로, 그때는 안내 문구를 보여 준다
  const sum = ss.getSheetByName(SUMMARY) || ss.insertSheet(SUMMARY);
  sum.clear();
  sum.getRange('A1').setValue('총 판매금액');
  sum.getRange('B1').setFormula("=SUMIF('" + SALES + "'!H:H,\"정상\",'" + SALES + "'!F:F)").setNumberFormat('#,##0');
  sum.getRange('A2').setValue('총 판매 개수');
  sum.getRange('B2').setFormula("=SUMIF('" + SALES + "'!H:H,\"정상\",'" + SALES + "'!E:E)");
  sum
    .getRange('A4')
    .setFormula(
      "=IFERROR(QUERY('" + SALES + "'!A:H,\"select C, sum(E), sum(F) where H = '정상' group by C label C '굿즈', sum(E) '판매 개수', sum(F) '금액'\",1), \"아직 판매 기록이 없어요\")"
    );
  sum
    .getRange('E4')
    .setFormula(
      "=IFERROR(QUERY('" + SALES + "'!A:H,\"select toDate(A), sum(E), sum(F) where H = '정상' group by toDate(A) label toDate(A) '날짜', sum(E) '판매 개수', sum(F) '금액'\",1), \"아직 판매 기록이 없어요\")"
    );
  sum.getRange('A1:A2').setFontWeight('bold');
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (String(p.pin || '') !== PIN) return out({ ok: false, error: 'pin' });
  return out({ ok: true, items: readItems(), sales: readSales() });
}

function doPost(e) {
  let b;
  try {
    b = JSON.parse(e.postData.contents);
  } catch (x) {
    return out({ ok: false, error: 'body' });
  }
  if (String(b.pin || '') !== PIN) return out({ ok: false, error: 'pin' });

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
    .getRange(2, 1, sh.getLastRow() - 1, 2)
    .getValues()
    .filter((r) => String(r[0]).trim())
    .map((r) => ({
      name: String(r[0]).trim(),
      price: r[1] === '' || isNaN(Number(r[1])) ? null : Number(r[1])
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

function addSale(b) {
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

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

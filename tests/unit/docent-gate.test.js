// functions/docent/_middleware.js — 도슨트 잠금 (QR 열쇠 · 입장권 · 운영 시간)
import { test, describe, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../../functions/docent/_middleware.js';

const ENV = { DOCENT_KEY: 'test-key', DOCENT_SECRET: 'test-secret' };
const OPEN_TIME = Date.parse('2026-11-14T15:00:00+09:00'); // 운영 중
const CLOSED_TIME = Date.parse('2026-11-14T22:00:00+09:00'); // 운영 끝난 밤
const BEFORE = Date.parse('2026-11-01T15:00:00+09:00'); // 전시 전 (리허설 기간)

function at(ms) {
  mock.timers.enable({ apis: ['Date'], now: ms });
}
afterEach(() => mock.timers.reset());

function call(path, { env = ENV, cookie } = {}) {
  const headers = cookie ? { Cookie: cookie } : {};
  const request = new Request('https://a-little-off.pages.dev' + path, { headers });
  let passed = false;
  const next = async () => {
    passed = true;
    return new Response('docent page', { status: 200 });
  };
  return onRequest({ request, env, next }).then((res) => ({ res, passed }));
}

async function passCookie() {
  const { res } = await call('/docent/?k=test-key');
  return res.headers.get('Set-Cookie').split(';')[0];
}

describe('설정이 없으면', () => {
  test('아무도 들어오지 못한다 (503 준비 중)', async () => {
    at(OPEN_TIME);
    const { res, passed } = await call('/docent/', { env: {} });
    assert.equal(res.status, 503);
    assert.equal(passed, false);
    assert.match(await res.text(), /도슨트 준비 중/);
  });
});

describe('운영 시간', () => {
  test('운영 시간이 아니면 막힌다 (403)', async () => {
    at(CLOSED_TIME);
    const { res, passed } = await call('/docent/?k=test-key');
    assert.equal(res.status, 403);
    assert.equal(passed, false);
    assert.match(await res.text(), /운영 시간이 아니에요/);
  });

  test('첫날은 13:00 부터 연다', async () => {
    at(Date.parse('2026-11-12T12:30:00+09:00'));
    assert.equal((await call('/docent/?k=test-key')).res.status, 403);
    mock.timers.reset();
    at(Date.parse('2026-11-12T13:00:00+09:00'));
    assert.equal((await call('/docent/?k=test-key')).res.status, 302);
  });

  test('리허설 모드는 전시 전에만 시간과 상관없이 연다', async () => {
    at(BEFORE);
    const env = { ...ENV, DOCENT_ALWAYS_OPEN: 'true' };
    assert.equal((await call('/docent/?k=test-key', { env })).res.status, 302);
    mock.timers.reset();
    at(CLOSED_TIME); // 전시 기간에는 리허설 설정이 남아 있어도 무시
    assert.equal((await call('/docent/?k=test-key', { env })).res.status, 403);
  });
});

describe('QR 열쇠와 입장권', () => {
  test('맞는 열쇠로 들어오면 3시간 입장권을 주고 주소에서 열쇠를 지운다', async () => {
    at(OPEN_TIME);
    const { res } = await call('/docent/?k=test-key#이재이');
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('Location'), '/docent/');
    const cookie = res.headers.get('Set-Cookie');
    assert.match(cookie, /^docent_pass=\d+\.[\w-]+;/);
    assert.match(cookie, /Max-Age=10800/);
    assert.match(cookie, /HttpOnly; Secure; SameSite=Lax/);
  });

  test('틀린 열쇠는 막는다', async () => {
    at(OPEN_TIME);
    const { res } = await call('/docent/?k=wrong-key');
    assert.equal(res.status, 403);
    assert.match(await res.text(), /전시장에서 들어 주세요/);
  });

  test('입장권이 있으면 페이지를 내주고 캐시하지 않는다', async () => {
    at(OPEN_TIME);
    const cookie = await passCookie();
    const { res, passed } = await call('/docent/', { cookie });
    assert.equal(passed, true);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Cache-Control'), 'private, no-store');
  });

  test('입장권이 없거나 위조됐으면 막는다', async () => {
    at(OPEN_TIME);
    assert.equal((await call('/docent/')).res.status, 403);
    const forged = 'docent_pass=9999999999.forgedsignature';
    assert.equal((await call('/docent/', { cookie: forged })).res.status, 403);
  });

  test('3시간이 지나면 입장권이 끝난다', async () => {
    at(OPEN_TIME);
    const cookie = await passCookie();
    mock.timers.reset();
    at(OPEN_TIME + 3 * 60 * 60 * 1000 + 1000);
    assert.equal((await call('/docent/', { cookie })).res.status, 403);
  });
});

describe('점검용 주소', () => {
  test('/docent/debug 는 잠그지 않고, 검색에 걸리지 않게 한다', async () => {
    at(CLOSED_TIME);
    const { res, passed } = await call('/docent/debug');
    assert.equal(passed, true);
    assert.equal(res.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  });

  test('/docent/__status 는 상태를 JSON 으로 알려 주고, 열쇠 값은 보여 주지 않는다', async () => {
    at(OPEN_TIME);
    const { res } = await call('/docent/__status?at=2026-11-17T20:30');
    const body = await res.json();
    assert.equal(body.settings.DOCENT_KEY, '설정됨');
    assert.equal(body.hours.openNow, true);
    assert.deepEqual(body.checkAt, { at: '2026-11-17 20:30', open: false }); // 마지막 날은 20:00 마감
    assert.equal(JSON.stringify(body).includes('test-key'), false);
  });
});

describe('운영진 입장', () => {
  const STAFF_ENV = { ...ENV, DOCENT_STAFF_KEY: 'staff-pass' };
  function post(key, env = STAFF_ENV) {
    const request = new Request('https://a-little-off.pages.dev/docent/__staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    return onRequest({ request, env, next: async () => new Response('x') });
  }

  test('비밀번호가 맞으면 운영 시간 전에도 QR 없이 페이지와 음성을 내준다', async () => {
    at(Date.parse('2026-11-12T11:00:00+09:00')); // 첫날 개관 전
    const res = await post('staff-pass');
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);
    const cookie = res.headers.get('Set-Cookie').split(';')[0];
    assert.match(cookie, /^docent_staff=/);
    for (const path of ['/docent/', '/docent/audio/%EC%84%9C%EB%AC%B8.mp3']) {
      const { res: r, passed } = await call(path, { env: STAFF_ENV, cookie });
      assert.equal(r.status, 200);
      assert.equal(passed, true);
      assert.equal(r.headers.get('Cache-Control'), 'private, no-store');
    }
    // 운영진 입장이 없으면 그대로 막힌다
    assert.equal((await call('/docent/', { env: STAFF_ENV })).res.status, 403);
  });

  test('틀린 비밀번호 · 설정 없음 · GET 은 막는다', async () => {
    at(OPEN_TIME);
    assert.equal((await post('nope')).status, 403);
    assert.equal((await post('staff-pass', ENV)).status, 503);
    const { res } = await call('/docent/__staff', { env: STAFF_ENV });
    assert.equal(res.status, 405);
  });

  test('12시간이 지나거나 위조된 운영진 입장권은 무효', async () => {
    at(OPEN_TIME);
    const cookie = (await post('staff-pass')).headers.get('Set-Cookie').split(';')[0];
    mock.timers.reset();
    at(OPEN_TIME + 12 * 3600 * 1000 + 1000);
    assert.equal((await call('/docent/', { env: STAFF_ENV, cookie })).res.status, 403);
    mock.timers.reset();
    at(CLOSED_TIME);
    const forged = cookie.replace(/\.[^.]+$/, '.forged');
    assert.equal((await call('/docent/', { env: STAFF_ENV, cookie: forged })).res.status, 403);
  });

  test('상태에 운영진 입장을 보여 주고, 비밀번호 값은 보여 주지 않는다', async () => {
    at(Date.parse('2026-11-12T11:00:00+09:00'));
    const cookie = (await post('staff-pass')).headers.get('Set-Cookie').split(';')[0];
    const { res } = await call('/docent/__status', { env: STAFF_ENV, cookie });
    const text = await res.text();
    assert.doesNotMatch(text, /staff-pass/);
    const body = JSON.parse(text);
    assert.equal(body.staff.valid, true);
    assert.equal(body.settings.DOCENT_STAFF_KEY, '설정됨');
    assert.match(body.gate, /^open: 운영진/);
  });
});

describe('개관 전 운영진 입장 칸 (도슨트 안내 화면)', () => {
  const STAFF_ENV = { ...ENV, DOCENT_STAFF_KEY: 'staff-pass' };

  test('첫 개관 전에는 안내 화면에 운영진 비밀번호 칸이 있다', async () => {
    at(Date.parse('2026-11-12T12:10:00+09:00'));
    for (const path of ['/docent/', '/docent/?k=wrong']) {
      const html = await (await call(path, { env: STAFF_ENV })).res.text();
      assert.match(html, /운영진 비밀번호/);
      assert.match(html, /\/docent\/__staff/);
      assert.doesNotMatch(html, /staff-pass/);
    }
  });

  test('비밀번호가 설정되지 않았으면 칸을 띄우지 않는다', async () => {
    at(Date.parse('2026-11-12T12:10:00+09:00'));
    const html = await (await call('/docent/')).res.text();
    assert.doesNotMatch(html, /운영진 비밀번호/);
  });

  test('개관(11/12 13:00) 뒤에는 칸이 사라진다', async () => {
    at(Date.parse('2026-11-12T13:00:00+09:00'));
    const html = await (await call('/docent/', { env: STAFF_ENV })).res.text();
    assert.match(html, /전시장에서 들어 주세요/);
    assert.doesNotMatch(html, /운영진 비밀번호/);
    mock.timers.reset();
    at(CLOSED_TIME);
    assert.doesNotMatch(await (await call('/docent/', { env: STAFF_ENV })).res.text(), /운영진 비밀번호/);
  });
});

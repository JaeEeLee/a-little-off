// functions/after-docent.js — 전시가 끝난 뒤에만 도슨트 글을 내준다
import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../../functions/after-docent.js';

const BEFORE_CLOSE = Date.parse('2026-11-17T19:59:00+09:00');
const AFTER_CLOSE = Date.parse('2026-11-17T20:00:00+09:00');
const ENV = { DOCENT_KEY: 'preview-key' };

afterEach(() => mock.timers.reset());

async function get(query, now, env = ENV) {
  mock.timers.reset();
  mock.timers.enable({ apis: ['Date'], now });
  const res = await onRequest({ request: new Request('https://a-little-off.pages.dev/after-docent' + query), env });
  return { res, body: await res.json() };
}

test('마감 전에는 글을 내보내지 않는다 (200 + ok:false)', async () => {
  const { res, body } = await get('?artist=' + encodeURIComponent('이재이'), BEFORE_CLOSE);
  assert.equal(res.status, 200);
  assert.equal(body.ok, false);
  assert.equal(body.paragraphs, undefined);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
});

test('마감 뒤에는 작가 도슨트 글을 내준다', async () => {
  const { body } = await get('?artist=' + encodeURIComponent('이재이'), AFTER_CLOSE);
  assert.equal(body.ok, true);
  assert.equal(body.title, '어디에 둘까요?');
  assert.ok(body.paragraphs.length > 3);
});

test('열쇠(k)가 맞으면 마감 전에도 미리 볼 수 있다', async () => {
  const ok = await get('?artist=' + encodeURIComponent('이재이') + '&k=preview-key', BEFORE_CLOSE);
  assert.equal(ok.body.ok, true);
  const wrong = await get('?artist=' + encodeURIComponent('이재이') + '&k=nope', BEFORE_CLOSE);
  assert.equal(wrong.body.ok, false);
});

test('열쇠 설정이 없으면 k 를 붙여도 미리 볼 수 없다', async () => {
  const { body } = await get('?artist=' + encodeURIComponent('이재이') + '&k=', BEFORE_CLOSE, {});
  assert.equal(body.ok, false);
});

test('글이 없는 작가는 언제나 ok:false', async () => {
  const { body } = await get('?artist=' + encodeURIComponent('홍림'), AFTER_CLOSE);
  assert.equal(body.ok, false);
});

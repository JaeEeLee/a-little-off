// functions/letters-data.js: 구글에서 받아 와 하루 보관, 실패는 보관하지 않음
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../../functions/letters-data.js';

function fakeCache() {
  const store = new Map();
  return {
    store,
    match: async (req) => (store.has(req.url) ? store.get(req.url).clone() : undefined),
    put: async (req, res) => store.set(req.url, res)
  };
}
async function call(url, cache) {
  globalThis.caches = { default: cache };
  const waits = [];
  const res = await onRequest({ request: new Request(url), waitUntil: (p) => waits.push(p) });
  await Promise.all(waits);
  return res;
}

test('처음엔 구글에서 받아 오고, 두 번째는 보관해 둔 것을 내준다', async () => {
  const cache = fakeCache();
  const fetchMock = mock.method(
    globalThis,
    'fetch',
    async () => new Response(JSON.stringify({ ok: true, notes: [{ message: 'a' }] }))
  );
  const r1 = await call('https://x.dev/letters-data?type=letters&artist=%EC%9D%B4%EC%9E%AC%EC%9D%B4', cache);
  assert.equal((await r1.json()).notes.length, 1);
  assert.match(r1.headers.get('Cache-Control'), /max-age=86400/);
  const r2 = await call('https://x.dev/letters-data?type=letters&artist=%EC%9D%B4%EC%9E%AC%EC%9D%B4', cache);
  assert.equal((await r2.json()).ok, true);
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.match(fetchMock.mock.calls[0].arguments[0], /type=letters&artist=%EC%9D%B4%EC%9E%AC%EC%9D%B4$/);
  // refresh=1 이면 다시 받아 온다
  await call('https://x.dev/letters-data?artist=%EC%9D%B4%EC%9E%AC%EC%9D%B4&refresh=1', cache);
  assert.equal(fetchMock.mock.callCount(), 2);
  fetchMock.mock.restore();
});

test('실패한 응답 · 이상한 응답은 보관하지 않는다', async () => {
  const cache = fakeCache();
  const f1 = mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ ok: false, error: 'closed' })));
  const r = await call('https://x.dev/letters-data?artist=a', cache);
  assert.equal((await r.json()).error, 'closed');
  assert.equal(cache.store.size, 0);
  f1.mock.restore();
  const f2 = mock.method(globalThis, 'fetch', async () => new Response('<html>오류</html>'));
  const r2 = await call('https://x.dev/letters-data?artist=a', cache);
  assert.equal(r2.status, 502);
  assert.equal(cache.store.size, 0);
  f2.mock.restore();
});

test('작가 이름이 없으면 400', async () => {
  const r = await call('https://x.dev/letters-data', fakeCache());
  assert.equal(r.status, 400);
});

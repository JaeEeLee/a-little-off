/**
 * 작가님께 온 편지 데이터 (/letters-data?artist=<본명>)
 *
 * 편지 페이지가 구글 Apps Script 를 직접 부르면 매번 몇 초씩 걸린다. 이제 쪽지가 더 쌓이지 않으므로
 * 여기서 한 번 받아 온 결과를 Cloudflare 캐시에 하루 보관하고, 그다음부터는 바로 내준다.
 * 글은 저장소에 두지 않는다 (공개 레포).
 *
 *  - ?refresh=1 을 붙이면 캐시를 건너뛰고 새로 받아 온다 (시트를 고친 뒤 바로 보고 싶을 때)
 *  - 실패한 응답은 보관하지 않는다
 */
const UPSTREAM =
  'https://script.google.com/macros/s/AKfycbz9oZZXBoCEBRYiXmML2QEUPuuK5gb1a4UqKDBBFDMhnSH3ud0gHYFVxLN8EM4yfnGEXg/exec';
const TTL = 24 * 60 * 60; // 하루
const VERSION = '1'; // 캐시를 한꺼번에 비우고 싶으면 숫자를 올린다

function json(body, status, extra) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign(
      {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Robots-Tag': 'noindex'
      },
      extra || {}
    )
  });
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const artist = (url.searchParams.get('artist') || '').trim();
  if (!artist || artist.length > 20) return json({ ok: false, error: 'artist' }, 400, { 'Cache-Control': 'no-store' });

  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(url.origin + '/letters-data?v=' + VERSION + '&artist=' + encodeURIComponent(artist));
  if (cache && url.searchParams.get('refresh') !== '1') {
    const hit = await cache.match(key);
    if (hit) return hit;
  }

  let data;
  try {
    const r = await fetch(UPSTREAM + '?type=letters&artist=' + encodeURIComponent(artist), { redirect: 'follow' });
    data = JSON.parse(await r.text());
  } catch (e) {
    return json({ ok: false, error: 'upstream' }, 502, { 'Cache-Control': 'no-store' });
  }
  if (!data || !data.ok) return json(data || { ok: false }, 200, { 'Cache-Control': 'no-store' });

  const res = json(data, 200, { 'Cache-Control': 'public, max-age=' + TTL });
  if (cache) context.waitUntil(cache.put(key, res.clone()));
  return res;
}

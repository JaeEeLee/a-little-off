/**
 * 작가님께 온 편지 데이터 (/letters-data?artist=<본명>)
 *
 * 편지 페이지가 구글 Apps Script 를 직접 부르면 매번 몇 초씩 걸린다. 그래서 받아 온 결과를 Cloudflare 캐시에
 * 10초 보관해 두고 그동안 여는 휴대폰에 바로 내준다. 쪽지를 보내면 편지 페이지가 ?refresh=1 로 곧바로
 * 최신본을 받아 보관본도 새것으로 바꾼다 (보낸 쪽지가 바로 보인다).
 * 휴대폰 브라우저에는 저장하지 말라고(no-store) 알린다. 저장해 두면 새 쪽지가 하루 동안 안 보인다.
 * 글은 저장소에 두지 않는다 (공개 레포).
 *
 *  - ?refresh=1 을 붙이면 캐시를 건너뛰고 새로 받아 온다 (시트를 고친 뒤 바로 보고 싶을 때)
 *  - 실패한 응답은 보관하지 않는다
 */
const UPSTREAM =
  'https://script.google.com/macros/s/AKfycbz9oZZXBoCEBRYiXmML2QEUPuuK5gb1a4UqKDBBFDMhnSH3ud0gHYFVxLN8EM4yfnGEXg/exec';
const TTL = 10; // 10초. 쪽지를 보내면 편지 페이지가 ?refresh=1 로 곧바로 새로 받아 둔다
const VERSION = '3'; // 캐시를 한꺼번에 비우고 싶으면 숫자를 올린다

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

  // 서버 보관용 사본에만 보관 기간을 적고, 휴대폰에 보내는 응답은 저장하지 않게 한다
  if (cache) context.waitUntil(cache.put(key, json(data, 200, { 'Cache-Control': 'public, max-age=' + TTL })));
  return json(data, 200, { 'Cache-Control': 'no-store' });
}

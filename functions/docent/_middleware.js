/**
 * 도슨트 현장 잠금 — /docent 아래 페이지와 음성 파일을 내보내기 전에 확인한다.
 *
 *  1. 전시장 QR(/docent?k=열쇠)로 들어오면 3시간짜리 입장권(쿠키)을 주고 주소에서 열쇠를 지운다
 *  2. 입장권이 없거나, 운영 시간이 아니면 "전시장에서 들어 주세요" 안내만 보여 준다
 *
 * Cloudflare Pages > 설정 > 변수 및 비밀(Production)에 넣는 값
 *  - DOCENT_KEY     QR 주소에 붙는 열쇠. 바꾸면 이전 QR은 더 이상 열리지 않는다
 *  - DOCENT_SECRET  입장권 서명용 비밀값. 밖으로 알려지지 않게 둔다
 *  - DOCENT_ALWAYS_OPEN  "true"면 운영 시간과 상관없이 연다 (전시 전 리허설용)
 *                        REHEARSAL_UNTIL 이 지나면 값이 남아 있어도 자동으로 무시한다
 * 두 값이 없으면 아무도 들어오지 못한다.
 *
 * 점검용 (잠금 없이 열린다. 열쇠·비밀값은 절대 보여 주지 않는다)
 *  - /docent/debug        점검 페이지
 *  - /docent/__status     지금 상태를 JSON으로. ?at=2026-11-14T15:00 이면 그 시각의 운영 여부도 알려 준다
 *                         ?logout=1 이면 이 휴대폰의 입장권을 지운다
 *  - /docent/tracks.js    도슨트 순서표 (작가·작품 이름뿐이라 공개돼도 괜찮다)
 */

const COOKIE = 'docent_pass';
const PASS_SECONDS = 3 * 60 * 60;   // 입장권 유효 시간 3시간

// 리허설 모드는 전시 첫날 0시(한국 시간)에 저절로 꺼진다
const REHEARSAL_UNTIL = new Date('2026-11-12T00:00:00+09:00');
function rehearsal(env, date) {
  return env.DOCENT_ALWAYS_OPEN === 'true' && date < REHEARSAL_UNTIL;
}

// 운영 시간 (한국 시간). 날짜: [여는 시각, 닫는 시각]
const HOURS = {
  '2026-11-12': ['13:00', '21:00'],
  '2026-11-13': ['11:00', '21:00'],
  '2026-11-14': ['11:00', '21:00'],
  '2026-11-15': ['11:00', '21:00'],
  '2026-11-16': ['11:00', '21:00'],
  '2026-11-17': ['11:00', '20:00']
};

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (url.pathname === '/docent/__status') return status(request, env, url);
  if (/^\/docent\/(debug(\.html)?|tracks\.js)$/.test(url.pathname)) {
    const res = await context.next();
    const out = new Response(res.body, res);
    out.headers.set('Cache-Control', 'no-store');
    out.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return out;
  }

  if (!env.DOCENT_KEY || !env.DOCENT_SECRET) return notice('closed', 503);
  if (!rehearsal(env, new Date()) && !isOpen(new Date())) return notice('hours', 403);

  const now = Math.floor(Date.now() / 1000);

  // QR로 들어왔다: 열쇠를 확인하고 입장권을 준다
  const key = url.searchParams.get('k');
  if (key !== null) {
    if (!sameText(key, env.DOCENT_KEY)) return notice('qr', 403);
    const exp = now + PASS_SECONDS;
    const pass = exp + '.' + await sign(String(exp), env.DOCENT_SECRET);
    url.searchParams.delete('k');
    return new Response(null, {
      status: 302,
      headers: {
        Location: url.pathname + url.search,   // #작가이름은 브라우저가 그대로 이어 붙인다
        'Set-Cookie': `${COOKIE}=${pass}; Path=/docent; Max-Age=${PASS_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
        'Cache-Control': 'no-store'
      }
    });
  }

  // 입장권 확인
  if ((await checkPass(request, env, now)).valid) {
    const res = await context.next();
    const out = new Response(res.body, res);
    out.headers.set('Cache-Control', 'private, no-store');
    out.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return out;
  }
  return notice('qr', 403);
}

/* ── 입장권 · 점검 ───────────────────────── */

async function checkPass(request, env, now) {
  const pass = readCookie(request.headers.get('Cookie') || '', COOKIE);
  if (!pass) return { present: false, valid: false, reason: '입장권 없음 (QR로 들어온 적이 없거나 3시간이 지남)' };
  const [exp, sig] = pass.split('.');
  if (!env.DOCENT_SECRET) return { present: true, valid: false, reason: 'DOCENT_SECRET 설정 없음' };
  if (!sig || !sameText(sig, await sign(exp, env.DOCENT_SECRET))) {
    return { present: true, valid: false, reason: '서명이 맞지 않음 (DOCENT_SECRET이 바뀌었거나 위조됨)' };
  }
  const left = Number(exp) - now;
  if (left <= 0) return { present: true, valid: false, reason: '유효 시간이 지남' };
  return { present: true, valid: true, reason: '유효', expiresKst: kstText(new Date(Number(exp) * 1000)), remainingMin: Math.floor(left / 60) };
}

async function status(request, env, url) {
  const nowDate = new Date();
  const now = Math.floor(nowDate.getTime() / 1000);
  const keySet = !!env.DOCENT_KEY, secretSet = !!env.DOCENT_SECRET;
  const alwaysOpen = rehearsal(env, nowDate);
  const rehearsalNote = env.DOCENT_ALWAYS_OPEN !== 'true' ? '꺼짐'
    : alwaysOpen ? 'true (리허설: 운영 시간 무시 · ' + kstText(REHEARSAL_UNTIL) + '에 자동으로 꺼짐)'
    : '설정은 남아 있지만 ' + kstText(REHEARSAL_UNTIL) + '이 지나 무시됨';
  const openNow = isOpen(nowDate);
  const pass = await checkPass(request, env, now);

  // 지금 /docent 를 열면 무엇이 보일지
  let gate;
  if (!keySet || !secretSet) gate = 'closed: 설정값이 없어 "도슨트 준비 중"';
  else if (!alwaysOpen && !openNow) gate = 'hours: 운영 시간이 아니라 막힘';
  else if (pass.valid) gate = 'open: 도슨트를 들을 수 있음';
  else gate = 'need_qr: 전시장 QR로 들어와야 함';

  const body = {
    nowKst: kstText(nowDate),
    gate,
    settings: { DOCENT_KEY: keySet ? '설정됨' : '없음', DOCENT_SECRET: secretSet ? '설정됨' : '없음', DOCENT_ALWAYS_OPEN: rehearsalNote },
    hours: { openNow, today: HOURS[kstText(nowDate).slice(0, 10)] || null, all: HOURS },
    pass,
    passSeconds: PASS_SECONDS
  };

  const at = url.searchParams.get('at');
  if (at) {
    const d = new Date(at.length <= 16 ? at + ':00+09:00' : at);
    body.checkAt = isNaN(d) ? { at, error: '날짜 형식: 2026-11-14T15:00' } : { at: kstText(d), open: isOpen(d) };
  }

  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  if (url.searchParams.get('logout') === '1') {
    headers['Set-Cookie'] = `${COOKIE}=; Path=/docent; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
    body.loggedOut = true;
  }
  return new Response(JSON.stringify(body, null, 2), { status: 200, headers });
}

function kstText(date) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ');
}

/* ── 도우미 ─────────────────────────────── */

function isOpen(date) {
  // 한국 시간으로 바꿔 날짜와 분을 구한다
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.toISOString().slice(0, 10);
  const hours = HOURS[day];
  if (!hours) return false;
  const min = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  return min >= toMin(hours[0]) && min < toMin(hours[1]);
}

function toMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

async function sign(text, secret) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const buf = await crypto.subtle.sign('HMAC', k, enc.encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// 길이가 같으면 끝까지 비교해서, 어디서 틀렸는지 시간으로 새지 않게 한다
function sameText(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readCookie(header, name) {
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return '';
}

const MESSAGES = {
  qr:     ['전시장에서 들어 주세요', '도슨트는 전시장 안의 QR 코드로만 열 수 있어요.<br>입장 후 3시간 동안 들을 수 있습니다.'],
  hours:  ['지금은 운영 시간이 아니에요', '도슨트는 전시 운영 시간에만 들을 수 있어요.<br>11. 12 (목) 13:00 – 11. 17 (화) 20:00<br>매일 11:00 – 21:00'],
  closed: ['도슨트 준비 중', '곧 들으실 수 있도록 준비하고 있어요.']
};

function notice(kind, status) {
  const [title, body] = MESSAGES[kind];
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${title} · 조금 이상한 우리들</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#FAFAFA;color:#332519;
font:15px/1.7 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif;text-align:center;padding:24px;box-sizing:border-box}
h1{margin:0 0 10px;font-size:1.3rem;letter-spacing:-.02em}p{margin:0;color:#6E6254;font-size:.9rem}
a{display:inline-block;margin-top:26px;padding:12px 20px;border:1px solid #E2DFD8;border-radius:10px;color:#332519;text-decoration:none;font-size:.85rem;background:#fff}
</style></head><body><main><h1>${title}</h1><p>${body}</p><a href="/">전시 안내 보기</a></main></body></html>`;
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
  });
}

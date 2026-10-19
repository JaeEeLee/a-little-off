/**
 * 로컬 테스트 서버 — Cloudflare Pages 가 정적 파일을 내주는 방식을 흉내 낸다.
 *  - 파일이 있으면 그 파일, 폴더면 그 안의 index.html
 *  - 확장자 없는 주소는 같은 이름의 .html 을 찾는다 (/docent/debug → docent/debug.html)
 *  - 그래도 없으면 /index.html (404.html 이 없을 때 Pages 의 SPA 대체 동작)
 * Pages Functions(/after-docent, /docent 잠금)는 돌리지 않는다. 그쪽은 unit/ 에서 따로 시험한다.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT || 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg'
};

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function resolvePath(urlPath) {
  const safe = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const base = join(ROOT, safe);
  if (!base.startsWith(ROOT)) return join(ROOT, 'index.html');
  for (const candidate of [base, join(base, 'index.html'), base + '.html']) {
    if (await isFile(candidate)) return candidate;
  }
  return join(ROOT, 'index.html');
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const file = await resolvePath(pathname);
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(body);
  } catch {
    res.writeHead(500).end();
  }
}).listen(PORT, () => console.log(`test server: http://localhost:${PORT}  (root: ${ROOT})`));

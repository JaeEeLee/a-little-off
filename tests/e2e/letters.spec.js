// 작가님께 온 편지 (/letters): 이름 고르기 → 열쇠 → 편지, 기억, 이미지 저장
import { test, expect } from './fixtures.js';

const EP = 'https://script.google.com/macros/s/LETTERS/exec';

async function fake(page) {
  const calls = [];
  await page.addInitScript((u) => (window.__LETTERS_ENDPOINT__ = u), EP);
  await page.route(EP + '**', async (route) => {
    const p = new URL(route.request().url()).searchParams;
    calls.push({ artist: p.get('artist'), code: p.get('code') });
    if (p.get('type') !== 'letters') return route.fulfill({ json: { ok: false } });
    if (p.get('artist') !== '이재이')
      return route.fulfill({ json: { ok: true, artist: p.get('artist'), label: p.get('artist'), notes: [], all: [] } });
    return route.fulfill({
      json: {
        ok: true,
        artist: '이재이',
        label: '재이',
        notes: [
          { message: '분홍색이 계속 생각나요', sender: '관람객', at: '2026-11-14T06:00:00.000Z' },
          { message: '응원해요!', sender: '', at: '2026-11-15T06:00:00.000Z' }
        ],
        all: [{ message: '모두 멋져요', sender: '친구', at: '2026-11-16T06:00:00.000Z' }],
        until: '2026-12-31T14:59:59.000Z'
      }
    });
  });
  return calls;
}

test('이름을 고르면 바로 그 작가의 편지가 열린다', async ({ page }) => {
  const calls = await fake(page);
  await page.goto('/letters/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('#names button')).toHaveCount(20);
  await page.locator('#names button', { hasText: '재이' }).click();
  await expect(page.locator('#letter')).toBeVisible();
  await expect(page.locator('#toName')).toHaveText('재이');
  await expect(page.locator('#count')).toHaveText('받은 글 2통 · 모두에게 남긴 글 1통');
  await expect(page.locator('#mine .note-card')).toHaveCount(2);
  await expect(page.locator('#mine .note-card').first()).toContainText('분홍색이 계속 생각나요');
  await expect(page.locator('#mine .note-card').first()).toContainText('From. 관람객');
  await expect(page.locator('#all .note-card')).toHaveCount(1);
  await expect(page.locator('#until')).toContainText('12월 31일');
  expect(calls.at(-1)).toEqual({ artist: '이재이', code: null }); // 열쇠 없이 이름만
});

test('한 번 연 휴대폰은 다음에 바로 열리고, 닫으면 다시 이름을 고른다', async ({ page }) => {
  await fake(page);
  await page.goto('/letters/');
  await page.locator('#names button', { hasText: '재이' }).click();
  await expect(page.locator('#letter')).toBeVisible();
  await page.reload();
  await expect(page.locator('#letter')).toBeVisible();
  await page.locator('#logout').click();
  await expect(page.locator('#pick')).toBeVisible();
  await page.reload();
  await expect(page.locator('#pick')).toBeVisible();
});

test('이미지로 저장: 편지를 이미지로 만들어 내려받는다', async ({ page }) => {
  await fake(page);
  // 그림 그리는 라이브러리는 가짜로 (실제 사이트는 cdnjs 에서 받는다)
  await page.route('https://cdnjs.cloudflare.com/**', (r) =>
    r.fulfill({
      contentType: 'application/javascript',
      body: 'window.html2canvas = function (el) { var c = document.createElement("canvas"); c.width = 10; c.height = 10; window.__drawn = (window.__drawn || []).concat(el.textContent); return Promise.resolve(c); };'
    })
  );
  await page.goto('/letters/');
  await page.locator('#names button', { hasText: '재이' }).click();
  const download = page.waitForEvent('download');
  await page.locator('#saveImg').click();
  await download; // 파일 이름은 이 시험용 브라우저가 무시해서 따로 보지 않는다
  await expect(page.locator('#saveMsg')).toHaveText('이미지 1장을 내려받았어요.');
  const drawn = await page.evaluate(() => window.__drawn);
  expect(drawn).toHaveLength(1);
  expect(drawn[0]).toContain('분홍색이 계속 생각나요');
  expect(drawn[0]).toContain('참여 작가 모두에게 남긴 글');
  expect(drawn[0]).toContain('운영진');
});

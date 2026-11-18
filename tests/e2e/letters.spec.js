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
  await expect(page.locator('#mine .note-card .note-from').first()).toHaveText('From. 관람객');
  await expect(page.locator('#mine .note-card .note-from').nth(1)).toHaveText('From. 익명'); // 보낸 사람이 비면 익명
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

test('PDF로 저장: 인쇄 창을 열고, 인쇄에는 편지 종이만 나온다', async ({ page }) => {
  await fake(page);
  await page.addInitScript(() => {
    window.print = () => (window.__printed = document.title);
  });
  await page.goto('/letters/');
  await page.locator('#names button', { hasText: '재이' }).click();
  await expect(page.locator('#pdfTip')).not.toBeEmpty();
  await page.locator('#savePdf').click();
  expect(await page.evaluate(() => window.__printed)).toBe('조금이상한우리들_재이_편지');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#sheet')).toBeVisible();
  await expect(page.locator('.actions')).toBeHidden();
  await expect(page.locator('.head')).toBeHidden();
});

test('관람객 쪽지가 없는 작가에게는 운영진 이름으로 그 작가만을 위한 글이 들어간다', async ({ page }) => {
  await fake(page);
  await page.goto('/letters/');
  await page.locator('#names button', { hasText: '홍림' }).click();
  await expect(page.locator('#count')).toHaveText('운영진이 전하는 글');
  await expect(page.locator('#mine .note-card.staff')).toHaveCount(1);
  await expect(page.locator('#mine .note-from')).toHaveText('From. 조금 이상한 우리들 운영진');
  await expect(page.locator('#mine .note-msg')).toContainText('강물');
  await page.locator('#logout').click();
  await page.locator('#names button', { hasText: '김지현' }).click();
  await expect(page.locator('#mine .note-msg')).toContainText('테이블');
});

test('한 번 연 편지는 휴대폰에 보관돼, 다음에는 서버가 느리거나 안 돼도 바로 보인다', async ({ page }) => {
  await fake(page);
  await page.goto('/letters/');
  await page.locator('#names button', { hasText: '재이' }).click();
  await expect(page.locator('#mine .note-card')).toHaveCount(2);
  await page.unroute(EP + '**');
  await page.route(EP + '**', (r) => r.abort()); // 서버가 안 되는 상황
  await page.reload();
  await expect(page.locator('#letter')).toBeVisible();
  await expect(page.locator('#mine .note-card')).toHaveCount(2);
  await expect(page.locator('#state')).toBeEmpty();
});

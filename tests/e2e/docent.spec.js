// 도슨트 플레이어 (/docent) — 잠금은 Pages Function 이 맡으므로 여기서는 화면만 본다
import { test, expect } from './fixtures.js';

test('순서표대로 목록을 그린다', async ({ page }) => {
  await page.goto('/docent/');
  const count = await page.evaluate(() => window.CHAPTERS.reduce((n, c) => n + c.tracks.length, 0));
  await expect(page.locator('#list button.track')).toHaveCount(count);
});

test('#작가명 으로 들어오면 그 작가의 도슨트를 불러온다', async ({ page }) => {
  await page.goto('/docent/#재이');
  await expect(page.locator('#nowName')).toContainText('재이');
});

test('점검 페이지가 열린다', async ({ page }) => {
  await page.route('**/docent/__status**', (r) =>
    r.fulfill({
      json: {
        nowKst: '2026-11-14 15:00',
        gate: 'need_qr: 전시장 QR로 들어와야 함',
        settings: { DOCENT_KEY: '설정됨', DOCENT_SECRET: '설정됨', DOCENT_ALWAYS_OPEN: '꺼짐' },
        hours: { openNow: true, today: ['11:00', '21:00'], all: {} },
        pass: { present: false, valid: false, reason: '입장권 없음' },
        passSeconds: 10800
      }
    })
  );
  await page.goto('/docent/debug');
  await expect(page.locator('h1')).toHaveText('도슨트 점검');
  await expect(page.locator('#statusList')).toContainText('설정됨');
});

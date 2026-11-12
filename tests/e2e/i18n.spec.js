// 한국어 ⇄ English 전환 (메인 · 도슨트)
import { test, expect } from './fixtures.js';

test('메인: ?lang=en 이면 영어로, 버튼을 누르면 한국어로 돌아가고 기억한다', async ({ page }) => {
  await page.goto('/?lang=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#infoSection h2')).toHaveText('Information');
  await expect(page.locator('#visitSubmit')).toHaveText('Reserve');
  await expect(page.locator('#langToggle')).toHaveText('한국어');
  await page.locator('#langToggle').click();
  await expect(page.locator('#infoSection h2')).toHaveText('전시 안내');
  await expect(page).not.toHaveURL(/lang=/);
  await page.reload();
  await expect(page.locator('#infoSection h2')).toHaveText('전시 안내');
  await expect(page.locator('#langToggle')).toHaveText('English');
});

test('휴대폰 언어가 영어면 처음부터 영어, 검색 로봇은 한국어', async ({ browser }) => {
  const en = await browser.newContext({ locale: 'en-US' });
  const p = await en.newPage();
  await p.route(/fonts\.|script\.google\.com/, (r) => r.abort());
  await p.goto('http://localhost:4173/');
  await expect(p.locator('#infoSection h2')).toHaveText('Information');
  await en.close();

  const bot = await browser.newContext({ locale: 'en-US', userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)' });
  const b = await bot.newPage();
  await b.route(/fonts\.|script\.google\.com/, (r) => r.abort());
  await b.goto('http://localhost:4173/');
  await expect(b.locator('#infoSection h2')).toHaveText('전시 안내');
  await bot.close();
});

test('작가 전용 페이지에는 언어 버튼이 없다', async ({ page }) => {
  await page.goto('/jessie');
  await expect(page.locator('#langToggle')).toHaveCount(0);
});

test('도슨트: 화면 문구 · 작가 이름 · 작품 제목이 영어로', async ({ page }) => {
  await page.addInitScript(() => {
    window.__DOCENT_LOG__ = '';
  });
  await page.goto('/docent/?lang=en#이재이');
  await expect(page.locator('h1')).toHaveText('Audio Guide');
  await expect(page.locator('#playAll')).toContainText('Play from the start');
  await expect(page.locator('#nowName')).toContainText('Jaei');
  await expect(page.locator('#nowName')).toContainText('Where Shall I Place It?');
  await expect(page.locator('.en-note')).toBeVisible();
  await page.locator('#noteBtn').click();
  await expect(page.locator('#noteTitle')).toHaveText('A note for Jaei');
});

test('도슨트 영어: 작품을 고르면 그 아래 영어 설명이 펼쳐지고, 다른 작품을 고르면 바뀐다', async ({ page }) => {
  await page.addInitScript(() => {
    window.__DOCENT_LOG__ = '';
  });
  await page.goto('/docent/?lang=en#이재이');
  const box = page.locator('.en-text');
  await expect(box).toHaveCount(1);
  await expect(box).toContainText('Oil on panel');
  await expect(box).toContainText('chess piece');
  await page.locator('#list button.track', { hasText: 'Heeji Lee' }).click();
  await expect(box).toHaveCount(1);
  await expect(box).toContainText('I am strange, and so are you.');
  await page.locator('#list button.track', { hasText: 'Introduction' }).click();
  await expect(box).toHaveCount(0);
});

test('도슨트 한국어에서는 영어 설명이 없다', async ({ page }) => {
  await page.goto('/docent/?lang=ko#이재이');
  await expect(page.locator('.en-text')).toHaveCount(0);
});

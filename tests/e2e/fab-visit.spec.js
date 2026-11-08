// 떠 있는 '관람 예약하기' 버튼: 언제 보이고 숨는지, 누르면 예약 카드로 가는지
import { test, expect, at } from './fixtures.js';

const fab = (page) => page.locator('#fabVisit');

async function scrollToY(page, y) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
}

test('첫 화면에서는 숨고, 내려가면 나타나고, 예약 카드에서는 숨는다', async ({ page, sheet }) => {
  await at(page, '2026-11-08T17:00:00');
  await page.goto('/');
  await expect(fab(page)).not.toHaveClass(/\bon\b/);

  await scrollToY(page, 800);
  await expect(fab(page)).toHaveClass(/\bon\b/);
  await expect(fab(page)).toContainText('관람 예약하기');

  await page.locator('#visitSection').scrollIntoViewIfNeeded();
  await expect(fab(page)).not.toHaveClass(/\bon\b/);
});

test('누르면 예약 카드로 내려간다', async ({ page, sheet }) => {
  await at(page, '2026-11-08T17:00:00');
  await page.goto('/');
  await scrollToY(page, 800);
  await fab(page).click();
  await expect(page.locator('#visitName')).toBeInViewport();
  await expect(fab(page)).not.toHaveClass(/\bon\b/);
});

test('예약을 마치면 사라지고, 다시 와도 띄우지 않는다', async ({ page, sheet }) => {
  await at(page, '2026-11-08T17:00:00');
  await page.goto('/');
  await page.locator('#visitName').fill('홍길동');
  await page.locator('#visitDate').selectOption('11/15(일)');
  await page.locator('#visitSubmit').click();
  await expect(page.locator('#visitDone')).toBeVisible();
  await expect(fab(page)).toHaveCount(0);

  await page.reload();
  await scrollToY(page, 800);
  await expect(fab(page)).toHaveCount(0);
});

test('작가 페이지에도 뜨고, 예약 전용 페이지에는 뜨지 않는다', async ({ page, sheet }) => {
  await at(page, '2026-11-08T17:00:00');
  await page.goto('/jessie');
  await scrollToY(page, 1600);
  await expect(fab(page)).toHaveClass(/\bon\b/);

  await page.goto('/jessie/visit');
  await expect(fab(page)).toHaveCount(0);
});

test('전시가 끝나면 띄우지 않는다', async ({ page, sheet }) => {
  await at(page, '2026-11-17T20:00:00');
  await page.goto('/');
  await scrollToY(page, 800);
  await expect(fab(page)).toHaveCount(0);
});

test('전시 소개는 맨 아래(감사 카드 앞)에 있다', async ({ page, sheet }) => {
  await page.goto('/');
  const ids = await page
    .locator('main section, body > section, section')
    .evaluateAll((els) => els.filter((e) => !e.hidden).map((e) => e.id));
  const visible = ids.filter(Boolean);
  expect(visible.indexOf('aboutSection')).toBe(visible.length - 1);
  expect(visible.indexOf('visitSection')).toBeLessThan(visible.indexOf('aboutSection'));
});

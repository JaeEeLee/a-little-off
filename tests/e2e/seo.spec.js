// 검색 노출: 메인만 색인, 작가 개인 페이지는 제외, 구조화 데이터가 올바른 형식인지
import { test, expect } from './fixtures.js';

test('메인: 대표 주소 · 설명 · 구조화 데이터(전시 일정)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://a-little-off.pages.dev/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^index/);
  const description = await page.locator('meta[name="description"]').getAttribute('content');
  expect(description).toContain('피시스 아카이브');

  const blocks = [].concat(JSON.parse(await page.locator('script[type="application/ld+json"]').textContent()));
  const data = blocks.find((b) => b['@type'] === 'ExhibitionEvent');
  expect(data).toBeTruthy();
  expect(new Date(data.startDate).toISOString()).toBe('2026-11-12T04:00:00.000Z'); // 13:00 KST
  expect(new Date(data.endDate).toISOString()).toBe('2026-11-17T11:00:00.000Z'); // 20:00 KST
  expect(data.location.address.streetAddress).toBe('신촌로 48');
  expect(data.offers).toMatchObject({ price: '5000', priceCurrency: 'KRW' });
});

for (const path of ['/jessie', '/jessie/visit']) {
  test(`작가 개인 페이지(${path})는 검색 제외`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^noindex/);
  });
}

test('robots.txt 와 sitemap.xml', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /docent/');
  expect(robots).toContain('Sitemap: https://a-little-off.pages.dev/sitemap.xml');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('<loc>https://a-little-off.pages.dev/</loc>');
});

test('전시 소개 · 자주 묻는 질문: 검색어가 보이는 글로 들어가 있고, 구조화 데이터와 같다', async ({ page }) => {
  await page.goto('/');
  const about = page.locator('#aboutSection');
  await expect(about).toBeVisible();
  for (const word of [
    '취미미술 단체전',
    '홍대 피시스 아카이브',
    '이상한 나라의 앨리스',
    '오디오 도슨트',
    '포토 스팟'
  ]) {
    await expect(about).toContainText(word);
  }
  await expect(page.locator('meta[name="keywords"]')).toHaveAttribute('content', /홍대 전시/);

  const questions = await about.locator('.faq summary').allTextContents();
  const blocks = [].concat(JSON.parse(await page.locator('script[type="application/ld+json"]').textContent()));
  const faq = blocks.find((b) => b['@type'] === 'FAQPage');
  expect(faq.mainEntity.map((q) => q.name)).toEqual(questions);

  await about.locator('summary', { hasText: '입장료' }).click();
  await expect(about.locator('details[open] p')).toHaveText('입장료는 5,000원이에요.');
});

test('전시 소개는 작가 · 예약 페이지에서는 숨는다', async ({ page }) => {
  await page.goto('/jessie');
  await expect(page.locator('#aboutSection')).toBeHidden();
});

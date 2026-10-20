// 작가 전용 페이지 (/jessie)
import { test, expect, at, SHEET } from './fixtures.js';

test('작품 카드가 열리고, 메인 전용 카드는 숨는다', async ({ page, sheet }) => {
  await page.goto('/jessie');
  await expect(page).toHaveTitle(/^재이 · /);
  await expect(page.locator('#workSection')).toBeVisible();
  for (const id of ['#artistsSection', '#noteSection', '#shareSection']) {
    await expect(page.locator(id)).toBeHidden();
  }
});

test('작품 사진을 누르면 전체 화면 뷰어가 열린다', async ({ page, sheet }) => {
  await page.goto('/jessie');
  await page.locator('.work-main .work-zoom').click();
  await expect(page.locator('#workViewer')).toBeVisible();
  await expect(page.locator('#viewerCount')).toHaveText(/^1 \/ \d+$/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#workViewer')).toBeHidden();
});

test.describe('쪽지 게시판', () => {
  test('처음 12장, 더 보기를 누를 때마다 12장씩', async ({ page, sheet }) => {
    await page.goto('/jessie');
    const visible = page.locator('#board .sticky:visible');
    await expect(visible).toHaveCount(12);
    await page.locator('#boardMore').click();
    await expect(visible).toHaveCount(18); // 가짜 쪽지 18장
    await expect(page.locator('#boardMoreRow')).toBeHidden();
  });

  test('하트 · 작은 쪽지 · 접힌 쪽지', async ({ page, sheet }) => {
    await page.goto('/jessie');
    // 보낸 사람이 '다진고기'면 하트, 길어도 접지 않는다
    const heart = page.locator('.sticky.is-heart');
    await expect(heart).toHaveCount(1);
    await expect(heart).toContainText('재이야 전시 축하해!');
    // 내용이 거의 없는 쪽지는 작게
    await expect(page.locator('.sticky.is-small', { hasText: 'ㅋㅋㅋㅋ' })).toHaveCount(1);
    await expect(page.locator('.sticky.is-small', { hasText: 'asdfgh' })).toHaveCount(1);
    // 긴 쪽지는 말줄임표로 접혔다가 누르면 펼쳐진다
    const long = page.locator('.sticky.is-clamped').first();
    await expect(long.locator('.sticky-msg')).toHaveText(/…$/);
    await long.click();
    await expect(long).toHaveAttribute('aria-expanded', 'true');
    await expect(long.locator('.sticky-msg')).toContainText('고민하게 됐어요');
  });

  test('이 페이지에서 쪽지를 보내면 게시판 맨 앞에 바로 붙는다', async ({ page, sheet }) => {
    await page.goto('/jessie');
    await expect(page.locator('#board .sticky').first()).toBeVisible();
    await page.locator('#noteMessage').fill('방금 쓴 쪽지');
    await page.locator('#noteSubmit').click();
    await expect.poll(() => sheet.posts.length).toBe(1);
    expect(sheet.posts[0].artist).toBe('이재이');
    await expect(page.locator('#board .sticky').first()).toContainText('방금 쓴 쪽지');
  });

  test('?to=board 로 들어오면 쪽지를 다 불러온 뒤 게시판으로 내려간다', async ({ page, sheet }) => {
    await page.goto('/jessie?to=board');
    await expect
      .poll(() => page.evaluate(() => Math.abs(document.getElementById('boardSection').getBoundingClientRect().top)))
      .toBeLessThan(40);
  });

  test('게시판을 불러오지 못하면 안내 문구를 보여 준다', async ({ page }) => {
    await page.route(SHEET, (r) => r.abort());
    await page.goto('/jessie');
    await expect(page.locator('#boardEmpty')).toContainText('불러오지 못했어요');
  });
});

test.describe('전시 후 도슨트 글', () => {
  test('공개 전에는 보이지 않는다', async ({ page, sheet }) => {
    await page.goto('/jessie');
    await expect(page.locator('#afterDocent')).toBeHidden();
    await expect(page.locator('#docentSoon')).toBeVisible();
  });

  test('서버가 글을 내주면 카드가 열린다', async ({ page, sheet }) => {
    await page.route('**/after-docent**', (r) =>
      r.fulfill({
        json: { ok: true, artist: '이재이', title: '어디에 둘까요?', paragraphs: ['첫 문단', '“마지막 질문”'] }
      })
    );
    await at(page, '2026-11-18T10:00:00');
    await page.goto('/jessie');
    await expect(page.locator('#afterDocent')).toBeVisible();
    await expect(page.locator('#afterDocentBody p')).toHaveCount(2);
    await expect(page.locator('#afterDocentBody .after-q')).toHaveText('“마지막 질문”');
    await expect(page.locator('#docentSoon')).toBeHidden();
  });
});

test('작품 카드 제목줄에 작가 인스타그램 링크', async ({ page, sheet }) => {
  await page.goto('/jessie');
  const link = page.locator('#workSection .artist-insta');
  await expect(link).toHaveText('@jaei_i');
  await expect(link).toHaveAttribute('href', 'https://www.instagram.com/jaei_i/');
});

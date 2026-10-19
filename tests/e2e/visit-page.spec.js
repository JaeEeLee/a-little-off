// 예약 전용 페이지 (/jessie/visit) — 장면을 페이드로 넘기는 구조
import { test, expect } from './fixtures.js';

const active = (page) => page.locator('.scene.is-active');
const activeName = (page) => active(page).getAttribute('aria-label');

/** 첫 진입 소개(표지 → 전시 안내)가 끝날 때까지 기다린다 */
async function afterIntro(page) {
  await expect(active(page)).toHaveAttribute('aria-label', '전시 안내', { timeout: 8000 });
  await page.waitForTimeout(700); // 장면이 바뀐 직후의 연속 넘기기 방지 시간(페이드 + 150ms)이 지나길 기다린다
}

test('사진을 받는 동안은 로딩 막대, 받은 뒤 표지 → 3초 안에 전시 안내', async ({ page, sheet }) => {
  let release;
  const gate = new Promise((r) => (release = r));
  await page.route('**/assets/img/poster-hero.jpg', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto('/jessie/visit', { waitUntil: 'domcontentloaded' }); // 사진을 잡아 두었으니 load 는 기다리지 않는다
  await expect(page.locator('html')).toHaveClass(/visit-loading/);
  await page.waitForTimeout(1500);
  await expect(page.locator('html')).toHaveClass(/visit-loading/); // 아직 기다리는 중
  release();
  await expect(active(page)).toHaveAttribute('aria-label', '표지');
  await expect(page.locator('html')).not.toHaveClass(/visit-loading/);
  await expect(active(page)).toHaveAttribute('aria-label', '전시 안내', { timeout: 4000 });
});

test('받는 중이라도 아래로 넘기면 바로 전시 안내로 간다', async ({ page, sheet }) => {
  await page.route('**/assets/img/poster-hero.jpg', () => {}); // 끝까지 오지 않는 사진
  await page.goto('/jessie/visit', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveClass(/visit-loading/);
  await page.keyboard.press('ArrowDown');
  await expect(active(page)).toHaveAttribute('aria-label', '전시 안내');
  await expect(page.locator('html')).not.toHaveClass(/visit-loading/);
});

test('장면 구성과 순서', async ({ page, sheet }) => {
  await page.goto('/jessie/visit');
  await afterIntro(page);
  const names = await page.locator('.scene').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(names).toEqual([
    '표지',
    '전시 안내',
    '관람 예약',
    '인사말',
    '작가에게 한마디',
    '조금 이상한 질문',
    '고맙습니다'
  ]);
  await expect(page.locator('#workSection')).toBeHidden();
  await expect(page.locator('#board')).toBeHidden();
});

test('키보드 · 휠 · 점으로 한 장씩 넘긴다', async ({ page, sheet }) => {
  await page.goto('/jessie/visit');
  await afterIntro(page);
  await page.keyboard.press('ArrowDown');
  await expect(active(page)).toHaveAttribute('aria-label', '관람 예약');
  await page.waitForTimeout(700);
  await page.keyboard.press('ArrowUp');
  await expect(active(page)).toHaveAttribute('aria-label', '전시 안내');
  await page.waitForTimeout(700);
  await page.mouse.move(200, 300);
  await page.mouse.wheel(0, 200);
  await expect(active(page)).toHaveAttribute('aria-label', '관람 예약');
  await page.locator('.scene-dots button').nth(5).click();
  await expect(active(page)).toHaveAttribute('aria-label', '조금 이상한 질문');
});

test('트랙패드 관성(짧은 휠 연타)으로는 한 장만 넘어간다', async ({ page, sheet }) => {
  await page.goto('/jessie/visit');
  await afterIntro(page);
  await page.mouse.move(200, 300);
  for (let i = 0; i < 15; i++) {
    await page.mouse.wheel(0, 40);
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(800);
  expect(await activeName(page)).toBe('관람 예약');
});

test.describe('예약으로 이어지는 길', () => {
  test('방문 날짜 기본값은 작가가 있는 날(11/14)', async ({ page, sheet }) => {
    await page.goto('/jessie/visit');
    await afterIntro(page);
    await expect(page.locator('#visitDate')).toHaveValue('11/14(토)');
    await expect(page.locator('.cal-day.picked')).toHaveAttribute('data-day', '14');
  });

  test('달력 날짜를 누르면 그 날짜로 예약 장면에 간다', async ({ page, sheet }) => {
    await page.goto('/jessie/visit');
    await afterIntro(page);
    await page.locator('.cal-day[data-day="16"]').click();
    await expect(active(page)).toHaveAttribute('aria-label', '관람 예약');
    await expect(page.locator('#visitDate')).toHaveValue('11/16(월)');
  });

  test('예약 폼은 이름 · 날짜만, 동행은 펼쳐야 보인다', async ({ page, sheet }) => {
    await page.goto('/jessie/visit');
    await afterIntro(page);
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#visitArtist')).toBeHidden();
    await expect(page.locator('#visitParty')).toBeHidden();
    await page.locator('.party-toggle').click();
    await expect(page.locator('#visitParty')).toBeVisible();
  });

  test('예약을 마치면 장면마다 있는 예약 버튼이 "예약 완료"로 바뀐다', async ({ page, sheet }) => {
    await page.goto('/jessie/visit');
    await afterIntro(page);
    await active(page).locator('.visit-cta').click();
    await expect(active(page)).toHaveAttribute('aria-label', '관람 예약');
    await page.locator('#visitName').fill('홍길동');
    await page.locator('#visitSubmit').click();
    await expect.poll(() => sheet.posts.length).toBe(1);
    expect(sheet.posts[0]).toMatchObject({ type: 'reservation', name: '홍길동', date: '11/14(토)', artist: '이재이' });
    await page.locator('.scene-dots button').nth(3).click();
    await expect(active(page).locator('.visit-cta')).toHaveText('예약 완료 ✓');
  });
});

test('쪽지 장면: 게시판은 작가 페이지로 연결된다', async ({ page, sheet }) => {
  await page.goto('/jessie/visit');
  await afterIntro(page);
  await page.locator('.scene-dots button').nth(4).click();
  await expect(page.locator('.board-link')).toHaveAttribute('href', '/jessie?to=board');
  await expect(page.locator('#notePrivacy')).toContainText('감상평');
});

test('글을 입력하는 동안은 장면이 넘어가지 않는다', async ({ page, sheet }) => {
  await page.goto('/jessie/visit');
  await afterIntro(page);
  await page.keyboard.press('ArrowDown');
  await expect(active(page)).toHaveAttribute('aria-label', '관람 예약');
  await page.locator('#visitName').click();
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(700);
  expect(await activeName(page)).toBe('관람 예약');
});

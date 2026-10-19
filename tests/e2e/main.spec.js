// 메인 페이지 (/) 와 작가 공유 링크 (/#이름)
import { test, expect, at } from './fixtures.js';

test.describe('D-day', () => {
  test('전시 전에는 오픈까지 남은 날', async ({ page }) => {
    await at(page, '2026-10-20T10:00:00');
    await page.goto('/');
    await expect(page.locator('#ddayNum')).toHaveText('D-23');
    await expect(page.locator('#ddayLabel')).toHaveText('전시 오픈까지');
  });

  test('전시 중에는 며칠째인지, 그리고 지금 근무자를 보여 준다', async ({ page }) => {
    await at(page, '2026-11-14T15:30:00');
    await page.goto('/');
    await expect(page.locator('#ddayNum')).toHaveText('3일차');
    const onduty = page.locator('#ondutySection');
    await expect(onduty).toBeVisible();
    await expect(onduty.locator('#ondutyList')).toContainText('이재이');
  });

  test('전시가 끝나면 종료', async ({ page }) => {
    await at(page, '2026-11-18T10:00:00');
    await page.goto('/');
    await expect(page.locator('#ddayNum')).toHaveText('종료');
    await expect(page.locator('#ondutySection')).toBeHidden();
  });
});

test('콘솔 인사 아트가 찍힌다', async ({ page }) => {
  const logs = [];
  page.on('console', (m) => logs.push(m.text()));
  await page.goto('/');
  await expect.poll(() => logs.some((t) => t.includes('뭣이 궁금헌디'))).toBe(true);
});

test('조금 이상한 질문: 이 기기에서 본 질문은 다음 방문 때 뒤로 밀린다', async ({ page }) => {
  await page.goto('/');
  const seen = new Set();
  for (let i = 0; i < 4; i++) {
    seen.add(await page.locator('#questText').textContent());
    await page.locator('#questNext').click();
    await page.waitForTimeout(450);
  }
  await page.reload();
  const first = await page.locator('#questText').textContent();
  expect(seen.has(first)).toBe(false);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('alo.seenQuestions') || '[]'));
  expect(stored.length).toBeGreaterThanOrEqual(4);
});

test('작가 공유 링크(/#재이)는 초대 문구를 띄우고 예약 작가를 미리 골라 둔다', async ({ page, sheet }) => {
  await page.goto('/#재이');
  await expect(page.locator('#inviteLine')).toHaveText('재이 작가가 초대합니다');
  await expect(page.locator('#visitArtist')).toHaveValue('이재이');
});

test.describe('작가에게 한마디', () => {
  test('연락처가 들어간 쪽지는 보내지 않는다', async ({ page, sheet }) => {
    await page.goto('/');
    await page.locator('.artists li', { hasText: '재이' }).click();
    await page.locator('#noteMessage').fill('연락 주세요 010-1234-5678');
    await page.locator('#noteSubmit').click();
    await expect(page.locator('#noteStatus')).toContainText('전화번호');
    expect(sheet.posts).toHaveLength(0);
  });

  test('고른 작가에게 쪽지를 보낸다', async ({ page, sheet }) => {
    await page.goto('/');
    await page.locator('.artists li', { hasText: '재이' }).click();
    await page.locator('#noteMessage').fill('전시 축하해요!');
    await page.locator('#noteSender').fill('친구');
    await page.locator('#noteSubmit').click();
    await expect.poll(() => sheet.posts.length).toBe(1);
    expect(sheet.posts[0]).toMatchObject({ artist: '이재이', message: '전시 축하해요!', sender: '친구' });
    await expect(page.locator('#noteDone')).toBeVisible();
  });
});

test.describe('관람 예약', () => {
  test('이름이 없으면 막는다', async ({ page, sheet }) => {
    await page.goto('/');
    await page.locator('#visitDate').selectOption('11/13(금)');
    await page.locator('#visitSubmit').click();
    await expect(page.locator('#visitStatus')).toContainText('성함');
    expect(sheet.posts).toHaveLength(0);
  });

  test('예약을 시트로 보내고 완료 안내를 보여 준다', async ({ page, sheet }) => {
    await page.goto('/');
    await page.locator('#visitName').fill('홍길동');
    await page.locator('#visitDate').selectOption('11/15(일)');
    await page.locator('#visitParty').selectOption('2');
    await page.locator('#visitSubmit').click();
    await expect.poll(() => sheet.posts.length).toBe(1);
    expect(sheet.posts[0]).toMatchObject({ type: 'reservation', name: '홍길동', date: '11/15(일)', companions: '2' });
    await expect(page.locator('#visitDone')).toBeVisible();
    await expect(page.locator('#visitDoneSub')).toContainText('11월 15일');
  });
});

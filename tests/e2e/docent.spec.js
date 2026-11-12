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

test.describe('재생 횟수를 시트에 남긴다', () => {
  const LOG = 'https://script.google.com/macros/s/DOCENT_LOG/exec';
  async function setup(page) {
    const posts = [];
    await page.addInitScript((u) => (window.__DOCENT_LOG__ = u), LOG);
    await page.route(LOG, async (route) => {
      posts.push(JSON.parse(route.request().postData()));
      await route.fulfill({ json: { ok: true } });
    });
    return posts;
  }
  const playing = (page) => page.evaluate(() => document.getElementById('audio').dispatchEvent(new Event('playing')));

  test('이름을 눌러 소리가 나면 한 번 보낸다 (이름 · 순서 · 어떻게 · 익명 번호만)', async ({ page }) => {
    const posts = await setup(page);
    await page.goto('/docent/');
    await page.locator('#list button.track', { hasText: '재이' }).click();
    await playing(page);
    await playing(page); // 같은 재생에서 'playing'이 또 와도 한 번만
    await expect.poll(() => posts.length).toBe(1);
    expect(posts[0]).toMatchObject({ type: 'docent_play', name: '재이', work: '어디에 둘까요?', how: 'tap' });
    expect(posts[0].order).toBeGreaterThan(0);
    expect(posts[0].device).toMatch(/^[a-z0-9]{6,24}$/);
    expect(Object.keys(posts[0]).sort()).toEqual(['device', 'how', 'name', 'order', 'type', 'work']);
  });

  test('#이름 링크로 바로 들어와도 tap, 다음으로 넘어가면 next', async ({ page }) => {
    const posts = await setup(page);
    await page.goto('/docent/#이재이');
    await playing(page);
    await expect.poll(() => posts.length).toBe(1);
    expect(posts[0]).toMatchObject({ name: '재이', how: 'tap' });
    await page.locator('#next').click();
    await playing(page);
    await expect.poll(() => posts.length).toBe(2);
    expect(posts[1].how).toBe('next');
  });

  test('같은 작품을 10분 안에 다시 들으면 세지 않는다', async ({ page }) => {
    const posts = await setup(page);
    await page.goto('/docent/');
    const jae = page.locator('#list button.track', { hasText: '재이' });
    await jae.click();
    await playing(page);
    await expect.poll(() => posts.length).toBe(1);
    await jae.click();
    await playing(page);
    await page.waitForTimeout(300);
    expect(posts).toHaveLength(1);
  });
});

test.describe('도슨트에서 작가에게 한마디', () => {
  const NOTE = 'https://script.google.com/macros/s/NOTE/exec';
  async function setup(page) {
    const posts = [];
    await page.addInitScript((u) => {
      window.__NOTE_ENDPOINT__ = u;
      window.__DOCENT_LOG__ = '';
    }, NOTE);
    await page.route(NOTE, async (route) => {
      posts.push(JSON.parse(route.request().postData()));
      await route.fulfill({ json: { ok: true } });
    });
    return posts;
  }

  test('작가 작품을 들으면 한마디 버튼이 뜨고, 그 작가에게 보낸다', async ({ page }) => {
    const posts = await setup(page);
    await page.goto('/docent/');
    await expect(page.locator('#noteBtn')).toBeHidden();
    await page.locator('#list button.track', { hasText: '정연' }).click();
    await expect(page.locator('#noteBtn')).toBeVisible();
    await page.locator('#noteBtn').click();
    await expect(page.locator('#noteTitle')).toHaveText('정연 작가에게 한마디');
    await expect(page.locator('#notePrivacy')).toHaveText('쪽지는 작가에게만 전해져요.');
    await page.locator('#noteMsg').fill('그림 정말 좋았어요');
    await page.locator('#noteFrom').fill('관람객');
    await page.locator('#noteSend').click();
    await expect(page.locator('#noteDone')).toBeVisible();
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ artist: '배정연', message: '그림 정말 좋았어요', sender: '관람객' });
    await page.locator('#noteDoneClose').click();
    await expect(page.locator('#noteSheet')).toBeHidden();
  });

  test('서문 · 연결 안내에서는 버튼이 숨고, 아래 버튼은 모두에게 보낸다', async ({ page }) => {
    const posts = await setup(page);
    await page.goto('/docent/');
    await page.locator('#list button.track', { hasText: '전시 서문' }).click();
    await expect(page.locator('#noteBtn')).toBeHidden();
    await page.locator('#noteAll').click();
    await expect(page.locator('#noteTitle')).toHaveText('참여 작가 모두에게 한마디');
    await page.locator('#noteMsg').fill('모두 멋져요');
    await page.locator('#noteSend').click();
    await expect(page.locator('#noteDone')).toBeVisible();
    expect(posts[0]).toMatchObject({ artist: '전체', message: '모두 멋져요' });
  });

  test('빈 글 · 연락처는 막고, 재이는 게시판에 붙는다고 알려 준다', async ({ page }) => {
    const posts = await setup(page);
    await page.goto('/docent/#이재이');
    await page.locator('#noteBtn').click();
    await expect(page.locator('#notePrivacy')).toContainText('작가 페이지의 쪽지 게시판에 붙어요');
    await page.locator('#noteSend').click();
    await expect(page.locator('#noteStatus')).toHaveText('남기고 싶은 말을 적어 주세요.');
    await page.locator('#noteMsg').fill('연락주세요 010-1234-5678');
    await page.locator('#noteSend').click();
    await expect(page.locator('#noteStatus')).toHaveText('전화번호는 적지 않으셔도 됩니다.');
    expect(posts).toHaveLength(0);
  });
});

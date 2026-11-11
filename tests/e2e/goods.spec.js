// 굿즈 판매 장부 (/goods): 담기 · 기록 · 합계 · 취소 · 비밀번호 · 신호 끊김 · 연습 모드
import { test, expect, at } from './fixtures.js';

const ENDPOINT = 'https://script.google.com/macros/s/GOODS/exec';

/** Apps Script(docs/apps-script/goods.gs)를 흉내 내는 가짜 시트 */
async function fakeSheet(page, { pin = '1234', items, openAt = '2000-01-01T00:00:00Z' } = {}) {
  const sheet = {
    pin,
    items: items || [
      { name: '엽서', price: 2000 },
      { name: '마그넷', price: 5000 },
      { name: '키링', price: null }
    ],
    sales: [],
    posts: [],
    down: false
  };
  await page.addInitScript(
    ([u, o]) => {
      window.__GOODS_ENDPOINT__ = u;
      if (o) window.__GOODS_OPEN_AT__ = o; // 기본은 이미 시작한 전시. null 이면 실제 시작 시각
    },
    [ENDPOINT, openAt]
  );
  await page.route(ENDPOINT + '**', async (route) => {
    if (sheet.down) return route.abort();
    const req = route.request();
    if (req.method() === 'GET') {
      const p = new URL(req.url()).searchParams;
      if (p.get('pin') !== sheet.pin) return route.fulfill({ json: { ok: false, error: 'pin' } });
      return route.fulfill({ json: { ok: true, items: sheet.items, sales: sheet.sales } });
    }
    const b = JSON.parse(req.postData());
    sheet.posts.push(b);
    if (b.pin !== sheet.pin) return route.fulfill({ json: { ok: false, error: 'pin' } });
    if (b.type === 'sale') {
      if (!sheet.sales.some((s) => s.id === b.id)) {
        const lines = b.lines.map((l) => ({ ...l, price: sheet.items.find((i) => i.name === l.name).price }));
        const amount = lines.reduce((t, l) => t + l.price * l.qty, 0);
        sheet.sales.push({ id: b.id, at: b.at, pay: b.pay, lines, amount, cancelled: false });
      }
    } else if (b.type === 'cancel') {
      sheet.sales.filter((s) => s.id === b.id).forEach((s) => (s.cancelled = true));
    }
    return route.fulfill({ json: { ok: true } });
  });
  return sheet;
}

async function openWithPin(page, pin = '1234') {
  await page.goto('/goods');
  await page.locator('#pin').fill(pin);
  await page.getByRole('button', { name: '열기' }).click();
  await expect(page.locator('#app')).toBeVisible();
}

test('비밀번호가 틀리면 열리지 않고, 맞으면 장부가 열린다', async ({ page }) => {
  await fakeSheet(page);
  await page.goto('/goods');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('#lock')).toBeVisible();
  await page.locator('#pin').fill('9999');
  await page.getByRole('button', { name: '열기' }).click();
  await expect(page.locator('#lockMsg')).toHaveText('비밀번호가 맞지 않아요.');
  await expect(page.locator('#app')).toBeHidden();

  await page.locator('#pin').fill('1234');
  await page.getByRole('button', { name: '열기' }).click();
  await expect(page.locator('#app')).toBeVisible();
  // 다시 열면 비밀번호를 묻지 않는다
  await page.reload();
  await expect(page.locator('#app')).toBeVisible();
});

for (const width of [360, 390]) {
  test(`잠금 화면(${width}px): 입력칸과 버튼이 카드 안에 들어가고, 빈 상태 알약은 숨는다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 760 });
    await fakeSheet(page);
    await page.goto('/goods');
    const card = await page.locator('#lock').boundingBox();
    for (const sel of ['#pin', '#lock button[type="submit"]']) {
      const box = await page.locator(sel).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(card.x);
      expect(box.x + box.width).toBeLessThanOrEqual(card.x + card.width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.locator('#sync')).toBeHidden();
  });
}

test('비밀번호는 입력한 때부터 48시간 동안만 기억한다', async ({ page }) => {
  await fakeSheet(page);
  // 47시간 전에 입력한 비밀번호 → 그대로 열린다
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('alo.goods.pin', JSON.stringify({ v: '1234', exp: Date.now() + 1 * 3600e3 }));
    }
  });
  await page.goto('/goods');
  await expect(page.locator('#app')).toBeVisible();

  // 48시간이 지난 비밀번호 → 잠기고 다시 묻는다
  await page.evaluate(() =>
    localStorage.setItem('alo.goods.pin', JSON.stringify({ v: '1234', exp: Date.now() - 1000 }))
  );
  await page.reload();
  await expect(page.locator('#lock')).toBeVisible();
  await expect(page.locator('#app')).toBeHidden();
});

test('예전 방식으로 기한 없이 저장된 비밀번호는 48시간 기한으로 바뀐다', async ({ page }) => {
  await fakeSheet(page);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('alo.goods.pin', JSON.stringify('1234'));
    }
  });
  await page.goto('/goods');
  await expect(page.locator('#app')).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('alo.goods.pin')));
  expect(saved.v).toBe('1234');
  expect(saved.exp - Date.now()).toBeGreaterThan(47 * 3600e3);
});

test('굿즈를 담아 기록하면 판매 개수와 총 판매금액이 쌓인다', async ({ page }) => {
  await at(page, '2026-11-14T15:00:00');
  const sheet = await fakeSheet(page);
  await openWithPin(page);

  // 가격이 빈 굿즈는 누를 수 없다
  await expect(page.locator('.item[data-name="키링"]')).toBeDisabled();

  await page.locator('.item[data-name="엽서"]').click();
  await page.locator('.item[data-name="엽서"]').click();
  await page.locator('.item[data-name="마그넷"]').click();
  await expect(page.locator('.item[data-name="엽서"] .badge')).toHaveText('2');
  await page.getByRole('radio', { name: '계좌이체' }).click();
  await expect(page.locator('#cartSubmit')).toHaveText('9,000원 판매 기록');
  await page.locator('#cartSubmit').click();

  await expect(page.locator('#cart')).toBeHidden();
  await expect(page.locator('#sumTotal')).toHaveText('9,000');
  await expect(page.locator('#sumSub')).toHaveText('굿즈 3개 · 판매 1건');
  await expect(page.locator('#byItem')).toContainText('엽서2개4,000원');
  await expect(page.locator('#byPay')).toHaveText('계좌이체 9,000원');
  await expect(page.locator('#sync')).toHaveText(/저장됨/);

  const sale = sheet.posts.find((p) => p.type === 'sale');
  expect(sale).toMatchObject({ pin: '1234', pay: '계좌이체' });
  expect(sale.lines).toEqual([
    { name: '엽서', price: 2000, qty: 2 },
    { name: '마그넷', price: 5000, qty: 1 }
  ]);

  // 담은 뒤 빼기
  await page.locator('.item[data-name="엽서"]').click();
  await page.getByRole('button', { name: '엽서 하나 빼기' }).click();
  await expect(page.locator('#cart')).toBeHidden();
});

test('취소는 두 번 눌러야 되고, 합계에서 빠진다', async ({ page }) => {
  await at(page, '2026-11-14T15:00:00');
  const sheet = await fakeSheet(page);
  await openWithPin(page);
  await page.locator('.item[data-name="마그넷"]').click();
  await page.locator('#cartSubmit').click();
  await expect(page.locator('#sumTotal')).toHaveText('5,000');

  const cancel = page.locator('#recent li').first().getByRole('button');
  await cancel.click();
  await expect(cancel).toHaveText('정말 취소');
  expect(sheet.posts.filter((p) => p.type === 'cancel')).toHaveLength(0);
  await cancel.click();
  await expect(page.locator('#sumTotal')).toHaveText('0');
  await expect(page.locator('#recent li').first()).toHaveClass(/cancelled/);
  expect(sheet.posts.filter((p) => p.type === 'cancel')).toHaveLength(1);
});

test('오늘 / 전체: 다른 날 판매는 전체에만 들어가고 날짜별로 나뉜다', async ({ page }) => {
  await at(page, '2026-11-14T15:00:00');
  const sheet = await fakeSheet(page);
  sheet.sales.push({
    id: 'gold01',
    at: '2026-11-13T05:00:00.000Z',
    pay: '현금',
    lines: [{ name: '엽서', price: 2000, qty: 3 }],
    amount: 6000,
    cancelled: false
  });
  await openWithPin(page);
  await expect(page.locator('#sumLabel')).toHaveText('11월 14일 (토) 판매금액');
  await expect(page.locator('#sumTotal')).toHaveText('0');

  await page.getByRole('tab', { name: '전체' }).click();
  await expect(page.locator('#sumTotal')).toHaveText('6,000');
  await expect(page.locator('#byDay')).toContainText('11월 13일 (금)3개6,000원');
});

test('신호가 끊겨도 기록이 휴대폰에 남았다가, 연결되면 한 번만 보낸다', async ({ page }) => {
  await at(page, '2026-11-14T15:00:00');
  const sheet = await fakeSheet(page);
  await openWithPin(page);

  sheet.down = true;
  await page.locator('.item[data-name="엽서"]').click();
  await page.locator('#cartSubmit').click();
  await expect(page.locator('#sync')).toHaveText('전송 대기 1건');
  await expect(page.locator('#sumTotal')).toHaveText('2,000'); // 화면에는 바로 반영
  await expect(page.locator('#recent li').first()).toHaveClass(/pending/);

  // 새로 고쳐도 사라지지 않는다
  await page.reload();
  await expect(page.locator('#sync')).toHaveText('전송 대기 1건');

  sheet.down = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.locator('#sync')).toHaveText(/저장됨/);
  expect(sheet.sales).toHaveLength(1);
  await expect(page.locator('#sumTotal')).toHaveText('2,000');
});

test('기록 직후 되돌리기를 누르면 판매가 빠지고 굿즈가 장바구니로 돌아온다', async ({ page }) => {
  const sheet = await fakeSheet(page);
  await openWithPin(page);
  await page.locator('.item[data-name="엽서"]').click();
  await page.locator('#cartSubmit').click();
  await expect(page.locator('#done')).toBeVisible();
  await expect(page.locator('#doneTitle')).toHaveText('2,000원 · 현금 기록 완료');
  await page.locator('#doneUndo').click();
  await expect(page.locator('#done')).toBeHidden();
  await expect(page.locator('#sumTotal')).toHaveText('0');
  await expect(page.locator('#cart')).toBeVisible();
  await expect(page.locator('.item[data-name="엽서"] .badge')).toHaveText('1');
  // 이미 보냈다면 취소가 따라가고, 아직이면 보내지 않는다 — 어느 쪽이든 시트 합계는 0
  await expect.poll(() => sheet.sales.filter((s) => !s.cancelled).length).toBe(0);
});

test('기록 알림은 X로 바로 닫히고, 다음 굿즈를 담아도 닫힌다', async ({ page }) => {
  await fakeSheet(page);
  await openWithPin(page);
  await page.locator('.item[data-name="엽서"]').click();
  await page.locator('#cartSubmit').click();
  await expect(page.locator('#done')).toBeVisible();
  await page.getByRole('button', { name: '닫기' }).click();
  await expect(page.locator('#done')).toBeHidden();
  await expect(page.locator('#sumTotal')).toHaveText('2,000'); // 닫아도 기록은 그대로

  await page.locator('.item[data-name="마그넷"]').click();
  await page.locator('#cartSubmit').click();
  await expect(page.locator('#done')).toBeVisible();
  await page.locator('.item[data-name="엽서"]').click(); // 다음 손님
  await expect(page.locator('#done')).toBeHidden();
  await expect(page.locator('#cartSubmit')).toBeVisible();
});

test('현금이면 받은 돈을 골라 거스름돈을 본다', async ({ page }) => {
  await fakeSheet(page);
  await openWithPin(page);
  await page.locator('.item[data-name="마그넷"]').click(); // 5,000원
  await page.getByRole('radio', { name: '현금' }).click();
  await expect(page.locator('#change')).toBeVisible();
  await page.locator('#changeOpts button', { hasText: '10,000' }).click();
  await expect(page.locator('#changeOut')).toHaveText('거스름돈 5,000원');
  await page.getByRole('radio', { name: '계좌이체' }).click();
  await expect(page.locator('#change')).toBeHidden();
});

test('재고를 적으면 남은 개수가 보이고, 다 팔리면 버튼이 꺼진다', async ({ page }) => {
  await fakeSheet(page, {
    items: [
      { name: '엽서', price: 2000, stock: 2 },
      { name: '마그넷', price: 5000, stock: null }
    ]
  });
  await openWithPin(page);
  await expect(page.locator('.item[data-name="엽서"] .stock')).toHaveText('남은 2개');
  await expect(page.locator('.item[data-name="마그넷"] .stock')).toHaveCount(0);
  await page.locator('.item[data-name="엽서"]').click();
  await page.locator('.item[data-name="엽서"]').click();
  await page.locator('.item[data-name="엽서"]').click(); // 재고 2개를 넘는 세 번째는 담기지 않는다
  await expect(page.locator('.item[data-name="엽서"] .badge')).toHaveText('2');
  await page.locator('#cartSubmit').click();
  await expect(page.locator('.item[data-name="엽서"] .stock')).toHaveText('품절');
  // 판매 합계 표에도 남은 재고가 보인다 (재고를 안 적은 굿즈는 –)
  await expect(page.locator('#byItem')).toContainText('남은 재고');
  await expect(page.locator('#byItem tr', { hasText: '엽서' }).locator('.left')).toHaveText('품절');
  await expect(page.locator('#byItem tr', { hasText: '마그넷' }).locator('.left')).toHaveText('–');
  await expect(page.locator('.item[data-name="엽서"]')).toBeDisabled();
});

test('휴지통을 누르면 수량과 상관없이 그 굿즈를 한 번에 뺀다', async ({ page }) => {
  await fakeSheet(page);
  await openWithPin(page);
  for (let i = 0; i < 3; i++) await page.locator('.item[data-name="엽서"]').click();
  await page.locator('.item[data-name="마그넷"]').click();
  await page.getByRole('button', { name: '엽서 모두 빼기' }).click();
  await expect(page.locator('.item[data-name="엽서"] .badge')).toHaveCount(0);
  await expect(page.locator('#cartSubmit')).toHaveText('5,000원 판매 기록');
  await page.getByRole('button', { name: '마그넷 모두 빼기' }).click();
  await expect(page.locator('#cart')).toBeHidden();
});

test('장바구니가 아래 굿즈를 가리지 않는다', async ({ page }) => {
  await fakeSheet(page);
  await openWithPin(page);
  await page.locator('.item[data-name="엽서"]').click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const last = await page.locator('.item').last().boundingBox();
  const cart = await page.locator('#cart').boundingBox();
  expect(last.y + last.height).toBeLessThanOrEqual(cart.y + 1);
});

test('시트 주소가 없으면 연습 모드: 이 휴대폰에만 저장된다', async ({ page }) => {
  await page.addInitScript(() => (window.__GOODS_ENDPOINT__ = ''));
  await page.goto('/goods');
  await expect(page.locator('#demoNote')).toBeVisible();
  await expect(page.locator('#sync')).toHaveText('연습 모드');
  await page.locator('.item[data-name="아트 책갈피"]').click();
  await page.locator('#cartSubmit').click();
  await expect(page.locator('#sumTotal')).toHaveText('8,000');
  await page.reload();
  await expect(page.locator('#sumTotal')).toHaveText('8,000');
  await page.getByRole('button', { name: '연습 기록 지우기' }).click();
  await expect(page.locator('#sumTotal')).toHaveText('0');
});

test.describe('전시 시작 전에는 실제 장부에 적지 않는다', () => {
  test('시작 전: 연습 모드로 열리고 시트에는 아무것도 보내지 않는다', async ({ page }) => {
    await at(page, '2026-11-12T12:30:00');
    const sheet = await fakeSheet(page, { openAt: null });
    await page.goto('/goods');
    await expect(page.locator('#lock')).toBeHidden(); // 연습이라 비밀번호 없이 열린다
    await expect(page.locator('#sync')).toHaveText('연습 모드 ⇄');
    await expect(page.locator('#demoText')).toContainText('11월 12일 (목) 13:00');
    await page.locator('.item:not([disabled])').first().click();
    await page.locator('#cartSubmit').click();
    await expect(page.locator('#recent li').first()).not.toHaveClass(/empty/);
    // 판매 내용은 보내지 않고, 익명 연습 현황(열어 봄 · 연습 판매)만 알린다
    await expect.poll(() => sheet.posts.length).toBe(2);
    expect(sheet.posts.map((p) => p.type)).toEqual(['practice', 'practice']);
    expect(sheet.posts.map((p) => p.event)).toEqual(['open', 'sale']);
    expect(sheet.posts[0].device).toMatch(/^[a-z0-9]{6,24}$/);
    expect(sheet.posts[1].device).toBe(sheet.posts[0].device);
    expect(Object.keys(sheet.posts[1]).sort()).toEqual(['device', 'event', 'type']);
  });

  test('13:00가 되면 실제 장부로 바뀌고, 연습 기록은 넘어가지 않는다', async ({ page }) => {
    await at(page, '2026-11-12T12:59:00');
    const sheet = await fakeSheet(page, { openAt: null });
    await page.goto('/goods');
    await page.locator('.item:not([disabled])').first().click();
    await page.locator('#cartSubmit').click();
    await expect(page.locator('#sync')).toHaveText('연습 모드 ⇄');

    await at(page, '2026-11-12T13:00:05');
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(page.locator('#lock')).toBeVisible(); // 실제 장부: 비밀번호를 묻는다
    await page.locator('#pin').fill('1234');
    await page.getByRole('button', { name: '열기' }).click();
    await expect(page.locator('#sync')).toHaveText(/저장됨/);
    await expect(page.locator('#sumTotal')).toHaveText('0');
    expect(sheet.posts.filter((p) => p.type === 'sale')).toHaveLength(0);

    await page.locator('.item[data-name="엽서"]').click();
    await page.locator('#cartSubmit').click();
    await expect(page.locator('#sumTotal')).toHaveText('2,000');
    expect(sheet.sales).toHaveLength(1);
  });

  test('시작 전에 실제 장부용으로 쌓여 있던 판매는 시작 뒤에도 보내지 않는다', async ({ page }) => {
    await at(page, '2026-11-12T14:00:00');
    const sheet = await fakeSheet(page, { openAt: null });
    await page.addInitScript(() => {
      localStorage.setItem(
        'alo.goods.queue',
        JSON.stringify([
          {
            type: 'sale',
            id: 'gtest01',
            at: '2026-11-03T09:00:00.000Z',
            pay: '현금',
            lines: [{ name: '엽서', price: 2000, qty: 1 }]
          }
        ])
      );
    });
    await openWithPin(page);
    await expect(page.locator('#sync')).toHaveText(/저장됨/);
    expect(sheet.posts.filter((p) => p.type === 'sale')).toHaveLength(0);
  });
});

test('확대가 꺼져 있다 (두 번 탭 · 두 손가락 확대)', async ({ page }) => {
  await page.goto('/goods');
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /maximum-scale=1,user-scalable=no/);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).touchAction)).toBe('manipulation');
});

test.describe('시작 전 실제 판매로 바꾸기 (연습 모드 칩)', () => {
  test('칩을 누르고 확인하면 실제 장부로 바뀌어 시트에 early 판매로 남는다', async ({ page }) => {
    await at(page, '2026-11-11T21:00:00');
    const sheet = await fakeSheet(page, { openAt: null });
    await page.goto('/goods');
    await expect(page.locator('#sync')).toHaveText('연습 모드 ⇄');

    page.once('dialog', (d) => {
      expect(d.message()).toContain('실제 판매를 기록할까요?');
      d.accept();
    });
    await page.locator('#sync').click();
    await expect(page.locator('#lock')).toBeVisible(); // 실제 장부라 비밀번호를 묻는다
    await expect(page.locator('#sync')).toHaveText('실제 기록 중 ⇄');
    await page.locator('#pin').fill('1234');
    await page.getByRole('button', { name: '열기' }).click();
    await expect(page.locator('#demoNote')).toContainText('실제 판매 기록 중');

    await page.locator('.item[data-name="엽서"]').click();
    await page.locator('.item[data-name="엽서"]').click();
    await page.locator('#cartSubmit').click();
    await expect.poll(() => sheet.sales.length).toBe(1);
    const sale = sheet.posts.find((p) => p.type === 'sale');
    expect(sale).toMatchObject({ early: true });
    await expect(page.locator('#sync')).toHaveText('실제 기록 중 ⇄');

    // 다시 열어도 실제 장부 그대로, 보낸 판매도 버리지 않는다
    await page.reload();
    await expect(page.locator('#sumTotal')).toHaveText('4,000');
  });

  test('취소하면 연습 모드 그대로, 다시 누르면 연습 모드로 돌아간다', async ({ page }) => {
    await at(page, '2026-11-11T21:00:00');
    const sheet = await fakeSheet(page, { openAt: null });
    await page.goto('/goods');
    page.once('dialog', (d) => d.dismiss());
    await page.locator('#sync').click();
    await expect(page.locator('#sync')).toHaveText('연습 모드 ⇄');
    await expect(page.locator('#lock')).toBeHidden();

    await page.evaluate(() => localStorage.setItem('alo.goods.live', '1'));
    await page.reload();
    await expect(page.locator('#sync')).toHaveText('실제 기록 중 ⇄');
    page.once('dialog', (d) => {
      expect(d.message()).toContain('연습 모드로 돌아갈까요?');
      d.accept();
    });
    await page.locator('#sync').click();
    await expect(page.locator('#sync')).toHaveText('연습 모드 ⇄');
    expect(sheet.posts.filter((p) => p.type === 'sale')).toHaveLength(0);
  });

  test('전시가 시작되면 칩은 바꾸기 버튼이 아니다', async ({ page }) => {
    await at(page, '2026-11-12T14:00:00');
    await fakeSheet(page, { openAt: null });
    await openWithPin(page);
    await expect(page.locator('#sync')).not.toHaveClass(/switch/);
  });
});

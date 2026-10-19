/**
 * 공통 준비물
 *  - 구글 글꼴처럼 바깥 주소로 나가는 요청은 막는다 (네트워크 없이도 같은 결과)
 *  - 구글 Apps Script(쪽지 · 예약 · 게시판)는 가짜로 응답하고, 보낸 내용을 sheet.posts 에 모은다
 *  - /after-docent (Pages Function)은 기본으로 '아직 공개 전'을 돌려준다
 */
import { test as base, expect } from '@playwright/test';

export const SHEET = 'https://script.google.com/macros/s/**';

export function makeNotes(extra = 0) {
  return [
    {
      message: '그림 속 앨리스의 손이 계속 생각나요. 저도 다음 수를 어디에 둘지 고민하게 됐어요',
      sender: '관람객',
      at: '11/14'
    },
    { message: '재이야 전시 축하해!', sender: '다진고기', at: '11/14' },
    { message: 'ㅋㅋㅋㅋ', sender: '익명', at: '11/14' },
    { message: 'asdfgh', sender: '', at: '11/14' },
    ...Array.from({ length: extra }, (_, i) => ({ message: `쪽지 ${i + 1}`, sender: '친구', at: '11/15' }))
  ];
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (r) => r.abort());
    await page.route('**/after-docent**', (r) => r.fulfill({ json: { ok: false } }));
    await use(page);
  },

  sheet: async ({ page }, use) => {
    const sheet = { posts: [], notes: makeNotes(14) };
    await page.route(SHEET, async (route) => {
      const req = route.request();
      if (req.method() === 'POST') {
        sheet.posts.push(JSON.parse(req.postData() || '{}'));
        return route.fulfill({ json: { ok: true } });
      }
      return route.fulfill({ json: { ok: true, notes: sheet.notes } });
    });
    await use(sheet);
  }
});

export { expect };

/** 한국 시간 기준으로 시계를 멈춰 둔다 (타이머는 그대로 흐른다) */
export async function at(page, kst) {
  await page.clock.setFixedTime(new Date(kst + '+09:00'));
}

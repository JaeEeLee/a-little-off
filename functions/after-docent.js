/**
 * 전시가 끝난 뒤에만 작가의 도슨트 글을 내준다. (/jessie 같은 작가 전용 페이지에서 불러간다)
 *
 *  GET /after-docent?artist=이재이
 *   - 전시 종료(OPEN_AT) 전: 404, 글을 내보내지 않는다 (페이지 소스에도 남지 않게 서버에 둔다)
 *   - 종료 후: { artist, title, paragraphs: [...] }
 *  미리 확인: ?k=<DOCENT_KEY> 를 붙이면 종료 전에도 내준다
 *
 * 글은 전시 도슨트 원고 수정본에서 가져왔다. 공개할 작가만 DOCENTS 에 넣는다.
 */

const OPEN_AT = new Date('2026-11-17T20:00:00+09:00');   // 전시 마감 시각

const DOCENTS = {
  '이재이': {
    title: '어디에 둘까요?',
    paragraphs: [
      '앞선 작품에서 우리는 무엇이든 될 수 있다고 믿었던 어린아이의 세계를 만났습니다. 하지만 어른이 된 우리는 왜 자신이 원하는 것을 선택하는 일조차 어려워졌을까요?',
      '재이 작가의 작품은 자신의 마음보다 주변의 기준과 목소리를 먼저 살피며 살아온 한 사람의 내면을 보여줍니다.',
      '작품 속 앨리스는 체스말 하나를 손에 들고 있지만 어디에 놓아야 할지 결정하지 못한 채 화면 밖을 바라봅니다. 무엇을 원하는지 모르는 것이 아니라, 자신의 마음을 선택의 중심에 놓는 일이 아직 익숙하지 않은 모습입니다.',
      '회중시계에 얼굴을 파묻은 토끼는 시간과 주변의 기준에 쫓기며 자신을 재촉하는 모습을 보여줍니다.',
      '화면을 가득 채운 분홍빛 역시 작가가 의도적으로 선택한 불편한 색입니다. 따뜻하고 사랑스러운 색으로 여겨지지만 정작 작가는 좋아하지 않는 색으로, 겉으로 보이는 모습과 자신의 마음이 어긋난 상태를 표현합니다.',
      '화면 끝을 떠다니는 작은 쌍둥이는 아직 제대로 목소리를 내지 못한 작고 진실된 자아입니다.',
      '그렇다면 다시 앨리스가 들고 있는 체스말을 바라봐 주세요. 다음 수가 무엇인지 아직 확신할 수는 없습니다. 하지만 그 말을 들고 있는 손은 다른 누구도 아닌 앨리스 자신의 손입니다.',
      '우리는 살아가면서 수많은 선택을 하지만, 그 선택이 언제나 자신의 마음에서 시작되는 것은 아닙니다. 남들이 옳다고 말하는 길과 내가 원하는 길 사이에서, 때로는 자신의 목소리를 잊어버리기도 합니다.',
      '“당신의 다음 수는 어디에 두고 싶나요?”'
    ]
  }
};

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const artist = url.searchParams.get('artist') || '';
  const doc = DOCENTS[artist];
  const preview = env.DOCENT_KEY && url.searchParams.get('k') === env.DOCENT_KEY;

  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  if (!doc || (!preview && new Date() < OPEN_AT)) {
    return new Response(JSON.stringify({ ok: false, openAt: OPEN_AT.toISOString() }), { status: 404, headers });
  }
  return new Response(JSON.stringify({ ok: true, artist, title: doc.title, paragraphs: doc.paragraphs }), { status: 200, headers });
}

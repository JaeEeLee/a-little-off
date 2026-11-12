/* 한국어 ⇄ English 전환 (메인 / · 도슨트 /docent)
 *
 * - 처음 오면 휴대폰 언어가 한국어가 아니면 영어로 보여 준다. 오른쪽 위 버튼으로 바꾸면 그 선택을 기억한다
 *   주소에 ?lang=en / ?lang=ko 를 붙여도 된다
 * - 바꾸면 페이지를 다시 연다 (한국어로 되돌릴 때 원래 글을 따로 들고 있지 않아도 되게)
 * - 영어일 때는 화면의 한국어 글을 아래 표대로 바꾼다
 *     BLOCKS  : 굵은 글씨가 섞인 문단처럼 통째로 바꿀 곳 (선택자 → 영어 HTML)
 *     TEXT    : 글자 그대로 일치하는 문장 (앞뒤 빈칸은 무시)
 *     PATTERNS: 숫자 · 이름이 섞여 만들어지는 문장
 *   site.js · docent.js 가 나중에 바꾸는 글도 MutationObserver 로 따라가며 바꾼다
 * - 작가 전용 페이지(/jessie 등)에는 버튼을 띄우지 않는다
 */
(function () {
  'use strict';

  var path = location.pathname.replace(/\/index\.html$/, '/');
  var PAGE = path === '/' ? 'main' : /^\/docent\/?$/.test(path) ? 'docent' : '';
  if (!PAGE) return;

  var KEY = 'alo.lang';
  function getLang() {
    var q = (location.search.match(/[?&]lang=(en|ko)\b/) || [])[1];
    if (q) {
      try {
        localStorage.setItem(KEY, q);
      } catch (e) {}
      return q;
    }
    try {
      var saved = localStorage.getItem(KEY);
      if (saved === 'en' || saved === 'ko') return saved;
    } catch (e) {}
    // 검색 로봇은 언어 설정이 영어인 경우가 많아, 한국어 검색에 쓰일 본문이 영어로 바뀌지 않게 한다
    if (/bot|crawl|spider|slurp|yeti|daum|bingpreview|lighthouse/i.test(navigator.userAgent)) return 'ko';
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'ko';
    return /^ko\b/i.test(nav) ? 'ko' : 'en';
  }
  var LANG = getLang();
  window.SITE_LANG = LANG;

  /* ── 오른쪽 위 언어 버튼 ── */
  function addToggle() {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'lang-toggle';
    b.id = 'langToggle';
    b.lang = LANG === 'en' ? 'ko' : 'en';
    b.textContent = LANG === 'en' ? '한국어' : 'English';
    b.setAttribute('aria-label', LANG === 'en' ? '한국어로 보기' : 'View in English');
    b.addEventListener('click', function () {
      try {
        localStorage.setItem(KEY, LANG === 'en' ? 'ko' : 'en');
      } catch (e) {}
      var url = location.pathname + location.search.replace(/([?&])lang=(en|ko)&?/, '$1').replace(/[?&]$/, '');
      location.replace(url + location.hash);
    });
    document.body.appendChild(b);
  }

  /* ── 이름 · 작품 제목 ── */
  var NAMES = {
    김지현: 'Jihyun Kim',
    남다름: 'Dareum Nam',
    남선주: 'Sunju Nam',
    노정균: 'Jeonggyun Noh',
    박수룡: 'Suryong Park',
    박정은: 'Jeongeun Park',
    배정연: 'Jeongyeon',
    정연: 'Jeongyeon',
    엄현서: 'Hyunseo Eom',
    윤혜진: 'Hyejin Yoon',
    이경도: 'Gyeongdo Lee',
    이서현: 'Seohyun Lee',
    이재이: 'Jaei',
    재이: 'Jaei',
    이희지: 'Heeji Lee',
    임소라: 'Sora Lim',
    조수연: 'Suyeon Cho',
    최윤아: 'Yuna Choi',
    최윤지: 'Yunji Choi',
    편해연: 'Haeyeon Pyeon',
    홍림: 'Rim Hong',
    홍성호: 'Sungho Hong'
  };
  var TITLES = {
    '이상한 나라들의 앨리스': 'Alices in Wonderlands',
    '어떤 어른이 되었나요?': 'What Kind of Grown-up Did You Become?',
    '이상한 나라의 해바라기': 'A Sunflower in Wonderland',
    '어디에 둘까요?': 'Where Shall I Place It?',
    'WELCOME TO THE TEA PARTY': 'WELCOME TO THE TEA PARTY',
    '미소 짓는 자리': 'A Place to Smile',
    '나의 계절은 아직': 'My Season Is Yet to Come',
    '각자의 촛불을 켜는 시간': 'A Time to Light Our Own Candles',
    'Off-beat': 'Off-beat',
    발돋움: 'On Tiptoe',
    '나를 따르다': 'Following Myself',
    '꿈과 현실 사이': 'Between Dreams and Reality',
    '그림자 너머': 'Beyond the Shadow',
    '경계선 위의 발걸음': 'Steps on the Borderline',
    바다: 'The Sea',
    '마이 룸 인 원더랜드': 'My Room in Wonderland',
    점화: 'Ignition',
    Vase: 'Vase',
    'What We Left on the Table': 'What We Left on the Table',
    '1+1+1=1': '1+1+1=1'
  };
  function name(n) {
    return NAMES[n] || n;
  }
  function title(t) {
    return TITLES[t] || t;
  }

  /* ── 공통 문장 ── */
  var TEXT = {
    // 날짜 · 장소
    '홍대 피시스 아카이브': 'Pieces Archive, Hongdae',
    '서울 마포구 신촌로 48': '48 Sinchon-ro, Mapo-gu, Seoul',
    '조금 이상한 우리들 · Everyone Is a Little off': 'Everyone Is a Little off',
    // 작가에게 한마디 (공통 걸름 문구)
    '이메일 주소는 적지 않으셔도 됩니다.': 'Please leave out email addresses.',
    '전화번호는 적지 않으셔도 됩니다.': 'Please leave out phone numbers.',
    '긴 숫자는 적지 않으셔도 됩니다.': 'Please leave out long numbers.',
    '링크는 넣을 수 없습니다.': 'Links are not allowed.',
    '전시와 관련 없는 내용은 보낼 수 없습니다.': 'Only messages about the exhibition, please.',
    '남기고 싶은 말을 적어 주세요.': 'Please write a message.',
    '방금 하나를 보냈습니다. 잠시 뒤에 다시 시도해 주세요.': 'You just sent one. Please try again in a moment.',
    '전하는 중…': 'Sending…',
    전하기: 'Send',
    '전하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.': "Couldn't send. Please try again in a moment.",
    '전하지 못했어요. 신호를 확인하고 다시 눌러 주세요.': "Couldn't send. Check your connection and try again.",
    '보내는 사람': 'From',
    닉네임: 'Nickname',
    '이즈드로잉 인스타그램': 'IZDRAWING on Instagram',
    '이즈드로잉 네이버': 'IZDRAWING on Naver',
    '네이버지도에서 보기': 'Open in Naver Map',
    '카카오맵에서 보기': 'Open in Kakao Map',
    '구글 지도에서 보기': 'Open in Google Maps',
    '전시 포스터 — 붉은 튤립 사이에 흰 튤립 한 송이가 피어 있고 위쪽에 Everyone Is a Little off 라고 적혀 있습니다':
      'Exhibition poster: a single white tulip among red tulips, with "Everyone Is a Little off" written above',
    '조금 이상한 우리들 · AUDIO GUIDE': 'Everyone Is a Little off · AUDIO GUIDE'
  };

  var MAIN_TEXT = {
    이즈드로잉: 'IZDRAWING',
    '취미미술학원 단체전': 'Art Studio Group Exhibition',
    네이버: 'Naver',
    카카오: 'Kakao',
    구글: 'Google',
    인스타그램: 'Instagram',
    '취미로 그림을 배우는 스무 명이 모여 만든 단체전입니다.':
      'A group exhibition by twenty people who paint as a hobby.',
    '엿새간 홍대 피시스 아카이브에서 열립니다.': 'Six days at Pieces Archive, Hongdae.',
    '이즈드로잉 취미미술학원 주최': 'Hosted by IZDRAWING Art Studio',
    '전시 오픈까지': 'until opening',
    '전시가 열리고 있습니다': 'The exhibition is open',
    '찾아와 주셔서 감사합니다': 'Thank you for visiting',
    종료: 'Closed',
    // 질문
    '조금 이상한 질문': 'A Little Off Question',
    '전시장에 들어서기 전에, 잠깐 이 질문을 들고 가 보세요.': 'Before you step in, take this question with you.',
    '다른 질문 보기': 'Another question',
    // 전시 안내
    '전시 안내': 'Information',
    '전시 기간': 'Dates',
    '엿새간 열립니다': 'Open for six days',
    '관람 시간': 'Hours',
    '첫날 12일 (목)은 13:00 개관 · 마지막 날 17일 (화)은 20:00 마감':
      'Opens at 13:00 on Thu 12 · closes at 20:00 on Tue 17',
    입장료: 'Admission',
    '5,000원': '5,000 KRW',
    장소: 'Venue',
    주소: 'Address',
    '주소 복사': 'Copy address',
    '주소를 복사했습니다': 'Address copied',
    '링크를 복사했습니다': 'Link copied',
    '복사가 막혀 있습니다. 길게 눌러 직접 복사해 주세요': 'Copying is blocked. Long-press to copy it yourself',
    '2026. 11. 12 (목)': 'Thu, Nov 12, 2026',
    '11. 17 (화)': 'Tue, Nov 17',
    // 관람 예약
    '관람 예약': 'Reservation',
    '예약자 성함': 'Your name',
    '입구에서 확인할 이름': 'Name to check at the entrance',
    '방문 날짜': 'Date of visit',
    '날짜 고르기': 'Choose a date',
    '초대한 작가': 'Invited by',
    '(선택)': '(optional)',
    '따로 없어요': 'No one in particular',
    '함께 오는 사람': 'Coming with',
    '(선택 · 예약자 제외)': '(optional · not counting you)',
    '고르지 않음': 'Not selected',
    '혼자 관람해요': 'Just me',
    '1명': '1 person',
    '2명': '2 people',
    '3명': '3 people',
    '4명': '4 people',
    '5명': '5 people',
    예약하기: 'Reserve',
    '예약을 남겼습니다': 'Reservation received',
    '한 번 더 예약하기': 'Make another reservation',
    '남기는 중…': 'Sending…',
    '입구에서 확인할 수 있도록 성함을 적어 주세요.': 'Please enter your name so we can find you at the entrance.',
    '방문 날짜를 골라 주세요.': 'Please choose a date.',
    '성함만 적어 주세요. 연락처나 링크는 넣을 수 없습니다.': 'Just your name, please. No contacts or links.',
    '방금 예약을 남겼습니다. 잠시 뒤에 다시 시도해 주세요.': 'You just reserved. Please try again in a moment.',
    '보낼 수 없는 표현이 들어 있습니다. 다시 확인해 주세요.': 'Some words cannot be sent. Please check again.',
    '고를 수 없는 날짜입니다. 다시 골라 주세요.': 'That date is not available. Please choose another.',
    '지금 예약이 몰려 있습니다. 잠시 뒤에 다시 시도해 주세요.':
      'Many reservations right now. Please try again shortly.',
    '예약을 남기지 못했습니다. 잠시 뒤에 다시 시도해 주세요.': "Couldn't save your reservation. Please try again.",
    '연결이 원활하지 않습니다. 잠시 뒤에 다시 시도해 주세요.': 'Connection problem. Please try again shortly.',
    '관람 예약하기': 'Reserve a visit',
    '11월 12일 (목) · 13:00 개관': 'Thu, Nov 12 · opens 13:00',
    '11월 13일 (금)': 'Fri, Nov 13',
    '11월 14일 (토)': 'Sat, Nov 14',
    '11월 15일 (일)': 'Sun, Nov 15',
    '11월 16일 (월)': 'Mon, Nov 16',
    '11월 17일 (화) · 20:00 마감': 'Tue, Nov 17 · closes 20:00',
    // 지금 전시장에는
    '지금 전시장에는': 'On site now',
    '전시장을 지키고 있는 작가들입니다. 말을 걸어도 괜찮습니다.':
      'These artists are at the venue. Feel free to say hello.',
    '아직 교대 전입니다.': 'Shifts start later today.',
    오늘: 'Today',
    입장: 'Entrance',
    브릿지: 'Bridge',
    '지하 1층': 'B1',
    '굿즈(2층)': 'Goods (2F)',
    // 참여 작가 · 한마디
    '참여 작가': 'Artists',
    '20명': '20 artists',
    '모두에게 한마디 남기기': 'Leave a note for everyone',
    '작가에게 한마디': 'Leave a Note',
    '위 명단에서 작가 이름을 누르면 그 작가에게 글을 남길 수 있어요.': 'Tap an artist above to leave them a note.',
    '응원의 한마디나 그림을 본 소감을 자유롭게 들려주세요.':
      'Words of support or thoughts on their work are all welcome.',
    '다른 작가 고르기': 'Choose another artist',
    '전시가 끝난 뒤 작가에게 그대로 전해집니다. 여기 적은 글은 사이트에 공개되지 않으며, 연락처나 링크는 넣을 수 없습니다.':
      'Your note will be passed on to the artist after the exhibition. It will not be shown on this site. Contacts and links are not allowed.',
    '남기고 싶은 말': 'Your message',
    '짧아도 괜찮습니다.': 'Short is fine.',
    '익명으로 두셔도 됩니다': 'You may stay anonymous',
    '잘 전해드리겠습니다.': "We'll pass it on.",
    '전시가 끝나면 작가에게 그대로 전달됩니다.': 'It will be delivered to the artist after the exhibition.',
    '한 번 더 쓰기': 'Write another',
    '참여 작가 모두': 'all artists',
    // 함께 보기
    '함께 보기': 'Share',
    '함께 보고 싶은 사람이 떠오른다면, 이 링크를 건네 보세요.': 'Thinking of someone to go with? Send them this link.',
    '링크 복사하기': 'Copy link',
    // 전시 소개
    '전시 소개': 'About',
    '자주 묻는 질문': 'FAQ',
    '어디에서 열리나요?': 'Where is it?',
    '홍대 피시스 아카이브(Pieces Archive)예요. 주소는 서울 마포구 신촌로 48이에요.':
      'At Pieces Archive in Hongdae, 48 Sinchon-ro, Mapo-gu, Seoul.',
    '언제 볼 수 있나요?': 'When can I visit?',
    '2026년 11월 12일(목)부터 17일(화)까지, 매일 11:00–21:00예요. 첫날은 13:00에 열고, 마지막 날은 20:00에 닫아요.':
      'From Thu, Nov 12 to Tue, Nov 17, 2026, daily 11:00–21:00. Opens at 13:00 on the first day and closes at 20:00 on the last day.',
    '입장료가 있나요?': 'Is there an admission fee?',
    '입장료는 5,000원이에요.': 'Admission is 5,000 KRW.',
    '작품 설명을 들을 수 있나요?': 'Is there an audio guide?',
    '전시장 곳곳의 QR 코드를 찍으면 작가들의 이야기를 담은 오디오 도슨트를 들을 수 있어요. 이어폰을 챙겨 오시면 좋아요.':
      "Scan the QR codes at the venue to hear the artists' stories in the audio guide (in Korean, with English text). Bring earphones.",
    '2026. 11. 12 (목) — 11. 17 (화) · 홍대 피시스 아카이브': 'Nov 12 – 17, 2026 · Pieces Archive, Hongdae',
    '주최 · 이즈드로잉 취미미술학원': 'Hosted by IZDRAWING Art Studio',
    '전시 서문': 'Introduction',
    성장측정실: 'Growth Measuring Room',
    에필로그: 'Epilogue',
    '에필로그 · TAKE ME': 'Epilogue · TAKE ME',
    전체: 'Everyone'
  };

  // 조금 이상한 질문
  var QUESTIONS = {
    '당신에게도 한때 자신만의 이상한 나라가 있었나요. 그 세계는 지금 어디에 있나요?':
      'Did you once have a wonderland of your own? Where is that world now?',
    '당신은 어떤 어른이 되었나요?': 'What kind of grown-up did you become?',
    '이상한 나라에 가게 된다면 무엇이 되고 싶으신가요?': 'If you went to Wonderland, what would you want to become?',
    '당신의 다음 수는 어디에 두고 싶나요?': 'Where would you like to make your next move?',
    '모두가 같은 모습으로 살아가야 할까요?': 'Must everyone live the same way?',
    '누군가의 성취를 보며 진심으로 응원해주지 못했던 적이 있나요?':
      "Have you ever found it hard to truly cheer for someone else's success?",
    '나의 계절은 정말 늦은 걸까요?': 'Is my season really late?',
    '곁에 있는 사람의 속도를 나의 기준으로 삼은 적이 있나요?':
      'Have you ever measured yourself by the pace of the people around you?',
    '이곳이 이상한 걸까요, 아니면 그 안에서 낯설게 느끼는 내가 이상한 걸까요?':
      'Is this place strange, or am I strange for feeling out of place in it?',
    '내가 믿어온 성공의 기준은 정말 나의 기준이었나요?': 'Was the measure of success I believed in really my own?',
    '앞으로 내가 채워갈 찻잔에는 조금 더 나다운 것이 담길 수 있을까요?':
      'Can the teacup I fill from now on hold something a little more like me?',
    '잠시 내려놓아도 괜찮은 것이 당신에게 있나요?': 'Is there something you could set down for a while?',
    '나는 앞으로 무엇을 선택하며 살아갈까요?': 'What will I choose to live by from now on?',
    '두려운 채로도 한 걸음 내디뎌 본 적이 있나요?': 'Have you ever taken a step forward while still afraid?',
    '아무도 나를 보고 있지 않을 때, 나는 어떤 사람일까요?': 'Who am I when no one is watching?',
    '아무런 역할을 하지 않고 온전히 자신으로 머물 수 있는 곳이 있나요?':
      'Is there a place where you can simply be yourself, with no role to play?',
    '지금 다시 불을 붙이고 싶은 꿈은 무엇인가요?': 'What dream would you like to rekindle now?',
    '내가 나라고 믿어온 모습 중, 정말 내가 선택한 것은 무엇일까요?':
      'Of all the things I believe make me who I am, which did I truly choose?',
    '지금까지의 삶은 당신에게 무엇을 남겼나요?': 'What has your life so far left you with?',
    '앞으로의 당신은 또 어떤 모습으로 변해갈까요?': 'Who will you become next?',
    '우리는 언제부터 보통이라는 기준을 의식하며 살게 되었을까요?': 'When did we start living with "normal" in mind?',
    '내가 조금 이상한 걸까. 이 질문을 마지막으로 떠올린 건 언제였나요?':
      '"Am I a little strange?" When did you last ask yourself that?',
    '이상한 것은 서로 다른 우리일까요, 모두가 같은 속도로 살아야 한다고 믿은 일일까요?':
      'What is strange: that we are all different, or that we believed everyone must move at the same pace?',
    '남들과 다른 길을 걷고 있어도 괜찮다고, 스스로에게 말해준 적이 있나요?':
      "Have you ever told yourself it's okay to walk a different path?",
    '아직 원하는 모습에 이르지 못했다고 해서, 지금까지의 시간이 의미 없을까요?':
      "If you haven't become who you hoped to be yet, does that make the time so far meaningless?",
    '당신은 어떤 사람인가요?': 'Who are you?',
    '나는 사회가 정한 기준에 맞춰 잘 크고 있는 걸까요?': 'Am I growing up "right" by the standards society set?',
    '사람의 성장을 하나의 기준으로 측정할 수 있을까요?': "Can a person's growth be measured by a single standard?",
    '우리는 여전히 되어가는 중입니다. 당신은 지금 무엇이 되어가고 있나요?':
      'We are still becoming. What are you becoming now?',
    '지금의 자신을 너무 서둘러 평가하고 있지는 않나요?': 'Are you judging yourself too quickly?',
    '우리는 모두 처음 살아보는 삶을 지나고 있습니다. 당신의 방식은 무엇인가요?':
      'We are all living this life for the first time. What is your way?',
    '전시를 나설 때 한 문장을 가져갈 수 있다면, 어떤 말이었으면 좋겠나요?':
      'If you could take one sentence with you as you leave, what would it be?',
    'DRINK ME라고 적힌 차가 눈앞에 있다면, 한 모금 마셔보시겠어요?':
      'If a cup of tea labeled DRINK ME were in front of you, would you take a sip?',
    '당신의 이상함을 가지고 티파티 테이블에 앉는다면, 어느 자리에 앉고 싶나요?':
      'If you brought your strangeness to the tea party table, where would you sit?',
    '회중시계를 든 토끼가 당신을 재촉한다면, 무엇을 가장 먼저 내려놓겠어요?':
      'If the rabbit with the pocket watch hurried you along, what would you put down first?',
    '아직 피지 않은 꽃봉오리처럼, 때를 기다리고 있는 것이 당신에게 있나요?':
      'Like a bud yet to bloom, is something in you waiting for its time?',
    '타인의 발자국으로 내가 얼마나 늦었는지를 재고 있지는 않나요?':
      "Are you measuring how late you are by other people's footsteps?",
    '쉬고 있다는 이유만으로 뒤처지고 있다고 느낀 적이 있나요?':
      'Have you ever felt left behind just because you were resting?',
    '지금 서 있는 자리는 누가 정해준 자리인가요?': 'Who decided where you are standing now?',
    '어떤 선택이 후회로 남았더라도, 그 시간이 지금의 나를 만들었다고 생각해 본 적 있나요?':
      'Even if a choice left regrets, have you thought that time made you who you are?',
    '남들은 시시하다고 하는데, 나는 한참을 들여다보게 되는 것이 있나요?':
      'Is there something others call boring that you could look at for ages?',
    '마지막으로 좀 이상하다는 말을 들은 건 언제였나요. 그때 기분은 어땠나요?':
      'When were you last called a little strange? How did it feel?',
    '어릴 때는 아무렇지 않게 했는데, 지금은 하지 않게 된 일이 있나요?':
      'Is there something you did freely as a child but no longer do?',
    '잘 그리는 것과 나답게 그리는 것, 하나만 고른다면 어느 쪽인가요?':
      'Drawing well or drawing like yourself: if you could pick only one, which?',
    '오늘 하루 중 가장 오래 바라본 것은 무엇이었나요?': 'What did you look at the longest today?',
    '누구에게도 보여주지 않고 혼자 간직하고 있는 것이 있나요?':
      'Is there something you keep to yourself and show no one?',
    '지금 눈앞에 있는 것 중 하나를 그린다면, 무엇을 고르시겠어요?':
      'If you were to draw one thing in front of you right now, what would you pick?',
    '서툴러서 오히려 좋았던 것이 있나요?': 'Is there something that was better for being clumsy?',
    '나를 설명하는 말 중에, 남들은 단점이라 하지만 나는 아끼는 것이 있나요?':
      'Is there a word others call your flaw that you secretly cherish?',
    '아무것도 답하지 않아도 괜찮습니다. 그냥 한 바퀴 둘러보시겠어요?':
      "You don't have to answer anything. Shall we just take a look around?"
  };

  var DOCENT_TEXT = {
    도슨트: 'Audio Guide',
    '처음부터 듣기': 'Play from the start',
    '들을 작품을 골라 주세요': 'Choose a work to listen to',
    '▶ 재생 버튼을 눌러 시작해 주세요': '▶ Tap play to start',
    '준비 중': 'Coming soon',
    '도슨트가 모두 끝났어요. 함께해 주셔서 고맙습니다.': "That's the end of the guide. Thank you for listening.",
    '이 작품의 도슨트는 아직 준비 중이에요.': 'The guide for this work is not ready yet.',
    // 장 · 안내
    '전시 서문': 'Introduction',
    '조금 이상한 우리들의 세계에 오신 걸 환영합니다': 'Welcome to our slightly strange world',
    '당신은 어떤 사람인가요?': 'Who are you?',
    '우리는 여전히 되어가는 중': 'We are still becoming',
    '토끼굴 아래로': 'Down the Rabbit Hole',
    'B1으로 내려가는 길': 'The way down to B1',
    성장측정실: 'Growth Measuring Room',
    '나만의 성향을 측정해 보세요': 'Measure your own tendencies',
    '2층으로': 'Up to 2F',
    '2F로 올라가는 길': 'The way up to 2F',
    에필로그: 'Epilogue',
    // 한마디
    '✉ 한마디': '✉ Note',
    '✉ 참여 작가들에게 한마디 남기기': '✉ Leave a note for all the artists',
    '참여 작가 모두에게 한마디': 'A note for all the artists',
    '작품을 보고 느낀 점, 응원 한마디를 남겨 주세요.': 'Share your thoughts on the work or a word of support.',
    '보내는 사람 (비워도 돼요)': 'From (optional)',
    '쪽지는 작가에게만 전해져요.': 'Your note goes only to the artist.',
    '전해졌어요. 고마워요!': 'Sent. Thank you!',
    '참여 작가 모두에게 전할게요.': "We'll pass it on to all the artists.",
    닫기: 'Close',
    '재생 속도': 'Playback speed',
    '이전 작품': 'Previous',
    '다음 작품': 'Next',
    재생: 'Play',
    '재생 위치': 'Position',
    '도슨트 플레이어': 'Audio guide player'
  };

  var PATTERNS = [
    // 이름 〈작품〉
    [
      /^(.+?)\s*〈(.+)〉$/,
      function (m) {
        return name(m[1]) + ' 〈' + title(m[2]) + '〉';
      }
    ],
    [
      /^〈(.+)〉$/,
      function (m) {
        return '〈' + title(m[1]) + '〉';
      }
    ],
    [
      /^(\d+)일차$/,
      function (m) {
        return 'Day ' + m[1];
      }
    ],
    [
      /^(\d\d:\d\d) 기준$/,
      function (m) {
        return 'as of ' + m[1];
      }
    ],
    [
      /^(\d+)시부터 (.+)$/,
      function (m) {
        return 'From ' + m[1] + ':00 · ' + m[2].split(', ').map(name).join(', ');
      }
    ],
    [
      /^(.+)에 오시는 걸로 적어 두었어요\.$/,
      function (m) {
        return 'We have you down for ' + tr(m[1]) + '.';
      }
    ],
    [
      /^(\d+)자까지 적을 수 있습니다\.$/,
      function (m) {
        return 'Up to ' + m[1] + ' characters.';
      }
    ],
    [
      /^(.+) 작가에게 한마디$/,
      function (m) {
        return 'A note for ' + name(m[1]);
      }
    ],
    [
      /^(.+) 작가에게 한마디 남기기$/,
      function (m) {
        return 'Leave a note for ' + name(m[1]);
      }
    ],
    [
      /^(.+) 작가에게 남긴 쪽지는 (.+) 작가 페이지의 쪽지 게시판에 붙어요\.$/,
      function (m) {
        return 'Notes to ' + name(m[1]) + ' are posted on ' + name(m[1]) + "'s page board.";
      }
    ],
    [
      /^(.+) 작가 페이지 게시판에 붙었어요\.$/,
      function (m) {
        return 'Posted on ' + name(m[1]) + "'s page board.";
      }
    ],
    [
      /^(.+) 작가에게 전할게요\.$/,
      function (m) {
        return "We'll pass it on to " + name(m[1]) + '.';
      }
    ],
    [
      /^(.+), (.+) 듣기$/,
      function (m) {
        return 'Listen: ' + name(m[1]) + ', ' + title(m[2]);
      }
    ],
    [
      /^(.+) 듣기$/,
      function (m) {
        return 'Listen: ' + tr(m[1]);
      }
    ]
  ];

  // 굵은 글씨가 섞인 문단: 통째로 바꾼다
  var MAIN_BLOCKS = {
    '.about p:nth-of-type(1)':
      '<em>Everyone Is a Little off</em> is a <strong>group exhibition</strong> by <strong>twenty amateur artists</strong> who learn to paint at IZDRAWING Art Studio. It runs for six days, from Thu, Nov 12 to Tue, Nov 17, 2026, at <strong>Pieces Archive</strong> in Hongdae (48 Sinchon-ro, Mapo-gu, Seoul).',
    '.about p:nth-of-type(2)':
      'Inspired by <strong>Alice\'s Adventures in Wonderland</strong>, the show is about those of us who live at a pace a little different from "normal". It unfolds in three chapters, WELCOME TO WONDERLAND, WHO ARE YOU? and STILL BECOMING, with twenty artists\' works from B1 to 2F.',
    '.about p:nth-of-type(3)':
      "Scan the QR codes at the venue for the <strong>audio guide</strong> with the artists' stories. There is also a Growth Measuring Room, <strong>photo spots</strong>, and <strong>goods</strong> such as keyrings and postcards. Drop by if you're looking for an art exhibition in Hongdae or Sinchon this November.",
    '.about-tags': '',
    '#visitLead': 'If you plan to visit, please make a reservation.<br />It really helps us prepare!'
  };

  var DOCENT_BLOCKS = {
    '.lead':
      'Listen from the introduction to the epilogue,<br />or tap an artist to hear just that work.<br />Please use earphones.',
    '.foot': 'Everyone Is a Little off<br />Nov 12 – 17, 2026 · Pieces Archive, Hongdae'
  };

  var DICT = {};
  [TEXT, PAGE === 'main' ? MAIN_TEXT : DOCENT_TEXT, QUESTIONS].forEach(function (d) {
    for (var k in d) DICT[k] = d[k];
  });
  // 작가 이름 · 작품 제목도 단독으로 나오면 바꾼다
  for (var n in NAMES) if (!DICT[n]) DICT[n] = NAMES[n];
  for (var t in TITLES) if (!DICT[t]) DICT[t] = TITLES[t];

  var HANGUL = /[가-힣]/;
  function tr(s) {
    var key = s.trim();
    if (!key || !HANGUL.test(key)) return s;
    if (DICT[key] !== undefined) return s.replace(key, DICT[key]);
    var flat = key.replace(/\s+/g, ' '); // 질문처럼 줄을 나눠 넣은 글
    if (flat !== key && DICT[flat] !== undefined) return s.replace(key, DICT[flat]);
    for (var i = 0; i < PATTERNS.length; i++) {
      var m = key.match(PATTERNS[i][0]);
      if (m) return s.replace(key, PATTERNS[i][1](m));
    }
    return s;
  }

  function translateNode(root) {
    if (root.nodeType === 3) {
      var v = tr(root.nodeValue);
      if (v !== root.nodeValue) root.nodeValue = v;
      return;
    }
    if (root.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA)$/.test(root.tagName)) return;
    ['placeholder', 'aria-label', 'title', 'alt'].forEach(function (a) {
      var v = root.getAttribute && root.getAttribute(a);
      if (v && HANGUL.test(v)) {
        var nv = tr(v);
        if (nv !== v) root.setAttribute(a, nv);
      }
    });
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    var node,
      list = [];
    while ((node = walker.nextNode())) list.push(node);
    list.forEach(function (x) {
      if (x.nodeType === 3) {
        if (x.parentNode && /^(SCRIPT|STYLE|TEXTAREA)$/.test(x.parentNode.tagName)) return;
        var nv = tr(x.nodeValue);
        if (nv !== x.nodeValue) x.nodeValue = nv;
      } else {
        ['placeholder', 'aria-label', 'title', 'alt'].forEach(function (a) {
          var v = x.getAttribute(a);
          if (v && HANGUL.test(v)) {
            var nv2 = tr(v);
            if (nv2 !== v) x.setAttribute(a, nv2);
          }
        });
      }
    });
  }

  // 받는 작가 표시: '<em>정연</em> 작가에게' → 'To <em>Jeongyeon</em>'
  function fixNoteTo() {
    var el = document.getElementById('noteTo');
    if (!el || el.getAttribute('data-en') === el.textContent) return;
    var em = el.querySelector('em');
    if (!em) return;
    var who = em.textContent;
    el.innerHTML = 'To <em></em>';
    el.querySelector('em').textContent = who === '참여 작가 모두' ? 'all artists' : name(who);
    el.setAttribute('data-en', el.textContent);
  }

  function applyBlocks() {
    var blocks = PAGE === 'main' ? MAIN_BLOCKS : DOCENT_BLOCKS;
    for (var sel in blocks) {
      var els = document.querySelectorAll(sel);
      for (var i = 0; i < els.length; i++) {
        if (blocks[sel] === '') els[i].hidden = true;
        else els[i].innerHTML = blocks[sel];
      }
    }
  }

  function start() {
    addToggle();
    if (LANG !== 'en') return;
    document.documentElement.lang = 'en';
    document.documentElement.classList.add('lang-en');
    if (PAGE === 'docent') document.title = 'Audio Guide · Everyone Is a Little off';
    else document.title = 'Everyone Is a Little off · Group Exhibition at Pieces Archive, Hongdae';
    applyBlocks();
    if (PAGE === 'docent') {
      // 음성은 한국어. 작품별 영어 해설 글은 따로 붙인다
      var lead = document.querySelector('.lead');
      if (lead) {
        var p = document.createElement('p');
        p.className = 'en-note';
        p.textContent = 'The audio is in Korean. English text for each work will be added here soon.';
        lead.after(p);
      }
    }
    translateNode(document.body);
    if (PAGE === 'main') fixNoteTo();
    var busy = false;
    new MutationObserver(function (records) {
      if (busy) return;
      busy = true;
      records.forEach(function (r) {
        if (r.type === 'characterData') translateNode(r.target);
        else if (r.type === 'attributes') translateNode(r.target);
        else
          r.addedNodes.forEach(function (x) {
            translateNode(x);
          });
      });
      if (PAGE === 'main') fixNoteTo();
      busy = false;
    }).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'aria-label', 'title']
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

/* ── 도슨트 순서 (전시 도슨트 원고 수정본 기준) ─────────
   음성 파일은 docent/audio/ 폴더에 올린다.
   · 작가 음성: '작가이름.mp3' (예: docent/audio/이재이.mp3)
   · 그 밖의 음성: file 에 적힌 이름 (예: docent/audio/서문.mp3)
   name 은 링크(#이재이)로 찾을 때 쓰는 이름, label 은 화면에 보이는 이름이다 */
var CHAPTERS = [
  {
    no: 'PROLOGUE',
    title: '전시 서문',
    sub: 'Everyone Is a Little Off',
    tracks: [{ label: '전시 서문', file: '서문' }]
  },
  {
    no: 'CHAPTER 01',
    title: 'WELCOME TO WONDERLAND',
    sub: '조금 이상한 우리들의 세계에 오신 걸 환영합니다',
    tracks: [
      { no: 1, name: '노정균', work: '이상한 나라들의 앨리스' },
      { no: 2, name: '배정연', label: '정연', work: '어떤 어른이 되었나요?' },
      { no: 3, name: '엄현서', work: '이상한 나라의 해바라기' },
      { no: 4, name: '이재이', label: '재이', work: '어디에 둘까요?' },
      { no: 5, name: '이희지', work: 'WELCOME TO THE TEA PARTY' },
      { label: '토끼굴 아래로', sub: 'B1으로 내려가는 길', file: '연결1' }
    ]
  },
  {
    no: 'CHAPTER 02 · B1',
    title: 'WHO ARE YOU?',
    sub: '당신은 어떤 사람인가요?',
    tracks: [
      { no: 6, name: '윤혜진', work: '미소 짓는 자리' },
      { no: 7, name: '박정은', work: '나의 계절은 아직' },
      { no: 8, name: '최윤지', work: '각자의 촛불을 켜는 시간' },
      { no: 9, name: '최윤아', work: 'Off-beat' },
      { label: '성장측정실', sub: '나만의 성향을 측정해 보세요', file: '성장측정실' },
      { no: 10, name: '임소라', work: '발돋움' },
      { no: 11, name: '홍성호', work: '나를 따르다' },
      { no: 12, name: '남다름', work: '꿈과 현실 사이' },
      { no: 13, name: '남선주', work: '그림자 너머' },
      { no: 14, name: '박수룡', work: '경계선 위의 발걸음' },
      { label: '2층으로', sub: '2F로 올라가는 길', file: '연결2' }
    ]
  },
  {
    no: 'CHAPTER 03 · 2F',
    title: 'STILL BECOMING',
    sub: '우리는 여전히 되어가는 중',
    tracks: [
      { no: 15, name: '이경도', work: '바다' },
      { no: 16, name: '편해연', work: '마이 룸 인 원더랜드' },
      { no: 17, name: '이서현', work: '점화' },
      { no: 18, name: '김지현', work: 'What We Left on the Table' },
      { no: 19, name: '조수연', work: 'Vase' },
      { no: 20, name: '홍림', work: '1+1+1=1' }
    ]
  },
  { no: 'EPILOGUE', title: 'TAKE ME', sub: '', tracks: [{ label: '에필로그', file: '에필로그' }] }
];
var AUDIO_DIR = '/docent/audio/';

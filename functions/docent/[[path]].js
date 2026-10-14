// /docent 아래 모든 주소(음성 파일 포함)를 이 경로로 받아, 같은 폴더의 _middleware.js 잠금을 거치게 한다.
// 잠금을 통과하면 원래 파일을 그대로 내보낸다.
export const onRequest = (context) => context.next();

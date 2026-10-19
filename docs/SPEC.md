# 기술 명세 (SPEC)

〈조금 이상한 우리들〉 안내 사이트의 구조, 사용 기술, 외부 연동, 데이터 규격을 정리한 문서입니다.
기능 소개와 자주 고치는 곳은 [README](../README.md)에 있습니다.

## 1. 개요

| 항목        | 내용                                                                         |
| ----------- | ---------------------------------------------------------------------------- |
| 형태        | 빌드 과정 없는 정적 사이트 + 서버 함수 2개                                   |
| 호스팅      | Cloudflare Pages (GitHub `main` 브랜치 → 자동 배포, 출력 폴더 = 저장소 루트) |
| 서버 함수   | Cloudflare Pages Functions (Workers 런타임)                                  |
| 데이터 저장 | Google 시트 (Google Apps Script 웹앱을 통해 읽고 씀)                         |
| 대상 기기   | 휴대폰 브라우저 우선 (iOS Safari, Android Chrome), 데스크톱 크롬 · 사파리    |
| 언어        | 한국어 (`<html lang="ko">`)                                                  |

## 2. 사용 기술

| 영역              | 사용한 것                                                                                | 비고                                                        |
| ----------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 마크업            | HTML5                                                                                    | 페이지당 HTML 한 장                                         |
| 스타일            | CSS (사용자 정의 속성, `clamp`/`min`/`max`, `aspect-ratio`, `mask`, `svh`)               | 전처리기 없음                                               |
| 브라우저 스크립트 | 바닐라 JavaScript (ES5 문법)                                                             | 프레임워크 · 번들러 없음. 오래된 휴대폰에서도 그대로 돌도록 |
| 서버 함수         | JavaScript ES 모듈 (Workers 런타임)                                                      | `fetch` 표준 `Request`/`Response`, Web Crypto               |
| 글꼴              | Google Fonts: Hahmlet(제목), IBM Plex Sans KR(본문), Gaegu(쪽지 손글씨, `/jessie`에서만) |                                                             |
| 외부 서비스       | Google Apps Script 웹앱, Google 시트                                                     | 쪽지 · 예약 · 게시판                                        |
| 지도              | 네이버 지도, 카카오맵, 구글 지도 링크                                                    | 링크만, 지도 SDK 없음                                       |
| 테스트            | Playwright Test 1.56 (브라우저), Node.js 내장 `node:test` (서버 함수)                    | `tests/`                                                    |
| 코드 스타일       | Prettier 3.3.3, EditorConfig                                                             | 설정은 루트의 `.prettierrc.json`, `.editorconfig`           |

브라우저 API: `fetch`, `localStorage`, `IntersectionObserver`, `requestAnimationFrame`, `matchMedia`(동작 줄이기), `document.fonts`, `Image.decode`, Media Session(도슨트 잠금 화면 조작), Clipboard(주소 · 링크 복사).

## 3. 구조

### 3.1 파일 구성

```
index.html              /, /jessie, /jessie/visit 공용
docent/index.html       /docent         (잠김)
docent/debug.html       /docent/debug   (잠기지 않음)
docent/audio/*.mp3      도슨트 음성      (잠김. 아직 저장소에 없음, 커밋하면 함께 배포됨)
assets/css/*.css        페이지별 스타일
assets/js/*.js          페이지별 스크립트 + 공용 데이터
assets/img/             포스터
works/<작가>/            작품 사진 (NN.jpg 원본, NN-s.jpg 목록용)
functions/              Pages Functions
_headers                캐시 규칙
_redirects              배포할 필요 없는 문서 · 테스트 폴더를 첫 화면으로 돌림
robots.txt, sitemap.xml 검색 엔진 안내
tests/                  테스트 (배포에 영향 없음)
docs/                   문서
```

### 3.2 주소와 화면 모드

Cloudflare Pages는 `404.html`이 없으면 없는 주소에 `index.html`을 내줍니다. 이 동작을 이용해 `index.html` 한 장이 주소에 따라 세 가지 화면이 됩니다.

| 주소            | 판정                          | `<html>` class           | 결과                              |
| --------------- | ----------------------------- | ------------------------ | --------------------------------- |
| `/`             | 기본                          | –                        | 메인                              |
| `/#이름`        | `location.hash`               | –                        | 메인 + 초대 문구 · 작가 미리 선택 |
| `/jessie`       | `PAGE_ARTISTS['jessie']`      | `artist-page`            | 작가 전용 페이지                  |
| `/jessie/visit` | `PAGE_VISITS['jessie/visit']` | `artist-page visit-page` | 예약 전용 페이지                  |

- `index.html` 머리의 인라인 부트 스크립트가 첫 화면이 그려지기 전에 `anim`(동작 허용), `visit-loading`(예약 페이지 로딩 중)을 붙입니다.
- 나머지는 `body` 끝에서 불러오는 `assets/js/site.js`가 처리합니다.

### 3.3 `assets/js/site.js` 모듈

파일 전체가 하나의 즉시 실행 함수(IIFE)이고, 기능별로 다시 IIFE로 나뉩니다.

| 모듈             | 하는 일                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------- |
| 작가 전용 주소   | 주소 판정, 카드 순서 · 숨김, 인사말 위치, 포스터에 작가 그림 겹치기, 전시 후 도슨트 불러오기 |
| 예약 페이지 장면 | 달력, 장면 묶기, 페이드 넘기기, 입력 중 잠금, 로딩 대기 · 표지 소개, 예약 버튼, 폼 줄이기    |
| 작품 뷰어        | 전체 화면 사진 넘기기 (원본은 지금 사진과 양옆만 받음)                                       |
| D-DAY            | 오픈 전 `D-N`, 전시 중 `N일차`, 끝나면 `종료`                                                |
| 복사             | 주소 · 링크 복사                                                                             |
| 작가에게 한마디  | 작가 선택, 글자 수, 금지 표현 검사, 전송                                                     |
| 쪽지 게시판      | 게시판 불러오기, 12장씩 보기, 접기 · 작게 · 하트, 새 쪽지 바로 붙이기                        |
| 관람 예약        | 날짜 · 작가 목록, 검사, 전송, 완료 안내                                                      |
| 작가별 공유 링크 | `#이름`으로 초대 문구 · 강조 · 미리 선택                                                     |
| 조금 이상한 질문 | 질문 목록, 안 본 질문 우선, 높이 고정, 바뀜 애니메이션                                       |
| 지금 전시장에는  | 근무표 CSV를 한국 시간 기준으로 읽어 지금 근무자 표시                                        |
| 모션             | 화면에 들어올 때 드러나는 효과                                                               |

### 3.4 예약 페이지 장면 엔진

- 장면 7개를 `position: fixed`로 겹쳐 두고, 보이는 장면에만 `.is-active`를 붙여 `opacity`로 페이드(`FADE` = 450ms)합니다. 나머지는 `inert` + `aria-hidden`.
- 다음 · 이전 입력: `wheel`, `touchstart/touchmove`, `keydown`(↑↓, PageUp/Down, Space, Home/End), 오른쪽 점, 달력 날짜, 장면별 예약 버튼.
- 장면이 화면보다 길면 장면 안에서 먼저 스크롤되고, 끝(`scrollTop`이 0 또는 최대)에서만 넘어갑니다.
- 연속 넘기기 방지: 넘긴 뒤 `FADE + 150ms` 동안 잠금, 휠은 신호가 220ms 끊길 때까지 다시 받지 않음(트랙패드 관성 대응).
- 입력 칸에 초점이 있으면(`.is-typing`) 넘기기를 멈춥니다.
- 첫 진입: 페이지 `load`, 포스터 · 겹친 그림 `decode()`, `document.fonts.ready`를 기다린 뒤(최대 20초) 표지를 보여 주고, `AUTO_HIDE` 뒤 전시 안내로 넘어갑니다(합계 3초). 기다리는 동안 내리면 바로 전시 안내로 건너뜁니다.
- 성능: 페이드 중 매 프레임 다시 그려지는 `filter: drop-shadow`는 쓰지 않고 `box-shadow`를 씁니다(크롬에서 프레임 50~80ms → 16.7ms).

## 4. 외부 연동

### 4.1 Google Apps Script 웹앱

`site.js`의 `SHEET_ENDPOINT`(배포된 웹앱 주소). 스크립트 코드는 Google Apps Script 편집기에 있고 이 저장소에는 없습니다.

| 용도        | 요청   | 본문 · 쿼리                                               | 응답                                       |
| ----------- | ------ | --------------------------------------------------------- | ------------------------------------------ |
| 쪽지 보내기 | `POST` | `{ artist, message, sender, at }`                         | `{ ok }`                                   |
| 관람 예약   | `POST` | `{ type: 'reservation', name, date, artist, companions }` | `{ ok }` 또는 `{ ok: false, reason }`      |
| 게시판 읽기 | `GET`  | `?type=board&artist=<본명>`                               | `{ ok, notes: [{ message, sender, at }] }` |

- `POST`는 `Content-Type: text/plain;charset=utf-8`로 보냅니다. Apps Script는 CORS 사전 요청(OPTIONS)에 답하지 못하므로, 사전 요청이 생기지 않는 형식을 씁니다. 응답을 읽지 못하면 `no-cors`로 한 번 더 보냅니다(쪽지).
- `artist`: 작가 본명. 비어 있으면 '전체'(쪽지) 또는 워크인 칸(예약).
- `date`: 예약 시트 '방문 날짜' 드롭다운 값과 같아야 함. 예: `11/14(토)`.
- `companions`: 예약자를 뺀 동행 인원 (`''` = 고르지 않음, `'0'` = 혼자).
- 예약 실패 `reason`: `blocked_*`, `bad_date`, `rate_limited`, `busy` → 화면 안내 문구로 바뀜.
- 게시판은 `BOARD_ARTISTS`에 있는 작가만 엽니다(Apps Script 쪽 목록과 같아야 함).

### 4.2 Cloudflare Pages Functions

| 주소                                                    | 파일                                              | 동작                                                                                                                                                                             |
| ------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /after-docent?artist=<본명>[&k=<열쇠>]`            | `functions/after-docent.js`                       | 마감(2026-11-17 20:00 KST) 전: `{ ok: false, openAt }`. 마감 후 또는 `k`가 `DOCENT_KEY`와 같으면: `{ ok: true, artist, title, paragraphs }`. 항상 200, `Cache-Control: no-store` |
| `/docent/*`                                             | `functions/docent/_middleware.js` + `[[path]].js` | 아래 잠금                                                                                                                                                                        |
| `GET /docent/__status[?at=YYYY-MM-DDTHH:mm][&logout=1]` | `_middleware.js`                                  | 잠금 상태 JSON (열쇠 · 비밀값의 값은 내보내지 않음)                                                                                                                              |

**도슨트 잠금 순서**

1. `/docent/debug`는 통과(캐시 금지, 검색 제외).
2. `DOCENT_KEY` 또는 `DOCENT_SECRET`이 없으면 503 "도슨트 준비 중".
3. 운영 시간이 아니면 403 (리허설 모드는 2026-11-12 0시 전까지만 무시).
4. `?k=`가 있으면 열쇠를 비교해, 맞으면 입장권 쿠키를 주고 `k`를 지운 주소로 302.
5. 입장권 쿠키가 유효하면 페이지 · 음성을 내줌(`private, no-store`), 아니면 403 "전시장에서 들어 주세요".

**입장권 쿠키** `docent_pass=<만료 유닉스초>.<서명>`

- 서명: `HMAC-SHA256(만료 시각, DOCENT_SECRET)`을 base64url로.
- `Path=/docent; Max-Age=10800; HttpOnly; Secure; SameSite=Lax` (3시간).
- 열쇠 · 서명 비교는 길이가 같으면 끝까지 비교해 시간 차이로 정보가 새지 않게 합니다.

**운영 시간** (KST): 11/12 13:00–21:00, 11/13–16 11:00–21:00, 11/17 11:00–20:00.

### 4.3 환경 변수 (Cloudflare Pages → 설정 → 변수 및 비밀)

| 이름                 | 종류            | 쓰는 곳                                       |
| -------------------- | --------------- | --------------------------------------------- |
| `DOCENT_KEY`         | 비밀            | 도슨트 QR 열쇠, 전시 후 도슨트 미리 보기 열쇠 |
| `DOCENT_SECRET`      | 비밀            | 입장권 서명                                   |
| `DOCENT_ALWAYS_OPEN` | 일반 (`"true"`) | 리허설 모드                                   |

값은 Cloudflare에만 있고 저장소 · 문서 · 테스트에는 넣지 않습니다. 테스트는 가짜 값(`test-key` 등)을 씁니다. 로컬에서는 `.dev.vars`(커밋되지 않음)에 둡니다.

## 5. 브라우저에 남기는 값 (`localStorage`)

| 키                  | 값                        | 용도                      |
| ------------------- | ------------------------- | ------------------------- |
| `alo.seenQuestions` | 본 질문 문장 배열         | 안 본 질문 먼저 보여 주기 |
| `note-sent`         | 마지막 쪽지 보낸 시각(ms) | 20초 안 연속 전송 막기    |
| `visit-sent`        | 마지막 예약 시각(ms)      | 20초 안 연속 예약 막기    |

모든 읽기 · 쓰기는 `try/catch`로 감싸, 사생활 보호 모드처럼 저장이 막혀도 동작합니다.

## 6. 입력 보호

- 쪽지 · 예약 이름: 이메일, 전화번호, 9자리 이상 숫자, 링크, 도메인, 광고성 낱말을 브라우저에서 막습니다(서버에서도 다시 거름).
- 숨은 입력 칸(허니팟 `nickname`)이 채워져 있으면 자동 프로그램으로 보고 보낸 척만 합니다.
- 쪽지 300자 제한, 20초 연속 전송 제한.
- 게시판 쪽지는 `textContent`로만 넣어 HTML이 실행되지 않습니다.

## 7. 캐시 · 성능

- `_headers`: 작품 사진, 포스터, 링크 미리보기 이미지, 아이콘은 하루 캐시 + 일주일 `stale-while-revalidate`.
- HTML · CSS · JS는 Pages 기본값(매번 확인)이라 고친 내용이 바로 반영됩니다.
- 표지 포스터는 `<link rel="preload" fetchpriority="high">`, 작품 사진은 `loading="lazy"`, 뷰어 원본은 지금 사진과 양옆만 받음.
- 글꼴 크기는 기기 설정과 상관없이 고정(`html { font-size: 16px; text-size-adjust: 100% }`).

## 7-1. 검색 노출 (SEO)

- 검색에 나오는 주소는 메인(`/`) 하나입니다. `<link rel="canonical">`, `robots.txt`, `sitemap.xml`이 모두 메인을 가리킵니다.
- 작가 개인 페이지(`/jessie`, `/jessie/visit`)는 지인에게 보내는 초대 링크라 `_headers`의 `X-Robots-Tag: noindex`와 페이지 안 `<meta name="robots">`로 검색에서 뺍니다. `/docent`는 잠금 함수가 `noindex`를 붙입니다.
- `<script type="application/ld+json">`에 schema.org `ExhibitionEvent`(기간 · 장소 · 입장료 · 주최)를 적어, 검색 결과에 전시 일정이 함께 보일 수 있게 합니다.
- 링크 미리보기: Open Graph(`og:*`), Twitter 카드, 1200×630 `og-image.jpg`.
- 검색 엔진 등록(구글 서치 콘솔, 네이버 서치어드바이저)은 소유 확인이 필요해 각 서비스에서 직접 합니다. 확인용 `<meta>` 태그나 HTML 파일을 받으면 `index.html` 머리나 루트에 넣습니다.

## 8. 접근성

- 장면 · 뷰어 · 달력 버튼에 `aria-label`, `aria-current`, `aria-pressed`, `aria-expanded`.
- 숨은 장면은 `inert`로 초점이 들어가지 않음, 키보드 초점이 다른 장면으로 가면 그 장면으로 넘어감.
- `prefers-reduced-motion`이면 움직임 · 페이드를 끔.

## 9. 테스트

`tests/` 폴더에 따로 두어 배포물과 섞이지 않게 했습니다(Cloudflare Pages는 루트의 `package.json`만 보고 설치함).

```sh
cd tests
npm install
npx playwright install chromium   # 처음 한 번
npm test                          # 서버 함수 단위 테스트 + 브라우저 테스트
```

| 종류                  | 파일                        | 내용                                                                                                                                                                        |
| --------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 단위 (`node:test`)    | `unit/docent-gate.test.js`  | 설정 없음 503, 운영 시간 · 첫날 13시, 리허설 기한, QR 열쇠 → 쿠키 · 302, 위조 · 만료 입장권, 점검 주소, 상태 JSON에 비밀값 없음                                             |
| 단위                  | `unit/after-docent.test.js` | 마감 전 비공개, 마감 후 공개, 열쇠 미리 보기, 열쇠 설정 없음, 글 없는 작가                                                                                                  |
| 브라우저 (Playwright) | `e2e/main.spec.js`          | D-day 세 상태 · 근무표, 콘솔 인사, 안 본 질문 우선, 공유 링크, 쪽지 금지 표현 · 전송, 예약 검사 · 전송                                                                      |
| 브라우저              | `e2e/artist-page.spec.js`   | 카드 구성, 작품 뷰어, 게시판 12장씩 · 하트 · 작게 · 접기, 새 쪽지 바로 붙이기, `?to=board`, 불러오기 실패, 전시 후 도슨트                                                   |
| 브라우저              | `e2e/visit-page.spec.js`    | 로딩 대기 → 표지 → 자동 전환, 로딩 중 건너뛰기, 장면 순서, 키보드 · 휠 · 점, 관성 연타 한 장, 기본 날짜 · 달력 → 예약, 폼 줄이기, 예약 완료 버튼, 게시판 링크, 입력 중 잠금 |
| 브라우저              | `e2e/docent.spec.js`        | 순서표대로 목록, `#작가명` 바로 불러오기, 점검 페이지                                                                                                                       |

- 브라우저 테스트는 `tests/server.mjs`(Pages의 정적 파일 · SPA 대체 동작을 흉내 낸 서버)로 사이트를 띄우고, Apps Script · 글꼴 · `/after-docent`는 가짜 응답으로 바꿔 네트워크 없이 같은 결과를 냅니다.
- 시각은 `page.clock` / `mock.timers`로 고정해 날짜에 따라 결과가 바뀌지 않습니다. 기기는 390×760 휴대폰 크기의 크롬, 시간대는 `Asia/Seoul`입니다.

## 10. 배포

1. `main`에 푸시하면 Cloudflare Pages가 저장소 루트를 그대로 올리고 `functions/`를 함수로 배포합니다(빌드 명령 없음).
2. GitHub 커밋 옆 'Cloudflare Pages' 체크로 배포 성공을 확인합니다.
3. 도슨트 음성은 `docent/audio/`에 커밋하면 함께 배포됩니다. 환경 변수는 Cloudflare 설정에서만 관리합니다.

# 에프터마인드2기 체크메이트 — 이어가기 가이드

> 마지막 작업: 2026-05-07
> 다음 세션 시작 시 이 문서 먼저 읽기.

---

## 🚀 프로덕션

- **URL**: https://aftermind-checkmate.vercel.app
- **Vercel 프로젝트**: `jaewonhyeon9-7705s-projects/aftermind-checkmate`
- **함수 리전**: `icn1` (서울) — Supabase와 같은 리전
- **DB**: Supabase `pwnegioardhvvkxttjsx` (서울)
- **GitHub repo**: https://github.com/jaewonhyeon9-ctrl/aftermind-checkmate (private)
- **배포 방식**: `git push` → Vercel 자동 빌드/배포 (CLI 불필요)

## 🔑 계정 (현재 4개 가입됨)

| 이메일 | 이름(DB) | 역할 |
|---|---|---|
| capetern1@gmail.com | capetern1 | OPERATOR |
| capetern@kakao.com | (확인 필요) | MEMBER |
| hammida7@gmail.com | (확인 필요) | MEMBER |
| (tkdrmsrla@nate.com 은 삭제됨, 재가입 가능) | | |

각자 /me 페이지에서 ✏️ 편집으로 이름·최종 목표 직접 수정 가능.

## ✅ 완료된 기능 (2026-04-28)

### 코어
- Next.js 16 + Prisma 6 + Supabase + Vercel
- 4-tab 네비 (오늘/팀 피드/운영자/내 기록)
- 회원가입 → 자동 이메일 확인 (admin createUser, rate limit 우회)
- 로그인 후 30일 자동 세션 (refresh token)

### 데일리 리포트
- 폼: 기상/출근, 회고(Small Win/Insight), 타임라인, Must 3, Nice 3, 변수, One Thing, 응원
- 타임라인 폼 안에서 시간 슬롯별 입력 (시작/마감 시간)
- 어제 Must 3 + 오늘 Must 3 둘 다 체크 가능
- 모든 체크 항목에 **메모** (URL 자동 링크 — 쓰레드/인스타/유튜브 등)

### 운영자 과제
- 🔥 전체 필수 / ⭐ 개별 특별
- **🎬 필수 시청 영상 링크** (빨간 배너로 강조)
- **🔗 추가 참고 링크** (여러 개)
- 카드별 진행률 + 팀원별 완료 상태

### 게이미피케이션
- 🎉 마감 안에 완료 시 Confetti 애니메이션
- **레벨 시스템** (10단계, 한글 닉네임)
  - 🌫️ 불규칙 → 🌬️ 흔들리는 → 🌱 새싹 → 🌿 꾸준 → ⚖️ 균형 → 🪵 단단한 → 🏗️ 마스터 → 🎼 마에스트로 → 👑 그랜드 → 🌟 전설
  - XP: 작성 +10 / 타임라인 완료 +5 / **온타임 +10** / Must 체크 +5 / 운영자 과제 +15 / streak 보너스
- 연속 작성 streak

### 내 기록 (/me)
- 그라데이션 프로필 카드 + ✏️ 편집 (이름·최종 목표)
- 레벨 카드 + XP 바 (보라/시안 그라데이션, 황금 진척 바)
- 통계 3개 (오늘/주/월)
- 월간 캘린더 → 클릭하면 `/entry/[date]` (과거: 읽기 전용)
- 최근 데일리 14일 + Insight 모음 + 공유 버튼
- 우측 상단 + 하단에 **로그아웃** 두 군데

### 팀 피드 (/feed)
- 카드별 최종 목표 + ONE THING + Must 3 + 타임라인
- 본인 카드의 타임라인은 **인터랙티브** (피드에서 바로 체크 가능)
- 카드 하단 **자동 일간 리포트** (작성 ✓, 타임라인 진행률, 운영자 과제 진행률)

### 알림 / 인스톨
- **인앱 알람** (Web Notification API) — 타임라인 시작 시간에 푸시
- **PWA 설치 가능** (manifest + service worker)
- 회원가입 직후 자동으로 **"홈 화면에 설치" 팝업** (Android Chrome / iOS Safari 분기 안내)
- /me 페이지에 "📥 홈 화면에 설치하기" 버튼 (이미 설치된 경우 자동 숨김)
- **AGround 로고** (SVG → 192/512/180/32 PNG 자동 생성)
- 카카오톡/페북/인스타/네이버/라인 인앱 브라우저 감지 → **외부 브라우저 열기** 배너

### 디자인 — 사이버펑크 다크 테마
- 다크 배경 + 시안(#00e0ff) / 바이올렛(#a155ff) / 라임(#b1ff42) 네온 액센트
- 그리드 패턴 배경 (radial mask)
- 헤더: 글래스모피즘 + 시안→바이올렛 그라데이션 텍스트
- 바텀 네비: 활성 탭 시안 글로우 + 상단 인디케이터
- 버튼: 시안→바이올렛 그라데이션 + 글로우 섀도우

---

## 🆕 2026-05-04 추가 — 팀 협업 + 코인

### 팀 라우트 (`/team`)
4개 서브탭 (TeamSubNav):
- **🤝 기여** (`/team/contribute`) — 팀원이 자기가 줄 수 있는 도움 등록 → 신청 → 작성자 승인 → 완료 시 보상 코인 송금
- **🎓 수업** (`/team/class`) — 수업 개설 (정원 옵션) → 선착순 자동 등록 → 완료 시 보상
- **🪙 코인** (`/team/coin`) — 잔액/송금/발행/거래내역. 팀원 잔액 순위
- **📊 리포트** (`/team/report`) — 월~일 주간, 코인 거래 + 체크리스트 통계, 토요일에 "주말 결산" 강조, 이전/다음 주 네비

### 코인 정책
- **무한 발행** (사용자 결정): 누구나 새 코인 발행 가능 (`fromUserId = null`)
- **송금**: 잔액에서 차감, 자기 자신엔 송금 금지
- **잔액 계산**: `sum(received) - sum(sent)` 동적 (캐시 필드 X)
- **이벤트 소싱**: 모든 코인 흐름이 `CoinLedger` 한 곳에 기록 (reason: ISSUE/TRANSFER/CONTRIBUTION_REWARD/CLASS_REWARD)

### BottomNav 변경
- 운영자 6개 / 멤버 5개 (오늘/피드/팀/가계부/[운영자]/내기록)
- 기존 `/feed` 라벨이 "팀"이었는데 "피드"로 변경, 새 `/team`이 "팀" 차지

### DB 모델 추가
| 테이블 | 용도 |
|---|---|
| `ContributionPost` | 기여 또는 수업 게시. type SKILL/CLASS, status OPEN/CLOSED |
| `ContributionApplication` | 신청. status PENDING/ACCEPTED/REJECTED/COMPLETED |
| `CoinLedger` | 코인 흐름 기록 (이벤트 소싱) |

### 핵심 파일
- `lib/coin.ts` — `getBalance` / `getBalances` / `issueCoin` / `transferCoin`
- `app/(app)/team/actions.ts` — 게시/신청/승인/완료/송금/발행 서버 액션
- `app/(app)/team/post/[id]/page.tsx` — 게시글 상세 + 작성자용 신청자 관리

---

## 🆕 2026-05-06 추가 — 만다라트 + 게시글 수정 + 수업 일정 + 전반적 CRUD

### 만다라트 차트 (`/me`)
- 9x9 그리드 (외곽 3x3 sub-grid × 9개)
- 중앙: 메인 목표 (시안↔바이올렛 그라데이션)
- 라임색 셀 8개: 하위 목표 — 중앙 sub-grid 둘레 + 각 외곽 sub-grid 가운데 (자동 동기화)
- 나머지 64셀: 액션 아이템
- 모바일 폭 맞춤 (text-[9px]). 일괄 저장 버튼 + 초기화 버튼
- DB: `User.mandalaChart` JSONB (마이그레이션 011)
- 핵심 파일: `app/(app)/me/MandalaChart.tsx`, `app/(app)/me/actions.ts:updateMandala`

### 수업 일정 (강의자가 정함)
- `ContributionPost`에 `scheduledAt` (DateTime?) + `scheduleNote` (String?) 추가 — 마이그레이션 012
- PostForm에서 **CLASS 타입일 때만** datetime-local + 메모 입력 노출
- PostCard / 게시글 상세에 라임색 일정 박스로 표시 (`5/8 (수) 14:30` 형식)
- 강의자가 게시글 수정 폼으로 일정 변경 가능
- 메모 활용 예: "참여자와 조율 후 결정", "Zoom 링크는 등록 후 공유"

### 게시글 수정 (`ContributionPost`)
- 작성자 카드 하단에 **수정** 버튼 추가
- 클릭 시 카드가 그 자리에서 **편집 폼**으로 전환 (제목/설명/보상/정원/마감/일정 모두 변경)
- 저장 시 원래 카드로 복귀
- 액션: `updatePost` (작성자만, 권한 체크)

### 모든 기능 수정 강화
- **TimelineTask**: 연필 아이콘 → 인라인 수정 폼 (제목/시작/마감) — `updateTimelineTask`
- **AssignedTask (운영자 과제)**: 연필 아이콘 → 인라인 편집 카드 (제목/설명/영상/링크/마감) — `updateAssignedTask`
  - scope/assignee는 변경 불가 (이미 생성된 completions 영향 방지)
- **ContributionApplication 메시지**: 신청자가 PENDING 상태일 때 본인 메시지 수정 — `updateApplicationMessage`
  - ACCEPTED/COMPLETED는 잠김

### CoinLedger CRUD 정책
- **수정/삭제 미지원** (의도적). 이벤트 소싱이라 거래 삭제 시 잔액 음수 가능 → 무결성 깨짐
- 필요 시 "취소 송금" (역방향 거래 추가) 방식이 안전. 별도 요청 시 추가 가능

---

## 🆕 2026-05-07 — 버그 수정 + 이벤트 기반 웹푸시

### 버그 수정 (커밋 `5b93dc1`)
1. **타임라인 저장 시 추가분 사라지던 버그**: `/today`에서 ⏰ 타임라인 섹션의 "+ 추가"로 더한 항목이 본문 저장 시 사라지는 문제. 폼 마운트 시점의 옛 timeline state가 DB를 덮어써서 발생.
   - `saveDailyEntry`: `timeline` payload가 `undefined`면 timelineTask 동기화 자체를 건너뜀
   - `EntryForm`: `timelineSlot`이 제공되면 `timeline` payload를 안 보냄
2. **시작/마감 시간 같이 등록**: startTime을 바꾸면 dueTime이 시작 ≤ 일 때 자동으로 +1시간 보정. 적용 위치: 폼 안의 타임라인 편집기 / Timeline AddTaskRow / EditTaskRow
3. **만다라트 차트 안 보이던 문제**: `<textarea rows={2}>` + `aspect-square` 충돌로 모바일에서 셀이 찌그러져 안 보임. `<input>`으로 교체, 셀 높이 44px 고정, 폰트 10px, 보라 글로우 박스로 섹션 강조. 좁은 화면에선 가로 스크롤.

### 이벤트 기반 웹푸시 (커밋 `6df3eee`)
인프라(VAPID 키, CRON_SECRET, sw.js, lib/push.ts)는 이미 있어서 트리거만 추가:

| 이벤트 | 발생 위치 | 받는 사람 |
|---|---|---|
| 🪙 코인 송금/발행/보상 | `lib/coin.ts:transferCoin/issueCoin` | 수령자 |
| 📨 새 신청 | `team/actions.ts:applyToPost` | 게시자 |
| ✅/❌ 신청 결정 | `team/actions.ts:decideApplication` | 신청자 |
| 🎉 무보상 완료 | `team/actions.ts:completeAndReward` | 신청자 (보상 있으면 송금 푸시로 갈음) |
| 🔥/⭐ 새 운영자 과제 | `operator/actions.ts:createAssignedTask` | 부여 받은 팀원 (본인 제외) |
| 🌙 데일리 미작성 | `api/cron/daily-reminder` | 매일 22:00 KST cron |

모든 푸시는 fire-and-forget (`.catch(() => {})`). 실패해도 본 액션은 성공.

### 테스트 푸시
- `/api/push/test` 엔드포인트 — 본인에게 테스트 발송
- `/me` 페이지 푸시 활성화 박스 아래 "테스트 알림 받기" 버튼

---

## ⚠️ 2026-05-07 — 카카오 작업 의도치 않은 푸시 (보류 상태)

이번 세션에 사용자가 로컬에서 작업 중이던 카카오 OAuth/리마인더 코드가 내 fix 커밋(`5b93dc1`)에 같이 묶여 production에 올라감. 사용자 결정으로 **롤백하지 않고 그대로 두되, 비활성 상태로 유지**:

**프로덕션 상태**:
- 마이그레이션 013 적용됨 (KakaoIntegration 빈 테이블 존재)
- `/api/auth/kakao/*`, `/api/cron/kakao-reminder`, `/api/integrations/kakao` 라우트 존재
- `KAKAO_CLIENT_ID` 등 env 미설정 → 카카오 연결 시도하면 에러 (UI는 graceful)
- vercel.json에 `kakao-reminder` cron 등록됐지만 매일 14:00 UTC 실행 시 env 없어서 에러만 (사용자 영향 X)
- `/me`에 `KakaoIntegrationCard` 표시되지만 "연결 안 됨" 상태로만 보임

**다음 작업** (사용자 요청: "카카오 공유기능도 같이 만들 때 한번에"):
- Kakao OAuth env 키 설정 + 동작 검증
- Kakao 알림톡 발송 라이브러리 (오토드림과 공유 가능)
- **Kakao 공유 기능** (게시글/리포트 공유)
- 위 셋을 한 번에 묶어서 처리

---

## 🐛 오늘 잡은 주요 버그

1. **proxy.ts 버그** — `/api/auth/*` 엔드포인트가 인증 미들웨어에 의해 비공개로 분류되어 회원가입 호출이 `/login`으로 리다이렉트 → 회원가입 100% 실패. `isPublicApi` 추가로 수정.
2. **`Cache-Control: no-store` 광범위 적용** — 모든 응답 캐시 차단해서 앱 매우 느림. selective `no-cache, must-revalidate`로 완화 + 정적 자산은 기본값 유지.
3. **Vercel 함수 리전** — 기본 미국(iad1) → 한국 사용자가 매번 태평양 왕복. `icn1`로 이전.
4. **잔존 unconfirmed 사용자** — admin createUser가 "이미 존재" 에러로 실패하지만 메시지 모호해서 사용자가 원인 파악 어려웠음. 에러 핸들링 개선.

---

## 📌 미완성 / 추후 작업

### 1. 카카오 알림톡 리마인더 (cron)
**스펙**:
- 저녁 22:00 KST에 그날 데일리 작성 안 한 팀원에게 카톡으로 리마인드
- Vercel Hobby 제약 — cron 23:00 KST 고정 (오토드림과 동일)
- 사용자가 카카오 알림톡 API 키 + 템플릿 설정 후 진행 가능

**필요**:
- KAKAO_API_KEY
- KAKAO_SENDER_KEY
- KAKAO_TEMPLATE_REMINDER (알림톡 템플릿 ID)
- CRON_SECRET (Vercel cron 인증)

**구현**:
- `app/api/cron/reminder/route.ts` 생성
- `vercel.json`에 `crons: [{ path: "/api/cron/reminder", schedule: "0 14 * * *" }]` 추가 (UTC 14:00 = KST 23:00)
- User 모델 `kakaoPhone` 필드는 이미 있음 — 운영자 페이지에 폰번호 입력 UI 추가 필요

### 2. 디자인 사용자 검토 (내일 아침)
- 사이버펑크 톤 마음에 들면 유지 / 톤다운 원하면 조정
- 색상 / 타이포 / 카드 라운드 등 미세 조정

### 3. AGround 로고 PNG 원본 교체 (선택)
- 현재 SVG로 재현 (비슷하지만 동일하지는 않음)
- 원본 PNG 파일 받으면 `public/icons/`에 직접 넣고 `manifest.json` 경로만 PNG로 교체

### 4. 운영자 기능 추가 (필요 시)
- 운영자가 직접 팀원 추가 (admin createUser로 즉시 계정 생성, 임시 비번 발급) — 현재는 자체 회원가입만
- 카카오 알림톡 폰번호 입력
- 팀원별 카카오 알림 ON/OFF

### 5. 데이터 청소
- `tkdrmsrla@nate.com` 잔존 미확인 계정 — **이미 삭제됨**, 재가입 가능
- 다른 미확인 계정도 `scripts/confirm-users.mjs`로 일괄 처리 (모두 confirmed 상태로 정리됨)

---

## 🛠 운영 스크립트

```bash
# 사용자 목록 + 미확인 자동 확인
npx dotenv -e .env.local -- node scripts/confirm-users.mjs

# 특정 이메일 사용자 완전 삭제 (Auth + DB)
npx dotenv -e .env.local -- node scripts/delete-user.mjs <email>

# DB 마이그레이션 SQL 실행
npm run db:exec prisma/manual-migration-XXX.sql

# Prisma 클라이언트 생성
npm run db:generate

# 아이콘 PNG 재생성 (icon.svg → 4 PNG)
node scripts/build-icons.mjs

# 프로덕션 빌드
npm run build

# 프로덕션 배포 (git push로 Vercel 자동 빌드)
git add -A && git commit -m "..." && git push

# Vercel 환경변수 추가
printf "%s" "값" | vercel env add VAR_NAME production
```

---

## 📝 DB 마이그레이션 히스토리

| 번호 | 파일 | 내용 |
|---|---|---|
| 001 | `manual-migration-001-init.sql` | 초기 스키마 (User/DailyEntry/TimelineTask/MustCheck/AssignedTask/Completion + enum) |
| 002 | `manual-migration-002-user-final-goal.sql` | User.finalGoal |
| 003 | `manual-migration-003-memos.sql` | TimelineTask.memo, MustCheck.memo, AssignedTaskCompletion.memo |
| 004 | `manual-migration-004-task-links.sql` | AssignedTask.videoUrl, attachments[] |
| 005 | `manual-migration-005-user-timezone.sql` | User.timezone |
| 006 | `manual-migration-006-push-subscription.sql` | PushSubscription |
| 007 | `manual-migration-007-period-plan.sql` | PeriodPlan (주/월/년 계획) |
| 008 | `manual-migration-008-gratitude.sql` | DailyEntry.gratitude |
| 009 | `manual-migration-009-transaction.sql` | Transaction (가계부 수입/지출) |
| 010 | `manual-migration-010-team-coin.sql` | ContributionPost / ContributionApplication / CoinLedger + 4 enum |
| 011 | `manual-migration-011-mandala.sql` | User.mandalaChart JSONB |
| 012 | `manual-migration-012-class-schedule.sql` | ContributionPost.scheduledAt, scheduleNote |
| 013 | `manual-migration-013-kakao-integration.sql` | KakaoIntegration (적용은 됐으나 기능은 비활성) |

다음 마이그레이션은 `manual-migration-014-*.sql` 부터.

---

## 🔐 환경변수 (Vercel 등록됨)

```
NEXT_PUBLIC_SUPABASE_URL          ✓
NEXT_PUBLIC_SUPABASE_ANON_KEY     ✓ (sb_publishable_)
SUPABASE_SERVICE_ROLE_KEY         ✓ (sb_secret_)
DATABASE_URL                      ✓ (pooler 6543, %5E 인코딩)
DIRECT_URL                        ✓ (pooler 5432, %5E 인코딩)
KAKAO_API_KEY                     비어있음 (cron 시작 시 추가)
KAKAO_SENDER_KEY                  비어있음
KAKAO_TEMPLATE_REMINDER           비어있음
CRON_SECRET                       비어있음
```

DB 비밀번호 노출 우려 시 Supabase 대시보드 → Database → Reset password.

---

## 🎯 다음 세션 첫 메시지 추천

> "에프터마인드2기 체크메이트 이어서. NEXT_STEPS.md 봤고, 카카오 OAuth + 카카오 공유 기능을 같이 마무리하자. KAKAO_CLIENT_ID 등 키는 이거야: ..."

또는

> "푸시 알림 테스트해보니 [어떻게] 동작 / 동작 안 함. [구체적 증상]"

또는 미흡한 부분 있으면 그대로 알려주세요.

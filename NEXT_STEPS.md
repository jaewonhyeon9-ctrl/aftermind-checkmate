# 에프터마인드2기 체크메이트 — 이어가기 가이드

> 마지막 작업: 2026-04-28 (밤)
> 다음 세션 시작 시 이 문서 먼저 읽기.

---

## 🚀 프로덕션

- **URL**: https://aftermind-checkmate.vercel.app
- **Vercel 프로젝트**: `jaewonhyeon9-7705s-projects/aftermind-checkmate`
- **함수 리전**: `icn1` (서울) — Supabase와 같은 리전
- **DB**: Supabase `pwnegioardhvvkxttjsx` (서울)
- **재배포**: `vercel deploy --prod --yes` (CLI 인증돼 있음)

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

# Vercel 프로덕션 배포
vercel deploy --prod --yes

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

다음 마이그레이션은 `manual-migration-005-*.sql` 부터.

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

> "에프터마인드2기 체크메이트 이어서. NEXT_STEPS.md 봤고, 카톡 알림톡 cron부터 진행하자. 카카오 알림톡 API 키 정보는 이거야: ..."

또는

> "디자인 어땠는지 보고 톤다운/조정하자. [구체적 피드백]"

또는 미흡한 부분 있으면 그대로 알려주세요.

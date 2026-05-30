# Codex 코드 리뷰 (2026-05-29) — 체크스타그램·체크인·정기지출·카톡 확장

> Codex CLI (`codex --dangerously-bypass-approvals-and-sandbox review --base main~2`)로 자동 리뷰. P1 이슈 2건 발견, 같은 세션에서 즉시 수정 + 푸시.
>
> 원본 로그: `CODE_REVIEW_2026-05-29.raw.log`

---

## 🔴 P1-1 · 모든 cron 인증 우회 가능 (Critical)

**원인**
```ts
const isVercelCron = req.headers.get("x-vercel-cron-signature") !== null;
if (!isVercelCron && (!cronSecret || auth !== `Bearer ${cronSecret}`)) ...
```
`x-vercel-cron-signature` **헤더의 존재 여부만** 확인하고 값은 검증하지 않음. 외부 공격자가 그 헤더를 아무 값이나 박아서 보내면 `CRON_SECRET` 검증을 건너뜀.

**영향**
- `kakao-daily-summary` — 누구나 호출해서 모든 옵트인 사용자에게 카톡 스팸 가능
- `hourly-checkin` — 누구나 호출해서 매시간 알림 강제 발송
- 기존 `daily-reminder` / `morning-summary` / `kakao-reminder`도 동일 패턴

**수정**
모든 cron 라우트 6개에서 `isVercelCron` 우회를 제거하고 `Authorization: Bearer ${CRON_SECRET}` 만 허용.
Vercel cron은 `CRON_SECRET` env가 설정되어 있으면 이 헤더를 **자동으로 주입**하므로 동작에는 영향 없음.

수정한 파일:
- `app/api/cron/hourly-checkin/route.ts` ✅
- `app/api/cron/kakao-daily-summary/route.ts` ✅
- `app/api/cron/daily-reminder/route.ts` ✅
- `app/api/cron/morning-summary/route.ts` ✅
- `app/api/cron/kakao-reminder/route.ts` ✅
- `app/api/cron/nag-incomplete/route.ts` — 원래부터 정상

---

## 🔴 P1-2 · 체크인 보상 반복 어뷰즈 (Critical)

**원인** (`app/(app)/checkin/actions.ts`)
체크인 삭제 시 `HourlyCheckin` row만 삭제되고 `CoinLedger`의 +50 에마 ledger는 그대로 남음. `isFirst` 판정은 `HourlyCheckin` 존재 여부로만 했기 때문에:

1. 14시에 사진 업로드 → +50 에마
2. 사진 삭제 → HourlyCheckin row 사라짐, 에마는 남음
3. 다시 14시 사진 업로드 → "기존 없음" 으로 판정 → 또 +50 에마
4. 반복 → 무한 에마

**수정**
보상 멱등성을 user+hour 단위로 강제. `CoinLedger.memo` 에 `[checkin:<ISO hour>]` 태그를 박고, 보상 발행 전에 그 태그로 dedup 조회.

```ts
const hourTag = `[checkin:${hour.toISOString().slice(0, 13)}:00]`;
const alreadyRewarded = await prisma.coinLedger.findFirst({
  where: { toUserId: user.id, reason: "ISSUE", memo: { contains: hourTag } },
});
if (!alreadyRewarded) { await issueCoin({...}); }
```

삭제 후 재업로드해도 `CoinLedger` 태그가 남아있으므로 두 번 지급되지 않음.

---

## ✅ 정상 (Codex가 별도 지적 없음)

- Prisma 스키마 + 마이그레이션 4개 — 정합성 OK
- Supabase Storage RLS (`storage.foldername(name)[1] = auth.uid()`) — 본인 폴더 외 업로드/삭제 차단
- 정기 지출 토글 (RecurringCheck) — Transaction과의 라이프사이클 일치
- 카톡 채널 토글 분리 — PATCH endpoint 검증 OK
- 코인 → 에마 명칭 일관성 — UI 텍스트 전반 교체 완료

---

## 📦 후속 수정 커밋

이 리뷰 결과로 수정한 변경분은 같은 세션에서 즉시 커밋·푸시 (Vercel 자동 재배포).

-- TimelineTask 에 isRoutine 컬럼 추가
-- 루틴으로 체크된 항목은 다음 날 DailyEntry 첫 로드 시 자동 복사됨

alter table "TimelineTask"
  add column if not exists "isRoutine" boolean not null default false;

-- 인덱스 — 사용자별 루틴만 빠르게 조회용
create index if not exists "TimelineTask_isRoutine_idx"
  on "TimelineTask" ("dailyEntryId", "isRoutine")
  where "isRoutine" = true;

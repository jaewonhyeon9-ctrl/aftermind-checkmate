-- 2026-04-28: 모든 체크 항목에 메모 필드 추가
ALTER TABLE "TimelineTask" ADD COLUMN IF NOT EXISTS "memo" TEXT;
ALTER TABLE "MustCheck" ADD COLUMN IF NOT EXISTS "memo" TEXT;
ALTER TABLE "AssignedTaskCompletion" ADD COLUMN IF NOT EXISTS "memo" TEXT;

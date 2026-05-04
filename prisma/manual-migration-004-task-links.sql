-- 2026-04-28: 과제에 필수 시청 영상 + 첨부 링크 필드
ALTER TABLE "AssignedTask" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
ALTER TABLE "AssignedTask" ADD COLUMN IF NOT EXISTS "attachments" TEXT[] NOT NULL DEFAULT '{}';

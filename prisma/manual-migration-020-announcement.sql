-- 2026-06-01: 공지사항 (운영자 전용)
-- 체크박스 없는 정보 전달용 게시물. /today 상단에 고정 표시.

CREATE TABLE IF NOT EXISTS "Announcement" (
  "id"        TEXT PRIMARY KEY,
  "authorId"  TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "body"      TEXT,
  "pinned"    BOOLEAN NOT NULL DEFAULT true,
  "startAt"   TIMESTAMPTZ,
  "endAt"     TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "Announcement_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Announcement_pinned_createdAt_idx"
  ON "Announcement" ("pinned", "createdAt");

CREATE INDEX IF NOT EXISTS "Announcement_startAt_endAt_idx"
  ON "Announcement" ("startAt", "endAt");

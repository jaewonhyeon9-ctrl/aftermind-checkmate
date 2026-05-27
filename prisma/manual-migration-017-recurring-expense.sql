-- 2026-05-27: 매일 정기 지출 체크박스 기능
-- 대표님 가계부에서 매일 반복되는 지출을 한 번 등록해두고, 매일 체크만 하면 거래로 자동 발행.

CREATE TABLE IF NOT EXISTS "RecurringExpense" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "label"     TEXT NOT NULL,
  "category"  TEXT NOT NULL,
  "amount"    INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "RecurringExpense_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "RecurringExpense_userId_active_idx"
  ON "RecurringExpense" ("userId", "isActive", "sortOrder");

CREATE TABLE IF NOT EXISTS "RecurringCheck" (
  "id"                 TEXT PRIMARY KEY,
  "recurringExpenseId" TEXT NOT NULL,
  "userId"             TEXT NOT NULL,
  "date"               DATE NOT NULL,
  "transactionId"      TEXT UNIQUE,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "RecurringCheck_recurringExpenseId_fkey"
    FOREIGN KEY ("recurringExpenseId") REFERENCES "RecurringExpense"("id") ON DELETE CASCADE,
  CONSTRAINT "RecurringCheck_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "RecurringCheck_expense_date_key"
  ON "RecurringCheck" ("recurringExpenseId", "date");

CREATE INDEX IF NOT EXISTS "RecurringCheck_userId_date_idx"
  ON "RecurringCheck" ("userId", "date");

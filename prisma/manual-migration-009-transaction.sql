-- 2026-04-29: 가계부 (수입/지출 거래)
DO $$ BEGIN
  CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Transaction" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type"      "TransactionType" NOT NULL,
  "category"  TEXT NOT NULL,
  "amount"    INTEGER NOT NULL,
  "date"      DATE NOT NULL,
  "note"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

DO $$ BEGIN
  CREATE TRIGGER transaction_updated_at BEFORE UPDATE ON "Transaction"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

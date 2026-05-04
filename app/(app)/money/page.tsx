import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayInTz, dateOnly, currentMonthKey } from "@/lib/dates";
import { TransactionForm } from "./TransactionForm";
import { TransactionList } from "./TransactionList";
import { SmsImportPanel } from "./SmsImportPanel";
import { OcrReceiptPanel } from "./OcrReceiptPanel";

export const dynamic = "force-dynamic";

export default async function MoneyPage() {
  const user = await requireUser();
  const tz = user.timezone || "Asia/Seoul";
  const today = todayInTz(tz);
  const monthKey = currentMonthKey(tz);
  const monthStart = monthKey + "-01";
  const monthEndExcl = nextMonthStart(monthKey);

  const monthly = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      date: { gte: dateOnly(monthStart), lt: dateOnly(monthEndExcl) },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  let income = 0;
  let expense = 0;
  const byCategory: Record<string, number> = {};
  for (const t of monthly) {
    if (t.type === "INCOME") income += t.amount;
    else {
      expense += t.amount;
      byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
    }
  }
  const categoryTotal = expense || 1;
  const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHeader
        title="💰 가계부"
        subtitle={format(new Date(monthStart + "T00:00:00"), "yyyy년 M월", { locale: ko })}
      />
      <div className="px-5 py-5 space-y-5">
        <section className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">이번 달 요약</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="수입" value={income} className="text-emerald-600" />
            <Stat label="지출" value={expense} className="text-rose-600" />
            <Stat label="잔액" value={income - expense} className={income - expense >= 0 ? "text-slate-900" : "text-amber-600"} />
          </div>

          {sortedCats.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <p className="text-[11px] text-slate-500">카테고리별 지출</p>
              {sortedCats.map(([cat, amt]) => {
                const pct = Math.round((amt / categoryTotal) * 100);
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="text-slate-700">{cat}</span>
                      <span className="text-slate-500 mono">
                        {fmt(amt)}원 · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-rose-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <SmsImportPanel />

        <OcrReceiptPanel defaultDate={today} />

        <section className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">+ 직접 추가</h3>
          <TransactionForm defaultDate={today} />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700 px-1">최근 거래</h3>
          <TransactionList items={monthly} />
        </section>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50/40 border border-slate-100 p-2.5">
      <p className="text-[10px] font-semibold text-slate-500">{label}</p>
      <p className={"mt-1 text-base font-bold tabular-nums " + (className ?? "")}>
        {fmt(value)}
      </p>
      <p className="text-[10px] text-slate-400 mono">원</p>
    </div>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

function nextMonthStart(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

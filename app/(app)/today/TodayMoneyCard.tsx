import Link from "next/link";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

type Item = {
  id: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: number;
  note: string | null;
};

export function TodayMoneyCard({ items }: { items: Item[] }) {
  const income = items
    .filter((i) => i.type === "INCOME")
    .reduce((s, i) => s + i.amount, 0);
  const expense = items
    .filter((i) => i.type === "EXPENSE")
    .reduce((s, i) => s + i.amount, 0);
  const balance = income - expense;
  const hasAny = items.length > 0;

  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">💰 오늘의 손익</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            오늘 등록된 수입 / 지출 합계
          </p>
        </div>
        <Link
          href="/money"
          className="text-[11px] text-slate-600 hover:text-slate-900 inline-flex items-center gap-0.5"
        >
          전체 <ArrowRight size={11} />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Cell
          label="수입"
          icon={<TrendingUp size={11} className="text-emerald-600" />}
          value={income}
          color="text-emerald-600"
        />
        <Cell
          label="지출"
          icon={<TrendingDown size={11} className="text-rose-600" />}
          value={expense}
          color="text-rose-600"
        />
        <Cell
          label="손익"
          value={balance}
          color={balance >= 0 ? "text-slate-900" : "text-amber-600"}
          showSign
        />
      </div>

      {hasAny && (
        <ul className="pt-2 border-t border-slate-100 divide-y divide-slate-100">
          {items.slice(0, 5).map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 py-1.5 text-xs"
            >
              <span
                className={
                  "text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 " +
                  (t.type === "INCOME"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700")
                }
              >
                {t.category}
              </span>
              <span className="text-slate-600 truncate flex-1">{t.note ?? "—"}</span>
              <span
                className={
                  "tabular-nums mono font-semibold flex-shrink-0 " +
                  (t.type === "INCOME" ? "text-emerald-600" : "text-rose-600")
                }
              >
                {t.type === "INCOME" ? "+" : "-"}
                {fmt(t.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!hasAny && (
        <p className="text-xs text-slate-400 text-center py-3">
          오늘 등록된 거래가 없어요. 가계부 탭에서 추가하세요.
        </p>
      )}
    </section>
  );
}

function Cell({
  label,
  icon,
  value,
  color,
  showSign,
}: {
  label: string;
  icon?: React.ReactNode;
  value: number;
  color?: string;
  showSign?: boolean;
}) {
  const display = showSign && value > 0 ? `+${fmt(value)}` : fmt(value);
  return (
    <div className="rounded-xl bg-slate-50/50 border border-slate-100 p-2.5">
      <p className="text-[10px] font-semibold text-slate-500 inline-flex items-center gap-1 justify-center">
        {icon}
        {label}
      </p>
      <p className={"mt-1 text-base font-bold tabular-nums mono " + (color ?? "")}>
        {display}
      </p>
      <p className="text-[10px] text-slate-400 mono">원</p>
    </div>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

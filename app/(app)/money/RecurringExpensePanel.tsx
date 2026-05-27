"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";
import {
  addRecurringExpense,
  deleteRecurringExpense,
  toggleRecurringCheck,
} from "./actions";

const DEFAULT_CATEGORIES = ["식비", "교통", "주거", "통신", "쇼핑", "여가", "의료", "교육", "기타"];

export type RecurringItem = {
  id: string;
  label: string;
  category: string;
  amount: number;
  checkedToday: boolean;
};

export function RecurringExpensePanel({
  items,
  today,
}: {
  items: RecurringItem[];
  today: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const totalToday = items
    .filter((i) => i.checkedToday)
    .reduce((s, i) => s + i.amount, 0);
  const totalAll = items.reduce((s, i) => s + i.amount, 0);

  function toggle(id: string) {
    startTransition(async () => {
      try {
        await toggleRecurringCheck({ recurringExpenseId: id, date: today });
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "처리 실패");
      }
    });
  }

  function remove(id: string, label: string) {
    if (!confirm(`"${label}" 정기 지출을 삭제할까요? 지금까지 발행된 거래도 함께 사라져요.`)) return;
    startTransition(async () => {
      try {
        await deleteRecurringExpense(id);
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "삭제 실패");
      }
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(amount.replace(/,/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("금액을 정확히 입력해주세요");
      return;
    }
    if (!label.trim()) {
      setError("항목 이름을 적어주세요");
      return;
    }
    startTransition(async () => {
      try {
        await addRecurringExpense({
          label: label.trim(),
          category,
          amount: Math.round(amt),
        });
        setLabel("");
        setAmount("");
        setShowAdd(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "추가 실패");
      }
    });
  }

  function onAmountChange(v: string) {
    const digits = v.replace(/[^\d]/g, "");
    setAmount(digits ? Number(digits).toLocaleString("ko-KR") : "");
  }

  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">📌 정기 지출 체크</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            매일 반복되는 지출 — 체크만 하면 거래로 기록돼요
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
        >
          <Plus size={13} /> 항목 추가
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="space-y-2 rounded-xl bg-slate-50/60 border border-slate-100 p-3">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="항목 이름 (예: 출근 커피)"
            className="input"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
            >
              {DEFAULT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                placeholder="금액"
                className="input pr-8 text-right tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">원</span>
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="flex-1 rounded-lg border border-slate-300 py-2 text-xs text-slate-700"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {pending ? "추가 중…" : "추가"}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">
          등록된 정기 지출이 없어요. 자주 쓰는 항목을 등록해두면 매일 체크만 하면 돼요.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((i) => (
            <li
              key={i.id}
              className={
                "flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors " +
                (i.checkedToday
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white hover:bg-slate-50")
              }
            >
              <button
                type="button"
                onClick={() => toggle(i.id)}
                disabled={pending}
                className={
                  "size-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors " +
                  (i.checkedToday
                    ? "bg-emerald-500 text-white"
                    : "border-2 border-slate-300 hover:border-slate-400")
                }
                aria-label={i.checkedToday ? "체크 해제" : "체크"}
              >
                {i.checkedToday && <Check size={14} strokeWidth={3} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={"text-sm " + (i.checkedToday ? "text-slate-500 line-through" : "text-slate-800")}>
                  {i.label}
                </p>
                <p className="text-[10px] text-slate-400">{i.category}</p>
              </div>
              <p className="text-sm tabular-nums font-semibold text-slate-700">
                {i.amount.toLocaleString("ko-KR")}원
              </p>
              <button
                type="button"
                onClick={() => remove(i.id, i.label)}
                disabled={pending}
                className="text-slate-400 hover:text-rose-500 p-1"
                aria-label="삭제"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-center">
          <div>
            <p className="text-[10px] text-slate-500">오늘 체크된 금액</p>
            <p className="text-sm font-bold text-emerald-600 tabular-nums">
              {totalToday.toLocaleString("ko-KR")}원
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">전체 합계</p>
            <p className="text-sm font-bold text-slate-700 tabular-nums">
              {totalAll.toLocaleString("ko-KR")}원
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

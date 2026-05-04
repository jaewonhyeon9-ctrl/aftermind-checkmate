"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { addTransaction } from "./actions";

const DEFAULT_INCOME_CATEGORIES = ["급여", "용돈", "투자수익", "기타수입"];
const DEFAULT_EXPENSE_CATEGORIES = [
  "식비",
  "교통",
  "쇼핑",
  "여가",
  "주거",
  "통신",
  "의료",
  "교육",
  "기타",
];

export function TransactionForm({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [category, setCategory] = useState(DEFAULT_EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [error, setError] = useState<string | null>(null);

  const cats = type === "INCOME" ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;

  function changeType(t: "INCOME" | "EXPENSE") {
    setType(t);
    setCategory(t === "INCOME" ? DEFAULT_INCOME_CATEGORIES[0] : DEFAULT_EXPENSE_CATEGORIES[0]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = Number(amount.replace(/,/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("금액을 정확히 입력해주세요");
      return;
    }
    if (!category.trim()) {
      setError("카테고리를 선택해주세요");
      return;
    }
    startTransition(async () => {
      try {
        await addTransaction({
          type,
          category: category.trim(),
          amount: Math.round(amt),
          date,
          note: note.trim() || null,
        });
        setAmount("");
        setNote("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "추가 실패");
      }
    });
  }

  function handleAmountChange(v: string) {
    // 콤마 제외 후 숫자만 추출 → 다시 콤마 표시
    const digits = v.replace(/[^\d]/g, "");
    if (!digits) {
      setAmount("");
      return;
    }
    setAmount(Number(digits).toLocaleString("ko-KR"));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => changeType("EXPENSE")}
          className={
            "rounded-lg py-2 text-xs font-semibold border transition-colors " +
            (type === "EXPENSE"
              ? "bg-rose-500 text-white border-rose-500"
              : "bg-white text-slate-600 border-slate-300")
          }
        >
          📤 지출
        </button>
        <button
          type="button"
          onClick={() => changeType("INCOME")}
          className={
            "rounded-lg py-2 text-xs font-semibold border transition-colors " +
            (type === "INCOME"
              ? "bg-emerald-500 text-white border-emerald-500"
              : "bg-white text-slate-600 border-slate-300")
          }
        >
          📥 수입
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input"
        >
          {cats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input"
        />
      </div>

      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          placeholder="금액"
          className="input pr-10 text-right tabular-nums text-base font-semibold"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">원</span>
      </div>

      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="메모 (선택)"
        className="input"
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white inline-flex items-center justify-center gap-1 disabled:opacity-50"
      >
        <Plus size={14} /> {pending ? "추가 중…" : "추가"}
      </button>
    </form>
  );
}

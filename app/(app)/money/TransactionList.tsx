"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Trash2, Pencil, X, Check } from "lucide-react";
import { deleteTransaction, updateTransaction } from "./actions";

type Item = {
  id: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: number;
  date: Date;
  note: string | null;
};

const EXPENSE_CATEGORIES = [
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
const INCOME_CATEGORIES = ["급여", "용돈", "투자수익", "환불", "기타수입"];

export function TransactionList({ items }: { items: Item[] }) {
  const [editing, setEditing] = useState<Item | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-5 text-sm text-slate-500 text-center">
        아직 등록된 거래가 없어요.
      </div>
    );
  }

  // 날짜별 그룹
  const groups: Record<string, Item[]> = {};
  for (const t of items) {
    const key = t.date.toISOString().slice(0, 10);
    (groups[key] ??= []).push(t);
  }

  return (
    <>
      <div className="space-y-3">
        {Object.entries(groups)
          .sort((a, b) => (a[0] < b[0] ? 1 : -1))
          .map(([dateKey, group]) => {
            const dayIncome = group
              .filter((g) => g.type === "INCOME")
              .reduce((s, g) => s + g.amount, 0);
            const dayExpense = group
              .filter((g) => g.type === "EXPENSE")
              .reduce((s, g) => s + g.amount, 0);
            return (
              <div key={dateKey} className="rounded-2xl bg-white border border-slate-200">
                <header className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-700">
                    {format(new Date(dateKey + "T00:00:00"), "M월 d일 (EEE)", { locale: ko })}
                  </p>
                  <p className="text-[11px] text-slate-500 mono">
                    {dayIncome > 0 && (
                      <span className="text-emerald-600">+{fmt(dayIncome)}</span>
                    )}
                    {dayIncome > 0 && dayExpense > 0 && " · "}
                    {dayExpense > 0 && (
                      <span className="text-rose-600">-{fmt(dayExpense)}</span>
                    )}
                  </p>
                </header>
                <ul className="divide-y divide-slate-100">
                  {group.map((t) => (
                    <Row key={t.id} item={t} onEdit={() => setEditing(t)} />
                  ))}
                </ul>
              </div>
            );
          })}
      </div>

      {editing && <EditModal item={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function Row({ item, onEdit }: { item: Item; onEdit: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!confirm("이 거래를 삭제할까요?")) return;
    startTransition(async () => {
      await deleteTransaction(item.id);
      router.refresh();
    });
  }

  return (
    <li className="px-4 py-2.5 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={
              "text-[10px] px-1.5 py-0.5 rounded-full font-semibold " +
              (item.type === "INCOME"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700")
            }
          >
            {item.category}
          </span>
        </div>
        {item.note && <p className="mt-0.5 text-xs text-slate-600 truncate">{item.note}</p>}
      </div>
      <p
        className={
          "text-sm font-bold tabular-nums mono " +
          (item.type === "INCOME" ? "text-emerald-600" : "text-rose-600")
        }
      >
        {item.type === "INCOME" ? "+" : "-"}
        {fmt(item.amount)}
      </p>
      <button
        type="button"
        onClick={onEdit}
        className="p-1 text-slate-400 hover:text-slate-700"
        aria-label="편집"
      >
        <Pencil size={13} />
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="p-1 text-slate-400 hover:text-red-600"
        aria-label="삭제"
      >
        <Trash2 size={13} />
      </button>
    </li>
  );
}

function EditModal({ item, onClose }: { item: Item; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<"INCOME" | "EXPENSE">(item.type);
  const [category, setCategory] = useState(item.category);
  const [amount, setAmount] = useState(item.amount.toLocaleString("ko-KR"));
  const [date, setDate] = useState(item.date.toISOString().slice(0, 10));
  const [note, setNote] = useState(item.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const cats = type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function changeType(t: "INCOME" | "EXPENSE") {
    setType(t);
    if (!cats.includes(category)) {
      setCategory(t === "INCOME" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
    }
  }

  function handleAmountChange(v: string) {
    const digits = v.replace(/[^\d]/g, "");
    setAmount(digits ? Number(digits).toLocaleString("ko-KR") : "");
  }

  function save(e: React.FormEvent) {
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
        await updateTransaction({
          id: item.id,
          type,
          category: category.trim(),
          amount: Math.round(amt),
          date,
          note: note.trim() || null,
        });
        onClose();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "수정 실패");
      }
    });
  }

  function handleDelete() {
    if (!confirm("이 거래를 삭제할까요?")) return;
    startTransition(async () => {
      await deleteTransaction(item.id);
      onClose();
      router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
        className="w-full max-w-md rounded-3xl bg-white text-slate-900 p-5 space-y-3 shadow-2xl"
      >
        <header className="flex items-center justify-between">
          <h3 className="text-base font-bold">거래 수정</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </header>

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
            {/* 현재 값이 사전에 없으면 그대로 살리기 */}
            {!cats.includes(category) && (
              <option value={category}>{category}</option>
            )}
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
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
            원
          </span>
        </div>

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="메모 (선택)"
          className="input"
        />

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="rounded-lg border border-red-300 px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 inline-flex items-center justify-center gap-1"
          >
            <Trash2 size={13} /> 삭제
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-600"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white inline-flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Check size={13} /> {pending ? "저장 중…" : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("ko-KR");
}

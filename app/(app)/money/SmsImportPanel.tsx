"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, Sparkles, Check, X, MessageSquare } from "lucide-react";
import { parseAll, type ParsedTxn } from "@/lib/sms";
import { bulkImportTransactions } from "./actions";

const DEFAULT_PLACEHOLDER = `여기에 카드 알림 SMS / 알림톡을 그대로 붙여넣으세요.

예시:
[삼성카드] 김상근 03/21 14:23 5,500원 일시불 스타벅스강남점 승인
[KB국민카드] 9999 03/21 14:30 12,000원 일시불 GS25강남점 승인

여러 알림을 한 번에 붙여넣어도 자동으로 나눠서 처리됩니다.`;

type Row = ParsedTxn & {
  id: string;
  selected: boolean;
};

export function SmsImportPanel({ initialText }: { initialText?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // share target에서 들어온 텍스트 자동 처리
  useEffect(() => {
    if (initialText) {
      setText(initialText);
      const parsed = parseAll(initialText);
      setRows(
        parsed.map((p, i) => ({
          ...p,
          id: String(i),
          selected: true,
        }))
      );
    }
  }, [initialText]);

  function parse() {
    setError(null);
    setSuccess(null);
    const parsed = parseAll(text);
    if (parsed.length === 0) {
      setError("인식된 거래가 없어요. 카드사 알림 형식인지 확인해주세요.");
      setRows([]);
      return;
    }
    setRows(
      parsed.map((p, i) => ({
        ...p,
        id: String(i),
        selected: true,
      }))
    );
  }

  async function pasteFromClipboard() {
    setError(null);
    try {
      const t = await navigator.clipboard.readText();
      if (!t) {
        setError("클립보드가 비어있어요.");
        return;
      }
      setText(t);
      const parsed = parseAll(t);
      setRows(
        parsed.map((p, i) => ({
          ...p,
          id: String(i),
          selected: true,
        }))
      );
    } catch {
      setError("클립보드 읽기 권한이 없어요. 직접 붙여넣어주세요.");
    }
  }

  function toggle(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));
  }

  function remove(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function update(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function importAll() {
    setError(null);
    setSuccess(null);
    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) {
      setError("추가할 거래를 선택해주세요.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await bulkImportTransactions({
          items: selected.map((r) => ({
            type: r.isCancel ? "INCOME" : r.type, // 취소는 환불 → 수입처리
            category: r.category,
            amount: r.amount,
            date: r.date,
            note: r.merchant,
          })),
        });
        setSuccess(`${res.created}건 추가됨`);
        setRows([]);
        setText("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "추가 실패");
      }
    });
  }

  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 inline-flex items-center gap-1.5">
          <MessageSquare size={14} /> 카드 알림 자동 등록
        </h3>
        <p className="mt-0.5 text-[11px] text-slate-500">
          카드사 SMS / 알림톡을 붙여넣으면 자동으로 카테고리 분류 + 일괄 등록.
          <br />
          공유 메뉴에서 "체크메이트" 선택해도 자동 입력됩니다.
        </p>
      </div>

      <textarea
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={DEFAULT_PLACEHOLDER}
        className="input text-xs leading-relaxed font-mono"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={pasteFromClipboard}
          className="flex-1 rounded-lg border border-slate-300 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-1"
        >
          <ClipboardPaste size={12} /> 클립보드 붙여넣기
        </button>
        <button
          type="button"
          onClick={parse}
          disabled={!text.trim()}
          className="flex-1 rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white inline-flex items-center justify-center gap-1 disabled:opacity-50"
        >
          <Sparkles size={12} /> 자동 분석
        </button>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 border border-red-200 px-2 py-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-1.5 text-xs text-emerald-700">
          ✓ {success}
        </p>
      )}

      {rows.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-700">
            인식된 거래 {rows.length}건 — 추가할 거래 선택
          </p>
          <ul className="space-y-1.5">
            {rows.map((r) => (
              <li
                key={r.id}
                className={
                  "rounded-lg border px-2.5 py-2 " +
                  (r.selected ? "border-slate-900 bg-slate-50/40" : "border-slate-200 opacity-60")
                }
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(r.id)}
                    className={
                      "mt-0.5 size-5 rounded-md flex items-center justify-center border flex-shrink-0 " +
                      (r.selected
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-white border-slate-300 text-transparent")
                    }
                  >
                    <Check size={11} strokeWidth={3} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <select
                        value={r.category}
                        onChange={(e) => update(r.id, { category: e.target.value })}
                        className="text-[11px] font-semibold rounded-full border border-slate-300 bg-white px-2 py-0.5"
                      >
                        {[
                          "식비",
                          "교통",
                          "쇼핑",
                          "여가",
                          "주거",
                          "통신",
                          "의료",
                          "교육",
                          "기타",
                          "환불",
                          "기타수입",
                          "급여",
                        ].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-slate-500">{r.date}</span>
                      {r.card && (
                        <span className="text-[10px] text-slate-400">· {r.card}</span>
                      )}
                      {r.isCancel && (
                        <span className="text-[10px] px-1 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          취소
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-700 truncate">{r.merchant}</p>
                  </div>
                  <p
                    className={
                      "text-sm font-bold tabular-nums mono flex-shrink-0 " +
                      (r.isCancel
                        ? "text-amber-600"
                        : r.type === "INCOME"
                        ? "text-emerald-600"
                        : "text-rose-600")
                    }
                  >
                    {r.isCancel || r.type === "INCOME" ? "+" : "-"}
                    {r.amount.toLocaleString("ko-KR")}
                  </p>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="text-slate-400 hover:text-red-600 p-0.5"
                    aria-label="제거"
                  >
                    <X size={12} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={importAll}
            disabled={pending || rows.filter((r) => r.selected).length === 0}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white inline-flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Check size={14} />
            {pending
              ? "추가 중…"
              : `${rows.filter((r) => r.selected).length}건 일괄 추가`}
          </button>
        </div>
      )}
    </section>
  );
}

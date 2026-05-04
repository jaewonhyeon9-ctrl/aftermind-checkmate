"use client";

import { useState, useTransition } from "react";
import { MessageSquare, X, Check } from "lucide-react";
import clsx from "clsx";
import { Linkify } from "./Linkify";
import { updateMemo } from "@/app/(app)/today/actions";

type Kind = "timeline" | "must" | "assignment";

export function MemoEditor({
  kind,
  id,
  initial,
  placeholder = "메모 (URL 붙여넣으면 자동 링크)",
  readOnly = false,
}: {
  kind: Kind;
  id: string;
  initial: string | null;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? "");
  const [pending, startTransition] = useTransition();
  const hasMemo = !!initial?.trim();

  function save() {
    startTransition(async () => {
      try {
        await updateMemo({ kind, id, memo: value });
        setEditing(false);
      } catch (e) {
        alert(e instanceof Error ? e.message : "저장 실패");
      }
    });
  }

  function cancel() {
    setValue(initial ?? "");
    setEditing(false);
  }

  // 읽기 전용 + 메모 있음 → 그냥 표시
  if (readOnly && hasMemo) {
    return (
      <div className="mt-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-700">
        <Linkify text={initial!} />
      </div>
    );
  }
  if (readOnly) return null;

  if (!editing) {
    return (
      <div className="mt-1">
        {hasMemo ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="w-full text-left rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-700"
          >
            <Linkify text={initial!} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[10px] text-slate-400 hover:text-slate-700 inline-flex items-center gap-1"
          >
            <MessageSquare size={10} /> 메모
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-1.5 rounded-lg border border-slate-300 bg-white p-2 space-y-1.5">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="w-full text-xs outline-none resize-none placeholder:text-slate-400"
        autoFocus
      />
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={cancel}
          className="p-1 text-slate-400 hover:text-slate-700"
          aria-label="취소"
        >
          <X size={14} />
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className={clsx(
            "p-1 rounded-md",
            pending
              ? "text-slate-300"
              : "text-emerald-600 hover:bg-emerald-50"
          )}
          aria-label="저장"
        >
          <Check size={14} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}

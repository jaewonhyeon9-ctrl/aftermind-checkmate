"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import clsx from "clsx";
import { updateMustCheck } from "./actions";
import { MemoEditor } from "@/components/MemoEditor";

type MustCheck = {
  id: string;
  mustIndex: number;
  mustText: string;
  isCompleted: boolean;
  reason: string | null;
  memo: string | null;
};

type Props = {
  checks: MustCheck[];
  variant?: "today" | "yesterday";
};

export function MustCheckList({ checks, variant = "yesterday" }: Props) {
  const isToday = variant === "today";
  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-700">
          {isToday ? "🔥 오늘 Must 3" : "🎯 어제 Must 3 — 잘 실행했나요?"}
        </h3>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {isToday
            ? "오늘 꼭 해야 할 것 3가지. 진행하면서 체크 + 메모"
            : "어제 작성한 꼭 해야 할 것에 대한 회고 체크"}
        </p>
      </div>
      <ul className="space-y-2">
        {checks.map((c) => (
          <CheckRow key={c.id} check={c} variant={variant} />
        ))}
      </ul>
    </section>
  );
}

function CheckRow({ check, variant }: { check: MustCheck; variant: "today" | "yesterday" }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(() => {
      updateMustCheck({
        mustCheckId: check.id,
        isCompleted: !check.isCompleted,
        reason: check.reason,
      });
    });
  }

  return (
    <li>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={clsx(
            "mt-0.5 size-6 rounded-md flex items-center justify-center border transition-colors flex-shrink-0",
            check.isCompleted
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "bg-white border-slate-300 text-transparent hover:border-slate-400"
          )}
          aria-label={check.isCompleted ? "체크 해제" : "체크"}
        >
          <Check size={14} strokeWidth={3} />
        </button>
        <div className="flex-1 min-w-0">
          <p
            className={clsx(
              "text-sm",
              check.isCompleted && "line-through text-slate-400"
            )}
          >
            {check.mustText}
          </p>
          <MemoEditor kind="must" id={check.id} initial={check.memo} />
        </div>
      </div>
    </li>
  );
}

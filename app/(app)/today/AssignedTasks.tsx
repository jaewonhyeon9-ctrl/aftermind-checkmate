"use client";

import { useTransition } from "react";
import { Check, Play, Link as LinkIcon } from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";
import { toggleAssignedCompletion } from "../operator/actions";
import { MemoEditor } from "@/components/MemoEditor";
import { Linkify } from "@/components/Linkify";

type Item = {
  id: string;
  isCompleted: boolean;
  completedAt: Date | null;
  memo: string | null;
  task: {
    id: string;
    scope: "ALL" | "INDIVIDUAL";
    title: string;
    description: string | null;
    videoUrl: string | null;
    attachments: string[];
    dueDate: Date | null;
  };
};

export function AssignedTasks({ items }: { items: Item[] }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-700">📋 운영자 과제</h3>
        <p className="mt-0.5 text-[11px] text-slate-500">
          전체 필수 또는 나에게 부여된 특별 과제
        </p>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <Row key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

function Row({ item }: { item: Item }) {
  const [pending, startTransition] = useTransition();
  function toggle() {
    startTransition(() => toggleAssignedCompletion(item.id));
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
            item.isCompleted
              ? "bg-slate-900 border-slate-900 text-white"
              : "bg-white border-slate-300 text-transparent hover:border-slate-400"
          )}
          aria-label={item.isCompleted ? "체크 해제" : "체크"}
        >
          <Check size={14} strokeWidth={3} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={clsx(
                "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                item.task.scope === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-amber-100 text-amber-800"
              )}
            >
              {item.task.scope === "ALL" ? "🔥 필수" : "⭐ 특별"}
            </span>
            {item.task.dueDate && (
              <span className="text-[10px] text-slate-500">
                ~ {format(new Date(item.task.dueDate), "M/d")}
              </span>
            )}
          </div>
          <p
            className={clsx(
              "mt-1 text-sm",
              item.isCompleted && "line-through text-slate-400"
            )}
          >
            {item.task.title}
          </p>
          {item.task.description && (
            <p className="mt-0.5 text-xs text-slate-600">
              <Linkify text={item.task.description} />
            </p>
          )}
          {item.task.videoUrl && (
            <a
              href={item.task.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-100"
              onClick={(e) => e.stopPropagation()}
            >
              <Play size={12} className="fill-current" /> 필수 시청 영상
            </a>
          )}
          {item.task.attachments.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {item.task.attachments.map((url, i) => (
                <li key={i} className="text-[11px] inline-flex items-center gap-1">
                  <LinkIcon size={10} className="text-slate-400" />
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline underline-offset-2 break-all"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <MemoEditor kind="assignment" id={item.id} initial={item.memo} />
        </div>
      </div>
    </li>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Trash2, Play, Link as LinkIcon } from "lucide-react";
import { deleteAssignedTask } from "./actions";
import { Linkify } from "@/components/Linkify";

type Task = {
  id: string;
  scope: "ALL" | "INDIVIDUAL";
  title: string;
  description: string | null;
  videoUrl: string | null;
  attachments: string[];
  dueDate: Date | null;
  createdAt: Date;
  creator: { id: string; name: string };
  completions: {
    id: string;
    isCompleted: boolean;
    completedAt: Date | null;
    user: { id: string; name: string };
  }[];
};

export function AssignedTaskList({ tasks, myId }: { tasks: Task[]; myId: string }) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-5 text-sm text-slate-500 text-center">
        아직 부여된 과제가 없어요.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} canDelete={t.creator.id === myId} />
      ))}
    </ul>
  );
}

function TaskCard({ task, canDelete }: { task: Task; canDelete: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const total = task.completions.length;
  const done = task.completions.filter((c) => c.isCompleted).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  function remove() {
    if (!confirm(`"${task.title}" 과제를 삭제할까요?`)) return;
    startTransition(async () => {
      await deleteAssignedTask(task.id);
      router.refresh();
    });
  }

  return (
    <li className="rounded-2xl bg-white border border-slate-200 p-4">
      <header className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={
                "text-[10px] px-1.5 py-0.5 rounded-full font-semibold " +
                (task.scope === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-amber-100 text-amber-800")
              }
            >
              {task.scope === "ALL" ? "🔥 전체 필수" : "⭐ 개별 특별"}
            </span>
            <span className="text-[10px] text-slate-400">{task.creator.name}</span>
            {task.dueDate && (
              <span className="text-[10px] text-slate-500">
                ~ {format(new Date(task.dueDate), "M/d")}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-semibold">{task.title}</p>
          {task.description && (
            <p className="mt-0.5 text-xs text-slate-600">
              <Linkify text={task.description} />
            </p>
          )}
          {task.videoUrl && (
            <a
              href={task.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] text-rose-700 hover:bg-rose-100"
            >
              <Play size={11} className="fill-current" /> 필수 시청 영상
            </a>
          )}
          {task.attachments.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {task.attachments.map((url, i) => (
                <li key={i} className="text-[11px] inline-flex items-center gap-1">
                  <LinkIcon size={9} className="text-slate-400" />
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
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="p-1 text-slate-400 hover:text-red-600"
            aria-label="삭제"
          >
            <Trash2 size={14} />
          </button>
        )}
      </header>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>
            완료 {done} / {total}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <ul className="mt-2 flex flex-wrap gap-1">
          {task.completions.map((c) => (
            <li
              key={c.id}
              className={
                "text-[10px] px-2 py-0.5 rounded-full border " +
                (c.isCompleted
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-slate-50 border-slate-200 text-slate-500")
              }
            >
              {c.isCompleted ? "✓ " : "○ "}
              {c.user.name}
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

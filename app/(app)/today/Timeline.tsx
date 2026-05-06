"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Trash2, Clock, Pencil } from "lucide-react";
import clsx from "clsx";
import confetti from "canvas-confetti";
import {
  addTimelineTask,
  completeTimelineTask,
  uncompleteTimelineTask,
  deleteTimelineTask,
  updateTimelineTask,
} from "./actions";
import { MemoEditor } from "@/components/MemoEditor";

type TimelineTask = {
  id: string;
  title: string;
  startTime: string;
  dueTime: string;
  completedAt: Date | null;
  isOnTime: boolean | null;
  memo: string | null;
  order: number;
};

export function Timeline({
  dailyEntryId,
  tasks: initialTasks,
  hideAdd = false,
  bare = false,
}: {
  dailyEntryId: string;
  tasks: TimelineTask[];
  /** 추가 버튼/UI 숨기기 (피드 등 다른 곳에서 임베드용) */
  hideAdd?: boolean;
  /** 카드 래퍼 없이 리스트만 (피드 카드 안에 들어갈 때) */
  bare?: boolean;
}) {
  const [adding, setAdding] = useState(false);

  if (bare || hideAdd) {
    return (
      <div>
        <ul className="space-y-1.5">
          {initialTasks.map((task) => (
            <TaskRow key={task.id} task={task} compact />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">⏱️ 오늘의 타임라인</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            마감 시간 안에 완료하면 🎉 클리어 축하!
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
        >
          <Plus size={14} /> 추가
        </button>
      </div>

      {initialTasks.length === 0 && !adding && (
        <p className="text-xs text-slate-400 py-4 text-center">
          시간 슬롯별 할일을 추가해보세요.
        </p>
      )}

      <ul className="space-y-2">
        {initialTasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </ul>

      {adding && (
        <AddTaskRow
          dailyEntryId={dailyEntryId}
          onDone={() => setAdding(false)}
        />
      )}
    </section>
  );
}

function TaskRow({ task, compact = false }: { task: TimelineTask; compact?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const isCompleted = !!task.completedAt;

  function toggle() {
    startTransition(async () => {
      if (isCompleted) {
        await uncompleteTimelineTask(task.id);
      } else {
        const res = await completeTimelineTask(task.id);
        if (res.isOnTime) fireConfetti();
        else fireSoLate();
      }
      router.refresh();
    });
  }

  function remove() {
    if (!confirm("이 할일을 삭제할까요?")) return;
    startTransition(async () => {
      await deleteTimelineTask(task.id);
      router.refresh();
    });
  }

  if (editing && !compact) {
    return (
      <li>
        <EditTaskRow
          task={task}
          onCancel={() => setEditing(false)}
          onDone={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      </li>
    );
  }

  return (
    <li className={clsx(compact ? "py-1" : "py-1.5")}>
      <div className={clsx("flex items-center", compact ? "gap-2" : "gap-3")}>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={clsx(
            "rounded-md flex items-center justify-center border transition-colors flex-shrink-0",
            compact ? "size-5" : "size-7",
            isCompleted
              ? task.isOnTime
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "bg-amber-500 border-amber-500 text-white"
              : "bg-white border-slate-300 text-transparent hover:border-slate-400"
          )}
          aria-label={isCompleted ? "완료 해제" : "완료"}
        >
          <Check size={compact ? 12 : 16} strokeWidth={3} />
        </button>
        <div className="flex-1 min-w-0">
          <p
            className={clsx(
              compact ? "text-xs" : "text-sm",
              "truncate",
              isCompleted && "line-through text-slate-400"
            )}
          >
            {task.title}
          </p>
          {!compact && (
            <p className="text-[11px] text-slate-500 inline-flex items-center gap-1">
              <Clock size={11} /> {task.startTime} ~ {task.dueTime}
              {isCompleted && task.isOnTime && <span className="ml-1 text-emerald-600 font-medium">온타임</span>}
              {isCompleted && task.isOnTime === false && <span className="ml-1 text-amber-600 font-medium">지각</span>}
            </p>
          )}
        </div>
        {compact && (
          <span className="text-[10px] text-slate-400 inline-flex items-center gap-0.5 flex-shrink-0">
            <Clock size={9} /> {task.startTime}~{task.dueTime}
          </span>
        )}
        {!compact && (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={pending}
              className="p-1 text-slate-400 hover:text-slate-700"
              aria-label="수정"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="p-1 text-slate-400 hover:text-red-600"
              aria-label="삭제"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
      <div className={compact ? "ml-7" : "ml-10"}>
        <MemoEditor kind="timeline" id={task.id} initial={task.memo} />
      </div>
    </li>
  );
}

function AddTaskRow({
  dailyEntryId,
  onDone,
}: {
  dailyEntryId: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [dueTime, setDueTime] = useState("10:00");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("제목을 입력해주세요");
      return;
    }
    startTransition(async () => {
      try {
        await addTimelineTask({ dailyEntryId, title: title.trim(), startTime, dueTime });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "추가 실패");
      }
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3 space-y-2 bg-slate-50">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="할일 제목"
        autoFocus
        className="input bg-white"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="input bg-white"
        />
        <input
          type="time"
          value={dueTime}
          onChange={(e) => setDueTime(e.target.value)}
          className="input bg-white"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "추가 중…" : "추가"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600"
        >
          취소
        </button>
      </div>
    </div>
  );
}

function EditTaskRow({
  task,
  onCancel,
  onDone,
}: {
  task: TimelineTask;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(task.title);
  const [startTime, setStartTime] = useState(task.startTime);
  const [dueTime, setDueTime] = useState(task.dueTime);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("제목을 입력해주세요");
      return;
    }
    startTransition(async () => {
      try {
        await updateTimelineTask({
          taskId: task.id,
          title: title.trim(),
          startTime,
          dueTime,
        });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "수정 실패");
      }
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3 space-y-2 bg-slate-50">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="할일 제목"
        autoFocus
        className="input bg-white"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="input bg-white"
        />
        <input
          type="time"
          value={dueTime}
          onChange={(e) => setDueTime(e.target.value)}
          className="input bg-white"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600"
        >
          취소
        </button>
      </div>
    </div>
  );
}

function fireSoLate() {
  if (typeof document === "undefined") return;
  const overlay = document.createElement("div");
  overlay.className = "so-late-overlay";
  overlay.innerHTML = `
    <div class="so-late-text">SO LATE!</div>
    <div class="so-late-sub">+점수 절반</div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 1700);
}

function fireConfetti() {
  const duration = 1500;
  const end = Date.now() + duration;
  const colors = ["#10b981", "#22c55e", "#f59e0b", "#3b82f6"];

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 65,
      origin: { x: 0, y: 0.85 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 65,
      origin: { x: 1, y: 0.85 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();

  confetti({
    particleCount: 80,
    spread: 100,
    origin: { y: 0.6 },
    colors,
  });
}

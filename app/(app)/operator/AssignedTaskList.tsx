"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Trash2, Play, Link as LinkIcon, Pencil, Plus, X } from "lucide-react";
import { deleteAssignedTask, updateAssignedTask } from "./actions";
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
  const [editing, setEditing] = useState(false);
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

  if (editing) {
    return (
      <li>
        <EditTaskCard task={task} onCancel={() => setEditing(false)} onDone={() => {
          setEditing(false);
          router.refresh();
        }} />
      </li>
    );
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
          <div className="flex items-start gap-0.5 flex-shrink-0">
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
          </div>
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

function EditTaskCard({
  task,
  onCancel,
  onDone,
}: {
  task: Task;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [videoUrl, setVideoUrl] = useState(task.videoUrl ?? "");
  const [attachments, setAttachments] = useState<string[]>(task.attachments);
  const [attachmentInput, setAttachmentInput] = useState("");
  const [dueDate, setDueDate] = useState(
    task.dueDate ? task.dueDate.toISOString().slice(0, 10) : ""
  );
  const [error, setError] = useState<string | null>(null);

  function addAttachment() {
    const url = attachmentInput.trim();
    if (!url) return;
    if (!/^https?:\/\//.test(url)) {
      setError("링크는 http:// 또는 https://로 시작해야 해요");
      return;
    }
    setAttachments((p) => [...p, url]);
    setAttachmentInput("");
    setError(null);
  }
  function removeAttachment(i: number) {
    setAttachments((p) => p.filter((_, idx) => idx !== i));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("제목을 입력해주세요");
      return;
    }
    if (videoUrl && !/^https?:\/\//.test(videoUrl)) {
      setError("영상 링크는 http:// 또는 https://로 시작해야 해요");
      return;
    }
    startTransition(async () => {
      try {
        await updateAssignedTask({
          taskId: task.id,
          title: title.trim(),
          description: description.trim() || null,
          videoUrl: videoUrl.trim() || null,
          attachments,
          dueDate: dueDate || null,
        });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "수정 실패");
      }
    });
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-amber-900">과제 수정</h4>
        <button type="button" onClick={onCancel} className="text-amber-600 hover:text-amber-900">
          <X size={14} />
        </button>
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="과제 제목"
        className="input bg-white"
      />
      <textarea
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="상세 설명 (선택)"
        className="input bg-white"
      />
      <label className="block">
        <span className="text-xs text-slate-500 inline-flex items-center gap-1">
          <Play size={11} className="text-rose-500" /> 필수 시청 영상 링크
        </span>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://..."
          className="input mt-1 bg-white"
        />
      </label>
      <div>
        <span className="text-xs text-slate-500 inline-flex items-center gap-1">
          <LinkIcon size={11} className="text-blue-500" /> 추가 참고 링크
        </span>
        {attachments.length > 0 && (
          <ul className="mt-1 space-y-1">
            {attachments.map((url, i) => (
              <li key={i} className="flex items-center gap-1.5 text-[11px] rounded-md bg-white border border-slate-200 px-2 py-1">
                <span className="flex-1 truncate text-slate-700">{url}</span>
                <button type="button" onClick={() => removeAttachment(i)} className="p-0.5 text-slate-400 hover:text-red-600" aria-label="제거">
                  <X size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-1 flex gap-1.5">
          <input
            type="url"
            value={attachmentInput}
            onChange={(e) => setAttachmentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAttachment();
              }
            }}
            placeholder="https://..."
            className="input flex-1 bg-white"
          />
          <button type="button" onClick={addAttachment} className="px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1">
            <Plus size={12} /> 추가
          </button>
        </div>
      </div>
      <label className="block">
        <span className="text-xs text-slate-500">마감일</span>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="input mt-1 bg-white"
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600"
        >
          취소
        </button>
      </div>
    </form>
  );
}

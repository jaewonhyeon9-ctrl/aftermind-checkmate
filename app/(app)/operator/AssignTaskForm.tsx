"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Play, Link as LinkIcon } from "lucide-react";
import { createAssignedTask } from "./actions";

type Member = { id: string; name: string; role: "OPERATOR" | "MEMBER" };

export function AssignTaskForm({ members }: { members: Member[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scope, setScope] = useState<"ALL" | "INDIVIDUAL">("ALL");
  const [assigneeId, setAssigneeId] = useState<string>(members[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [attachmentInput, setAttachmentInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  function addAttachment() {
    const url = attachmentInput.trim();
    if (!url) return;
    if (!/^https?:\/\//.test(url)) {
      setError("링크는 http:// 또는 https://로 시작해야 해요");
      return;
    }
    setAttachments((prev) => [...prev, url]);
    setAttachmentInput("");
    setError(null);
  }

  function removeAttachment(i: number) {
    setAttachments((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("과제 제목을 입력해주세요");
      return;
    }
    if (scope === "INDIVIDUAL" && !assigneeId) {
      setError("받을 팀원을 선택해주세요");
      return;
    }
    if (videoUrl && !/^https?:\/\//.test(videoUrl)) {
      setError("영상 링크는 http:// 또는 https://로 시작해야 해요");
      return;
    }
    startTransition(async () => {
      try {
        await createAssignedTask({
          scope,
          title: title.trim(),
          description: description.trim() || null,
          videoUrl: videoUrl.trim() || null,
          attachments,
          dueDate: dueDate || null,
          assigneeId: scope === "INDIVIDUAL" ? assigneeId : null,
        });
        setTitle("");
        setDescription("");
        setVideoUrl("");
        setAttachments([]);
        setAttachmentInput("");
        setDueDate("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "생성 실패");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setScope("ALL")}
          className={
            "rounded-lg py-2 text-xs font-semibold border transition-colors " +
            (scope === "ALL"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-600 border-slate-300")
          }
        >
          🔥 전체 필수 과제
        </button>
        <button
          type="button"
          onClick={() => setScope("INDIVIDUAL")}
          className={
            "rounded-lg py-2 text-xs font-semibold border transition-colors " +
            (scope === "INDIVIDUAL"
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-600 border-slate-300")
          }
        >
          ⭐ 개별 특별 과제
        </button>
      </div>

      {scope === "INDIVIDUAL" && (
        <label className="block">
          <span className="text-xs text-slate-500">받을 팀원</span>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="input mt-1"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.role === "OPERATOR" ? "(운영자)" : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="과제 제목"
        className="input"
      />
      <textarea
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="상세 설명 (선택)"
        className="input"
      />

      <label className="block">
        <span className="text-xs text-slate-500 inline-flex items-center gap-1">
          <Play size={11} className="text-rose-500" /> 필수 시청 영상 링크 (선택)
        </span>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtu.be/... 또는 영상 URL"
          className="input mt-1"
        />
      </label>

      <div>
        <span className="text-xs text-slate-500 inline-flex items-center gap-1">
          <LinkIcon size={11} className="text-blue-500" /> 추가 참고 링크 (선택)
        </span>
        {attachments.length > 0 && (
          <ul className="mt-1 space-y-1">
            {attachments.map((url, i) => (
              <li
                key={i}
                className="flex items-center gap-1.5 text-[11px] rounded-md bg-slate-50 border border-slate-200 px-2 py-1"
              >
                <span className="flex-1 truncate text-slate-700">{url}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="p-0.5 text-slate-400 hover:text-red-600"
                  aria-label="제거"
                >
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
            className="input flex-1"
          />
          <button
            type="button"
            onClick={addAttachment}
            className="px-3 rounded-lg border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1"
          >
            <Plus size={12} /> 추가
          </button>
        </div>
      </div>

      <label className="block">
        <span className="text-xs text-slate-500">마감일 (선택)</span>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="input mt-1"
        />
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 disabled:opacity-50"
      >
        {pending ? "부여 중…" : "과제 부여"}
      </button>
    </form>
  );
}

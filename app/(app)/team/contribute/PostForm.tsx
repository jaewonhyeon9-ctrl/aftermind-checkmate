"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createPost, updatePost } from "../actions";

type EditInitial = {
  postId: string;
  title: string;
  description: string | null;
  coinReward: number;
  maxApplicants: number | null;
  deadline: string | null;     // YYYY-MM-DD
  scheduledAt: string | null;  // YYYY-MM-DDTHH:MM
  scheduleNote: string | null;
};

type Props =
  | { type: "SKILL" | "CLASS"; mode?: "CREATE" }
  | { type: "SKILL" | "CLASS"; mode: "EDIT"; initial: EditInitial; onCancel: () => void; onDone: () => void };

export function PostForm(props: Props) {
  const isEdit = props.mode === "EDIT";
  const initial = isEdit ? props.initial : null;

  const [open, setOpen] = useState(isEdit);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [coinReward, setCoinReward] = useState(String(initial?.coinReward ?? 0));
  const [maxApplicants, setMaxApplicants] = useState(
    initial?.maxApplicants != null ? String(initial.maxApplicants) : ""
  );
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [scheduledAt, setScheduledAt] = useState(initial?.scheduledAt ?? "");
  const [scheduleNote, setScheduleNote] = useState(initial?.scheduleNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    if (!title.trim()) {
      setError("제목을 입력해주세요");
      return;
    }
    setError(null);
    start(async () => {
      try {
        const data = {
          title: title.trim(),
          description: description.trim() || null,
          coinReward: Math.max(0, parseInt(coinReward) || 0),
          maxApplicants: maxApplicants ? Math.max(1, parseInt(maxApplicants)) : null,
          deadline: deadline || null,
          scheduledAt: props.type === "CLASS" && scheduledAt ? scheduledAt : null,
          scheduleNote: props.type === "CLASS" ? scheduleNote.trim() || null : null,
        };
        if (isEdit && initial) {
          await updatePost({ postId: initial.postId, ...data });
          props.onDone();
        } else {
          await createPost({ type: props.type, ...data });
          setTitle("");
          setDescription("");
          setCoinReward("0");
          setMaxApplicants("");
          setDeadline("");
          setScheduledAt("");
          setScheduleNote("");
          setOpen(false);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "오류가 발생했습니다");
      }
    });
  };

  const noun = props.type === "CLASS" ? "수업" : "기여";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold transition-all"
        style={{
          background: "linear-gradient(135deg, rgba(0,224,255,0.15), rgba(161,85,255,0.15))",
          border: "1px solid rgba(0,224,255,0.3)",
          color: "var(--accent-cyan)",
        }}
      >
        <Plus size={16} />
        {noun} 등록하기
      </button>
    );
  }

  const closeForm = () => {
    if (isEdit) props.onCancel();
    else setOpen(false);
  };

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "rgba(15,20,40,0.6)",
        border: "1px solid var(--line)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
          {isEdit ? `${noun} 수정` : `새 ${noun} 등록`}
        </h3>
        <button onClick={closeForm} className="text-slate-400 hover:text-slate-200">
          <X size={16} />
        </button>
      </div>

      <input
        type="text"
        placeholder={props.type === "CLASS" ? "수업 제목 (예: 인스타 광고 세팅 1시간)" : "기여 제목 (예: 영상 편집 도와드려요)"}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm"
        style={{
          background: "rgba(10,14,31,0.6)",
          border: "1px solid var(--line)",
          color: "var(--fg)",
        }}
        maxLength={80}
      />

      <textarea
        placeholder="설명 (선택)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 rounded-lg text-sm resize-none"
        style={{
          background: "rgba(10,14,31,0.6)",
          border: "1px solid var(--line)",
          color: "var(--fg)",
        }}
        maxLength={2000}
      />

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs" style={{ color: "var(--fg-muted)" }}>
          🪙 보상 코인
          <input
            type="number"
            min={0}
            value={coinReward}
            onChange={(e) => setCoinReward(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg text-sm tabular-nums"
            style={{
              background: "rgba(10,14,31,0.6)",
              border: "1px solid var(--line)",
              color: "var(--fg)",
            }}
          />
        </label>
        {props.type === "CLASS" && (
          <label className="text-xs" style={{ color: "var(--fg-muted)" }}>
            정원 (선택)
            <input
              type="number"
              min={1}
              placeholder="제한 없음"
              value={maxApplicants}
              onChange={(e) => setMaxApplicants(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm tabular-nums"
              style={{
                background: "rgba(10,14,31,0.6)",
                border: "1px solid var(--line)",
                color: "var(--fg)",
              }}
            />
          </label>
        )}
      </div>

      <label className="text-xs block" style={{ color: "var(--fg-muted)" }}>
        모집 마감일 (선택)
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
          style={{
            background: "rgba(10,14,31,0.6)",
            border: "1px solid var(--line)",
            color: "var(--fg)",
          }}
        />
      </label>

      {props.type === "CLASS" && (
        <>
          <label className="text-xs block" style={{ color: "var(--fg-muted)" }}>
            ⏰ 수업 시작 시간 (선택 — 미정이면 비워두세요)
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
              style={{
                background: "rgba(10,14,31,0.6)",
                border: "1px solid var(--line)",
                color: "var(--fg)",
              }}
            />
          </label>
          <label className="text-xs block" style={{ color: "var(--fg-muted)" }}>
            일정 메모 (선택)
            <input
              type="text"
              placeholder="예: 참여자와 조율 후 결정 / Zoom 링크는 등록 후 공유"
              value={scheduleNote}
              onChange={(e) => setScheduleNote(e.target.value)}
              maxLength={200}
              className="w-full mt-1 px-3 py-2 rounded-lg text-sm"
              style={{
                background: "rgba(10,14,31,0.6)",
                border: "1px solid var(--line)",
                color: "var(--fg)",
              }}
            />
          </label>
        </>
      )}

      {error && (
        <p className="text-xs text-rose-400">{error}</p>
      )}

      <button
        onClick={submit}
        disabled={pending}
        className="w-full rounded-lg py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, #00e0ff, #a155ff)",
          color: "#0a0e1f",
          boxShadow: "0 4px 20px rgba(0,224,255,0.3)",
        }}
      >
        {pending ? (isEdit ? "저장 중..." : "등록 중...") : isEdit ? "저장" : "등록"}
      </button>
    </div>
  );
}

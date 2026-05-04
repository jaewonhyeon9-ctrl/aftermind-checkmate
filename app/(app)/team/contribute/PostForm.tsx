"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createPost } from "../actions";

type Props = {
  type: "SKILL" | "CLASS";
};

export function PostForm({ type }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coinReward, setCoinReward] = useState("0");
  const [maxApplicants, setMaxApplicants] = useState("");
  const [deadline, setDeadline] = useState("");
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
        await createPost({
          type,
          title: title.trim(),
          description: description.trim() || null,
          coinReward: Math.max(0, parseInt(coinReward) || 0),
          maxApplicants: maxApplicants ? Math.max(1, parseInt(maxApplicants)) : null,
          deadline: deadline || null,
        });
        setTitle("");
        setDescription("");
        setCoinReward("0");
        setMaxApplicants("");
        setDeadline("");
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "오류가 발생했습니다");
      }
    });
  };

  const noun = type === "CLASS" ? "수업" : "기여";

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
          새 {noun} 등록
        </h3>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-200">
          <X size={16} />
        </button>
      </div>

      <input
        type="text"
        placeholder={type === "CLASS" ? "수업 제목 (예: 인스타 광고 세팅 1시간)" : "기여 제목 (예: 영상 편집 도와드려요)"}
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
        {type === "CLASS" && (
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
        마감일 (선택)
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
        {pending ? "등록 중..." : "등록"}
      </button>
    </div>
  );
}

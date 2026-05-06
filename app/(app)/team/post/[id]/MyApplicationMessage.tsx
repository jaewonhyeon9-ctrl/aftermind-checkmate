"use client";

import { useState, useTransition } from "react";
import { Pencil, Save, X } from "lucide-react";
import { updateApplicationMessage } from "../../actions";

type Props = {
  applicationId: string;
  initialMessage: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED";
};

export function MyApplicationMessage({ applicationId, initialMessage, status }: Props) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState(initialMessage ?? "");
  const [savedMessage, setSavedMessage] = useState(initialMessage);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!editing) {
    return (
      <div className="flex items-start gap-2">
        {savedMessage ? (
          <p className="flex-1 text-xs" style={{ color: "var(--fg-dim)" }}>
            "{savedMessage}"
          </p>
        ) : (
          <p className="flex-1 text-xs italic" style={{ color: "var(--fg-muted)" }}>
            (메시지 없음)
          </p>
        )}
        {status === "PENDING" && (
          <button
            onClick={() => setEditing(true)}
            className="text-[11px] inline-flex items-center gap-0.5"
            style={{ color: "var(--fg-muted)" }}
          >
            <Pencil size={10} /> 수정
          </button>
        )}
      </div>
    );
  }

  const save = () => {
    setError(null);
    start(async () => {
      try {
        await updateApplicationMessage({
          applicationId,
          message: message.trim() || null,
        });
        setSavedMessage(message.trim() || null);
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "수정 실패");
      }
    });
  };

  return (
    <div className="space-y-1.5">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        maxLength={500}
        className="w-full px-2.5 py-1.5 rounded-md text-xs resize-none"
        style={{
          background: "rgba(10,14,31,0.6)",
          border: "1px solid var(--line)",
          color: "var(--fg)",
        }}
      />
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
      <div className="flex gap-1.5">
        <button
          onClick={save}
          disabled={pending}
          className="flex-1 rounded-md py-1 text-[11px] font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1"
          style={{
            background: "linear-gradient(135deg, #00e0ff, #a155ff)",
            color: "#0a0e1f",
          }}
        >
          <Save size={10} />
          {pending ? "..." : "저장"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setMessage(savedMessage ?? "");
          }}
          className="rounded-md px-2 py-1 text-[11px] inline-flex items-center gap-0.5"
          style={{
            border: "1px solid var(--line)",
            color: "var(--fg-muted)",
          }}
        >
          <X size={10} /> 취소
        </button>
      </div>
    </div>
  );
}

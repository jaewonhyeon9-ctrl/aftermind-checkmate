"use client";

import { useState, useTransition } from "react";
import { decideApplication, completeAndReward } from "../../actions";

type Props = {
  applicationId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED";
  coinReward: number;
  applicantName: string;
};

export function ApplicationActions({ applicationId, status, coinReward, applicantName }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const decide = (decision: "ACCEPTED" | "REJECTED") => {
    setError(null);
    start(async () => {
      try {
        await decideApplication({ applicationId, decision });
      } catch (e) {
        setError(e instanceof Error ? e.message : "오류");
      }
    });
  };

  const complete = () => {
    if (coinReward > 0) {
      if (!confirm(`${applicantName}님에게 ${coinReward.toLocaleString("ko-KR")} 코인을 지급하고 완료 처리할까요?`)) return;
    } else {
      if (!confirm("완료 처리할까요?")) return;
    }
    setError(null);
    start(async () => {
      try {
        await completeAndReward({ applicationId });
      } catch (e) {
        setError(e instanceof Error ? e.message : "오류");
      }
    });
  };

  return (
    <div className="space-y-1.5">
      {status === "PENDING" && (
        <div className="flex gap-2">
          <button
            onClick={() => decide("ACCEPTED")}
            disabled={pending}
            className="flex-1 rounded-lg py-1.5 text-xs font-semibold disabled:opacity-50"
            style={{
              background: "rgba(177,255,66,0.15)",
              border: "1px solid rgba(177,255,66,0.3)",
              color: "var(--accent-lime)",
            }}
          >
            승인
          </button>
          <button
            onClick={() => decide("REJECTED")}
            disabled={pending}
            className="flex-1 rounded-lg py-1.5 text-xs font-semibold disabled:opacity-50"
            style={{
              border: "1px solid var(--line)",
              color: "var(--fg-muted)",
            }}
          >
            반려
          </button>
        </div>
      )}
      {status === "ACCEPTED" && (
        <button
          onClick={complete}
          disabled={pending}
          className="w-full rounded-lg py-1.5 text-xs font-semibold disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #00e0ff, #a155ff)",
            color: "#0a0e1f",
          }}
        >
          {pending
            ? "처리 중..."
            : coinReward > 0
              ? `완료 + ${coinReward.toLocaleString("ko-KR")} 코인 지급`
              : "완료 처리"}
        </button>
      )}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}

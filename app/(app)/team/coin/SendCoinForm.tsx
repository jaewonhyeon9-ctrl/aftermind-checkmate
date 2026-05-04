"use client";

import { useState, useTransition } from "react";
import { Send, Sparkles } from "lucide-react";
import { sendCoin, issueCoinAction } from "../actions";

type Member = { id: string; name: string };

type Props = {
  members: Member[];
  myId: string;
  myBalance: number;
};

export function SendCoinForm({ members, myId, myBalance }: Props) {
  const [mode, setMode] = useState<"SEND" | "ISSUE">("SEND");
  const [toUserId, setToUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const others = members.filter((m) => m.id !== myId);

  const submit = () => {
    setError(null);
    setSuccess(null);
    if (!toUserId) {
      setError("받는 사람을 선택해주세요");
      return;
    }
    const amt = parseInt(amount);
    if (!amt || amt <= 0) {
      setError("금액을 입력해주세요");
      return;
    }
    if (mode === "SEND" && amt > myBalance) {
      setError(`잔액 부족 (보유: ${myBalance.toLocaleString("ko-KR")})`);
      return;
    }
    start(async () => {
      try {
        if (mode === "SEND") {
          await sendCoin({ toUserId, amount: amt, memo: memo.trim() || null });
        } else {
          await issueCoinAction({ toUserId, amount: amt, memo: memo.trim() || null });
        }
        setSuccess(
          mode === "SEND"
            ? `✓ ${amt.toLocaleString("ko-KR")} 코인 송금 완료`
            : `✨ ${amt.toLocaleString("ko-KR")} 코인 발행 완료`
        );
        setToUserId("");
        setAmount("");
        setMemo("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "오류");
      }
    });
  };

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: "rgba(15,20,40,0.6)",
        border: "1px solid var(--line)",
      }}
    >
      <div
        className="grid grid-cols-2 rounded-lg p-1 gap-1"
        style={{ background: "rgba(10,14,31,0.6)" }}
      >
        <button
          onClick={() => setMode("SEND")}
          className="rounded-md py-1.5 text-xs font-semibold transition-all"
          style={
            mode === "SEND"
              ? {
                  background: "linear-gradient(135deg, rgba(0,224,255,0.2), rgba(161,85,255,0.2))",
                  color: "var(--accent-cyan)",
                }
              : { color: "var(--fg-muted)" }
          }
        >
          <Send size={12} className="inline mr-1" />
          송금 (잔액 차감)
        </button>
        <button
          onClick={() => setMode("ISSUE")}
          className="rounded-md py-1.5 text-xs font-semibold transition-all"
          style={
            mode === "ISSUE"
              ? {
                  background: "linear-gradient(135deg, rgba(177,255,66,0.2), rgba(0,224,255,0.2))",
                  color: "var(--accent-lime)",
                }
              : { color: "var(--fg-muted)" }
          }
        >
          <Sparkles size={12} className="inline mr-1" />
          발행 (무한)
        </button>
      </div>

      <p className="text-[11px]" style={{ color: "var(--fg-muted)" }}>
        {mode === "SEND"
          ? `내 잔액에서 차감해 송금. 보유: ${myBalance.toLocaleString("ko-KR")} 코인`
          : "새 코인을 발행해서 지급 (잔액 차감 없음)"}
      </p>

      <select
        value={toUserId}
        onChange={(e) => setToUserId(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm"
        style={{
          background: "rgba(10,14,31,0.6)",
          border: "1px solid var(--line)",
          color: toUserId ? "var(--fg)" : "var(--fg-muted)",
        }}
      >
        <option value="">받는 사람 선택</option>
        {others.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      <input
        type="number"
        min={1}
        placeholder="금액 (코인)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm tabular-nums"
        style={{
          background: "rgba(10,14,31,0.6)",
          border: "1px solid var(--line)",
          color: "var(--fg)",
        }}
      />

      <input
        type="text"
        placeholder="메모 (선택)"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        maxLength={200}
        className="w-full px-3 py-2 rounded-lg text-sm"
        style={{
          background: "rgba(10,14,31,0.6)",
          border: "1px solid var(--line)",
          color: "var(--fg)",
        }}
      />

      {error && <p className="text-xs text-rose-400">{error}</p>}
      {success && <p className="text-xs" style={{ color: "var(--accent-lime)" }}>{success}</p>}

      <button
        onClick={submit}
        disabled={pending}
        className="w-full rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
        style={{
          background:
            mode === "SEND"
              ? "linear-gradient(135deg, #00e0ff, #a155ff)"
              : "linear-gradient(135deg, #b1ff42, #00e0ff)",
          color: "#0a0e1f",
        }}
      >
        {pending ? "처리 중..." : mode === "SEND" ? "송금" : "발행"}
      </button>
    </div>
  );
}

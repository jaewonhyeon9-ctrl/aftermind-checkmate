"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestJoin } from "./actions";

export function JoinProgramCard({
  programId,
  programName,
  status,
}: {
  programId: string;
  programName: string;
  status: "PENDING" | "REJECTED" | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justRequested, setJustRequested] = useState(false);

  if (status === "PENDING" || justRequested) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-4 text-center text-sm text-slate-600">
        <p className="font-medium">가입 승인 대기 중이에요</p>
        <p className="mt-1 text-xs text-slate-400">운영자가 승인하면 바로 이용할 수 있어요.</p>
      </div>
    );
  }

  if (status === "REJECTED") {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-4 text-center text-sm text-slate-600">
        가입 신청이 거절되었어요. 운영자에게 문의해주세요.
      </div>
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await requestJoin(programId);
        setJustRequested(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "가입 신청 실패");
      }
    });
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3 text-center">
      <p className="text-sm text-slate-700">
        <span className="font-semibold">{programName}</span>에 가입 신청할까요?
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="w-full rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 disabled:opacity-50"
      >
        {pending ? "신청 중…" : "가입 신청"}
      </button>
    </div>
  );
}

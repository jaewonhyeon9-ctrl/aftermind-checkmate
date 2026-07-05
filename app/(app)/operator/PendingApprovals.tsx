"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserX } from "lucide-react";
import { approveMembership, rejectMembership } from "./actions";

type Pending = { userId: string; name: string; email: string };

export function PendingApprovals({ pending }: { pending: Pending[] }) {
  const router = useRouter();
  const [pendingTx, startTransition] = useTransition();

  if (pending.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-4 text-center text-xs text-slate-500">
        가입 대기 중인 팀원이 없어요.
      </div>
    );
  }

  function approve(userId: string) {
    startTransition(async () => {
      await approveMembership(userId);
      router.refresh();
    });
  }

  function reject(userId: string, name: string) {
    if (!confirm(`${name}님의 가입 신청을 거절할까요?`)) return;
    startTransition(async () => {
      await rejectMembership(userId);
      router.refresh();
    });
  }

  return (
    <ul className="rounded-2xl bg-white border border-slate-200 divide-y divide-slate-100 overflow-hidden">
      {pending.map((p) => (
        <li key={p.userId} className="px-4 py-3 flex items-center gap-3">
          <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-700 flex-shrink-0">
            {p.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{p.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{p.email}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => approve(p.userId)}
              disabled={pendingTx}
              title="승인"
              className="p-2 rounded-md text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
            >
              <UserCheck size={16} />
            </button>
            <button
              type="button"
              onClick={() => reject(p.userId, p.name)}
              disabled={pendingTx}
              title="거절"
              className="p-2 rounded-md text-red-500 hover:bg-red-50 disabled:opacity-50"
            >
              <UserX size={16} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
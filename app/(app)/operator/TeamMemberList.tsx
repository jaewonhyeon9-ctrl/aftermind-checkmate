"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield, ShieldOff, UserMinus, UserPlus } from "lucide-react";
import { updateUserRole, toggleUserActive } from "./actions";

type Member = {
  id: string;
  email: string;
  name: string;
  role: "OPERATOR" | "MEMBER";
  isActive: boolean;
};

export function TeamMemberList({ members, myId }: { members: Member[]; myId: string }) {
  return (
    <ul className="rounded-2xl bg-white border border-slate-200 divide-y divide-slate-100 overflow-hidden">
      {members.map((m) => (
        <MemberRow key={m.id} member={m} isMe={m.id === myId} />
      ))}
    </ul>
  );
}

function MemberRow({ member, isMe }: { member: Member; isMe: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function togglePromote() {
    startTransition(async () => {
      try {
        await updateUserRole({
          userId: member.id,
          role: member.role === "OPERATOR" ? "MEMBER" : "OPERATOR",
        });
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "역할 변경 실패");
      }
    });
  }

  function toggleActive() {
    if (
      !confirm(
        member.isActive
          ? `${member.name}님을 비활성화할까요? (피드/과제 부여에서 제외됨)`
          : `${member.name}님을 다시 활성화할까요?`
      )
    )
      return;
    startTransition(async () => {
      await toggleUserActive(member.id);
      router.refresh();
    });
  }

  return (
    <li className={"px-4 py-3 flex items-center gap-3 " + (member.isActive ? "" : "bg-slate-50/50 opacity-60")}>
      <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-700 flex-shrink-0">
        {member.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{member.name}</p>
          {member.role === "OPERATOR" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900 text-white">
              운영자
            </span>
          )}
          {isMe && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              나
            </span>
          )}
          {!member.isActive && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600">
              비활성
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 truncate">{member.email}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={togglePromote}
          disabled={pending}
          title={member.role === "OPERATOR" ? "운영자 → 팀원" : "팀원 → 운영자"}
          className="p-2 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-50"
        >
          {member.role === "OPERATOR" ? (
            <ShieldOff size={15} />
          ) : (
            <Shield size={15} />
          )}
        </button>
        <button
          type="button"
          onClick={toggleActive}
          disabled={pending || isMe}
          title={member.isActive ? "비활성화" : "활성화"}
          className="p-2 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30"
        >
          {member.isActive ? <UserMinus size={15} /> : <UserPlus size={15} />}
        </button>
      </div>
    </li>
  );
}

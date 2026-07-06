"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Target, X, Globe } from "lucide-react";
import { updateMyProfile } from "./actions";
import { TIMEZONE_OPTIONS } from "@/lib/dates";

type Props = {
  name: string;
  email: string;
  role: "OPERATOR" | "MEMBER";
  finalGoal: string | null;
  timezone: string;
};

export function ProfileEdit({ name, email, role, finalGoal, timezone }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [nameInput, setNameInput] = useState(name);
  const [goalInput, setGoalInput] = useState(finalGoal ?? "");
  const [tzInput, setTzInput] = useState(timezone);
  const [error, setError] = useState<string | null>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nameInput.trim()) {
      setError("이름은 필수예요");
      return;
    }
    startTransition(async () => {
      try {
        await updateMyProfile({
          name: nameInput.trim(),
          finalGoal: goalInput.trim() || null,
          timezone: tzInput,
        });
        setEditing(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "저장 실패");
      }
    });
  }

  return (
    <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white p-5 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-lg font-semibold">
            {name.charAt(0)}
          </div>
          <div>
            <p className="text-base font-bold">{name}</p>
            <p className="text-[11px] text-slate-300">{email}</p>
            <p className="mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full bg-white/10">
              {role === "OPERATOR" ? "운영자" : "팀원"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-md text-slate-300 hover:bg-white/10"
          aria-label="편집"
        >
          <Pencil size={14} />
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-4">
        <div className="flex items-center gap-2 text-amber-300">
          <Target size={14} />
          <p className="text-[11px] font-semibold tracking-wider uppercase">
            최종 목표
          </p>
        </div>
        {finalGoal ? (
          <p className="mt-2 text-sm text-white whitespace-pre-wrap">{finalGoal}</p>
        ) : (
          <p className="mt-2 text-xs text-slate-400 italic">
            아직 목표를 설정하지 않았어요. 우측 상단 ✏️ 버튼으로 추가하세요.
          </p>
        )}
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setEditing(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={save}
            className="w-full max-w-md rounded-3xl bg-white text-slate-900 p-5 space-y-4 shadow-2xl"
          >
            <header className="flex items-center justify-between">
              <h3 className="text-base font-bold">프로필 편집</h3>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="p-1 text-slate-400"
              >
                <X size={18} />
              </button>
            </header>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">이름</span>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="input mt-1"
                placeholder="홍길동"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">
                최종 목표
              </span>
              <textarea
                rows={4}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="input mt-1"
                placeholder="예: 6개월 내 사이드 프로젝트 첫 매출 만들기"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700 inline-flex items-center gap-1">
                <Globe size={12} /> 시간대 (국가별 시각)
              </span>
              <select
                value={tzInput}
                onChange={(e) => setTzInput(e.target.value)}
                className="input mt-1"
              >
                {TIMEZONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                "오늘"의 기준이 이 시간대로 잡혀요. 자정이 되면 자동으로 다음 날로 넘어갑니다.
              </span>
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {pending ? "저장 중…" : "저장"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

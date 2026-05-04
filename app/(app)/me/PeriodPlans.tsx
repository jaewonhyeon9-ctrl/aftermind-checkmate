"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, X, Check, Calendar } from "lucide-react";
import { upsertPeriodPlan } from "./plan-actions";

type Scope = "WEEK" | "MONTH" | "YEAR";

type Plan = {
  id: string;
  scope: Scope;
  periodKey: string;
  content: string | null;
  goals: string[];
};

type Props = {
  weekPlan: Plan | null;
  weekKey: string;
  monthPlan: Plan | null;
  monthKey: string;
  yearPlan: Plan | null;
  yearKey: string;
};

export function PeriodPlans({
  weekPlan,
  weekKey,
  monthPlan,
  monthKey,
  yearPlan,
  yearKey,
}: Props) {
  const [activeTab, setActiveTab] = useState<Scope>("WEEK");

  const config = {
    WEEK: { label: "주간", emoji: "📆", plan: weekPlan, key: weekKey, title: weekKey.replace(/^(\d{4})-W(\d{2})$/, "$1년 $2주차") },
    MONTH: { label: "월간", emoji: "🗓️", plan: monthPlan, key: monthKey, title: monthKey.replace(/^(\d{4})-(\d{2})$/, "$1년 $2월") },
    YEAR: { label: "연간", emoji: "🌟", plan: yearPlan, key: yearKey, title: `${yearKey}년` },
  };

  const cur = config[activeTab];

  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <Calendar size={14} className="text-slate-700" />
        <h3 className="text-sm font-semibold text-slate-700">기간별 계획</h3>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {(["WEEK", "MONTH", "YEAR"] as const).map((s) => {
          const c = config[s];
          const active = activeTab === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setActiveTab(s)}
              className={
                "rounded-lg py-2 text-xs font-semibold border transition-colors " +
                (active
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-300")
              }
            >
              {c.emoji} {c.label}
            </button>
          );
        })}
      </div>

      <PlanCard
        scope={activeTab}
        periodKey={cur.key}
        title={cur.title}
        plan={cur.plan}
      />
    </section>
  );
}

function PlanCard({
  scope,
  periodKey,
  title,
  plan,
}: {
  scope: Scope;
  periodKey: string;
  title: string;
  plan: Plan | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [content, setContent] = useState(plan?.content ?? "");
  const [goals, setGoals] = useState<string[]>(plan?.goals ?? []);
  const [newGoal, setNewGoal] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setContent(plan?.content ?? "");
    setGoals(plan?.goals ?? []);
    setNewGoal("");
    setError(null);
  }

  function addGoal() {
    const g = newGoal.trim();
    if (!g) return;
    setGoals((prev) => [...prev, g]);
    setNewGoal("");
  }

  function removeGoal(i: number) {
    setGoals((prev) => prev.filter((_, idx) => idx !== i));
  }

  function save() {
    setError(null);
    // 입력 중인 새 목표가 있으면 자동 추가
    let finalGoals = goals;
    if (newGoal.trim()) {
      finalGoals = [...goals, newGoal.trim()];
      setGoals(finalGoals);
      setNewGoal("");
    }
    startTransition(async () => {
      try {
        await upsertPeriodPlan({
          scope,
          periodKey,
          content: content.trim() || null,
          goals: finalGoals,
        });
        setEditing(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "저장 실패");
      }
    });
  }

  if (!editing) {
    return (
      <div className="rounded-xl border border-slate-200 p-3 space-y-2">
        <header className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-slate-500">{title}</p>
          <button
            type="button"
            onClick={() => {
              reset();
              setEditing(true);
            }}
            className="text-[11px] text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
          >
            <Pencil size={11} /> 편집
          </button>
        </header>

        {plan && plan.goals.length > 0 ? (
          <ul className="space-y-1">
            {plan.goals.map((g, i) => (
              <li key={i} className="text-sm text-slate-700 flex items-start gap-1.5">
                <span className="text-slate-400 mt-0.5">{i + 1}.</span>
                <span className="flex-1">{g}</span>
              </li>
            ))}
          </ul>
        ) : (
          !plan?.content && (
            <p className="text-xs text-slate-400 text-center py-3">
              목표나 내용을 적어보세요. 편집 →
            </p>
          )
        )}
        {plan?.content && (
          <p className="text-xs text-slate-600 whitespace-pre-wrap pt-1 border-t border-slate-100">
            {plan.content}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-300 p-3 space-y-3 bg-slate-50/50">
      <header className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-700">{title} — 편집</p>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-slate-400 hover:text-slate-700"
          aria-label="닫기"
        >
          <X size={14} />
        </button>
      </header>

      <div>
        <p className="text-[11px] font-semibold text-slate-700 mb-1">🎯 목표</p>
        <ul className="space-y-1.5">
          {goals.map((g, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 w-4 text-right">{i + 1}.</span>
              <input
                type="text"
                value={g}
                onChange={(e) =>
                  setGoals((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))
                }
                className="input text-xs py-1.5 flex-1"
              />
              <button
                type="button"
                onClick={() => removeGoal(i)}
                className="p-1 text-slate-400 hover:text-red-600"
                aria-label="삭제"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-1.5">
          <input
            type="text"
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addGoal();
              }
            }}
            placeholder="새 목표"
            className="input text-xs py-1.5 flex-1"
          />
          <button
            type="button"
            onClick={addGoal}
            className="px-2.5 rounded-lg border border-slate-300 text-xs text-slate-600 inline-flex items-center gap-1"
          >
            <Plus size={11} /> 추가
          </button>
        </div>
      </div>

      <label className="block">
        <span className="text-[11px] font-semibold text-slate-700">📝 메모 (선택)</span>
        <textarea
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="이 기간의 큰 흐름, 우선순위, 메모"
          className="input text-xs mt-1"
        />
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="flex-1 rounded-lg border border-slate-300 py-2 text-xs font-medium text-slate-600"
        >
          취소
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="flex-1 rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white disabled:opacity-50 inline-flex items-center justify-center gap-1"
        >
          <Check size={12} /> {pending ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}

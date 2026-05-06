"use client";

import { useState, useTransition } from "react";
import { Save, RotateCcw, Sparkles } from "lucide-react";
import { updateMandala, type MandalaData } from "./actions";

type Props = {
  initial: MandalaData | null;
};

const EMPTY: MandalaData = {
  center: "",
  goals: Array.from({ length: 8 }, () => ({ title: "", actions: ["", "", "", "", "", "", "", ""] })),
};

/**
 * 만다라트 차트 (9x9 그리드).
 *
 * 9개 sub-grid (3x3 배열), 각 sub-grid는 3x3 셀.
 * - 중앙 sub-grid (idx=4): 한가운데 메인 목표 + 8개 하위 목표 둘러싸기
 * - 주변 sub-grid (idx=0~3,5~8): 한가운데에 해당 하위 목표(메인 sub-grid와 동기화) + 8개 액션
 *
 * 인덱스 매핑:
 * - 9칸 위치(0~8) 중 4가 중앙. skipFour로 0~7로 변환
 * - 주변 sub-grid 0,1,2,3,5,6,7,8 → goal index 0~7 (skipFour)
 * - 셀 내 위치 0,1,2,3,5,6,7,8 → action index 0~7 (skipFour)
 */
function skipFour(idx: number): number {
  return idx < 4 ? idx : idx - 1;
}

export function MandalaChart({ initial }: Props) {
  const [data, setData] = useState<MandalaData>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, start] = useTransition();

  const setCenter = (v: string) =>
    setData((d) => ({ ...d, center: v.slice(0, 80) }));

  const setGoalTitle = (goalIdx: number, v: string) =>
    setData((d) => ({
      ...d,
      goals: d.goals.map((g, i) => (i === goalIdx ? { ...g, title: v.slice(0, 40) } : g)),
    }));

  const setAction = (goalIdx: number, actionIdx: number, v: string) =>
    setData((d) => ({
      ...d,
      goals: d.goals.map((g, i) =>
        i === goalIdx
          ? { ...g, actions: g.actions.map((a, j) => (j === actionIdx ? v.slice(0, 40) : a)) }
          : g
      ),
    }));

  const reset = () => {
    if (!confirm("입력한 내용을 모두 지우시겠어요?")) return;
    setData(EMPTY);
  };

  const save = () => {
    setError(null);
    setSuccess(false);
    start(async () => {
      try {
        await updateMandala(data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2500);
      } catch (e) {
        setError(e instanceof Error ? e.message : "저장 실패");
      }
    });
  };

  // 셀 렌더링용 헬퍼: subGridIdx, pos → 값 + 변경자
  function cellFor(subGridIdx: number, pos: number): {
    value: string;
    onChange: (v: string) => void;
    role: "main" | "goal" | "action";
  } {
    if (subGridIdx === 4) {
      // 중앙 sub-grid
      if (pos === 4) {
        return { value: data.center, onChange: setCenter, role: "main" };
      }
      const goalIdx = skipFour(pos);
      return {
        value: data.goals[goalIdx].title,
        onChange: (v) => setGoalTitle(goalIdx, v),
        role: "goal",
      };
    }
    // 주변 sub-grid
    const goalIdx = skipFour(subGridIdx);
    if (pos === 4) {
      return {
        value: data.goals[goalIdx].title,
        onChange: (v) => setGoalTitle(goalIdx, v),
        role: "goal",
      };
    }
    const actionIdx = skipFour(pos);
    return {
      value: data.goals[goalIdx].actions[actionIdx] ?? "",
      onChange: (v) => setAction(goalIdx, actionIdx, v),
      role: "action",
    };
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: "var(--fg)" }}>
          <Sparkles size={14} style={{ color: "var(--accent-violet)" }} />
          만다라트 차트
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={reset}
            disabled={pending}
            className="text-[11px] px-2 py-1 rounded inline-flex items-center gap-1"
            style={{
              border: "1px solid var(--line)",
              color: "var(--fg-muted)",
            }}
          >
            <RotateCcw size={11} />
            초기화
          </button>
          <button
            onClick={save}
            disabled={pending}
            className="text-[11px] px-2.5 py-1 rounded inline-flex items-center gap-1 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #00e0ff, #a155ff)",
              color: "#0a0e1f",
              fontWeight: 600,
            }}
          >
            <Save size={11} />
            {pending ? "저장 중..." : success ? "✓ 저장됨" : "저장"}
          </button>
        </div>
      </div>

      <p className="text-[11px]" style={{ color: "var(--fg-muted)" }}>
        가운데에 메인 목표 → 8개 하위 목표 → 각 목표마다 8개 액션
      </p>

      <div
        className="rounded-2xl p-2"
        style={{
          background: "rgba(15,20,40,0.5)",
          border: "1px solid var(--line)",
        }}
      >
        {/* 외곽 3x3 of sub-grids */}
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 9 }).map((_, subGridIdx) => (
            <div key={subGridIdx} className="grid grid-cols-3 gap-px rounded-md overflow-hidden" style={{ background: "var(--line)" }}>
              {Array.from({ length: 9 }).map((_, pos) => {
                const cell = cellFor(subGridIdx, pos);
                return (
                  <Cell
                    key={pos}
                    value={cell.value}
                    onChange={cell.onChange}
                    role={cell.role}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}
    </section>
  );
}

function Cell({
  value,
  onChange,
  role,
}: {
  value: string;
  onChange: (v: string) => void;
  role: "main" | "goal" | "action";
}) {
  const bg =
    role === "main"
      ? "linear-gradient(135deg, rgba(0,224,255,0.25), rgba(161,85,255,0.25))"
      : role === "goal"
        ? "rgba(177,255,66,0.10)"
        : "rgba(10,14,31,0.6)";
  const color =
    role === "main"
      ? "var(--accent-cyan)"
      : role === "goal"
        ? "var(--accent-lime)"
        : "var(--fg)";
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder=""
      rows={2}
      className="aspect-square w-full p-0.5 text-center resize-none focus:outline-none focus:ring-1"
      style={{
        background: bg,
        color,
        fontSize: "9px",
        lineHeight: "1.1",
        fontWeight: role === "main" ? 700 : role === "goal" ? 600 : 400,
        borderColor: "transparent",
      }}
    />
  );
}

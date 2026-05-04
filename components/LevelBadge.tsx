import clsx from "clsx";
import type { RoutineSourceCounts } from "@/lib/level";
import { computeXp, levelFromXp } from "@/lib/level";

type Props = {
  counts: RoutineSourceCounts;
  variant?: "card" | "inline";
};

export function LevelBadge({ counts, variant = "card" }: Props) {
  const xp = computeXp(counts);
  const { current, next, progressPct, xpInLevel, xpToNext } = levelFromXp(xp);

  if (variant === "inline") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
        <span aria-hidden>{current.emoji}</span>
        Lv {current.level} · {current.name}
      </span>
    );
  }

  return (
    <section className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white p-5 shadow-xl">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-white/70">
            Lv {current.level}
          </p>
          <p className="text-xl font-bold mt-0.5 inline-flex items-center gap-2">
            <span className="text-2xl" aria-hidden>{current.emoji}</span>
            {current.name}
          </p>
          <p className="text-[11px] text-white/80 mt-1">{current.description}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/70 uppercase tracking-wider">XP</p>
          <p className="text-xl font-bold tabular-nums">{xp}</p>
        </div>
      </header>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-white/80">
          <span>{next ? `다음: ${next.emoji} ${next.name}` : "최고 레벨 도달!"}</span>
          <span>
            {next ? `${xpInLevel} / ${xpToNext}` : "MAX"}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/15 overflow-hidden">
          <div
            className={clsx(
              "h-full bg-gradient-to-r from-amber-300 to-yellow-200 shadow-[0_0_8px_rgba(255,200,0,0.6)] transition-all"
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Mini label="작성" value={counts.entries} />
        <Mini label="온타임" value={counts.timelineOnTime} />
        <Mini label="Streak" value={counts.streak} suffix="일" />
      </div>
    </section>
  );
}

function Mini({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur px-2 py-2">
      <p className="text-[9px] text-white/70 uppercase tracking-wider">{label}</p>
      <p className="text-base font-bold tabular-nums">
        {value}
        {suffix && <span className="text-[10px] font-normal ml-0.5">{suffix}</span>}
      </p>
    </div>
  );
}

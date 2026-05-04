"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Clock } from "lucide-react";
import { saveDailyEntry, type DailyEntryInput } from "./actions";

type Mode = "today" | "plan";

type Props = {
  date: string;
  /** "today" = /today 페이지 (실행 모드 순서). "plan" = /entry/[date] (내일 계획 모드 순서). */
  mode?: Mode;
  initial?: Partial<DailyEntryInput> | null;
  initialTimeline?: { title: string; startTime: string; dueTime: string }[];
  /** "오늘" | "내일" | 특정 날짜 라벨 */
  dayLabel?: string;
  /** Must 3 위치에 끼워넣을 실행 가능한 체크 컴포넌트 (today 모드) */
  mustCheckSlot?: React.ReactNode;
  /** 타임라인 위치에 끼워넣을 실행 가능한 컴포넌트 (today 모드) */
  timelineSlot?: React.ReactNode;
  onSaved?: () => void;
};

const empty3 = ["", "", ""];

const TODAY_ORDER: SectionId[] = [
  "header",
  "cheer",
  "oneThing",
  "variables",
  "must3",
  "nice3",
  "smallWin",
  "insight",
  "gratitude",
  "timeline",
];

const PLAN_ORDER: SectionId[] = [
  "header",
  "reflection", // smallWin + insight + gratitude 묶음
  "timeline",
  "must3",
  "nice3",
  "variables",
  "oneThing",
  "cheer",
];

type SectionId =
  | "header"
  | "reflection"
  | "smallWin"
  | "insight"
  | "gratitude"
  | "timeline"
  | "must3"
  | "nice3"
  | "variables"
  | "oneThing"
  | "cheer";

export function EntryForm({
  date,
  mode = "plan",
  initial,
  initialTimeline,
  dayLabel = "오늘",
  mustCheckSlot,
  timelineSlot,
  onSaved,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [wakeUpTime, setWakeUpTime] = useState(initial?.wakeUpTime ?? "");
  const [workStartTime, setWorkStartTime] = useState(initial?.workStartTime ?? "");
  const [smallWin, setSmallWin] = useState(initial?.smallWin ?? "");
  const [insight, setInsight] = useState(initial?.insight ?? "");
  const [gratitude, setGratitude] = useState(initial?.gratitude ?? "");
  const [must3, setMust3] = useState<string[]>(
    initial?.must3 && initial.must3.length === 3 ? initial.must3 : empty3
  );
  const [nice3, setNice3] = useState<string[]>(
    initial?.nice3 && initial.nice3.length === 3 ? initial.nice3 : empty3
  );
  const [variables, setVariables] = useState(initial?.variables ?? "");
  const [oneThing, setOneThing] = useState(initial?.oneThing ?? "");
  const [cheerMessage, setCheerMessage] = useState(initial?.cheerMessage ?? "");
  const [timeline, setTimeline] = useState<
    { title: string; startTime: string; dueTime: string }[]
  >(initialTimeline ?? []);

  function setMustAt(i: number, v: string) {
    setMust3((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  }
  function setNiceAt(i: number, v: string) {
    setNice3((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  }

  function addTimelineRow() {
    const last = timeline[timeline.length - 1];
    setTimeline((prev) => [
      ...prev,
      {
        title: "",
        startTime: last?.dueTime ?? "09:00",
        dueTime: shiftHour(last?.dueTime ?? "09:00", 1),
      },
    ]);
  }
  function updateTimelineRow(
    i: number,
    patch: Partial<{ title: string; startTime: string; dueTime: string }>
  ) {
    setTimeline((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeTimelineRow(i: number) {
    setTimeline((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanedTimeline = timeline
      .map((t) => ({
        title: t.title.trim(),
        startTime: t.startTime,
        dueTime: t.dueTime,
      }))
      .filter((t) => t.title);

    startTransition(async () => {
      try {
        await saveDailyEntry({
          date,
          wakeUpTime: wakeUpTime || null,
          workStartTime: workStartTime || null,
          smallWin: smallWin || null,
          insight: insight || null,
          gratitude: gratitude || null,
          must3,
          nice3,
          variables: variables || null,
          oneThing: oneThing || null,
          cheerMessage: cheerMessage || null,
          timeline: cleanedTimeline,
        });
        onSaved?.();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "저장에 실패했어요.");
      }
    });
  }

  // === 섹션 렌더 함수들 ===

  function renderHeader() {
    return (
      <Section key="header" title="🕘 기상 / 출근">
        <div className="grid grid-cols-2 gap-3">
          <Field label="기상">
            <input
              type="time"
              value={wakeUpTime ?? ""}
              onChange={(e) => setWakeUpTime(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="출근">
            <input
              type="text"
              placeholder="08:30 / x"
              value={workStartTime ?? ""}
              onChange={(e) => setWorkStartTime(e.target.value)}
              className="input"
            />
          </Field>
        </div>
      </Section>
    );
  }

  function renderCheer() {
    return (
      <Section key="cheer" title="📣 한 줄 응원">
        <input
          type="text"
          value={cheerMessage ?? ""}
          onChange={(e) => setCheerMessage(e.target.value)}
          className="input"
          placeholder="선언하고 행동하자"
        />
      </Section>
    );
  }

  function renderOneThing() {
    return (
      <Section key="oneThing" title={`💎 ${dayLabel}의 원씽 (One Thing)`}>
        <input
          type="text"
          value={oneThing ?? ""}
          onChange={(e) => setOneThing(e.target.value)}
          className="input"
          placeholder="가장 중요한 단 하나"
        />
      </Section>
    );
  }

  function renderVariables() {
    return (
      <Section key="variables" title={`❗ ${dayLabel}의 변수 / 주의할 점`}>
        <textarea
          rows={2}
          value={variables ?? ""}
          onChange={(e) => setVariables(e.target.value)}
          className="input"
          placeholder="치과 방문, 미팅 등"
        />
      </Section>
    );
  }

  function renderMust3() {
    // today 모드에서 실행용 슬롯 제공 시 Must3 입력 대신 그것을 표시
    if (mustCheckSlot) {
      return <div key="must3">{mustCheckSlot}</div>;
    }
    return (
      <Section key="must3" title="🔥 Must 3 — 꼭 해야 할 것">
        {[0, 1, 2].map((i) => (
          <input
            key={i}
            type="text"
            value={must3[i] ?? ""}
            onChange={(e) => setMustAt(i, e.target.value)}
            placeholder={`${i + 1}. 꼭 해야 할 일`}
            className="input"
          />
        ))}
      </Section>
    );
  }

  function renderNice3() {
    return (
      <Section key="nice3" title="🌱 Nice 3 — 하면 좋은 것">
        {[0, 1, 2].map((i) => (
          <input
            key={i}
            type="text"
            value={nice3[i] ?? ""}
            onChange={(e) => setNiceAt(i, e.target.value)}
            placeholder={`${i + 1}. 하면 좋은 일`}
            className="input"
          />
        ))}
      </Section>
    );
  }

  function renderSmallWin() {
    return (
      <Section key="smallWin" title={`✅ ${dayLabel} 해낸 것 (Small Win)`}>
        <textarea
          rows={2}
          value={smallWin ?? ""}
          onChange={(e) => setSmallWin(e.target.value)}
          className="input"
          placeholder="작은 성취 한 가지"
        />
      </Section>
    );
  }

  function renderInsight() {
    return (
      <Section key="insight" title={`💡 ${dayLabel} 배운 것 (Insight)`}>
        <textarea
          rows={2}
          value={insight ?? ""}
          onChange={(e) => setInsight(e.target.value)}
          className="input"
          placeholder="얻은 인사이트 한 줄"
        />
      </Section>
    );
  }

  function renderGratitude() {
    return (
      <Section key="gratitude" title={`🙏 ${dayLabel} 감사한 점`}>
        <textarea
          rows={2}
          value={gratitude ?? ""}
          onChange={(e) => setGratitude(e.target.value)}
          className="input"
          placeholder="감사할 일 한 가지"
        />
      </Section>
    );
  }

  function renderReflection() {
    return (
      <Section key="reflection" title={`✅ ${dayLabel} 회고 (해낸 것 / 배운 점 / 감사)`}>
        <Field label="Small Win — 해낸 것">
          <textarea
            rows={2}
            value={smallWin ?? ""}
            onChange={(e) => setSmallWin(e.target.value)}
            className="input"
            placeholder="작은 성취 한 가지"
          />
        </Field>
        <Field label="Insight — 배운 점">
          <textarea
            rows={2}
            value={insight ?? ""}
            onChange={(e) => setInsight(e.target.value)}
            className="input"
            placeholder="얻은 인사이트 한 줄"
          />
        </Field>
        <Field label="🙏 감사한 점">
          <textarea
            rows={2}
            value={gratitude ?? ""}
            onChange={(e) => setGratitude(e.target.value)}
            className="input"
            placeholder="감사할 일 한 가지"
          />
        </Field>
      </Section>
    );
  }

  function renderTimeline() {
    // today 모드에서 실행용 슬롯 제공 시 편집 폼 대신 그것을 표시
    if (timelineSlot) {
      return <div key="timeline">{timelineSlot}</div>;
    }
    return (
      <Section key="timeline" title={`⏰ ${dayLabel} 타임라인`}>
        <p className="text-[11px] text-slate-500 -mt-1">
          시작/마감 시간이 있는 할일을 시간순으로 추가하세요. 마감 안에 완료하면 🎉 클리어 축하!
        </p>
        <ul className="space-y-2">
          {timeline.map((row, i) => (
            <li key={i} className="rounded-lg border border-slate-200 p-2.5 bg-slate-50/60">
              <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                <input
                  type="text"
                  value={row.title}
                  onChange={(e) => updateTimelineRow(i, { title: e.target.value })}
                  placeholder="할일"
                  className="input bg-white"
                />
                <button
                  type="button"
                  onClick={() => removeTimelineRow(i)}
                  className="size-9 rounded-md text-slate-400 hover:text-red-600 inline-flex items-center justify-center"
                  aria-label="삭제"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="flex items-center gap-1.5 rounded-md bg-white border border-slate-200 px-2 py-1.5 text-xs">
                  <Clock size={12} className="text-slate-400" />
                  <span className="text-slate-500">시작</span>
                  <input
                    type="time"
                    value={row.startTime}
                    onChange={(e) => updateTimelineRow(i, { startTime: e.target.value })}
                    className="flex-1 outline-none bg-transparent"
                  />
                </label>
                <label className="flex items-center gap-1.5 rounded-md bg-white border border-slate-200 px-2 py-1.5 text-xs">
                  <Clock size={12} className="text-slate-400" />
                  <span className="text-slate-500">마감</span>
                  <input
                    type="time"
                    value={row.dueTime}
                    onChange={(e) => updateTimelineRow(i, { dueTime: e.target.value })}
                    className="flex-1 outline-none bg-transparent"
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addTimelineRow}
          className="w-full rounded-lg border border-dashed border-slate-300 py-2.5 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-900 inline-flex items-center justify-center gap-1"
        >
          <Plus size={15} /> 타임라인 항목 추가
        </button>
      </Section>
    );
  }

  function renderById(id: SectionId) {
    switch (id) {
      case "header": return renderHeader();
      case "cheer": return renderCheer();
      case "oneThing": return renderOneThing();
      case "variables": return renderVariables();
      case "must3": return renderMust3();
      case "nice3": return renderNice3();
      case "smallWin": return renderSmallWin();
      case "insight": return renderInsight();
      case "gratitude": return renderGratitude();
      case "reflection": return renderReflection();
      case "timeline": return renderTimeline();
    }
  }

  const order = mode === "today" ? TODAY_ORDER : PLAN_ORDER;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {order.map((id) => renderById(id))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="sticky bottom-20 z-10 -mx-5 px-5 py-3 bg-slate-50/95 backdrop-blur border-t border-slate-200">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function shiftHour(hhmm: string, hours: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const next = (h + hours + 24) % 24;
  return `${String(next).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

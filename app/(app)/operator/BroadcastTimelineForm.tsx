"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Send } from "lucide-react";
import { broadcastTimelineTask } from "./actions";

function todayLocalISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

export function BroadcastTimelineForm({ memberCount }: { memberCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(todayLocalISO());
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [dueTime, setDueTime] = useState("10:00");
  const [isRoutine, setIsRoutine] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!title.trim()) {
      setError("일정 제목을 입력해주세요");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(dueTime)) {
      setError("시간 형식이 올바르지 않아요");
      return;
    }
    if (startTime > dueTime) {
      setError("시작 시간이 종료 시간보다 늦을 수 없어요");
      return;
    }
    if (!confirm(`전체 활성 팀원 ${memberCount}명의 ${date} 타임라인에 "${title.trim()}" 일정을 추가할까요?`)) {
      return;
    }
    startTransition(async () => {
      try {
        const { created } = await broadcastTimelineTask({
          date,
          title: title.trim(),
          startTime,
          dueTime,
          isRoutine,
        });
        setNotice(`✅ ${created}명에게 추가됨`);
        setTitle("");
        setIsRoutine(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "추가 실패");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3"
    >
      <div className="flex items-center gap-1.5">
        <CalendarClock size={14} className="text-blue-600" />
        <h4 className="text-xs font-semibold text-slate-700">
          전체 팀원 ({memberCount}명) 타임라인에 일정 추가
        </h4>
      </div>

      <label className="block">
        <span className="text-[11px] text-slate-500">날짜</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input mt-1"
        />
      </label>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="일정 제목 (예: 단체 미팅, 줌 강의)"
        className="input"
      />

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] text-slate-500">시작 시간</span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="input mt-1"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-slate-500">종료 시간</span>
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className="input mt-1"
          />
        </label>
      </div>

      <label className="inline-flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={isRoutine}
          onChange={(e) => setIsRoutine(e.target.checked)}
          className="h-4 w-4 accent-blue-500"
        />
        🔁 매일 반복되는 루틴으로 표시
      </label>

      <p className="text-[10px] text-slate-400 leading-relaxed">
        ※ 팀원별 DailyEntry가 없으면 자동 생성됩니다. 추가 후 각 팀원이 본인 타임라인에서 수정/삭제할 수 있어요.
      </p>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {notice && <p className="text-xs text-emerald-700 font-semibold">{notice}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 disabled:opacity-50"
      >
        <Send size={14} /> {pending ? "추가 중…" : "전체 팀원에게 추가"}
      </button>
    </form>
  );
}

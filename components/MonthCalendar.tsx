"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

type DayMark = {
  date: string; // YYYY-MM-DD
  hasEntry: boolean;
  total: number;
  done: number;
  onTime: number;
};

type Props = {
  /** YYYY-MM-DD, 캘린더 첫 진입 시 보여줄 달의 임의 일자 */
  initialMonth: string;
  marks: DayMark[];
  /** 클릭 시 이동할 경로의 베이스. e.g. "/me" → "/me/2026-04-28" */
  hrefBase: string;
  /** 오늘 날짜 (KST), 강조용 */
  today: string;
};

export function MonthCalendar({ initialMonth, marks, hrefBase, today }: Props) {
  const [cursor, setCursor] = useState(toMonthStart(initialMonth));

  const days = buildMonthDays(cursor);
  const markMap = new Map(marks.map((m) => [m.date, m]));

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(addMonths(cursor, -1))}
          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
          aria-label="이전 달"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-semibold">
          {cursor.slice(0, 4)}년 {Number(cursor.slice(5, 7))}월
        </p>
        <button
          type="button"
          onClick={() => setCursor(addMonths(cursor, +1))}
          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
          aria-label="다음 달"
        >
          <ChevronRight size={16} />
        </button>
      </header>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
          <span key={d} className="text-[10px] font-medium text-slate-400 py-1">
            {d}
          </span>
        ))}

        {days.map((d, idx) => {
          if (!d) return <div key={idx} />;
          const mark = markMap.get(d);
          const isToday = d === today;
          const pct = mark && mark.total > 0 ? mark.done / mark.total : 0;
          const cell = (
            <div
              className={clsx(
                "relative size-9 mx-auto rounded-full flex items-center justify-center text-xs",
                isToday
                  ? "bg-slate-900 text-white font-semibold"
                  : mark?.hasEntry
                  ? "bg-emerald-50 text-emerald-900"
                  : "text-slate-700"
              )}
            >
              {Number(d.slice(8, 10))}
              {mark?.hasEntry && !isToday && (
                <span
                  className={clsx(
                    "absolute -bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full",
                    pct >= 1 ? "bg-emerald-500" : pct > 0 ? "bg-emerald-300" : "bg-slate-300"
                  )}
                />
              )}
            </div>
          );
          return (
            <Link key={d} href={`${hrefBase}/${d}`} aria-label={`${d} 기록`}>
              {cell}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function toMonthStart(s: string): string {
  return s.slice(0, 7) + "-01";
}

function addMonths(s: string, delta: number): string {
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const total = (y * 12 + (m - 1)) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

/**
 * 해당 달의 모든 날짜를 월요일부터 시작하는 7-column 캘린더 그리드로 변환.
 * 비어있는 칸은 빈 문자열.
 */
function buildMonthDays(monthStart: string): (string | "")[] {
  const y = Number(monthStart.slice(0, 4));
  const m = Number(monthStart.slice(5, 7));
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0=일
  const leading = (firstDow + 6) % 7; // 월요일을 시작으로

  // 해당 달의 일수
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const cells: (string | "")[] = [];
  for (let i = 0; i < leading; i++) cells.push("");
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push("");
  return cells;
}

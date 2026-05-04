"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

type Stats = {
  entries: number;
  total: number;
  done: number;
  onTime: number;
};

export function ShareSummaryButton({
  userName,
  stats,
  streak,
}: {
  userName: string;
  stats: { today: Stats; week: Stats; month: Stats };
  streak: number;
}) {
  const [copied, setCopied] = useState(false);

  function buildText() {
    const pct = (s: Stats) => (s.total > 0 ? Math.round((s.done / s.total) * 100) : 0);
    return [
      `📊 ${userName}의 진행 상황`,
      ``,
      `🔥 연속 작성 ${streak}일`,
      ``,
      `오늘 — ${pct(stats.today)}% (${stats.today.done}/${stats.today.total})`,
      `이번 주 — ${pct(stats.week)}% (${stats.week.done}/${stats.week.total}) · 작성 ${stats.week.entries}일 · 온타임 ${stats.week.onTime}`,
      `이번 달 — ${pct(stats.month)}% (${stats.month.done}/${stats.month.total}) · 작성 ${stats.month.entries}일 · 온타임 ${stats.month.onTime}`,
      ``,
      `#에프터마인드2기 #체크메이트`,
    ].join("\n");
  }

  async function share() {
    const text = buildText();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text, title: "내 진행 상황" });
        return;
      } catch {
        // 사용자 취소 등은 무시
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(text);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
    >
      <Share2 size={13} />
      {copied ? "복사됨!" : "공유"}
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";

type IntegrationInfo = {
  id: string;
  kakaoId: string;
  dailyReminderEnabled: boolean;
  moneyEnabled: boolean;
  todayPlanEnabled: boolean;
  lastSentAt: string | null;
  createdAt: string;
};

type ToggleKey = "dailyReminderEnabled" | "moneyEnabled" | "todayPlanEnabled";

export function KakaoIntegrationCard() {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<IntegrationInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("kakao") === "connected") {
        // 깔끔하게 URL 정리
        const url = new URL(window.location.href);
        url.searchParams.delete("kakao");
        url.searchParams.delete("kakao_error");
        window.history.replaceState({}, "", url.toString());
      } else if (params.get("kakao_error")) {
        setError(`카카오 연동 실패: ${params.get("kakao_error")}`);
      }
    }
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/kakao");
      if (res.ok) {
        const data = await res.json();
        setInfo(data.integration ?? null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function toggleField(key: ToggleKey, enabled: boolean) {
    if (!info) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/integrations/kakao", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: enabled }),
      });
      if (res.ok) {
        setInfo({ ...info, [key]: enabled });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function disconnect() {
    if (!confirm("카카오 연동을 해제하시겠습니까?\n매일 카카오톡 리마인드가 중단됩니다.")) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/integrations/kakao", { method: "DELETE" });
      if (res.ok) setInfo(null);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 animate-pulse h-24" />
    );
  }

  if (!info) {
    return (
      <div className="rounded-2xl border border-yellow-400/20 bg-gradient-to-br from-yellow-500/10 to-amber-500/5 p-4 space-y-2">
        <div className="flex items-start gap-2">
          <span className="text-2xl">💬</span>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-yellow-200">카카오톡 리마인드</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              카카오톡 "나에게 보내기"로 매일 오늘 일정·가계부 요약을 받아보세요.
            </p>
          </div>
        </div>
        {error && (
          <p className="text-[11px] text-rose-300 bg-rose-500/10 rounded px-2 py-1">
            {error}
          </p>
        )}
        <a
          href="/api/auth/kakao/start"
          className="block w-full text-center py-2.5 rounded-xl bg-yellow-400 text-black font-bold text-sm hover:bg-yellow-300 transition-colors"
        >
          🟡 카카오 연동하기
        </a>
        <p className="text-[10px] text-slate-500">
          매일 밤 23:00 KST 자동 발송. 본인 카카오톡 채팅창에 메시지가 도착합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-green-500/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-2xl">💬</span>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-emerald-200">카카오톡 연동됨 ✓</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            연동일: {new Date(info.createdAt).toLocaleDateString("ko-KR")}
          </p>
          {info.lastSentAt && (
            <p className="text-[10px] text-slate-500">
              최근 발송: {new Date(info.lastSentAt).toLocaleString("ko-KR")}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <ToggleRow
          label="📝 데일리 리포트 미작성 알림"
          hint="저녁에 아직 안 썼으면 카톡으로 푸시"
          on={info.dailyReminderEnabled}
          disabled={submitting}
          onChange={(v) => toggleField("dailyReminderEnabled", v)}
        />
        <ToggleRow
          label="📅 오늘 일정 요약"
          hint="타임라인/MUST 진행 상황을 카톡으로"
          on={info.todayPlanEnabled}
          disabled={submitting}
          onChange={(v) => toggleField("todayPlanEnabled", v)}
        />
        <ToggleRow
          label="💰 가계부 일일 요약"
          hint="오늘/이번 달 지출·수입을 카톡으로"
          on={info.moneyEnabled}
          disabled={submitting}
          onChange={(v) => toggleField("moneyEnabled", v)}
        />
      </div>

      <button
        onClick={disconnect}
        disabled={submitting}
        className="w-full py-1.5 rounded-lg text-[11px] text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition-colors"
      >
        연동 해제
      </button>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  on,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  on: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-200">{label}</p>
        {hint && <p className="text-[10px] text-slate-500 mt-0.5">{hint}</p>}
      </div>
      <button
        onClick={() => onChange(!on)}
        disabled={disabled}
        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
          on ? "bg-emerald-500" : "bg-slate-600"
        }`}
        aria-label="toggle"
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            on ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

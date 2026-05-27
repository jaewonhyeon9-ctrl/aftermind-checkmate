"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { updateCheckinConfig } from "./actions";

export function CheckinConfigCard({
  initial,
}: {
  initial: { enabled: boolean; startHour: number; endHour: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [startHour, setStartHour] = useState(initial.startHour);
  const [endHour, setEndHour] = useState(initial.endHour);
  const [msg, setMsg] = useState<string | null>(null);

  function save() {
    setMsg(null);
    startTransition(async () => {
      try {
        await updateCheckinConfig({ enabled, startHour, endHour });
        setMsg("저장됨");
        router.refresh();
        setTimeout(() => setMsg(null), 2500);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "저장 실패");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={16} className="text-cyan-300" />
          <h3 className="text-sm font-semibold text-white">매시간 체크인 알림</h3>
        </div>
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            enabled ? "bg-cyan-500" : "bg-slate-600"
          }`}
          aria-label="enabled toggle"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              enabled ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] text-slate-400">시작 시각</span>
          <select
            value={startHour}
            onChange={(e) => setStartHour(Number(e.target.value))}
            disabled={!enabled}
            className="w-full mt-1 rounded-lg bg-white/10 border border-white/15 text-white text-sm px-2 py-2 disabled:opacity-40"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i} className="text-black">
                {String(i).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] text-slate-400">종료 시각 (포함)</span>
          <select
            value={endHour}
            onChange={(e) => setEndHour(Number(e.target.value))}
            disabled={!enabled}
            className="w-full mt-1 rounded-lg bg-white/10 border border-white/15 text-white text-sm px-2 py-2 disabled:opacity-40"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i} className="text-black">
                {String(i).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-[11px] text-slate-400">
        설정된 시간대(KST) 동안 매 정각에 팀원 전원에게 체크인 알림이 발송됩니다.
      </p>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-emerald-300 min-h-[1em]">{msg}</span>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="px-4 py-1.5 rounded-lg bg-cyan-500 text-white text-xs font-semibold disabled:opacity-50"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}

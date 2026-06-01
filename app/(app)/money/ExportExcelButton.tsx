"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";

export function ExportExcelButton({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  function download() {
    const params = new URLSearchParams({ from, to });
    window.open(`/api/money/export?${params.toString()}`, "_blank");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
      >
        <Download size={12} /> 엑셀 다운로드
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-emerald-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800">📊 엑셀로 다운로드</h4>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="p-1 text-slate-400 hover:text-slate-700"
          aria-label="닫기"
        >
          <X size={14} />
        </button>
      </div>
      <p className="text-[11px] text-slate-500">
        선택한 기간의 거래 내역을 엑셀(.xlsx) 파일로 받아갑니다.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] text-slate-500">시작일</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            max={to}
            className="input mt-1"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-slate-500">종료일</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            min={from}
            className="input mt-1"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            const today = new Date();
            const first = new Date(today.getFullYear(), today.getMonth(), 1);
            setFrom(first.toISOString().slice(0, 10));
            setTo(today.toISOString().slice(0, 10));
          }}
          className="px-2.5 py-1 rounded-md border border-slate-200 text-[10px] text-slate-600 hover:bg-slate-50"
        >
          이번 달
        </button>
        <button
          type="button"
          onClick={() => {
            const today = new Date();
            const first = new Date(today.getFullYear(), 0, 1);
            setFrom(first.toISOString().slice(0, 10));
            setTo(today.toISOString().slice(0, 10));
          }}
          className="px-2.5 py-1 rounded-md border border-slate-200 text-[10px] text-slate-600 hover:bg-slate-50"
        >
          올해
        </button>
      </div>
      <button
        type="button"
        onClick={download}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-700/20"
      >
        <Download size={14} /> 다운로드
      </button>
    </div>
  );
}

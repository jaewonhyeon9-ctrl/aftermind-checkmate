"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Image as ImageIcon, Sparkles, Check, X, Loader2 } from "lucide-react";
import { addTransaction } from "./actions";
import { categorizeMerchant } from "@/lib/sms";

const DEFAULT_EXPENSE_CATEGORIES = [
  "식비",
  "교통",
  "쇼핑",
  "여가",
  "주거",
  "통신",
  "의료",
  "교육",
  "기타",
];

export function OcrReceiptPanel({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"idle" | "loading" | "ready" | "saving">("idle");
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("기타");
  const [date, setDate] = useState(defaultDate);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setImageUrl(URL.createObjectURL(f));
    setStage("idle");
    setText("");
    setAmount("");
    setMerchant("");
    setError(null);
    setSuccess(null);
  }

  async function runOcr() {
    if (!imageFile) return;
    setStage("loading");
    setProgress(0);
    setError(null);
    try {
      // Tesseract.js 동적 import (초기 번들 크기 줄이기)
      const Tesseract = await import("tesseract.js");
      const worker = await Tesseract.createWorker("kor+eng", 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      const { data } = await worker.recognize(imageFile);
      await worker.terminate();

      setText(data.text);
      const guess = guessFromOcr(data.text);
      if (guess.amount) setAmount(guess.amount.toLocaleString("ko-KR"));
      if (guess.merchant) {
        setMerchant(guess.merchant);
        setCategory(categorizeMerchant(guess.merchant));
      }
      if (guess.date) setDate(guess.date);
      setStage("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR 실패");
      setStage("idle");
    }
  }

  async function save() {
    setError(null);
    setSuccess(null);
    const amt = Number(amount.replace(/,/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("금액을 확인해주세요.");
      return;
    }
    if (!merchant.trim()) {
      setError("가맹점명을 입력해주세요.");
      return;
    }
    startTransition(async () => {
      try {
        await addTransaction({
          type: "EXPENSE",
          category,
          amount: Math.round(amt),
          date,
          note: merchant.trim(),
        });
        setSuccess("저장 완료");
        // reset
        setImageFile(null);
        setImageUrl(null);
        setText("");
        setAmount("");
        setMerchant("");
        setStage("idle");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "저장 실패");
      }
    });
  }

  function reset() {
    setImageFile(null);
    setImageUrl(null);
    setText("");
    setAmount("");
    setMerchant("");
    setCategory("기타");
    setStage("idle");
    setError(null);
    setSuccess(null);
  }

  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 inline-flex items-center gap-1.5">
          <Camera size={14} /> 영수증 OCR
        </h3>
        <p className="mt-0.5 text-[11px] text-slate-500">
          영수증 사진 → 자동 인식 → 거래 등록 (한국어 인식, 첫 사용 시 ~7MB 다운로드)
        </p>
      </div>

      {!imageUrl ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="block cursor-pointer">
            <span className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 py-5 text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900">
              <Camera size={16} />
              촬영
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={pickFile}
              className="hidden"
            />
          </label>
          <label className="block cursor-pointer">
            <span className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 py-5 text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900">
              <ImageIcon size={16} />
              갤러리
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={pickFile}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="영수증 미리보기" className="w-full h-auto max-h-72 object-contain bg-slate-50" />
            <button
              type="button"
              onClick={reset}
              className="absolute top-2 right-2 size-7 rounded-full bg-black/60 text-white flex items-center justify-center"
              aria-label="제거"
            >
              <X size={14} />
            </button>
          </div>

          {stage === "idle" && (
            <button
              type="button"
              onClick={runOcr}
              className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white inline-flex items-center justify-center gap-1"
            >
              <Sparkles size={14} /> OCR 분석 시작
            </button>
          )}

          {stage === "loading" && (
            <div className="rounded-lg border border-slate-200 p-3 space-y-2">
              <p className="text-xs text-slate-600 inline-flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> 분석 중… {progress}%
              </p>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-slate-900 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {stage === "ready" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input"
                >
                  {DEFAULT_EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input"
                />
              </div>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="가맹점명"
                className="input"
              />
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^\d]/g, "");
                    setAmount(digits ? Number(digits).toLocaleString("ko-KR") : "");
                  }}
                  placeholder="금액"
                  className="input pr-10 text-right tabular-nums text-base font-semibold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">원</span>
              </div>

              <details className="text-[11px] text-slate-500">
                <summary className="cursor-pointer">인식된 원본 텍스트 보기</summary>
                <pre className="mt-1 p-2 bg-slate-50 rounded text-[10px] whitespace-pre-wrap break-words max-h-40 overflow-auto">
                  {text}
                </pre>
              </details>

              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white inline-flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Check size={14} /> {pending ? "저장 중…" : "거래 추가"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-50 border border-red-200 px-2 py-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-1.5 text-xs text-emerald-700">
          ✓ {success}
        </p>
      )}
    </section>
  );
}

/**
 * OCR 텍스트에서 금액 / 가맹점 / 날짜 추정.
 */
function guessFromOcr(text: string): {
  amount?: number;
  merchant?: string;
  date?: string;
} {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 합계 / 결제금액 / 총액 라벨 우선
  let amount: number | undefined;
  for (const line of lines) {
    if (/(합계|결제금액|총액|총\s*결제|TOTAL|받을금액|승인금액)/i.test(line)) {
      const m = line.match(/([\d,]{2,})/);
      if (m) {
        const n = Number(m[1].replace(/,/g, ""));
        if (Number.isFinite(n) && n > 0) {
          amount = n;
          break;
        }
      }
    }
  }
  // 라벨 못 찾으면 가장 큰 숫자 (≥1000)
  if (!amount) {
    const nums = [...text.matchAll(/([\d]{1,3}(?:,[\d]{3})+|[\d]{4,})/g)]
      .map((m) => Number(m[1].replace(/,/g, "")))
      .filter((n) => n >= 500 && n <= 100_000_000);
    if (nums.length > 0) amount = Math.max(...nums);
  }

  // 날짜 — yyyy-mm-dd 또는 yyyy/mm/dd 또는 yyyy.mm.dd
  let date: string | undefined;
  const dateM = text.match(/(20\d{2})[\.\-\/년](\d{1,2})[\.\-\/월](\d{1,2})/);
  if (dateM) {
    const y = dateM[1];
    const m = String(Number(dateM[2])).padStart(2, "0");
    const d = String(Number(dateM[3])).padStart(2, "0");
    date = `${y}-${m}-${d}`;
  }

  // 가맹점 — 가장 위쪽의 문자 위주 라인
  let merchant: string | undefined;
  for (const line of lines.slice(0, 6)) {
    const onlyDigits = /^[\d\s,.\-:/원₩]+$/.test(line);
    if (onlyDigits) continue;
    if (line.length < 2) continue;
    if (/(영수증|RECEIPT|TEL|전화|주소|사업자|대표자|매장|점장)/i.test(line)) continue;
    merchant = line;
    break;
  }

  return { amount, merchant, date };
}

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Image as ImageIcon, Sparkles, X } from "lucide-react";
import { submitCheckin } from "./actions";

export function CheckinForm({ hasExisting }: { hasExisting: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function pickFromInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setError(null);
    setSuccess(null);
  }

  function clear() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setMessage("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!file) {
      setError("사진을 선택해주세요");
      return;
    }
    if (!message.trim()) {
      setError("한 줄이라도 적어주세요");
      return;
    }

    const fd = new FormData();
    fd.append("photo", file);
    fd.append("message", message.trim());

    startTransition(async () => {
      try {
        const r = await submitCheckin(fd);
        clear();
        if (r?.rewardedEmma) {
          setSuccess(`✨ +${r.rewardedEmma} 에마 지급! 잘했어요.`);
        } else {
          setSuccess("이번 정각 체크인을 덮어썼어요.");
        }
        router.refresh();
        setTimeout(() => setSuccess(null), 4000);
      } catch (e) {
        setError(e instanceof Error ? e.message : "업로드 실패");
      }
    });
  }

  const remaining = 140 - message.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!previewUrl ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="rounded-xl bg-white/10 border border-white/15 py-3 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 hover:bg-white/15"
          >
            <Camera size={16} /> 카메라
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="rounded-xl bg-white/10 border border-white/15 py-3 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 hover:bg-white/15"
          >
            <ImageIcon size={16} /> 갤러리
          </button>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={pickFromInput}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={pickFromInput}
          />
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/15 bg-black aspect-square">
          {/* 미리보기 — 실제 카드와 동일한 인스타 오버레이 스타일 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="미리보기"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p
              className="text-white text-base font-semibold whitespace-pre-wrap min-h-[1.5em]"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}
            >
              {message || <span className="text-white/40">여기에 글이 올라가요</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={clear}
            className="absolute top-2 right-2 size-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            aria-label="다시 고르기"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="relative">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 140))}
          placeholder="지금 뭐 하고 있어요? (140자)"
          rows={2}
          className="w-full rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/40 text-sm px-3 py-2 resize-none focus:outline-none focus:border-cyan-400/50"
        />
        <span className="absolute bottom-1.5 right-2 text-[10px] mono text-white/40">
          {remaining}
        </span>
      </div>

      {error && (
        <p className="text-[11px] text-rose-300 bg-rose-500/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-[11px] text-emerald-300 bg-emerald-500/10 rounded-lg px-3 py-2 inline-flex items-center gap-1.5">
          <Sparkles size={12} /> {success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !file || !message.trim()}
        className="w-full rounded-xl py-3 text-sm font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending
          ? "올리는 중…"
          : hasExisting
            ? "이번 정각 체크인 덮어쓰기"
            : "체크인 올리기 (+50 에마)"}
      </button>
    </form>
  );
}

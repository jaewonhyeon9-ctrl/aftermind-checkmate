"use client";

import Image from "next/image";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteCheckin } from "./actions";

export function CheckinCard({
  id,
  userName,
  isOperator,
  isMe,
  hour,
  photoUrl,
  message,
}: {
  id: string;
  userName: string;
  isOperator: boolean;
  isMe: boolean;
  hour: Date;
  photoUrl: string;
  message: string;
}) {
  const [pending, startTransition] = useTransition();

  const hourLabel = new Date(hour).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    hour12: false,
  });

  function handleDelete() {
    if (!confirm("이 체크인을 삭제할까요?")) return;
    startTransition(async () => {
      try {
        await deleteCheckin(id);
      } catch (e) {
        alert(e instanceof Error ? e.message : "삭제 실패");
      }
    });
  }

  return (
    <article className="relative rounded-2xl overflow-hidden bg-black ring-1 ring-white/10 shadow-lg">
      {/* 사진 (인스타 스타일 정사각형) */}
      <div className="relative aspect-square w-full">
        <Image
          src={photoUrl}
          alt={`${userName}의 체크인`}
          fill
          sizes="(max-width: 768px) 100vw, 448px"
          className="object-cover"
          unoptimized
        />
        {/* 하단 그라데이션 + 텍스트 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 space-y-2">
          <p
            className="text-white text-base leading-snug font-semibold whitespace-pre-wrap"
            style={{
              textShadow: "0 2px 8px rgba(0,0,0,0.7), 0 0 2px rgba(0,0,0,0.9)",
            }}
          >
            {message}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-white flex items-center justify-center text-[11px] font-bold">
                {userName.charAt(0)}
              </div>
              <div>
                <p className="text-[12px] font-semibold text-white flex items-center gap-1">
                  {userName}
                  {isOperator && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white text-black">
                      운영자
                    </span>
                  )}
                  {isMe && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-400 text-black">
                      나
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-white/70 mono">{hourLabel}</p>
              </div>
            </div>
            {isMe && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="text-white/70 hover:text-rose-300 p-1.5 rounded-full hover:bg-white/10 disabled:opacity-50"
                aria-label="삭제"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

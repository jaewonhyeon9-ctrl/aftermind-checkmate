"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

/**
 * 카카오톡 / 페이스북 / 인스타 등 인앱 브라우저에서 외부 브라우저로 유도.
 * - 캐시 + 일부 Web API 제한이 심해서 반드시 외부 브라우저 권장.
 */
export function InAppBrowserBanner() {
  const [info, setInfo] = useState<{ kind: string } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent || "";
    let kind: string | null = null;
    if (/KAKAOTALK/i.test(ua)) kind = "카카오톡";
    else if (/NAVER\(inapp/i.test(ua) || /; Whale\//.test(ua)) kind = "네이버";
    else if (/FBAN|FBAV/i.test(ua)) kind = "페이스북";
    else if (/Instagram/i.test(ua)) kind = "인스타그램";
    else if (/Line\//i.test(ua)) kind = "라인";
    if (kind) setInfo({ kind });
  }, []);

  if (!info) return null;

  function openExternal() {
    if (typeof window === "undefined") return;
    const url = window.location.href;

    if (info?.kind === "카카오톡") {
      // 카카오톡 외부 브라우저 호출
      window.location.href =
        "kakaotalk://web/openExternal?url=" + encodeURIComponent(url);
      return;
    }

    // 안드로이드 intent (Chrome 우선)
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      window.location.href =
        "intent://" +
        url.replace(/^https?:\/\//, "") +
        "#Intent;scheme=https;package=com.android.chrome;end";
      return;
    }

    // 그 외(iOS 등)는 안내만
    alert(
      `${info?.kind} 인앱 브라우저는 일부 기능이 제한돼요.\n` +
        `우측 상단 ⋯ 메뉴 → "Safari/Chrome으로 열기"를 눌러주세요.`
    );
  }

  return (
    <div className="bg-amber-100 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3">
      <p className="text-[11px] text-amber-900 leading-tight">
        <span className="font-semibold">{info.kind} 인앱 브라우저</span>에서는
        일부 기능이 제한돼요.{" "}
        <span className="text-amber-700">외부 브라우저 권장</span>
      </p>
      <button
        type="button"
        onClick={openExternal}
        className="flex-shrink-0 inline-flex items-center gap-1 rounded-md bg-amber-900 text-white px-2.5 py-1.5 text-[11px] font-semibold hover:bg-amber-800"
      >
        <ExternalLink size={11} /> 열기
      </button>
    </div>
  );
}

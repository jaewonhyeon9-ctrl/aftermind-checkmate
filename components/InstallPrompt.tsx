"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "android-chrome" | "ios-safari" | "ios-chrome" | "desktop" | "other";

export function InstallPrompt({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [bip, setBip] = useState<BIPEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>("other");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 이미 설치된 경우 (PWA 모드로 실행 중)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) {
      if (/CriOS/i.test(ua)) setPlatform("ios-chrome");
      else setPlatform("ios-safari");
    } else if (/Android/i.test(ua)) {
      setPlatform("android-chrome");
    } else {
      setPlatform("desktop");
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setBip(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!open || installed) return null;

  async function install() {
    if (!bip) return;
    await bip.prompt();
    const { outcome } = await bip.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-white text-slate-900 p-5 space-y-4 shadow-2xl"
      >
        <header className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center">
              <Download size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold">홈 화면에 설치</h3>
              <p className="text-[11px] text-slate-500">앱처럼 빠르게 실행하세요</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </header>

        {(platform === "android-chrome" || platform === "desktop") && bip && (
          <button
            type="button"
            onClick={install}
            className="w-full rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20"
          >
            바로 설치하기
          </button>
        )}

        {(platform === "android-chrome" || platform === "desktop") && !bip && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-700 space-y-2">
            <p>
              <span className="font-semibold">{platform === "desktop" ? "데스크톱" : "안드로이드"}</span>{" "}
              {platform === "desktop"
                ? "Chrome / Edge에서:"
                : "Chrome 브라우저에서:"}
            </p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>주소창 옆 ⋯ (또는 ⋮) 메뉴 클릭</li>
              <li>
                <span className="font-semibold">"앱 설치"</span> 또는{" "}
                <span className="font-semibold">"홈 화면에 추가"</span> 선택
              </li>
            </ol>
          </div>
        )}

        {(platform === "ios-safari" || platform === "ios-chrome") && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-700 space-y-2">
            {platform === "ios-chrome" ? (
              <p className="text-amber-700 font-medium">
                ⚠️ iOS에선 <span className="font-semibold">Safari</span>로 열어야 설치 가능해요. Chrome 우측 상단 ⋯ → "Safari로 열기"
              </p>
            ) : (
              <>
                <p>iPhone Safari에서:</p>
                <ol className="list-decimal pl-4 space-y-1.5">
                  <li className="flex items-center gap-1">
                    하단 가운데 <Share size={13} className="inline mx-0.5" /> 공유 버튼 누르기
                  </li>
                  <li className="flex items-center gap-1">
                    아래로 스크롤 →{" "}
                    <span className="font-semibold mx-0.5 inline-flex items-center gap-0.5">
                      <Plus size={11} className="border border-slate-400 rounded p-0.5" /> "홈 화면에 추가"
                    </span>{" "}
                    선택
                  </li>
                  <li>"추가" 버튼 → 홈 화면에 체크메이트 아이콘 생김</li>
                </ol>
              </>
            )}
          </div>
        )}

        <p className="text-center text-[10px] text-slate-400">
          설치하면 홈 화면 아이콘에서 바로 열리고, 알림도 더 잘 와요.
        </p>
      </div>
    </div>
  );
}

/** /me 페이지에 표시할 트리거 버튼 + 모달 */
export function InstallButton() {
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (isStandalone) setInstalled(true);
  }, []);

  if (installed) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center gap-1.5"
      >
        <Download size={14} /> 홈 화면에 설치하기
      </button>
      <InstallPrompt open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** 회원가입 직후 자동 표시 (URL의 ?welcome=1 query 감지) */
export function WelcomeInstallPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") {
      setOpen(true);
      // URL에서 welcome 파라미터 제거 (재방문 시 다시 안 뜨게)
      const url = new URL(window.location.href);
      url.searchParams.delete("welcome");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  return <InstallPrompt open={open} onClose={() => setOpen(false)} />;
}

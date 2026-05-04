"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

type State = "loading" | "unsupported" | "denied" | "subscribed" | "off";

export function PushSubscribeButton() {
  const [state, setState] = useState<State>("loading");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "subscribed" : "off");
    } catch {
      setState("off");
    }
  }

  async function subscribe() {
    setError(null);
    setPending(true);
    try {
      // 권한 요청
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        setPending(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        });
      }

      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh,
          authKey: json.keys?.auth,
          userAgent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "구독 저장 실패");
      }
      setState("subscribed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "알림 활성화 실패");
    } finally {
      setPending(false);
    }
  }

  async function unsubscribe() {
    setPending(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
          method: "DELETE",
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch (e) {
      setError(e instanceof Error ? e.message : "해제 실패");
    } finally {
      setPending(false);
    }
  }

  if (state === "loading") return null;

  if (state === "unsupported") {
    return (
      <div className="text-[11px] text-slate-500 text-center py-2">
        이 브라우저는 푸시 알림을 지원하지 않아요.
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-[11px] text-amber-800">
        알림이 차단돼 있어요. 브라우저 설정 → 사이트 권한 → 알림 허용으로 바꿔주세요.
      </div>
    );
  }

  if (state === "subscribed") {
    return (
      <div className="space-y-1">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 px-3 py-2 text-xs text-emerald-700 inline-flex items-center gap-1.5 w-full">
          <Check size={13} /> 푸시 알림 활성화됨 — 매일 22시 리마인드
        </div>
        <button
          type="button"
          onClick={unsubscribe}
          disabled={pending}
          className="w-full text-[11px] text-slate-500 hover:text-red-600 inline-flex items-center justify-center gap-1 py-1"
        >
          <BellOff size={11} /> 알림 끄기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={subscribe}
        disabled={pending}
        className="w-full rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        <Bell size={14} /> {pending ? "활성화 중…" : "푸시 알림 켜기"}
      </button>
      {error && <p className="text-[11px] text-red-600 text-center">{error}</p>}
    </div>
  );
}

function urlBase64ToUint8Array(b64: string): Uint8Array {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

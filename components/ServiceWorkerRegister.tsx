"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // 프로덕션에서만 등록
    if (window.location.hostname === "localhost") return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // 실패해도 무시 (인앱 브라우저 등에서 등록 안 됨)
    });
  }, []);
  return null;
}

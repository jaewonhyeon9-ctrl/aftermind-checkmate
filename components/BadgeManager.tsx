"use client";

import { useEffect } from "react";

type Props = {
  /** 배지에 표시할 숫자 (0이면 배지 제거). 보통 오늘 미완료 합계. */
  count: number;
};

/**
 * 앱 아이콘 배지 (위젯 흉내내기 C).
 *
 * iOS 16.4+ PWA, Android Chrome 등에서 navigator.setAppBadge 지원.
 * 페이지 마운트 시 / count 변경 시 자동 갱신.
 *
 * 이 컴포넌트가 마운트된 페이지(보통 /today)에 들어올 때마다 정확한 카운트 반영.
 * 백그라운드에서는 sw.js의 push 핸들러가 받은 payload.badge로 갱신.
 */
export function BadgeManager({ count }: Props) {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (count > 0 && nav.setAppBadge) {
      nav.setAppBadge(count).catch(() => {});
    } else if (nav.clearAppBadge) {
      nav.clearAppBadge().catch(() => {});
    }
  }, [count]);

  return null;
}

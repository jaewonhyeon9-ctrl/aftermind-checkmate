"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";

type Task = {
  id: string;
  title: string;
  startTime: string; // "HH:MM"
  completedAt: Date | null;
};

export function AlarmManager({ tasks }: { tasks: Task[] }) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  // 알림 스케줄링: 시작 시간 + 시작 후 20분 체크포인트
  useEffect(() => {
    if (permission !== "granted") return;
    const now = new Date();
    const timers: ReturnType<typeof setTimeout>[] = [];

    function schedule(taskId: string, atMs: number, build: () => Notification | undefined) {
      if (atMs <= 0 || atMs > 24 * 60 * 60 * 1000) return;
      const id = setTimeout(() => {
        // fire 직전 현재 task 상태 확인 — 이미 완료면 스킵
        const current = tasksRef.current.find((t) => t.id === taskId);
        if (current && current.completedAt) return;
        try {
          build();
        } catch {
          // ignore
        }
      }, atMs);
      timers.push(id);
    }

    for (const task of tasks) {
      if (task.completedAt) continue;
      const [h, m] = task.startTime.split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) continue;

      const start = new Date();
      start.setHours(h, m, 0, 0);
      const startMs = start.getTime() - now.getTime();
      const checkMs = startMs + 20 * 60 * 1000;

      schedule(task.id, startMs, () =>
        new Notification("⏱️ 체크메이트", {
          body: `"${task.title}" 시작 시간이에요. 화이팅!`,
          icon: "/icons/icon-192.png",
          tag: `task-start-${task.id}`,
        })
      );

      schedule(task.id, checkMs, () =>
        new Notification("🔥 잘 실행 중인가요?", {
          body: `"${task.title}" 시작 후 20분 — 진행 상황 어떠세요?`,
          icon: "/icons/icon-192.png",
          tag: `task-mid-${task.id}`,
        })
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [tasks, permission]);

  async function request() {
    if (permission === "unsupported") return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      try {
        new Notification("✅ 알람 활성화", {
          body: "타임라인 시작 시간에 알려드릴게요.",
          icon: "/icons/icon-192.png",
        });
      } catch {
        // ignore
      }
    }
  }

  if (permission === "unsupported") return null;
  if (permission === "granted") {
    return (
      <button
        type="button"
        title="알람 켜짐 (브라우저 탭이 열려있어야 동작)"
        className="inline-flex items-center gap-1 text-[11px] text-emerald-600"
      >
        <Bell size={12} /> 알람 ON
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={request}
      className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900"
    >
      <BellOff size={12} /> 알람 켜기
    </button>
  );
}

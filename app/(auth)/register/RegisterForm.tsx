"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  function startCooldown(sec: number) {
    setCooldown(sec);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 서버 admin API로 한 번에 생성 (rate limit 회피 + 이메일 확인 자동)
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = String(body.error ?? "회원가입에 실패했어요");
        // Supabase rate limit 메시지 감지
        const m = msg.match(/after\s+(\d+)\s+seconds/i);
        if (m) {
          const sec = Number(m[1]);
          setError(`보안상 잠시 후 다시 시도해주세요 (${sec}초)`);
          startCooldown(sec);
        } else {
          setError(msg);
        }
        setLoading(false);
        return;
      }

      // 즉시 로그인 (admin이 만들어둔 계정)
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push("/today?welcome=1");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "회원가입에 실패했어요");
      setLoading(false);
    }
  }

  const disabled = loading || cooldown > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">이름</span>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
          placeholder="홍길동"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">이메일</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
          placeholder="you@example.com"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">비밀번호</span>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
          placeholder="6자 이상"
        />
      </label>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30 hover:from-slate-800 disabled:opacity-50 transition-all"
      >
        {cooldown > 0 ? `잠시 후 다시 시도 (${cooldown}초)` : loading ? "가입 중…" : "회원가입"}
      </button>
    </form>
  );
}

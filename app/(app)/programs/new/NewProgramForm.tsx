"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProgram } from "./actions";

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

export function NewProgramForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("팀 이름을 입력해주세요");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError("URL 코드는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있어요");
      return;
    }
    startTransition(async () => {
      try {
        await createProgram({ name: name.trim(), slug });
        router.push("/today");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "생성 실패");
      }
    });
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
      <label className="block">
        <span className="text-xs text-slate-500">팀 이름</span>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="예: 1인기업가 3기"
          className="input mt-1"
        />
      </label>
      <label className="block">
        <span className="text-xs text-slate-500">가입 링크에 쓸 URL 코드 (영문 소문자·숫자·하이픈)</span>
        <input
          type="text"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value.toLowerCase());
          }}
          placeholder="예: solo-founder-3"
          className="input mt-1"
        />
        {slug && <p className="mt-1 text-[11px] text-slate-400">가입 링크: /join/{slug}</p>}
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 disabled:opacity-50"
      >
        {pending ? "만드는 중…" : "팀 만들기"}
      </button>
    </form>
  );
}

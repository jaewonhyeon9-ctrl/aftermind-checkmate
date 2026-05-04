"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({
  variant = "block",
}: {
  variant?: "block" | "icon";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    if (variant === "icon" && !confirm("로그아웃 할까요?")) return;
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        title="로그아웃"
        aria-label="로그아웃"
        className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
      >
        <LogOut size={16} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="w-full rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
    >
      <LogOut size={14} /> {pending ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
}

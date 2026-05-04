"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Handshake, GraduationCap, Coins, BarChart3 } from "lucide-react";

const tabs = [
  { href: "/team/contribute", label: "기여", icon: Handshake },
  { href: "/team/class", label: "수업", icon: GraduationCap },
  { href: "/team/coin", label: "코인", icon: Coins },
  { href: "/team/report", label: "리포트", icon: BarChart3 },
] as const;

export function TeamSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="z-20"
      style={{
        background: "linear-gradient(180deg, rgba(10,14,31,0.7), rgba(10,14,31,0.4))",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <ul className="flex max-w-md mx-auto px-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = pathname.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className="relative flex flex-col items-center justify-center py-3 gap-1 transition-all"
                style={{ color: active ? "var(--accent-cyan)" : "var(--fg-dim)" }}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-10 rounded-full"
                    style={{
                      background: "linear-gradient(90deg, transparent, #00e0ff, transparent)",
                      boxShadow: "0 0 12px rgba(0,224,255,0.7)",
                    }}
                  />
                )}
                <Icon
                  size={18}
                  strokeWidth={active ? 2.4 : 1.8}
                  style={
                    active ? { filter: "drop-shadow(0 0 6px rgba(0,224,255,0.6))" } : undefined
                  }
                />
                <span
                  className={"text-[11px] " + (active ? "font-semibold" : "")}
                  style={active ? { textShadow: "0 0 8px rgba(0,224,255,0.5)" } : undefined}
                >
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Users, Shield, User, Wallet, Handshake, Camera } from "lucide-react";
import clsx from "clsx";

type NavItem = {
  href: string;
  label: string;
  icon: typeof CalendarCheck;
  operatorOnly?: boolean;
};

const items: NavItem[] = [
  { href: "/today", label: "오늘", icon: CalendarCheck },
  { href: "/checkstagram", label: "체크스타그램", icon: Camera },
  { href: "/feed", label: "피드", icon: Users },
  { href: "/team", label: "팀", icon: Handshake },
  { href: "/money", label: "가계부", icon: Wallet },
  { href: "/operator", label: "운영자", icon: Shield, operatorOnly: true },
  { href: "/me", label: "내 기록", icon: User },
];

export function BottomNav({ isOperator }: { isOperator: boolean }) {
  const pathname = usePathname();

  const visible = items.filter((i) => !i.operatorOnly || isOperator);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]"
      style={{
        background: "linear-gradient(180deg, rgba(10,14,31,0.6), rgba(10,14,31,0.95))",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid var(--line)",
      }}
    >
      <ul className="flex justify-around max-w-md mx-auto">
        {visible.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={clsx(
                  "relative flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all"
                )}
                style={{
                  color: active ? "var(--accent-cyan)" : "var(--fg-dim)",
                }}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-10 rounded-full"
                    style={{
                      background: "linear-gradient(90deg, transparent, #00e0ff, transparent)",
                      boxShadow: "0 0 12px rgba(0,224,255,0.7)",
                    }}
                  />
                )}
                <Icon
                  size={22}
                  strokeWidth={active ? 2.4 : 1.8}
                  style={
                    active ? { filter: "drop-shadow(0 0 6px rgba(0,224,255,0.6))" } : undefined
                  }
                />
                <span
                  className={clsx("text-[11px]", active && "font-semibold")}
                  style={active ? { textShadow: "0 0 8px rgba(0,224,255,0.5)" } : undefined}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Home, Clock, Settings, ChevronDown } from "lucide-react";
import { getCurrentUser } from "@/lib/tenet/types";

const items = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/history", label: "Trade history", icon: Clock },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside className="w-[200px] shrink-0 bg-surface border-r border-border flex flex-col">
        <div className="px-5 py-5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal inline-block" />
          <span className="text-[16px] font-semibold tracking-tight">Tenet</span>
        </div>
        <nav className="px-2 mt-2 flex flex-col gap-1">
          {items.map((it) => {
            const active = pathname === it.to || (it.to === "/home" && pathname === "/");
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-[14px] ${
                  active
                    ? "bg-[#F5F5F0] text-ink border-l-2 border-teal -ml-[2px] pl-[14px]"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-end px-6 border-b border-border bg-surface">
          <div className="flex items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-[#E8E8E0] text-ink text-[13px] font-semibold flex items-center justify-center">
              AC
            </div>
            <ChevronDown className="w-4 h-4 text-ink-secondary" />
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

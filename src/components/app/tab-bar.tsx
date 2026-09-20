"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookText, CircleCheck, NotebookText, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/check", label: "Check", icon: CircleCheck },
  { href: "/journal", label: "Journal", icon: NotebookText },
  { href: "/rulebook", label: "Rulebook", icon: BookText },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal },
];

/** Bottom navigation for phones; the rail takes over from md upwards. */
export function TabBar() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="grid shrink-0 grid-cols-4 border-t border-white/[.06] bg-[#08080a] pb-[env(safe-area-inset-bottom)] md:hidden">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("flex h-14 flex-col items-center justify-center gap-1 text-[11px]", active ? "text-ink" : "text-ink-muted")}
          >
            <Icon className="size-5" strokeWidth={1.6} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

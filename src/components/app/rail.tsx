"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookText, CircleCheck, NotebookText, SlidersHorizontal } from "lucide-react";
import { LogoMark } from "@/components/app/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/check", label: "Check a trade", icon: CircleCheck },
  { href: "/journal", label: "Journal", icon: NotebookText },
  { href: "/rulebook", label: "Rulebook", icon: BookText },
];

function RailLink({ href, label, icon: Icon }: (typeof NAV)[number]) {
  const path = usePathname();
  const active = path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex size-11 items-center justify-center rounded-md transition-colors duration-200",
        active ? "bg-surface-raised text-ink ring-1 ring-inset ring-white/[.06]" : "text-ink-muted hover:bg-surface-raised hover:text-ink",
      )}
    >
      {active && <span className="absolute -left-4 top-3 h-5 w-[3px] rounded-r-[3px] bg-brand" />}
      <Icon className="size-5" strokeWidth={1.6} />
      <span className="pointer-events-none absolute left-[58px] top-1/2 z-10 -translate-x-1.5 -translate-y-1/2 whitespace-nowrap rounded-[8px] border border-white/[.08] bg-[#1b1b22] px-2.5 py-1.5 text-xs text-ink opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
        {label}
      </span>
    </Link>
  );
}

export function Rail({ initials }: { initials: string }) {
  return (
    <aside className="hidden w-[76px] shrink-0 flex-col md:flex items-center gap-[22px] border-r border-white/[.06] bg-[#08080a] py-[18px]">
      <LogoMark />
      <nav aria-label="Main" className="flex flex-col gap-1.5">
        {NAV.map((n) => <RailLink key={n.href} {...n} />)}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-3.5">
        <RailLink href="/settings" label="Settings" icon={SlidersHorizontal} />
        <div className="flex size-9 items-center justify-center rounded-full bg-surface-raised text-xs font-semibold text-ink-soft ring-1 ring-inset ring-white/[.08]">
          {initials}
        </div>
      </div>
    </aside>
  );
}

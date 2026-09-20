import { Fragment } from "react";
import { LogoMark } from "@/components/app/logo";

export function PageHeader({ crumbs, children }: { crumbs: string[]; children?: React.ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/[.06] px-4 md:h-[60px] md:gap-3 md:px-6">
      <span className="md:hidden"><LogoMark size={28} /></span>
      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        {crumbs.map((c, i) => (
          <Fragment key={c}>
            {i > 0 && <span className="hidden text-[#4a4a52] md:inline">/</span>}
            <span className={i === crumbs.length - 1 ? "truncate font-medium" : "hidden text-ink-muted md:inline"}>{c}</span>
          </Fragment>
        ))}
      </div>
      {children}
    </header>
  );
}

export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex flex-1 p-3 md:p-6">
      <div className="onyx-card flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
        <span className="text-xs font-semibold tracking-[0.1em] text-ink-muted">IN THE NEXT BUILD PHASE</span>
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h1>
        <p className="max-w-md text-sm leading-relaxed text-ink-soft">{body}</p>
      </div>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveRulebook, getVersions } from "@/lib/tenet/queries";
import { SECTIONS } from "@/lib/tenet/rulebook";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Rulebook" };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export default async function RulebookPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const supabase = await createClient();
  const [active, versions, sp] = await Promise.all([getActiveRulebook(supabase), getVersions(supabase), searchParams]);
  if (!active) redirect("/rulebook/new");
  const hard = active.rules.filter((r) => r.kind === "hard").length;

  return (
    <>
      <PageHeader crumbs={["Rulebook"]}>
        <span className="num hidden rounded-full bg-go/10 px-2.5 py-0.5 text-xs text-go sm:inline">v{active.version} · active</span>
        <Button asChild size="sm" variant="secondary"><Link href="/rulebook/new"><span className="sm:hidden">Import</span><span className="hidden sm:inline">Upload new version</span></Link></Button>
        <Button asChild size="sm"><Link href="/rulebook/edit">Edit rules</Link></Button>
      </PageHeader>
      <main className="flex min-h-0 flex-1 gap-5 p-3 md:p-6 md:pt-5">
        <section className="flex min-w-0 flex-1 flex-col gap-3.5">
          {sp.saved && (
            <div className="flex items-center gap-3 rounded-lg bg-go/[.06] px-[18px] py-3 text-sm ring-1 ring-inset ring-go/20">
              <CircleCheck className="size-4 text-go" />
              <span className="flex-1">Saved as version {active.version}. New checks use these rules.</span>
              <Button asChild size="sm"><Link href="/check">Check a trade</Link></Button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-ink-soft">
            <span>Active since {fmt(active.created_at)}</span>
            <span className="text-[#4a4a52]">·</span>
            <span>{hard} hard, {active.rules.length - hard} soft</span>
            {active.source_filename && (<><span className="text-[#4a4a52]">·</span><span>from {active.source_filename === "Pasted text" ? "pasted text" : active.source_filename}</span></>)}
          </div>
          <div className="onyx-card flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2 md:px-[18px]">
            {SECTIONS.map((s) => {
              const list = active.rules.filter((r) => r.section === s.key);
              if (!list.length) return null;
              return (
                <div key={s.key} className="flex flex-col gap-0.5 border-b border-white/5 py-3 last:border-0">
                  <span className="px-1 pb-1.5 text-sm font-semibold tracking-[-0.01em]">{s.label}</span>
                  {list.map((r) => (
                    <div key={r.code} className="flex items-center gap-3 rounded-md px-1 py-2">
                      <span className="num w-7 shrink-0 text-xs text-ink-muted">{r.code}</span>
                      <span className="flex-1 text-sm leading-snug">{r.body}</span>
                      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", r.kind === "hard" ? "bg-surface-raised text-[#e4e4e8]" : "bg-brand/[.12] text-brand-soft")}>
                        {r.kind === "hard" ? "Hard" : "Soft"}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
        <aside className="onyx-card hidden w-[360px] shrink-0 flex-col gap-3 overflow-y-auto p-[18px] lg:flex">
          <span className="text-xs font-semibold tracking-[0.1em] text-ink-muted">VERSIONS</span>
          {versions.map((v) => (
            <div key={v.id} className={cn("flex flex-col gap-1 rounded-md px-3.5 py-3 ring-1 ring-inset ring-white/[.06]", v.is_active ? "bg-surface-raised" : "bg-field")}>
              <div className="flex items-center justify-between">
                <span className="num text-sm font-medium">v{v.version}</span>
                <span className={cn("text-xs", v.is_active ? "text-go" : "text-ink-muted")}>{v.is_active ? "Active" : "Retired"}</span>
              </div>
              <span className="text-xs text-ink-muted">
                {fmt(v.created_at)} · {v.source === "upload" ? "uploaded" : "edited"} · {v.checkCount} check{v.checkCount === 1 ? "" : "s"}
              </span>
            </div>
          ))}
          <p className="text-xs leading-relaxed text-ink-muted">Opening a past check shows the rules exactly as they were then.</p>
        </aside>
      </main>
    </>
  );
}

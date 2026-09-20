import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveRulebook, getTimezone, getUsage } from "@/lib/tenet/queries";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Settings" };

function Row({ k, children, action }: { k: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-t border-white/5 py-3.5">
      <span className="w-44 shrink-0 text-sm text-ink-soft">{k}</span>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
      {action}
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="onyx-card flex flex-col px-[22px] pb-1.5 pt-[18px]">
      <div className="flex flex-col gap-0.5 pb-3">
        <h2 className="text-base font-semibold tracking-[-0.01em]">{title}</h2>
        {sub && <span className="text-[13px] text-ink-muted">{sub}</span>}
      </div>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data }, usage, tz, active] = await Promise.all([supabase.auth.getUser(), getUsage(supabase), getTimezone(supabase), getActiveRulebook(supabase)]);
  const user = data.user;
  const providers = (user?.app_metadata?.providers as string[] | undefined) ?? [];
  const pct = Math.min(100, Math.round((usage.used / Math.max(usage.limit, 1)) * 100));

  return (
    <>
      <PageHeader crumbs={["Settings"]} />
      <main className="grid flex-1 content-start gap-4 overflow-y-auto p-6 lg:grid-cols-2">
        <Card title="Account">
          <Row k="Email">{user?.email}</Row>
          <Row k="Name">{(user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string) || "Not set"}</Row>
          <Row k="Sign-in">{providers.includes("google") ? (providers.includes("email") ? "Email and Google" : "Google") : "Email and password"}</Row>
          <Row k="Time zone">{tz}</Row>
          <Row k="Session" action={<form action="/auth/signout" method="post"><Button type="submit" size="sm" variant="secondary">Sign out</Button></form>}>Signed in</Row>
        </Card>
        <Card title="Usage" sub="Counted on the server, per account.">
          <Row k="Checks today">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between"><span className="num">{usage.used} of {usage.limit}</span><span className="text-xs text-ink-muted">Resets at midnight, {tz}</span></div>
              <div className="h-1.5 overflow-hidden rounded bg-white/[.06]"><div className="h-full rounded bg-brand" style={{ width: `${pct}%` }} /></div>
            </div>
          </Row>
          <Row k="What counts">Every message Tenet evaluates, including answers to its questions.</Row>
        </Card>
        <Card title="Rulebook">
          <Row k="Active version" action={<Button asChild size="sm" variant="secondary"><Link href="/rulebook">Open</Link></Button>}>
            {active ? <><span className="num">v{active.version}</span> · {active.rules.length} rules</> : "None yet"}
          </Row>
        </Card>
        <Card title="Your data">
          <Row k="Export" action={<Button asChild size="sm" variant="secondary"><a href="/api/export" download>Download CSV</a></Button>}>All checks, verdicts and decisions</Row>
        </Card>
      </main>
    </>
  );
}

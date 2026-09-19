import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  return (
    <>
      <PageHeader crumbs={["Settings"]} />
      <main className="grid flex-1 content-start gap-4 p-6 lg:grid-cols-2">
        <section className="onyx-card flex flex-col px-[22px] pb-1.5 pt-[18px]">
          <h2 className="pb-3 text-base font-semibold tracking-[-0.01em]">Account</h2>
          {[
            ["Email", user?.email ?? ""],
            ["Name", (user?.user_metadata?.full_name as string) || "Not set"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center gap-4 border-t border-white/5 py-3.5">
              <span className="w-44 shrink-0 text-sm text-ink-soft">{k}</span>
              <span className="flex-1 text-sm">{v}</span>
            </div>
          ))}
          <div className="flex items-center gap-4 border-t border-white/5 py-3.5">
            <span className="w-44 shrink-0 text-sm text-ink-soft">Session</span>
            <span className="flex-1 text-sm">Signed in</span>
            <form action="/auth/signout" method="post">
              <Button type="submit" size="sm" variant="secondary">Sign out</Button>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}

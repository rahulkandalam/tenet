import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveRulebook, getUsage } from "@/lib/tenet/queries";
import { CheckHeader } from "@/components/check/check-header";
import { CheckView } from "@/components/check/check-view";

export const metadata = { title: "Check" };

export default async function CheckPage() {
  const supabase = await createClient();
  const [{ data: auth }, active, usage] = await Promise.all([supabase.auth.getUser(), getActiveRulebook(supabase), getUsage(supabase)]);
  if (!active) redirect("/rulebook/new");
  return (
    <>
      <CheckHeader crumbs={["Check", "New"]} used={usage.used} limit={usage.limit} />
      <CheckView
        key="new"
        userId={auth.user!.id}
        checkId={null}
        rulebookVersion={active.version}
        ruleCount={active.rules.length}
        initialMessages={[]}
        initialResult={null}
        initialCharts={[]}
        initialDecision={null}
        usage={usage}
      />
    </>
  );
}

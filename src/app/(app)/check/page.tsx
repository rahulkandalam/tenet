import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveRulebook } from "@/lib/tenet/queries";
import { PageHeader, ComingSoon } from "@/components/app/page-header";

export const metadata = { title: "Check" };

export default async function CheckPage() {
  const supabase = await createClient();
  const active = await getActiveRulebook(supabase);
  if (!active) redirect("/rulebook/new");
  return (
    <>
      <PageHeader crumbs={["Check"]} />
      <ComingSoon title="Talk a trade through" body={`Rulebook v${active.version} is ready with ${active.rules.length} rules. The chat check arrives in the next update.`} />
    </>
  );
}

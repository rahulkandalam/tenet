import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveRulebook, nextVersion } from "@/lib/tenet/queries";
import { newKey } from "@/lib/tenet/rulebook";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { RulebookEditor } from "@/components/rulebook/rulebook-editor";

export const metadata = { title: "Edit rulebook" };

export default async function EditRulebookPage() {
  const supabase = await createClient();
  const [active, version] = await Promise.all([getActiveRulebook(supabase), nextVersion(supabase)]);
  if (!active) redirect("/rulebook/new");
  return (
    <>
      <PageHeader crumbs={["Rulebook", `Edit v${active.version}`]}>
        <Button asChild size="sm" variant="secondary"><Link href="/rulebook">Cancel</Link></Button>
      </PageHeader>
      <RulebookEditor
        source="manual"
        nextVersion={version}
        rawText={null}
        initialRules={active.rules.map((r) => ({ key: newKey(), section: r.section, kind: r.kind, body: r.body }))}
      />
    </>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { nextVersion } from "@/lib/tenet/queries";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { NewRulebook } from "@/components/rulebook/new-rulebook";

export const metadata = { title: "New rulebook" };

export default async function NewRulebookPage() {
  const supabase = await createClient();
  const version = await nextVersion(supabase);
  return (
    <>
      <PageHeader crumbs={["Rulebook", "New rulebook"]}>
        {version > 1 && <Button asChild size="sm" variant="secondary"><Link href="/rulebook">Cancel</Link></Button>}
      </PageHeader>
      <NewRulebook nextVersion={version} />
    </>
  );
}

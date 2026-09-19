import Link from "next/link";
import { PageHeader, ComingSoon } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Rulebook" };

export default function RulebookPage() {
  return (
    <>
      <PageHeader crumbs={["Rulebook"]}>
        <Button asChild size="sm" variant="secondary"><Link href="/rulebook/new">New rulebook</Link></Button>
      </PageHeader>
      <ComingSoon title="Your numbered rules" body="Hard and soft rules in five sections, with version history. Past checks keep the version they ran against." />
    </>
  );
}

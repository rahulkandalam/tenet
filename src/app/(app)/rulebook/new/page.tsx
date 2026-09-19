import { PageHeader, ComingSoon } from "@/components/app/page-header";

export const metadata = { title: "New rulebook" };

export default function NewRulebookPage() {
  return (
    <>
      <PageHeader crumbs={["Rulebook", "New rulebook"]} />
      <ComingSoon title="Bring your rulebook" body="Upload a document and confirm the numbered rules Tenet finds, or build it section by section." />
    </>
  );
}

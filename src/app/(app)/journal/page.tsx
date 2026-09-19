import { PageHeader, ComingSoon } from "@/components/app/page-header";

export const metadata = { title: "Journal" };

export default function JournalPage() {
  return (
    <>
      <PageHeader crumbs={["Journal"]} />
      <ComingSoon title="Every check, with your decision" body="Checks save automatically. Filter by verdict and range, and open any check to see the full verdict." />
    </>
  );
}

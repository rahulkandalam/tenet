import { PageHeader, ComingSoon } from "@/components/app/page-header";

export const metadata = { title: "Check" };

export default function CheckPage() {
  return (
    <>
      <PageHeader crumbs={["Check"]} />
      <ComingSoon title="Talk a trade through" body="Describe the idea, attach charts, and Tenet asks for anything your rules need before it returns a verdict." />
    </>
  );
}

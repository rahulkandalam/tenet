import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCheck, getUsage } from "@/lib/tenet/queries";
import { EvalResponse } from "@/lib/tenet/eval";
import { CheckHeader } from "@/components/check/check-header";
import { CheckView } from "@/components/check/check-view";

export const metadata = { title: "Check" };

export default async function CheckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: auth }, data, usage] = await Promise.all([supabase.auth.getUser(), getCheck(supabase, id), getUsage(supabase)]);
  if (!data) notFound();
  const parsed = EvalResponse.safeParse(data.check.result);
  const plan = parsed.success ? parsed.data.extracted_plan : null;
  const title = [plan?.pair, plan?.direction?.toLowerCase()].filter(Boolean).join(" ") || "Check";

  // Charts attach to the first user message in the thread view.
  const firstUser = data.messages.findIndex((m) => m.role === "user");
  return (
    <>
      <CheckHeader crumbs={["Check", title]} used={usage.used} limit={usage.limit} />
      <CheckView
        key={id}
        userId={auth.user!.id}
        checkId={id}
        rulebookVersion={data.rulebookVersion}
        ruleCount={data.ruleCount}
        initialMessages={data.messages.map((m, i) => ({ role: m.role, content: m.content, charts: i === firstUser ? data.charts.map((c) => c.url) : undefined }))}
        initialResult={parsed.success ? parsed.data : null}
        initialCharts={data.charts}
        initialDecision={data.decision}
        usage={usage}
      />
    </>
  );
}

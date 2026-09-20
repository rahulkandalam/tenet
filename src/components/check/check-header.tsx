import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";

export function CheckHeader({ crumbs, used, limit }: { crumbs: string[]; used: number; limit: number }) {
  return (
    <PageHeader crumbs={crumbs}>
      <span className="num hidden h-[34px] items-center sm:flex gap-2 rounded-[10px] border border-white/[.08] bg-surface px-3 text-xs text-ink-soft">
        <span className="size-[7px] rounded-full bg-brand" />
        {used} / {limit} checks today
      </span>
      <Button asChild size="sm"><Link href="/check" aria-label="New check"><Plus /><span className="hidden sm:inline">New check</span></Link></Button>
    </PageHeader>
  );
}

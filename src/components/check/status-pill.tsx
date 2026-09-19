import { Check, CircleHelp, Ban, TriangleAlert } from "lucide-react";
import { TONE, type RuleTone } from "@/lib/tenet/eval";
import { cn } from "@/lib/utils";

const ICON = { met: Check, soft: TriangleAlert, broken: Ban, info: CircleHelp };

export function StatusPill({ tone, className }: { tone: RuleTone; className?: string }) {
  const Icon = ICON[tone];
  const t = TONE[tone];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", t.bg, t.fg, className)}>
      <Icon className="size-3" strokeWidth={2.4} />
      {t.label}
    </span>
  );
}

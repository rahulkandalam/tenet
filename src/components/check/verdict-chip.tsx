import { Ban, Check, CircleHelp, TriangleAlert } from "lucide-react";
import { VERDICT_STYLE, type Verdict } from "@/lib/tenet/eval";
import { cn } from "@/lib/utils";

const ICON: Record<Verdict, typeof Check> = { "GO AHEAD": Check, "PROCEED WITH CAUTION": TriangleAlert, "NO GO": Ban, PROMPT: CircleHelp };

export function VerdictChip({ verdict, className }: { verdict: Verdict; className?: string }) {
  const s = VERDICT_STYLE[verdict];
  const Icon = ICON[verdict];
  return (
    <span className={cn("inline-flex items-center gap-2 self-start rounded-full py-[5px] pl-[9px] pr-[11px] text-xs font-semibold tracking-[0.08em]", s.chip, s.fg, className)}>
      <Icon className="size-3.5" strokeWidth={2.2} />
      {s.label}
    </span>
  );
}

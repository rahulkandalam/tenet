import { Ban, BookText, Check, CircleHelp, FileUp, LineChart, Lock, MessageSquareText, Mic, NotebookText, ShieldOff, TriangleAlert } from "lucide-react";
import { LogoMark } from "@/components/app/logo";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: FileUp,
    title: "Bring your rulebook",
    body: "Upload a document, paste your notes or build it section by section. Tenet splits it into numbered rules (R1, R2…) and flags anything it had to interpret. Nothing is saved until you approve it.",
  },
  {
    icon: MessageSquareText,
    title: "Talk the trade through",
    body: "Describe the idea the way you would say it, type or speak, and attach up to three charts. If your rules need a detail you left out, Tenet asks for it instead of assuming.",
  },
  {
    icon: BookText,
    title: "Get a verdict against your rules",
    body: "Every rule is marked met, failed or can't tell, with the evidence quoted back from your plan and charts. Tenet never adds outside rules or “best practice”.",
  },
  {
    icon: NotebookText,
    title: "Log what you did",
    body: "Taken, skipped or overridden. The journal shows how often you follow the verdict, how often you override it, and which rule you miss most.",
  },
];

const VERDICTS = [
  { icon: Check, label: "GO AHEAD", cls: "text-go bg-go/[.12]", body: "Every hard rule is met. The execution is yours." },
  { icon: TriangleAlert, label: "PROCEED WITH CAUTION", cls: "text-caution bg-caution/[.12]", body: "The setup fits, but something needs confirming: a trigger, a soft rule, a small deviation." },
  { icon: Ban, label: "NO GO", cls: "text-nogo bg-nogo/[.12]", body: "A hard rule is broken. Tenet names the rule and quotes what broke it." },
  { icon: CircleHelp, label: "A QUESTION BACK", cls: "text-prompt bg-prompt/[.12]", body: "The plan is missing something your rules need. Answer it and the check continues." },
];

const PRINCIPLES = [
  { icon: BookText, title: "Your rules only", body: "Checks use the rulebook you approved, nothing else." },
  { icon: LineChart, title: "Reads your charts", body: "Charts are read as evidence, and contradictions are called out." },
  { icon: ShieldOff, title: "Never places orders", body: "No broker connection, no execution, no P&L predictions." },
  { icon: Lock, title: "Private by default", body: "Your rulebook, checks and charts are visible only to you." },
];

function Pill({ tone, children }: { tone: "met" | "broken" | "info"; children: React.ReactNode }) {
  const cls = { met: "text-go bg-go/10", broken: "text-nogo bg-nogo/[.12]", info: "text-prompt bg-prompt/[.12]" }[tone];
  const Icon = { met: Check, broken: Ban, info: CircleHelp }[tone];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", cls)}>
      <Icon className="size-3" strokeWidth={2.4} />
      {children}
    </span>
  );
}

/** Static illustration of a check, built from the same visual language as the app. */
function ProductPreview() {
  return (
    <div aria-hidden className="onyx-card grid grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(0,1fr)_260px]">
      <div className="flex flex-col gap-3 rounded-lg bg-[#08080a] p-4 ring-1 ring-inset ring-white/[.05]">
        <div className="max-w-[92%] self-end rounded-[14px_14px_4px_14px] bg-brand/[.12] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#e4e4e8] ring-1 ring-inset ring-brand/25">
          EURUSD is in a clear 4H uptrend and price is about to tap the demand order block. Planning to short it.
        </div>
        <div className="max-w-[92%] self-start rounded-[14px_14px_14px_4px] bg-[#121217] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#e4e4e8] ring-1 ring-inset ring-white/[.06]">
          <span className="mb-1 block text-[10px] font-semibold tracking-[0.08em] text-brand-soft">TENET</span>
          Your rules pair an uptrend with demand and longs. A short here crosses that pairing, so this fails R2 before we get to stop, target or risk.
        </div>
        <div className="mt-1 flex items-center gap-2 rounded-[12px] bg-field px-3 py-2.5 text-[12px] text-ink-muted ring-1 ring-inset ring-white/[.06]">
          <Mic className="size-3.5" /> Describe the trade, or attach a chart…
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 rounded-lg bg-nogo/[.06] px-3.5 py-3 ring-1 ring-inset ring-nogo/20">
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-nogo/[.14] px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-nogo">
            <Ban className="size-3" strokeWidth={2.2} /> NO GO
          </span>
          <span className="text-[12.5px] leading-snug text-[#e4e4e8]">Short in an uptrend at demand. Your rulebook maps this to a long.</span>
        </div>
        {[
          ["R1 · Market is trending", "met"],
          ["R2 · Entry at an open order block", "broken"],
          ["R3 · Stop beyond the block", "info"],
          ["R4 · Target is 2R", "info"],
        ].map(([label, tone]) => (
          <div key={label} className="flex items-center justify-between gap-2 border-b border-white/[.04] px-1 pb-2 last:border-0">
            <span className="truncate text-[12px] text-[#e4e4e8]">{label}</span>
            <Pill tone={tone as "met" | "broken" | "info"}>{tone === "met" ? "Met" : tone === "broken" ? "Broken" : "Can't tell"}</Pill>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="flex w-full max-w-[860px] flex-col gap-20 px-6 py-10 sm:px-12 lg:px-16 lg:py-12">
      <header className="hidden items-center gap-3 lg:flex">
        <LogoMark />
        <span className="text-lg font-semibold tracking-[-0.02em]">Tenet</span>
        <span className="text-[13px] text-ink-muted">by Stoic Traders Club</span>
      </header>

      <section className="flex flex-col gap-6">
        <span className="text-xs font-semibold tracking-[0.12em] text-brand-soft">A PRE-TRADE CHECK FOR DISCRETIONARY TRADERS</span>
        <h1 className="text-[44px] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-[56px]">Your rules, checked before every trade.</h1>
        <p className="max-w-[620px] text-[17px] leading-relaxed text-ink-soft">
          You wrote the rules when you were calm. Tenet holds you to them when you are not. Describe the trade before you enter and
          get a verdict against your own rulebook, with the exact rule that passed or broke.
        </p>
        <ProductPreview />
      </section>

      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold tracking-[0.12em] text-ink-muted">HOW IT WORKS</span>
          <h2 className="text-[32px] font-semibold tracking-[-0.035em]">Four steps, under a minute per trade.</h2>
        </div>
        <ol className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="onyx-card flex flex-col gap-3 p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-[10px] bg-surface-raised text-ink"><s.icon className="size-[18px]" strokeWidth={1.6} /></span>
                <span className="num text-xs text-ink-muted">0{i + 1}</span>
              </div>
              <span className="text-base font-semibold tracking-[-0.01em]">{s.title}</span>
              <p className="text-sm leading-relaxed text-ink-soft">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold tracking-[0.12em] text-ink-muted">THE VERDICTS</span>
          <h2 className="text-[32px] font-semibold tracking-[-0.035em]">Four clear answers.</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {VERDICTS.map((v) => (
            <div key={v.label} className="flex flex-col gap-3 rounded-lg bg-field p-5 ring-1 ring-inset ring-white/[.06]">
              <span className={cn("inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em]", v.cls)}>
                <v.icon className="size-3.5" strokeWidth={2.2} /> {v.label}
              </span>
              <p className="text-sm leading-relaxed text-ink-soft">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold tracking-[0.12em] text-ink-muted">WHAT TENET IS, AND ISN&rsquo;T</span>
          <h2 className="text-[32px] font-semibold tracking-[-0.035em]">A thesis check, not a signal service.</h2>
          <p className="max-w-[620px] text-[15px] leading-relaxed text-ink-soft">
            Tenet does not tell you what to trade. It tells you whether the trade you already want to take is the one your rulebook allows.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="flex gap-3.5">
              <p.icon className="mt-0.5 size-5 shrink-0 text-brand-soft" strokeWidth={1.6} />
              <div className="flex flex-col gap-1">
                <span className="text-[15px] font-medium">{p.title}</span>
                <span className="text-sm leading-relaxed text-ink-soft">{p.body}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="flex flex-col gap-2 border-t border-white/[.06] pt-6 text-xs leading-relaxed text-ink-muted">
        <span>Tenet is a discipline tool, not financial advice. It does not place trades or predict outcomes.</span>
        <span>© {new Date().getFullYear()} Stoic Traders Club</span>
      </footer>
    </div>
  );
}

import { LogoMark } from "@/components/app/logo";

const POINTS = [
  { title: "Your rules only", body: "No outside best practice. Every verdict cites your rule numbers." },
  { title: "Four clear verdicts", body: "Go ahead, proceed with caution, no go, or a question back." },
  { title: "Every decision logged", body: "Taken, skipped or overridden, kept in your journal." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <section className="hidden flex-1 flex-col gap-10 border-r border-white/[.06] px-16 py-12 lg:flex">
        <div className="flex items-center gap-3">
          <LogoMark />
          <span className="text-lg font-semibold tracking-[-0.02em]">Tenet</span>
          <span className="text-[13px] text-ink-muted">by Stoic Traders Club</span>
        </div>
        <div className="flex max-w-[640px] flex-col gap-[18px]">
          <h1 className="text-[52px] font-semibold leading-[1.04] tracking-[-0.04em]">
            Check the trade against your own rules before you take it.
          </h1>
          <p className="max-w-[560px] text-base leading-relaxed text-ink-soft">
            Describe the idea and attach your charts. Tenet reads them against the rulebook you wrote and returns a
            verdict. It never places orders and never predicts P&amp;L.
          </p>
        </div>
        <div className="mt-auto grid grid-cols-3 gap-8">
          {POINTS.map((p) => (
            <div key={p.title} className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{p.title}</span>
              <span className="text-[13px] leading-snug text-ink-soft">{p.body}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-[480px] lg:shrink-0">
        <div className="mx-auto w-full max-w-[384px]">{children}</div>
      </section>
    </div>
  );
}

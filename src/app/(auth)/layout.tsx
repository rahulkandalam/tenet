import type { Metadata } from "next";
import { Landing } from "@/components/app/landing";
import { LogoMark } from "@/components/app/logo";

export const metadata: Metadata = {
  title: "Tenet · Your rules, checked before every trade",
  description:
    "Describe a trade before you enter and get a verdict against your own rulebook: go ahead, proceed with caution, no go, or a question back. Built for discretionary traders.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col-reverse lg:h-dvh lg:flex-row lg:overflow-hidden">
      <section className="min-w-0 flex-1 border-white/[.06] lg:overflow-y-auto lg:border-r">
        <Landing />
      </section>
      <section className="flex w-full shrink-0 flex-col justify-center border-b border-white/[.06] px-6 py-12 sm:px-12 lg:w-[480px] lg:border-b-0">
        <div className="mx-auto mb-10 flex w-full max-w-[384px] items-center gap-3 lg:hidden">
          <LogoMark size={32} />
          <span className="text-base font-semibold tracking-[-0.02em]">Tenet</span>
        </div>
        <div className="mx-auto w-full max-w-[384px]">{children}</div>
        <span className="num mx-auto mt-10 hidden w-full max-w-[384px] text-xs text-ink-muted lg:block">tenet.stoictradersclub.com</span>
      </section>
    </div>
  );
}

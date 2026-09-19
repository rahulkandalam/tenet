export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-[11px] bg-ink font-bold tracking-[-0.04em] text-background"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.47) }}
      aria-hidden
    >
      T
    </div>
  );
}

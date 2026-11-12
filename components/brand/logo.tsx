/**
 * Celebra brand mark: a circle of people seen from above. Nine dots gather
 * into a C; the marigold dot is the guest who just said yes.
 */
const SEATS: [number, number][] = [
  [50, 87], [31.5, 82.04], [17.96, 68.5], [13, 50], [17.96, 31.5], [31.5, 17.96], [50, 13], [68.5, 17.96],
];
const YOU: [number, number] = [68.5, 82.04];

type Variant = "color" | "inverse" | "mono";

const PALETTE: Record<Variant, { ink: string; you: string; center: string; stroke?: string }> = {
  color: { ink: "var(--color-aubergine)", you: "var(--color-marigold)", center: "var(--color-blush)" },
  inverse: { ink: "var(--color-linen)", you: "var(--color-marigold)", center: "#4a3758" },
  mono: { ink: "currentColor", you: "currentColor", center: "none", stroke: "currentColor" },
};

export function Mark({ size = 32, variant = "color", className, animate = false }: { size?: number; variant?: Variant; className?: string; animate?: boolean }) {
  const c = PALETTE[variant];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <circle cx="50" cy="50" r="19" fill={c.center} stroke={c.stroke} strokeWidth={c.stroke ? 4 : undefined} />
      {SEATS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="8" fill={c.ink} />)}
      <circle cx={YOU[0]} cy={YOU[1]} r="8" fill={c.you} className={animate ? "brand-seat-in" : undefined} />
    </svg>
  );
}

export function Logo({ size = 28, variant = "color", className }: { size?: number; variant?: Variant; className?: string }) {
  const color = variant === "inverse" ? "text-linen" : variant === "mono" ? "" : "text-aubergine";
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <Mark size={size} variant={variant} />
      <span className={`font-display font-bold tracking-[-0.04em] leading-none ${color}`} style={{ fontSize: size * 0.78 }}>celebra</span>
    </span>
  );
}

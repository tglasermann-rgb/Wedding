import type { ComponentProps, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Button({ variant = "primary", size = "md", className, ...p }: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" }) {
  return (
    <button
      {...p}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm",
        variant === "primary" && "bg-stone-900 text-white hover:bg-stone-700",
        variant === "secondary" && "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
        variant === "ghost" && "text-stone-600 hover:bg-stone-100",
        variant === "danger" && "text-red-700 hover:bg-red-50",
        className,
      )}
    />
  );
}

export const inputCls = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200";

export function Input(p: ComponentProps<"input">) {
  return <input {...p} className={cx(inputCls, p.className)} />;
}
export function Textarea(p: ComponentProps<"textarea">) {
  return <textarea {...p} className={cx(inputCls, "min-h-24", p.className)} />;
}
export function Select(p: ComponentProps<"select">) {
  return <select {...p} className={cx(inputCls, p.className)} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-stone-600">{label}</span>
      {children}
      {hint && <span className="block text-xs text-stone-400">{hint}</span>}
    </label>
  );
}

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-xl border border-stone-200 bg-white p-5 shadow-sm", className)}>
      {(title || actions) && (
        <header className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="font-semibold text-stone-800">{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "green" | "red" | "amber" | "stone" }) {
  const tones = { green: "text-emerald-700", red: "text-red-700", amber: "text-amber-700", stone: "text-stone-900" };
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-stone-500">{label}</div>
      <div className={cx("mt-1 text-3xl font-semibold tabular-nums", tones[tone ?? "stone"])}>{value}</div>
      {sub && <div className="mt-1 text-xs text-stone-500">{sub}</div>}
    </div>
  );
}

const BADGE: Record<string, string> = {
  yes: "bg-emerald-100 text-emerald-800", no: "bg-red-100 text-red-800", maybe: "bg-amber-100 text-amber-800", pending: "bg-stone-100 text-stone-600",
  queued: "bg-stone-100 text-stone-600", sending: "bg-stone-100 text-stone-600", sent: "bg-sky-100 text-sky-800", delivered: "bg-indigo-100 text-indigo-800",
  opened: "bg-violet-100 text-violet-800", read: "bg-violet-100 text-violet-800", clicked: "bg-fuchsia-100 text-fuchsia-800", replied: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800", bounced: "bg-red-100 text-red-800", skipped: "bg-stone-100 text-stone-500",
  active: "bg-emerald-100 text-emerald-800", draft: "bg-stone-100 text-stone-600", archived: "bg-stone-200 text-stone-500",
};
export function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", BADGE[tone] ?? BADGE.pending)}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">{children}</div>;
}

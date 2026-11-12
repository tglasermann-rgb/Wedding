"use client";
import { useEffect, useState } from "react";

export function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return <div className="h-20" />;
  const diff = Math.max(0, new Date(target).getTime() - now);
  const parts = [
    [Math.floor(diff / 86_400_000), "días"], [Math.floor(diff / 3_600_000) % 24, "horas"],
    [Math.floor(diff / 60_000) % 60, "min"], [Math.floor(diff / 1000) % 60, "seg"],
  ] as const;
  return (
    <div className="flex justify-center gap-6 md:gap-10">
      {parts.map(([n, l]) => (
        <div key={l} className="text-center">
          <div className="text-4xl tabular-nums md:text-5xl" style={{ fontFamily: "var(--site-heading)" }}>{n}</div>
          <div className="text-xs uppercase tracking-widest opacity-60">{l}</div>
        </div>
      ))}
    </div>
  );
}

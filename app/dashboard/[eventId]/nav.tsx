"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["", "Overview"], ["/guests", "Guests"], ["/messages", "Messages"], ["/seating", "Seating"], ["/site", "Website"], ["/settings", "Settings"],
] as const;

export function EventNav({ eventId }: { eventId: string }) {
  const path = usePathname();
  const base = `/dashboard/${eventId}`;
  return (
    <nav className="no-print flex gap-1 overflow-x-auto">
      {TABS.map(([href, label]) => {
        const active = href === "" ? path === base : path.startsWith(base + href);
        return (
          <Link key={href} href={base + href} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm ${active ? "bg-aubergine font-medium text-linen" : "text-stone-600 hover:bg-stone-100"}`}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

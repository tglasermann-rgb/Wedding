import Link from "next/link";
import { requireEvent } from "@/lib/auth";
import { EVENT_TYPES } from "@/lib/event-types";
import { Badge } from "@/components/ui";
import { EventNav } from "./nav";

export default async function EventLayout({ children, params }: { children: React.ReactNode; params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { event } = await requireEvent(eventId);
  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="font-serif text-xl font-semibold">Celebra</Link>
            <span className="text-stone-300">/</span>
            <span className="font-medium">{event.title}</span>
            <span className="text-xs text-stone-500">{EVENT_TYPES[event.type].label}</span>
            {event.status !== "active" && <Badge tone={event.status}>{event.status === "draft" ? "Draft — sending disabled" : "Archived"}</Badge>}
          </div>
          <a href={`/${event.slug}`} target="_blank" className="text-sm underline">View website ↗</a>
        </div>
        <div className="mx-auto max-w-7xl px-6 pb-2"><EventNav eventId={event.id} /></div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}

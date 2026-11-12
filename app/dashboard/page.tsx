import Link from "next/link";
import { isPlatformAdmin, requireUser } from "@/lib/auth";
import { EVENT_TYPES } from "@/lib/event-types";
import type { EventRow } from "@/lib/types";
import { Badge, Empty } from "@/components/ui";
import { Logo } from "@/components/brand/logo";
import { signOut } from "./actions";

const STATUS = { active: "Active", draft: "Draft", archived: "Archived" };

export default async function DashboardHome() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("events").select("*").order("event_date", { ascending: true });
  const events = (data ?? []) as EventRow[];
  const admin = await isPlatformAdmin();
  if (events.length === 1 && !admin) {
    const { redirect } = await import("next/navigation");
    redirect(`/dashboard/${events[0].id}`);
  }
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4"><Logo size={26} /><span className="text-stone-300">/</span><h1 className="font-display text-2xl font-bold tracking-tight">My events</h1></div>
        <div className="flex items-center gap-3 text-sm">
          {admin && <Link href="/admin" className="underline">Super-admin</Link>}
          <span className="text-stone-500">{user.email}</span>
          <form action={signOut}><button className="underline">Log out</button></form>
        </div>
      </div>
      <div className="mt-8 grid gap-3">
        {events.length === 0 && <Empty>You don’t have any events yet. Your event will appear here as soon as it’s activated.</Empty>}
        {events.map((e) => (
          <Link key={e.id} href={`/dashboard/${e.id}`} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-5 hover:border-stone-400">
            <div>
              <div className="font-semibold">{e.title}</div>
              <div className="text-sm text-stone-500">{EVENT_TYPES[e.type].label} · {e.event_date ?? "no date yet"} · /{e.slug}</div>
            </div>
            <Badge tone={e.status}>{STATUS[e.status]}</Badge>
          </Link>
        ))}
      </div>
    </main>
  );
}

import Link from "next/link";
import { isPlatformAdmin, requireUser } from "@/lib/auth";
import { EVENT_TYPES } from "@/lib/event-types";
import type { EventRow } from "@/lib/types";
import { Badge, Empty } from "@/components/ui";
import { signOut } from "./actions";

const STATUS = { active: "Activo", draft: "Borrador", archived: "Archivado" };

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
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Mis eventos</h1>
        <div className="flex items-center gap-3 text-sm">
          {admin && <Link href="/admin" className="underline">Super-admin</Link>}
          <span className="text-stone-500">{user.email}</span>
          <form action={signOut}><button className="underline">Salir</button></form>
        </div>
      </div>
      <div className="mt-8 grid gap-3">
        {events.length === 0 && <Empty>Aún no tienes eventos. Cuando se active tu evento, aparecerá aquí.</Empty>}
        {events.map((e) => (
          <Link key={e.id} href={`/dashboard/${e.id}`} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-5 hover:border-stone-400">
            <div>
              <div className="font-semibold">{e.title}</div>
              <div className="text-sm text-stone-500">{EVENT_TYPES[e.type].label} · {e.event_date ?? "sin fecha"} · /{e.slug}</div>
            </div>
            <Badge tone={e.status}>{STATUS[e.status]}</Badge>
          </Link>
        ))}
      </div>
    </main>
  );
}

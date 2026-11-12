import { requireEvent } from "@/lib/auth";
import { PrintButton } from "./print-button";

export default async function SeatingPrint({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { supabase, event } = await requireEvent(eventId);
  const [{ data: tables }, { data: seats }] = await Promise.all([
    supabase.from("seating_tables").select("id,label,capacity").eq("event_id", eventId),
    supabase.from("seat_assignments").select("table_id, seat_index, guest:guests(first_name,last_name)").eq("event_id", eventId),
  ]);
  const name = (g: unknown) => { const x = g as { first_name: string; last_name: string | null }; return `${x.first_name} ${x.last_name ?? ""}`.trim(); };
  const sorted = [...(tables ?? [])].sort((a, b) => a.label.localeCompare(b.label, "en-US", { numeric: true }));
  const label = new Map(sorted.map((t) => [t.id, t.label]));
  const alpha = (seats ?? []).map((s) => ({ name: name(s.guest), table: label.get(s.table_id) ?? "" })).sort((a, b) => a.name.localeCompare(b.name, "en-US"));

  return (
    <div className="space-y-8 bg-white p-6">
      <div className="flex items-center justify-between"><h1 className="font-display text-3xl font-bold tracking-tight">{event.title} — Tables</h1><PrintButton /></div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {sorted.map((t) => {
          const at = (seats ?? []).filter((s) => s.table_id === t.id);
          return (
            <div key={t.id} className="break-inside-avoid rounded border border-stone-300 p-3">
              <div className="font-semibold">{t.label} <span className="text-xs text-stone-500">({at.length}/{t.capacity})</span></div>
              <ul className="mt-1 text-sm">{at.map((s, i) => <li key={i}>{name(s.guest)}</li>)}</ul>
            </div>
          );
        })}
      </div>
      <div style={{ breakBefore: "page" }}>
        <h2 className="mb-3 font-display text-2xl font-semibold">Find your seat</h2>
        <div className="columns-2 text-sm md:columns-3">{alpha.map((a, i) => <div key={i} className="flex justify-between gap-2 border-b border-dotted py-0.5"><span>{a.name}</span><b>{a.table}</b></div>)}</div>
      </div>
    </div>
  );
}

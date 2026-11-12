import Link from "next/link";
import { requireEvent } from "@/lib/auth";
import { loadGuests } from "@/lib/data";
import { guestStatus } from "@/lib/messaging/audience";
import type { SeatAssignmentRow, SeatingConstraintRow, SeatingTableRow } from "@/lib/types";
import { EditorLoader } from "./editor-loader";

export default async function SeatingPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { supabase, canEdit } = await requireEvent(eventId);
  let { data: layout } = await supabase.from("venue_layouts").select("*").eq("event_id", eventId).order("created_at").limit(1).maybeSingle();
  if (!layout && canEdit) ({ data: layout } = await supabase.from("venue_layouts").insert({ event_id: eventId }).select("*").single());
  if (!layout) return <p>No hay salón configurado.</p>;

  const [guests, { data: tables }, { data: assignments }, { data: constraints }] = await Promise.all([
    loadGuests(supabase, eventId),
    supabase.from("seating_tables").select("*").eq("layout_id", layout.id),
    supabase.from("seat_assignments").select("*").eq("layout_id", layout.id),
    supabase.from("seating_constraints").select("*").eq("event_id", eventId),
  ]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Link href={`/dashboard/${eventId}/seating/print`} className="text-sm underline">Imprimir lista de mesas</Link></div>
      <EditorLoader
        eventId={eventId}
        layout={{ id: layout.id, width: layout.width, height: layout.height }}
        canEdit={canEdit}
        guests={guests.map((g) => ({
          id: g.id, name: `${g.first_name} ${g.last_name ?? ""}`.trim(), householdId: g.household_id, household: g.household.name,
          status: guestStatus(g), isChild: g.is_child, tags: g.household.tags,
        }))}
        initialTables={(tables ?? []) as SeatingTableRow[]}
        initialAssignments={(assignments ?? []) as SeatAssignmentRow[]}
        initialConstraints={(constraints ?? []) as SeatingConstraintRow[]}
      />
    </div>
  );
}

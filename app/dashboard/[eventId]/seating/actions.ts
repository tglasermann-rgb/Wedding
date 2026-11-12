"use server";
import { z } from "zod";
import { requireEvent } from "@/lib/auth";
import type { SeatingTableRow } from "@/lib/types";

export async function addTable(eventId: string, layoutId: string, input: { shape: "round" | "square" | "rect"; capacity: number; x: number; y: number; label: string }) {
  const { supabase } = await requireEvent(eventId, { edit: true });
  const { data, error } = await supabase.from("seating_tables").insert({ ...input, layout_id: layoutId, event_id: eventId }).select("*").single();
  if (error) throw new Error(error.message);
  return data as SeatingTableRow;
}

const tablePatch = z.object({
  label: z.string().min(1).max(40).optional(),
  capacity: z.number().int().min(1).max(40).optional(),
  shape: z.enum(["round", "square", "rect"]).optional(),
  x: z.number().optional(), y: z.number().optional(), rotation: z.number().optional(),
});

export async function updateTable(eventId: string, id: string, patch: z.infer<typeof tablePatch>) {
  const { supabase } = await requireEvent(eventId, { edit: true });
  const { error } = await supabase.from("seating_tables").update(tablePatch.parse(patch)).eq("id", id).eq("event_id", eventId);
  if (error) throw new Error(error.message);
}

export async function deleteTable(eventId: string, id: string) {
  const { supabase } = await requireEvent(eventId, { edit: true });
  await supabase.from("seating_tables").delete().eq("id", id).eq("event_id", eventId);
}

/** Assign (tableId) or unassign (null) a guest. */
export async function assignGuest(eventId: string, layoutId: string, guestId: string, tableId: string | null, seatIndex: number | null) {
  const { supabase } = await requireEvent(eventId, { edit: true });
  if (!tableId) {
    await supabase.from("seat_assignments").delete().eq("layout_id", layoutId).eq("guest_id", guestId);
    return;
  }
  const { error } = await supabase.from("seat_assignments").upsert({ layout_id: layoutId, guest_id: guestId, table_id: tableId, event_id: eventId, seat_index: seatIndex });
  if (error) throw new Error(error.message);
}

export async function addConstraint(eventId: string, kind: "together" | "apart", a: string, b: string) {
  const { supabase } = await requireEvent(eventId, { edit: true });
  const { data, error } = await supabase.from("seating_constraints").insert({ event_id: eventId, kind, guest_a: a, guest_b: b }).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteConstraint(eventId: string, id: string) {
  const { supabase } = await requireEvent(eventId, { edit: true });
  await supabase.from("seating_constraints").delete().eq("id", id).eq("event_id", eventId);
}

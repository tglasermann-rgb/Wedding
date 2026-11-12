import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { EventRow, MemberRole } from "./types";

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_platform_admin");
  return data === true;
}

export async function requireAdmin() {
  const ctx = await requireUser();
  if (!(await isPlatformAdmin())) notFound();
  return ctx;
}

/** Loads an event the current user can access (RLS enforces membership). */
export async function requireEvent(eventId: string, opts: { edit?: boolean } = {}) {
  const { supabase, user } = await requireUser();
  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle<EventRow>();
  if (!event) notFound();
  const { data: role } = await supabase.rpc("event_role", { eid: eventId });
  const admin = await isPlatformAdmin();
  const canEdit = admin || role === "owner" || role === "editor";
  if (opts.edit && !canEdit) throw new Error("No tienes permiso para editar este evento.");
  return { supabase, user, event, role: (role as MemberRole | null) ?? (admin ? "owner" : "viewer"), canEdit };
}

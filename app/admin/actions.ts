"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { EVENT_TYPES } from "@/lib/event-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TEMPLATES } from "@/lib/messaging/defaults";
import type { ActionState } from "@/components/action-form";
import type { EventType } from "@/lib/types";

const RESERVED = ["login", "dashboard", "admin", "api", "auth", "app", "www", "help"];

const createSchema = z.object({
  title: z.string().min(2),
  hosts: z.string().optional(),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,60}[a-z0-9]$/, "Slug: lowercase letters, numbers and hyphens only"),
  type: z.enum(["wedding", "bar_mitzvah", "bat_mitzvah", "brit_milah", "quinceanera", "generic"]),
  event_date: z.string().optional(),
  owner_email: z.string().email(),
  max_guests: z.coerce.number().int().positive().default(300),
  max_messages: z.coerce.number().int().positive().default(2000),
  activate: z.string().optional(),
});

export async function createEvent(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const p = createSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const d = p.data;
  if (RESERVED.includes(d.slug)) return { ok: false, message: "That slug is reserved" };
  const preset = EVENT_TYPES[d.type as EventType];

  const { data: ev, error } = await supabase
    .from("events")
    .insert({
      title: d.title, hosts: d.hosts || null, slug: d.slug, type: d.type, event_date: d.event_date || null,
      status: d.activate ? "active" : "draft", limits: { max_guests: d.max_guests, max_messages: d.max_messages },
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.code === "23505" ? "That slug is already taken" : error.message };

  await supabase.from("event_sessions").insert(preset.defaultSessions.map((name, i) => ({ event_id: ev.id, name, sort: i })));
  await supabase.from("event_sites").insert({
    event_id: ev.id, theme_id: preset.defaultTheme, sections: preset.defaultSections({ title: d.title, hosts: d.hosts ?? "" }),
  });
  await supabase.from("venue_layouts").insert({ event_id: ev.id, name: "Main venue" });
  await supabase.from("message_templates").insert(DEFAULT_TEMPLATES.map((t) => ({ ...t, event_id: ev.id })));
  await supabase.from("event_invites").insert({ event_id: ev.id, email: d.owner_email.toLowerCase(), role: "owner" });

  // Send an invitation email; if the user already exists they just log in and the invite is accepted.
  const admin = createAdminClient();
  const { error: invErr } = await admin.auth.admin.inviteUserByEmail(d.owner_email, { redirectTo: `${env.appUrl()}/auth/callback?next=/dashboard/${ev.id}` });
  revalidatePath("/admin");
  return {
    ok: true,
    message: invErr ? `Event created. ${d.owner_email} already has an account: they can log in at /login to see the event.` : `Event created and invitation sent to ${d.owner_email}.`,
  };
}

export async function setEventStatus(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(fd.get("id"));
  const status = z.enum(["draft", "active", "archived"]).parse(fd.get("status"));
  await supabase.from("events").update({ status }).eq("id", id);
  revalidatePath("/admin");
}

export async function updateLimits(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(fd.get("id"));
  const limits = { max_guests: Number(fd.get("max_guests")), max_messages: Number(fd.get("max_messages")) };
  await supabase.from("events").update({ limits }).eq("id", id);
  revalidatePath("/admin");
}

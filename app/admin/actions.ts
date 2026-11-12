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
import { generatePassword } from "@/lib/password";

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
  // Give the owner an account with a password (no email needed). Existing accounts keep their password.
  const admin = createAdminClient();
  const ownerEmail = d.owner_email.toLowerCase();
  const password = generatePassword();
  let ownerId: string | undefined;
  let isNew = false;
  const { data: created } = await admin.auth.admin.createUser({ email: ownerEmail, password, email_confirm: true });
  if (created.user) { ownerId = created.user.id; isNew = true; }
  else {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    ownerId = list.users.find((u) => u.email?.toLowerCase() === ownerEmail)?.id;
  }
  if (ownerId) await admin.from("event_members").upsert({ event_id: ev.id, user_id: ownerId, role: "owner" });
  else await supabase.from("event_invites").insert({ event_id: ev.id, email: ownerEmail, role: "owner" });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return isNew
    ? { ok: true, message: `Event created. ${ownerEmail} can log in at ${env.appUrl()}/login with this password.`, secret: password }
    : { ok: true, message: `Event created. ${ownerEmail} already has an account and will see the event when they log in. Use Users → Reset password if they need a new one.` };
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

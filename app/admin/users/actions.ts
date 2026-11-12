"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/components/action-form";

const ROLE = z.enum(["owner", "editor", "viewer"]);

const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  name: z.string().trim().max(120).optional(),
  event_id: z.string().uuid().optional().or(z.literal("")),
  role: ROLE.default("owner"),
  super_admin: z.string().optional(),
  send_invite: z.string().optional(),
});

/** Creates (or reuses) an account, then grants event access and/or super-admin. */
export async function createUser(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const p = createUserSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const d = p.data;
  const admin = createAdminClient();
  const next = d.event_id ? `/dashboard/${d.event_id}` : "/dashboard";
  const metadata = d.name ? { full_name: d.name } : undefined;

  let userId: string | undefined;
  let invited = false;
  if (d.send_invite) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(d.email, {
      data: metadata, redirectTo: `${env.appUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    });
    if (!error) { userId = data.user?.id; invited = true; }
  }
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({ email: d.email, email_confirm: true, user_metadata: metadata });
    if (data.user) userId = data.user.id;
    else if (error && /already|registered|exists/i.test(error.message)) userId = await findUserId(d.email);
    else return { ok: false, message: error?.message ?? "Could not create the user." };
  }
  if (!userId) return { ok: false, message: "Could not find or create that user." };

  if (d.event_id) {
    const { error } = await admin.from("event_members").upsert({ event_id: d.event_id, user_id: userId, role: d.role });
    if (error) return { ok: false, message: error.message };
  }
  if (d.super_admin) await admin.from("platform_admins").upsert({ user_id: userId });

  revalidatePath("/admin/users");
  const how = invited ? "An invitation email is on its way." : "They can log in at /login with their email.";
  return { ok: true, message: `${d.email} is ready. ${how}` };
}

async function findUserId(email: string): Promise<string | undefined> {
  const { data } = await createAdminClient().auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email?.toLowerCase() === email)?.id;
}

export async function grantEventAccess(fd: FormData) {
  await requireAdmin();
  const userId = z.string().uuid().parse(fd.get("user_id"));
  const eventId = z.string().uuid().parse(fd.get("event_id"));
  const role = ROLE.parse(fd.get("role"));
  await createAdminClient().from("event_members").upsert({ event_id: eventId, user_id: userId, role });
  revalidatePath("/admin/users");
}

export async function revokeEventAccess(fd: FormData) {
  await requireAdmin();
  const userId = z.string().uuid().parse(fd.get("user_id"));
  const eventId = z.string().uuid().parse(fd.get("event_id"));
  await createAdminClient().from("event_members").delete().eq("event_id", eventId).eq("user_id", userId);
  revalidatePath("/admin/users");
}

export async function setSuperAdmin(fd: FormData) {
  const { user } = await requireAdmin();
  const userId = z.string().uuid().parse(fd.get("user_id"));
  const on = fd.get("on") === "1";
  if (!on && userId === user.id) return; // never remove your own access
  const admin = createAdminClient();
  if (on) await admin.from("platform_admins").upsert({ user_id: userId });
  else await admin.from("platform_admins").delete().eq("user_id", userId);
  revalidatePath("/admin/users");
}

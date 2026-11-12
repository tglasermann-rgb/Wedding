"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/components/action-form";
import { generatePassword, MIN_PASSWORD } from "@/lib/password";

const ROLE = z.enum(["owner", "editor", "viewer"]);

const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  name: z.string().trim().max(120).optional(),
  event_id: z.string().uuid().optional().or(z.literal("")),
  role: ROLE.default("owner"),
  super_admin: z.string().optional(),
  password: z.string().trim().max(72).optional(),
  send_invite: z.string().optional(),
});

/**
 * Creates (or reuses) an account with a password, so people can log in without any email.
 * Leave the password blank to generate one; it is returned once for the admin to share.
 */
export async function createUser(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const p = createUserSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  const d = p.data;
  if (d.password && d.password.length < MIN_PASSWORD) return { ok: false, message: `The password needs at least ${MIN_PASSWORD} characters.` };
  const password = d.password || generatePassword();
  const admin = createAdminClient();
  const metadata = d.name ? { full_name: d.name } : undefined;

  let userId: string | undefined;
  let existed = false;
  const { data, error } = await admin.auth.admin.createUser({ email: d.email, password, email_confirm: true, user_metadata: metadata });
  if (data.user) userId = data.user.id;
  else if (error && /already|registered|exists/i.test(error.message)) {
    userId = await findUserId(d.email);
    existed = true;
    if (userId) {
      const { error: upd } = await admin.auth.admin.updateUserById(userId, { password, ...(metadata ? { user_metadata: metadata } : {}) });
      if (upd) return { ok: false, message: upd.message };
    }
  } else return { ok: false, message: error?.message ?? "Could not create the user." };
  if (!userId) return { ok: false, message: "Could not find or create that user." };

  if (d.event_id) {
    const { error: mErr } = await admin.from("event_members").upsert({ event_id: d.event_id, user_id: userId, role: d.role });
    if (mErr) return { ok: false, message: mErr.message };
  }
  if (d.super_admin) await admin.from("platform_admins").upsert({ user_id: userId });

  // Optional: also email them a login link (subject to the email provider's limits).
  let emailNote = "";
  if (d.send_invite) {
    const next = d.event_id ? `/dashboard/${d.event_id}` : "/dashboard";
    const { error: inv } = await admin.auth.signInWithOtp({
      email: d.email, options: { shouldCreateUser: false, emailRedirectTo: `${env.appUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    emailNote = inv ? " The login email couldn’t be sent, but the password works." : " A login email is on its way too.";
  }

  revalidatePath("/admin/users");
  return {
    ok: true,
    message: `${d.email} ${existed ? "already had an account; the password was updated" : "is ready"}. They log in at ${env.appUrl()}/login.${emailNote}`,
    secret: d.password ? undefined : password,
  };
}

/** Sets a new random password and returns it once. */
export async function resetPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const userId = z.string().uuid().parse(fd.get("user_id"));
  const password = generatePassword();
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "New password set. The old one no longer works.", secret: password };
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

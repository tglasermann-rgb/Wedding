import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, Empty, Field, Input, Select } from "@/components/ui";
import { AdminNav } from "../nav";
import { createUser, grantEventAccess, resetPassword, revokeEventAccess, setSuperAdmin } from "./actions";

const ROLES = [["owner", "Owner"], ["editor", "Editor"], ["viewer", "Viewer"]] as const;
const ROLE_HINT = "Owner and editor can change everything; viewer can only look.";

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never");

export default async function AdminUsersPage() {
  const { user: me } = await requireAdmin();
  const admin = createAdminClient();
  const [{ data: list }, { data: admins }, { data: members }, { data: events }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("platform_admins").select("user_id"),
    admin.from("event_members").select("event_id, user_id, role"),
    admin.from("events").select("id, title").order("created_at", { ascending: false }),
  ]);
  const users = [...(list?.users ?? [])].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  const adminIds = new Set((admins ?? []).map((a) => a.user_id));
  const eventTitle = new Map((events ?? []).map((e) => [e.id, e.title]));

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <AdminNav />

      <Card title="New user">
        <ActionForm action={createUser} className="grid gap-3 md:grid-cols-3">
          <Field label="Email"><Input name="email" type="email" required placeholder="martha@example.com" /></Field>
          <Field label="Name" hint="Optional"><Input name="name" placeholder="Martha Diaz" /></Field>
          <Field label="Password" hint="Leave blank to generate one. You’ll see it once to share."><Input name="password" type="text" autoComplete="new-password" minLength={8} placeholder="Generate for me" /></Field>
          <Field label="Give access to event" hint="Optional">
            <Select name="event_id" defaultValue="">
              <option value="">No event yet</option>
              {(events ?? []).map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </Select>
          </Field>
          <Field label="Role in that event" hint={ROLE_HINT}>
            <Select name="role" defaultValue="owner">{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          </Field>
          <div className="flex flex-col justify-center gap-2 text-sm md:col-span-2">
            <label className="flex items-center gap-2"><input type="checkbox" name="send_invite" /> Also email them a login link (optional)</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="super_admin" /> Make super-admin (full access to every event and to this page)</label>
          </div>
          <div className="md:col-span-3"><SubmitButton pendingText="Creating…">Create user</SubmitButton></div>
        </ActionForm>
      </Card>

      <Card title={`Users (${users.length})`}>
        {users.length === 0 ? <Empty>No users yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase text-stone-500">
                <tr><th className="py-2">User</th><th>Access</th><th>Events</th><th>Joined</th><th>Last login</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100 align-top">
                {users.map((u) => {
                  const isAdmin = adminIds.has(u.id);
                  const mine = (members ?? []).filter((m) => m.user_id === u.id);
                  const name = (u.user_metadata?.full_name as string | undefined) ?? "";
                  return (
                    <tr key={u.id}>
                      <td className="py-3 pr-4">
                        <div className="font-medium">{name || u.email}</div>
                        {name && <div className="text-xs text-stone-500">{u.email}</div>}
                        {!u.last_sign_in_at && <div className="mt-1 text-xs text-stone-500">Hasn’t logged in yet</div>}
                        <ActionForm action={resetPassword} className="mt-1">
                          <input type="hidden" name="user_id" value={u.id} />
                          <button className="text-xs underline">Reset password</button>
                        </ActionForm>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-col items-start gap-1">
                          <Badge tone={isAdmin ? "active" : "pending"}>{isAdmin ? "Super-admin" : "Client"}</Badge>
                          {u.id !== me.id && (
                            <form action={setSuperAdmin}>
                              <input type="hidden" name="user_id" value={u.id} />
                              <input type="hidden" name="on" value={isAdmin ? "0" : "1"} />
                              <button className="text-xs underline">{isAdmin ? "Remove super-admin" : "Make super-admin"}</button>
                            </form>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <ul className="space-y-1">
                          {mine.map((m) => (
                            <li key={m.event_id} className="flex items-center gap-2">
                              <Link href={`/dashboard/${m.event_id}`} className="underline">{eventTitle.get(m.event_id) ?? "Event"}</Link>
                              <span className="text-xs capitalize text-stone-500">{m.role}</span>
                              <form action={revokeEventAccess}>
                                <input type="hidden" name="user_id" value={u.id} />
                                <input type="hidden" name="event_id" value={m.event_id} />
                                <button className="text-xs text-red-700 underline" aria-label={`Remove access to ${eventTitle.get(m.event_id) ?? "event"}`}>Remove</button>
                              </form>
                            </li>
                          ))}
                        </ul>
                        {(events ?? []).length > 0 && (
                          <form action={grantEventAccess} className="mt-2 flex flex-wrap items-center gap-1">
                            <input type="hidden" name="user_id" value={u.id} />
                            <select name="event_id" className="rounded border border-stone-300 bg-white px-1 py-0.5 text-xs" aria-label="Event">
                              {(events ?? []).map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                            </select>
                            <select name="role" className="rounded border border-stone-300 bg-white px-1 py-0.5 text-xs" aria-label="Role">
                              {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                            <button className="text-xs underline">Add</button>
                          </form>
                        )}
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-stone-600">{fmt(u.created_at)}</td>
                      <td className="py-3 tabular-nums text-stone-600">{fmt(u.last_sign_in_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}

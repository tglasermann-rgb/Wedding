import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { EVENT_TYPE_OPTIONS, EVENT_TYPES } from "@/lib/event-types";
import type { EventRow } from "@/lib/types";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, Field, Input, Select } from "@/components/ui";
import { createEvent, setEventStatus, updateLimits } from "./actions";
import { AdminNav } from "./nav";

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false });
  const events = (data ?? []) as EventRow[];
  const { data: counts } = await supabase.from("guests").select("event_id");
  const guestCount = new Map<string, number>();
  for (const g of counts ?? []) guestCount.set(g.event_id, (guestCount.get(g.event_id) ?? 0) + 1);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <AdminNav />

      <Card title="New event (client has paid)">
        <ActionForm action={createEvent} className="grid gap-3 md:grid-cols-3">
          <Field label="Title"><Input name="title" required placeholder="Anna & David’s wedding" /></Field>
          <Field label="Hosts"><Input name="hosts" placeholder="Anna & David" /></Field>
          <Field label="Slug (URL)" hint="getcelebra.com/anna-and-david"><Input name="slug" required pattern="[a-z0-9][a-z0-9-]+[a-z0-9]" /></Field>
          <Field label="Type"><Select name="type">{EVENT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field>
          <Field label="Date"><Input name="event_date" type="date" /></Field>
          <Field label="Owner email"><Input name="owner_email" type="email" required /></Field>
          <Field label="Max guests"><Input name="max_guests" type="number" defaultValue={300} /></Field>
          <Field label="Max messages"><Input name="max_messages" type="number" defaultValue={2000} /></Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="activate" defaultChecked /> Activate now</label>
          <div className="md:col-span-3"><SubmitButton>Create event</SubmitButton></div>
        </ActionForm>
      </Card>

      <Card title={`Events (${events.length})`}>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-stone-500">
            <tr><th className="py-2">Event</th><th>Type</th><th>Date</th><th>Guests</th><th>Limits</th><th>Status</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {events.map((e) => (
              <tr key={e.id}>
                <td className="py-2"><Link className="font-medium underline" href={`/dashboard/${e.id}`}>{e.title}</Link><div className="text-xs text-stone-500">/{e.slug}</div></td>
                <td>{EVENT_TYPES[e.type].label}</td>
                <td>{e.event_date ?? "—"}</td>
                <td>{guestCount.get(e.id) ?? 0}</td>
                <td>
                  <form action={updateLimits} className="flex gap-1">
                    <input type="hidden" name="id" value={e.id} />
                    <input name="max_guests" defaultValue={e.limits.max_guests} className="w-16 rounded border px-1" title="Guests" />
                    <input name="max_messages" defaultValue={e.limits.max_messages} className="w-20 rounded border px-1" title="Messages" />
                    <button className="text-xs underline">OK</button>
                  </form>
                </td>
                <td><Badge tone={e.status}>{e.status}</Badge></td>
                <td>
                  <form action={setEventStatus} className="flex gap-1">
                    <input type="hidden" name="id" value={e.id} />
                    {e.status !== "active" && <button name="status" value="active" className="text-xs underline">Activate</button>}
                    {e.status !== "archived" && <button name="status" value="archived" className="text-xs underline">Archive</button>}
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}

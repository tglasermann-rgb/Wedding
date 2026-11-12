import { requireEvent } from "@/lib/auth";
import { loadSessions } from "@/lib/data";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, Field, Input } from "@/components/ui";
import { addQuestion, deleteQuestion, deleteSession, saveSession, updateEvent } from "./actions";

function toLocalInput(iso: string | null, tz: string) {
  if (!iso) return "";
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(new Date(iso)).reduce<Record<string, string>>((a, x) => ((a[x.type] = x.value), a), {});
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export default async function SettingsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { supabase, event, canEdit } = await requireEvent(eventId);
  const [sessions, { data: questions }, { data: members }, { data: invites }] = await Promise.all([
    loadSessions(supabase, eventId),
    supabase.from("rsvp_questions").select("*").eq("event_id", eventId).order("sort"),
    supabase.from("event_members").select("user_id, role").eq("event_id", eventId),
    supabase.from("event_invites").select("email, role, accepted_at").eq("event_id", eventId),
  ]);

  return (
    <fieldset disabled={!canEdit} className="grid gap-6 lg:grid-cols-2">
      <Card title="Event details">
        <ActionForm action={updateEvent.bind(null, eventId)} className="space-y-3">
          <Field label="Title"><Input name="title" defaultValue={event.title} required /></Field>
          <Field label="Hosts / couple"><Input name="hosts" defaultValue={event.hosts ?? ""} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date"><Input type="date" name="event_date" defaultValue={event.event_date ?? ""} /></Field>
            <Field label="RSVP deadline"><Input type="date" name="rsvp_deadline" defaultValue={event.rsvp_deadline ?? ""} /></Field>
          </div>
          <Field label="Time zone" hint="e.g. America/New_York, America/Los_Angeles, Europe/London, Asia/Jerusalem"><Input name="timezone" defaultValue={event.timezone} /></Field>
          <SubmitButton>Save</SubmitButton>
        </ActionForm>
      </Card>

      <Card title="Events / moments">
        <div className="space-y-4">
          {[...sessions, null].map((s) => (
            <details key={s?.id ?? "new"} open={!s && sessions.length === 0} className="rounded-lg border border-stone-200 p-3">
              <summary className="cursor-pointer text-sm font-medium">{s ? s.name : "+ Add a moment (ceremony, reception, kiddush…)"}</summary>
              <ActionForm action={saveSession.bind(null, eventId)} className="mt-3 space-y-2">
                <input type="hidden" name="id" value={s?.id ?? ""} />
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Name"><Input name="name" required defaultValue={s?.name} /></Field>
                  <Field label="Date & time"><Input type="datetime-local" name="starts_at" defaultValue={toLocalInput(s?.starts_at ?? null, event.timezone)} /></Field>
                  <Field label="Venue"><Input name="venue_name" defaultValue={s?.venue_name ?? ""} /></Field>
                  <Field label="Order"><Input type="number" name="sort" defaultValue={s?.sort ?? sessions.length} /></Field>
                </div>
                <Field label="Address"><Input name="address" defaultValue={s?.address ?? ""} /></Field>
                <Field label="Google Maps / Waze link"><Input name="map_url" defaultValue={s?.map_url ?? ""} /></Field>
                <div className="flex gap-2">
                  <SubmitButton size="sm">Save</SubmitButton>
                  {s && <button formAction={async () => { "use server"; await deleteSession(eventId, s.id); }} className="text-xs text-red-700 underline">Delete</button>}
                </div>
              </ActionForm>
            </details>
          ))}
        </div>
      </Card>

      <Card title="RSVP questions">
        <ul className="mb-3 space-y-1 text-sm">
          {(questions ?? []).map((q) => (
            <li key={q.id} className="flex justify-between">
              <span>{q.label} {q.options.length > 0 && <span className="text-xs text-stone-500">({q.options.join(" / ")})</span>}</span>
              <form action={deleteQuestion.bind(null, eventId, q.id)}><button className="text-xs text-red-700">✕</button></form>
            </li>
          ))}
        </ul>
        <ActionForm action={addQuestion.bind(null, eventId)} className="space-y-2">
          <Field label="Question"><Input name="label" placeholder="Which meal would you like?" /></Field>
          <Field label="Options" hint="comma-separated; empty = free text"><Input name="options" placeholder="Beef, Fish, Vegetarian" /></Field>
          <SubmitButton size="sm" variant="secondary">Add</SubmitButton>
        </ActionForm>
        <p className="mt-2 text-xs text-stone-500">Dietary restrictions are always asked.</p>
      </Card>

      <Card title="Access">
        <ul className="space-y-1 text-sm">
          {(invites ?? []).map((i) => <li key={i.email}>{i.email} · {i.role} {i.accepted_at ? "✓" : "(pending)"}</li>)}
          <li className="text-xs text-stone-500">{members?.length ?? 0} user(s) with access. To add someone (wedding planner, family member), contact us.</li>
        </ul>
      </Card>
    </fieldset>
  );
}

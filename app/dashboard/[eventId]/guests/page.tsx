import { requireEvent } from "@/lib/auth";
import { loadGuests, loadSessions } from "@/lib/data";
import { env } from "@/lib/env";
import { Card } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Textarea } from "@/components/ui";
import { addHousehold } from "./actions";
import { GuestTable } from "./guest-table";
import { CsvImport } from "./csv-import";

export default async function GuestsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { supabase, event, canEdit } = await requireEvent(eventId);
  const [guests, sessions, { data: lastMsgs }] = await Promise.all([
    loadGuests(supabase, eventId),
    loadSessions(supabase, eventId),
    supabase.from("messages").select("guest_id,channel,status,queued_at").eq("event_id", eventId).order("queued_at", { ascending: false }),
  ]);
  const last: Record<string, { email?: string; whatsapp?: string }> = {};
  for (const m of lastMsgs ?? []) {
    last[m.guest_id] ??= {};
    last[m.guest_id][m.channel as "email" | "whatsapp"] ??= m.status;
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Add a household">
            <ActionForm action={addHousehold.bind(null, eventId)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Household name"><Input name="name" placeholder="The Smith family" /></Field>
                <Field label="Guest of"><Input name="side" placeholder="bride / groom" /></Field>
                <Field label="Tags" hint="comma-separated"><Input name="tags" placeholder="family, work" /></Field>
                <Field label="Plus-ones allowed"><Input name="max_plus_ones" type="number" min={0} defaultValue={0} /></Field>
              </div>
              <Field label="People" hint="One per line: First Last, email, phone, child">
                <Textarea name="members" required placeholder={"John Smith, john@mail.com, (415) 555-2671\nLily Smith, child"} />
              </Field>
              <SubmitButton>Add</SubmitButton>
            </ActionForm>
          </Card>
          <Card title="Import from Excel / CSV">
            <CsvImport eventId={eventId} />
          </Card>
        </div>
      )}
      <GuestTable
        eventId={eventId}
        guests={guests}
        sessions={sessions}
        lastMessage={last}
        canEdit={canEdit}
        rsvpBase={`${env.appUrl()}/${event.slug}?i=`}
      />
    </div>
  );
}

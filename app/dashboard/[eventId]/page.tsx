import { requireEvent } from "@/lib/auth";
import { computeStats, loadGuests, loadSessions } from "@/lib/data";
import { Card, Stat } from "@/components/ui";
import type { MessageRow, RsvpStatus } from "@/lib/types";

function daysUntil(date: string | null) {
  if (!date) return null;
  return Math.ceil((new Date(date + "T00:00:00").getTime() - Date.now()) / 86_400_000);
}

const COLORS: Record<RsvpStatus, string> = { yes: "bg-emerald-500", maybe: "bg-amber-400", no: "bg-red-400", pending: "bg-stone-300" };
const LABEL: Record<RsvpStatus, string> = { yes: "Attending", maybe: "Maybe", no: "Declined", pending: "Pending" };

function StackBar({ counts, total }: { counts: Record<RsvpStatus, number>; total: number }) {
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-stone-100">
        {(["yes", "maybe", "no", "pending"] as const).map((k) =>
          counts[k] ? <div key={k} className={COLORS[k]} style={{ width: `${(counts[k] / Math.max(total, 1)) * 100}%` }} title={`${LABEL[k]}: ${counts[k]}`} /> : null,
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-600">
        {(["yes", "maybe", "no", "pending"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${COLORS[k]}`} />{LABEL[k]} {counts[k]}</span>
        ))}
      </div>
    </div>
  );
}

function Funnel({ steps }: { steps: [string, number][] }) {
  const max = Math.max(steps[0]?.[1] ?? 0, 1);
  return (
    <div className="space-y-2">
      {steps.map(([label, n]) => (
        <div key={label} className="grid grid-cols-[90px_1fr_40px] items-center gap-2 text-sm">
          <span className="text-stone-600">{label}</span>
          <div className="h-2 rounded-full bg-stone-100"><div className="h-2 rounded-full bg-stone-700" style={{ width: `${(n / max) * 100}%` }} /></div>
          <span className="text-right tabular-nums">{n}</span>
        </div>
      ))}
    </div>
  );
}

export default async function Overview({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { supabase, event } = await requireEvent(eventId);
  const [guests, sessions, { data: msgs }] = await Promise.all([
    loadGuests(supabase, eventId),
    loadSessions(supabase, eventId),
    supabase.from("messages").select("channel,status,sent_at,delivered_at,opened_at,replied_at").eq("event_id", eventId),
  ]);
  const s = computeStats(guests, sessions, (msgs ?? []) as MessageRow[]);
  const days = daysUntil(event.event_date);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Countdown" value={days === null ? "—" : days >= 0 ? days : "Done!"} sub={days !== null && days >= 0 ? (days === 1 ? "day to go" : "days to go") : event.event_date ?? "Set the date in Settings"} />
        <Stat label="Guests" value={s.guests} sub={`${s.households} households · ${s.adults} adults · ${s.children} children`} />
        <Stat label="Attending" value={s.byStatus.yes} tone="green" sub={`${Math.round((s.byStatus.yes / Math.max(s.guests, 1)) * 100)}%`} />
        <Stat label="Maybe" value={s.byStatus.maybe} tone="amber" />
        <Stat label="Pending" value={s.byStatus.pending} sub={`${s.byStatus.no} declined`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="RSVPs by session" className="lg:col-span-2">
          <div className="space-y-5">
            <div><div className="mb-2 text-sm font-medium">Overall</div><StackBar counts={s.byStatus} total={s.guests} /></div>
            {s.bySession.map((b) => (
              <div key={b.session.id}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium">{b.session.name}</span>
                  <span className="text-stone-500">{b.attendingAdults} adults · {b.attendingChildren} children attending</span>
                </div>
                <StackBar counts={b.byStatus} total={s.guests} />
              </div>
            ))}
          </div>
        </Card>
        <Card title="Needs attention">
          <ul className="space-y-2 text-sm">
            <li>{s.noContact} guests with no email or phone</li>
            <li>{s.byStatus.pending} guests haven’t replied yet</li>
            <li>{s.messages.reduce((a, m) => a + m.failed, 0)} failed messages</li>
          </ul>
          {s.dietary.length > 0 && (
            <>
              <h3 className="mt-5 mb-2 text-sm font-semibold">Dietary restrictions / allergies</h3>
              <ul className="max-h-48 space-y-1 overflow-auto text-sm">{s.dietary.map((d, i) => <li key={i}><b>{d.name}:</b> {d.value}</li>)}</ul>
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {s.messages.map((m) => (
          <Card key={m.channel} title={m.channel === "email" ? "Email" : "WhatsApp"}>
            {m.total === 0 ? <p className="text-sm text-stone-500">No messages sent yet.</p> : (
              <Funnel steps={[["Sent", m.sent], ["Delivered", m.delivered], [m.channel === "email" ? "Opened" : "Read", m.opened], ["Replied", m.replied], ["Failed", m.failed]]} />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

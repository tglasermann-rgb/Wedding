"use client";
import { useState, useTransition } from "react";
import { submitRsvpAction } from "@/app/[slug]/actions";
import type { RsvpStatus } from "@/lib/types";
import type { RsvpData } from "./sections";

const OPTIONS: { v: Exclude<RsvpStatus, "pending">; l: string }[] = [{ v: "yes", l: "Joyfully accept" }, { v: "maybe", l: "Maybe" }, { v: "no", l: "Regretfully decline" }];
const inp = "w-full rounded-lg border px-3 py-2 text-sm bg-white/80";

export function RsvpForm({ slug, data, sessions, deadline, open }: { slug: string; data: RsvpData; sessions: { id: string; name: string }[]; deadline: string | null; open: boolean }) {
  const [statuses, setStatuses] = useState<Record<string, RsvpStatus>>(() =>
    Object.fromEntries(data.guests.flatMap((g) => sessions.map((s) => [`${g.id}:${s.id}`, g.statuses[s.id] ?? "pending"]))));
  const [dietary, setDietary] = useState<Record<string, string>>(() => Object.fromEntries(data.guests.map((g) => [g.id, g.dietary])));
  const [answers, setAnswers] = useState<Record<string, string>>(data.answers);
  const [plusOnes, setPlusOnes] = useState<{ firstName: string; lastName: string }[]>([]);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  const anyYes = Object.values(statuses).some((s) => s === "yes");
  const complete = Object.values(statuses).every((s) => s !== "pending");

  function submit() {
    start(async () => {
      const r = await submitRsvpAction(slug, {
        token: data.token,
        responses: Object.entries(statuses).filter(([, s]) => s !== "pending").map(([k, s]) => {
          const [guestId, sessionId] = k.split(":");
          return { guestId, sessionId, status: s as "yes" | "no" | "maybe" };
        }),
        plusOnes: plusOnes.filter((p) => p.firstName.trim()).map((p) => ({ firstName: p.firstName.trim(), lastName: p.lastName.trim() || undefined })),
        answers: Object.entries(answers).map(([k, value]) => { const [questionId, guestId] = k.split(":"); return { questionId, guestId, value }; }),
        dietary: Object.entries(dietary).map(([guestId, value]) => ({ guestId, value })),
      });
      setResult(r);
      if (r.ok) setPlusOnes([]);
    });
  }

  if (!open) return <p className="text-center opacity-70">RSVPs will open soon.</p>;

  return (
    <div className="space-y-6">
      {data.guests.map((g) => (
        <div key={g.id} className="rounded-2xl p-5" style={{ background: "var(--site-bg)" }}>
          <div className="mb-3 text-lg font-medium">{g.name}</div>
          {sessions.map((s) => (
            <div key={s.id} className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm opacity-80">{s.name}</span>
              <div className="flex gap-1">
                {OPTIONS.map((o) => {
                  const active = statuses[`${g.id}:${s.id}`] === o.v;
                  return (
                    <button key={o.v} type="button" onClick={() => setStatuses((st) => ({ ...st, [`${g.id}:${s.id}`]: o.v }))}
                      className="rounded-full border px-3 py-1 text-sm transition"
                      style={active ? { background: "var(--site-accent)", color: "#fff", borderColor: "var(--site-accent)" } : { borderColor: "var(--site-accent)", color: "var(--site-accent)" }}>
                      {o.l}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {sessions.some((s) => statuses[`${g.id}:${s.id}`] === "yes") && (
            <div className="mt-3 space-y-2">
              <input className={inp} placeholder="Allergies or dietary needs (optional)" value={dietary[g.id] ?? ""} onChange={(e) => setDietary((d) => ({ ...d, [g.id]: e.target.value }))} />
              {data.questions.map((q) => {
                const k = `${q.id}:${g.id}`;
                return q.kind === "select" ? (
                  <select key={q.id} className={inp} value={answers[k] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [k]: e.target.value }))}>
                    <option value="">{q.label}</option>{q.options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input key={q.id} className={inp} placeholder={q.label} value={answers[k] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [k]: e.target.value }))} />
                );
              })}
            </div>
          )}
        </div>
      ))}

      {anyYes && data.plusOnesLeft > 0 && (
        <div className="rounded-2xl p-5" style={{ background: "var(--site-bg)" }}>
          <div className="mb-2 font-medium">Plus-ones ({data.plusOnesLeft - plusOnes.length} available)</div>
          {plusOnes.map((p, i) => (
            <div key={i} className="mb-2 grid grid-cols-2 gap-2">
              <input className={inp} placeholder="First name" value={p.firstName} onChange={(e) => setPlusOnes((ps) => ps.map((x, j) => (j === i ? { ...x, firstName: e.target.value } : x)))} />
              <input className={inp} placeholder="Last name" value={p.lastName} onChange={(e) => setPlusOnes((ps) => ps.map((x, j) => (j === i ? { ...x, lastName: e.target.value } : x)))} />
            </div>
          ))}
          {plusOnes.length < data.plusOnesLeft && <button type="button" className="text-sm underline" onClick={() => setPlusOnes((p) => [...p, { firstName: "", lastName: "" }])}>+ Add a plus-one</button>}
        </div>
      )}

      <div className="text-center">
        <button type="button" disabled={pending || !complete} onClick={submit}
          className="rounded-full px-10 py-3 text-white disabled:opacity-50" style={{ background: "var(--site-accent)" }}>
          {pending ? "Sending…" : "Send RSVP"}
        </button>
        {!complete && <p className="mt-2 text-xs opacity-60">Please answer for every person and every event.</p>}
        {deadline && <p className="mt-2 text-xs opacity-60">You can change your answer until {new Date(deadline + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}.</p>}
        {result && <p className={`mt-4 ${result.ok ? "" : "text-red-700"}`}>{result.message}</p>}
      </div>
    </div>
  );
}

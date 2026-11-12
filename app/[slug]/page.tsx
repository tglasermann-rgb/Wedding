import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseSections } from "@/lib/site/schema";
import { getTheme } from "@/lib/site/themes";
import type { EventRow, RsvpStatus, SessionRow } from "@/lib/types";
import { SiteSections, type RsvpData } from "@/components/site/sections";

const loadEvent = cache(async (slug: string) => {
  const sb = createAdminClient();
  const { data: event } = await sb.from("events").select("*").eq("slug", slug).neq("status", "archived").maybeSingle<EventRow>();
  if (!event) return null;
  const [{ data: site }, { data: sessions }] = await Promise.all([
    sb.from("event_sites").select("*").eq("event_id", event.id).maybeSingle(),
    sb.from("event_sessions").select("*").eq("event_id", event.id).order("sort").order("starts_at"),
  ]);
  return { event, site, sessions: (sessions ?? []) as SessionRow[] };
});

async function loadRsvp(eventId: string, token: string): Promise<RsvpData | null> {
  const sb = createAdminClient();
  const { data: hh } = await sb.from("households")
    .select("id, name, token, max_plus_ones, guests(id, first_name, last_name, dietary, is_plus_one, created_at, rsvp_responses(session_id,status))")
    .eq("token", token).eq("event_id", eventId).maybeSingle();
  if (!hh) return null;
  const guests = (hh.guests as { id: string; first_name: string; last_name: string | null; dietary: string | null; is_plus_one: boolean; created_at: string; rsvp_responses: { session_id: string; status: RsvpStatus }[] }[])
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const [{ data: questions }, { data: answers }] = await Promise.all([
    sb.from("rsvp_questions").select("id,label,kind,options").eq("event_id", eventId).order("sort"),
    sb.from("rsvp_answers").select("question_id,guest_id,value").in("guest_id", guests.map((g) => g.id)),
  ]);
  return {
    token: hh.token, householdName: hh.name,
    plusOnesLeft: hh.max_plus_ones - guests.filter((g) => g.is_plus_one).length,
    guests: guests.map((g) => ({
      id: g.id, name: `${g.first_name} ${g.last_name ?? ""}`.trim(), dietary: g.dietary ?? "",
      statuses: Object.fromEntries(g.rsvp_responses.map((r) => [r.session_id, r.status])),
    })),
    questions: (questions ?? []) as RsvpData["questions"],
    answers: Object.fromEntries((answers ?? []).map((a) => [`${a.question_id}:${a.guest_id}`, a.value ?? ""])),
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await loadEvent(slug);
  if (!d) return {};
  const hero = parseSections(d.site?.sections).find((s) => s.type === "hero");
  return {
    title: d.event.hosts ? `${d.event.hosts} — ${d.event.title}` : d.event.title,
    openGraph: { title: d.event.title, images: hero && "imageUrl" in hero && hero.imageUrl ? [hero.imageUrl] : [] },
    robots: { index: false },
  };
}

export default async function EventSite({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ i?: string; preview?: string }> }) {
  const { slug } = await params;
  const { i: token, preview } = await searchParams;
  const d = await loadEvent(slug);
  if (!d) notFound();

  let canPreview = false;
  if (preview) {
    const sb = await createClient();
    const { data } = await sb.rpc("is_event_member", { eid: d.event.id });
    canPreview = data === true;
  }
  const theme = getTheme(d.site?.theme_id);
  if (!d.site?.published && !canPreview) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8 text-center" style={{ ...theme.vars, background: "var(--site-bg)", color: "var(--site-fg)" } as React.CSSProperties}>
        <div>
          <h1 className="text-5xl" style={{ fontFamily: theme.headingFont }}>{d.event.hosts ?? d.event.title}</h1>
          <p className="mt-4 opacity-70">Coming soon…</p>
        </div>
      </main>
    );
  }

  const rsvp = token ? await loadRsvp(d.event.id, token) : null;
  return (
    <SiteSections
      event={{ slug, title: d.event.title, hosts: d.event.hosts, date: d.event.event_date, timezone: d.event.timezone, locale: d.event.locale, rsvpDeadline: d.event.rsvp_deadline, active: d.event.status === "active" }}
      sessions={d.sessions}
      sections={parseSections(d.site?.sections).filter((s) => !s.hidden)}
      theme={theme}
      rsvp={rsvp}
      invalidToken={!!token && !rsvp}
    />
  );
}

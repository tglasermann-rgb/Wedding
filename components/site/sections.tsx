import type { CSSProperties, ReactNode } from "react";
import type { SiteSection } from "@/lib/site/schema";
import type { Theme } from "@/lib/site/themes";
import type { RsvpStatus, SessionRow } from "@/lib/types";
import { Countdown } from "./countdown";
import { RsvpForm } from "./rsvp-form";

export interface SiteEvent { slug: string; title: string; hosts: string | null; date: string | null; timezone: string; locale: string; rsvpDeadline: string | null; active: boolean }
export interface RsvpData {
  token: string;
  householdName: string;
  plusOnesLeft: number;
  guests: { id: string; name: string; dietary: string; statuses: Record<string, RsvpStatus> }[];
  questions: { id: string; label: string; kind: "text" | "select"; options: string[] }[];
  answers: Record<string, string>;
}

function Section({ title, children, muted }: { title?: string; children: ReactNode; muted?: boolean }) {
  return (
    <section className="px-6 py-16 md:py-24" style={{ background: muted ? "var(--site-muted)" : undefined }}>
      <div className="mx-auto max-w-3xl">
        {title && <h2 className="mb-10 text-center text-4xl md:text-5xl" style={{ fontFamily: "var(--site-heading)" }}>{title}</h2>}
        {children}
      </div>
    </section>
  );
}

const fmtDate = (d: string, locale: string) => new Date(d + "T12:00:00").toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function SiteSections({ event, sessions, sections, theme, rsvp, invalidToken }: {
  event: SiteEvent; sessions: SessionRow[]; sections: SiteSection[]; theme: Theme; rsvp: RsvpData | null; invalidToken: boolean;
}) {
  const style = { ...theme.vars, "--site-heading": theme.headingFont, background: "var(--site-bg)", color: "var(--site-fg)" } as CSSProperties;
  const firstStart = sessions.find((s) => s.starts_at)?.starts_at ?? (event.date ? event.date + "T18:00:00" : null);
  let alt = false;

  return (
    <main style={style} className="min-h-screen">
      {sections.map((s) => {
        alt = s.type === "hero" ? false : !alt;
        switch (s.type) {
          case "hero":
            return (
              <header key={s.id} className="relative flex min-h-[85vh] items-center justify-center overflow-hidden px-6 text-center">
                {s.imageUrl && <img src={s.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                {s.imageUrl && <div className="absolute inset-0 bg-black/35" />}
                <div className={`relative ${s.imageUrl ? "text-white" : ""}`}>
                  {rsvp && <p className="mb-4 text-sm uppercase tracking-[0.3em] opacity-80">{rsvp.householdName}</p>}
                  <h1 className="text-6xl md:text-8xl" style={{ fontFamily: "var(--site-heading)" }}>{s.title || event.hosts || event.title}</h1>
                  {s.subtitle && <p className="mt-6 text-xl opacity-90">{s.subtitle}</p>}
                  {event.date && <p className="mt-4 text-lg capitalize tracking-wide opacity-80">{fmtDate(event.date, event.locale)}</p>}
                  {rsvp && <a href="#rsvp" className="mt-10 inline-block rounded-full px-8 py-3 text-white" style={{ background: "var(--site-accent)" }}>RSVP</a>}
                </div>
              </header>
            );
          case "countdown":
            return firstStart ? <Section key={s.id} muted={alt}><Countdown target={firstStart} /></Section> : null;
          case "text":
            return <Section key={s.id} title={s.title} muted={alt}><p className="whitespace-pre-line text-center text-lg leading-relaxed">{s.body}</p></Section>;
          case "schedule":
            return (
              <Section key={s.id} title={s.title} muted={alt}>
                <div className="grid gap-6 md:grid-cols-2">
                  {sessions.map((x) => (
                    <div key={x.id} className="rounded-2xl p-6 text-center" style={{ background: "var(--site-bg)", border: "1px solid var(--site-muted)" }}>
                      <h3 className="text-2xl" style={{ fontFamily: "var(--site-heading)" }}>{x.name}</h3>
                      {x.starts_at && <p className="mt-2 text-lg" style={{ color: "var(--site-accent)" }}>{new Date(x.starts_at).toLocaleString(event.locale, { timeZone: event.timezone, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p>}
                      {x.venue_name && <p className="mt-2 font-medium">{x.venue_name}</p>}
                      {x.address && <p className="text-sm opacity-70">{x.address}</p>}
                      {x.map_url && <a href={x.map_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm underline" style={{ color: "var(--site-accent)" }}>View map</a>}
                    </div>
                  ))}
                </div>
              </Section>
            );
          case "gifts":
            return (
              <Section key={s.id} title={s.title} muted={alt}>
                {s.text && <p className="mb-8 whitespace-pre-line text-center">{s.text}</p>}
                <div className="flex flex-wrap justify-center gap-3">
                  {s.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="rounded-full border px-6 py-2" style={{ borderColor: "var(--site-accent)", color: "var(--site-accent)" }}>{l.label}</a>)}
                </div>
              </Section>
            );
          case "gallery":
            return s.images.length ? (
              <Section key={s.id} title={s.title} muted={alt}>
                <div className="columns-2 gap-3 md:columns-3">{s.images.map((u) => <img key={u} src={u} alt="" className="mb-3 w-full rounded-lg" loading="lazy" />)}</div>
              </Section>
            ) : null;
          case "faq":
            return s.items.length ? (
              <Section key={s.id} title={s.title} muted={alt}>
                <div className="space-y-3">{s.items.map((f, i) => (
                  <details key={i} className="rounded-xl p-4" style={{ background: "var(--site-bg)" }}><summary className="cursor-pointer font-medium">{f.q}</summary><p className="mt-2 opacity-80">{f.a}</p></details>
                ))}</div>
              </Section>
            ) : null;
          case "rsvp":
            return (
              <Section key={s.id} title={s.title} muted={alt}>
                <div id="rsvp">
                  {s.text && <p className="mb-8 text-center">{s.text}</p>}
                  {rsvp ? (
                    <RsvpForm slug={event.slug} data={rsvp} sessions={sessions.map((x) => ({ id: x.id, name: x.name }))} deadline={event.rsvpDeadline} open={event.active} />
                  ) : (
                    <p className="text-center opacity-70">{invalidToken ? "We couldn't find your invitation. Please check the link you received." : "Use the personal link you received by email or WhatsApp to RSVP."}</p>
                  )}
                </div>
              </Section>
            );
        }
      })}
      <footer className="py-10 text-center text-xs opacity-50">Made with Celebra</footer>
    </main>
  );
}

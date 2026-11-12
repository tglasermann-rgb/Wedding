import Link from "next/link";
import { Logo, Mark } from "@/components/brand/logo";

const CONTACT = "hello@getcelebra.com";

const STEPS = [
  ["Create your page", "Pick a theme and add your story, schedule, venue, registry and FAQ. It looks lovely on every phone."],
  ["Invite your guests", "Every household gets a personal link by WhatsApp or email, with gentle reminders sent for you."],
  ["Watch the yeses arrive", "See who received, opened and replied, plus plus-ones and dietary needs, as it happens."],
] as const;

const FEATURES = [
  ["Your event website", "Elegant themes with your story, schedule, map, registry, gallery and FAQ."],
  ["Personal RSVPs", "Yes, no or maybe for each part of the day, with plus-ones, menu choices and your own questions."],
  ["WhatsApp and email", "Invitations and reminders that go out on schedule. Guests can reply right from WhatsApp."],
  ["A live guest list", "Attending, pending, children and dietary needs at a glance, with a countdown to the day."],
  ["Seating, if you need it", "Round, square or banquet tables. Drag guests into place and print the chart for the venue."],
  ["Made for every celebration", "Weddings, bar and bat mitzvahs, brit milahs, quinceañeras, birthdays and more."],
] as const;

const OCCASIONS = ["Weddings", "Bar & Bat Mitzvahs", "Brit Milahs", "Quinceañeras", "Anniversaries", "Birthdays"];

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="rounded-[28px] bg-white p-6 shadow-[0_30px_60px_-30px_rgba(46,31,58,.45)] ring-1 ring-stone-200">
        <div className="rounded-2xl bg-linen px-6 py-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Saturday, March 13, 2027</p>
          <p className="mt-3 font-display text-3xl font-semibold tracking-tight">Anna &amp; David</p>
          <p className="mt-1 text-sm text-stone-600">Hacienda Los Olivos</p>
        </div>
        <p className="mt-6 text-sm font-semibold">Will you join us, Martha?</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <span className="rounded-full bg-aubergine py-2 text-center font-semibold text-linen">Yes</span>
          <span className="rounded-full py-2 text-center ring-1 ring-stone-300">No</span>
          <span className="rounded-full py-2 text-center ring-1 ring-stone-300">Maybe</span>
        </div>
      </div>
      <div className="absolute -bottom-14 -left-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg ring-1 ring-stone-200 sm:-left-10">
        <Mark size={36} animate />
        <div className="text-sm leading-tight">
          <p className="font-semibold tabular-nums">112 attending</p>
          <p className="text-stone-500 tabular-nums">18 still to reply</p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
        <Link href="/" aria-label="Celebra home"><Logo size={30} /></Link>
        <nav className="flex items-center gap-6 text-sm">
          <a href="#how" className="hidden text-stone-600 hover:text-aubergine sm:inline">How it works</a>
          <a href="#features" className="hidden text-stone-600 hover:text-aubergine sm:inline">Features</a>
          <Link href="/login" className="rounded-full px-4 py-2 font-medium ring-1 ring-stone-300 hover:bg-white">Log in</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 pb-24 pt-12 md:grid-cols-[1.1fr_1fr] md:pt-20">
        <div>
          <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-[-0.035em] text-balance md:text-7xl">
            Gather everyone you love.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-stone-600">
            Celebra gives your celebration a beautiful website, a personal RSVP link for every household and invitations over WhatsApp and email, with one calm dashboard to keep track of it all.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href={`mailto:${CONTACT}`} className="rounded-full bg-aubergine px-7 py-3 font-semibold text-linen hover:bg-stone-800">Create your page</a>
            <a href="#how" className="rounded-full bg-marigold px-7 py-3 font-semibold text-aubergine hover:bg-[#f5ad55]">See how it works</a>
          </div>
        </div>
        <HeroPreview />
      </section>

      <section className="border-y border-stone-200 bg-white">
        <ul className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-8 gap-y-3 px-6 py-6 text-sm font-medium text-stone-600">
          {OCCASIONS.map((o) => <li key={o}>{o}</li>)}
        </ul>
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-8 px-6 py-24">
        <h2 className="font-display text-4xl font-bold tracking-tight text-balance">From the first invite to the last yes</h2>
        <ol className="mt-12 grid gap-10 md:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="border-t-2 border-aubergine pt-5">
              <span className="font-display text-sm font-bold text-marigold-dark">Step {i + 1}</span>
              <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">{t}</h3>
              <p className="mt-2 text-stone-600">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="features" className="scroll-mt-8 bg-blush/40">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="max-w-xl font-display text-4xl font-bold tracking-tight text-balance">Everything your celebration needs, in one place</h2>
          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([t, d]) => (
              <div key={t}>
                <h3 className="font-display text-xl font-semibold tracking-tight">{t}</h3>
                <p className="mt-2 text-stone-600">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-aubergine text-linen">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 py-20 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-6">
            <Mark size={72} variant="inverse" />
            <h2 className="max-w-md font-display text-4xl font-bold tracking-tight text-balance">Your guests are waiting to say yes.</h2>
          </div>
          <a href={`mailto:${CONTACT}`} className="rounded-full bg-marigold px-8 py-3 font-semibold text-aubergine hover:bg-[#f5ad55]">Create your page</a>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-sm text-stone-500">
        <Logo size={22} />
        <span>{CONTACT}</span>
        <span>© {new Date().getFullYear()} Celebra</span>
      </footer>
    </main>
  );
}

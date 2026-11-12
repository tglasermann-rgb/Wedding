import Link from "next/link";

const FEATURES = [
  ["Your event website", "Elegant templates with your story, schedule, map, registry, gallery and FAQ."],
  ["RSVPs", "Every household gets a personal link. Yes, no or maybe — per event, with plus-ones and meal choices."],
  ["Email & WhatsApp", "Automatic invitations and reminders. See who received, opened, read and replied."],
  ["Seating chart", "Round tables of 8, 10 or 12, square or banquet tables. Drag every guest to their seat."],
  ["Live dashboard", "Attending, pending, kids, dietary needs and a countdown at a glance."],
  ["For every celebration", "Weddings, bar and bat mitzvahs, brit milah, quinceañeras and more."],
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-serif text-2xl font-semibold">Celebra</span>
        <Link href="/login" className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-white">Log in</Link>
      </header>
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="font-serif text-5xl leading-tight md:text-6xl">Your event, organized from start to finish</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-600">
          A beautiful website for your guests and one dashboard to manage RSVPs, email and WhatsApp messages, and seating.
        </p>
        <a href="mailto:hello@celebra.app" className="mt-10 inline-block rounded-full bg-stone-900 px-8 py-3 text-white hover:bg-stone-700">Get your website</a>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 md:grid-cols-3">
        {FEATURES.map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-stone-200 bg-white p-6">
            <h3 className="font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-stone-600">{d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

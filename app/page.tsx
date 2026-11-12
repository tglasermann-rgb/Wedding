import Link from "next/link";

const FEATURES = [
  ["Tu página del evento", "Plantillas elegantes con historia, programa, mapa, regalos, galería y preguntas frecuentes."],
  ["Confirmaciones (RSVP)", "Cada familia recibe su link personal. Sí, no o tal vez — por evento, con acompañantes y menú."],
  ["Email y WhatsApp", "Invitaciones y recordatorios automáticos. Ve quién recibió, abrió, leyó y respondió."],
  ["Mesas del salón", "Mesas redondas de 8, 10 o 12, cuadradas o imperiales. Arrastra a cada invitado a su lugar."],
  ["Dashboard en vivo", "Confirmados, pendientes, niños, dietas especiales y cuenta regresiva de un vistazo."],
  ["Para todo tipo de evento", "Bodas, bar y bat mitzvah, brit milá, XV años y cualquier celebración."],
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-serif text-2xl font-semibold">Celebra</span>
        <Link href="/login" className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-white">Entrar</Link>
      </header>
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="font-serif text-5xl leading-tight md:text-6xl">Tu evento, organizado de principio a fin</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-600">
          Una página hermosa para tus invitados y un panel para manejar confirmaciones, mensajes por email y WhatsApp, y la distribución de mesas.
        </p>
        <a href="mailto:hola@celebra.app" className="mt-10 inline-block rounded-full bg-stone-900 px-8 py-3 text-white hover:bg-stone-700">Quiero mi página</a>
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

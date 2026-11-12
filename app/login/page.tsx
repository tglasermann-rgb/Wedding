import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="font-serif text-3xl">Entrar</h1>
        <p className="mt-1 text-sm text-stone-500">Te enviaremos un enlace mágico a tu correo.</p>
        {error && <p className="mt-3 text-sm text-red-700">El enlace no es válido o expiró. Intenta de nuevo.</p>}
        <LoginForm next={next ?? "/dashboard"} />
      </div>
    </main>
  );
}

import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <Link href="/" aria-label="Celebra home"><Logo size={34} /></Link>
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-stone-500">We’ll email you a magic link to log in. No password needed.</p>
        {error && <p className="mt-3 text-sm text-red-700">That link is invalid or has expired. Request a new one below.</p>}
        <LoginForm next={next ?? "/dashboard"} />
      </div>
    </main>
  );
}

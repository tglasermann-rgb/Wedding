"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";
import { LoginForm } from "./login-form";

/** Email + password login. The emailed link/code stays available as a fallback. */
export function PasswordLogin({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "email">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const sb = createClient();
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      setErr(/invalid/i.test(error.message) ? "Wrong email or password. Check both and try again." : error.message);
      return;
    }
    await sb.rpc("accept_pending_invites");
    router.replace(next);
    router.refresh();
  }

  if (mode === "email")
    return (
      <>
        <LoginForm next={next} />
        <p className="mt-4 text-center text-xs text-stone-500">
          <button type="button" className="underline" onClick={() => setMode("password")}>Log in with a password instead</button>
        </p>
      </>
    );

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <Input id="login-email" type="email" required autoComplete="email" placeholder="you@example.com" aria-label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input id="login-password" type="password" required autoComplete="current-password" placeholder="Password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button className="w-full" disabled={busy}>{busy ? "Logging in…" : "Log in"}</Button>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <p className="text-center text-xs text-stone-500">
        No password yet? <button type="button" className="underline" onClick={() => setMode("email")}>Email me a login link</button>
      </p>
    </form>
  );
}

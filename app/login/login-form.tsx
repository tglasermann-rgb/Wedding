"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: true },
    });
    if (error) { setErr(error.message); setState("error"); } else setState("sent");
  }

  if (state === "sent") return <p className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">Check your inbox at <b>{email}</b> and open the link to log in.</p>;
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <Input type="email" required placeholder="you@example.com" aria-label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button className="w-full" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Email me a link"}</Button>
      {state === "error" && <p className="text-sm text-red-700">{err}</p>}
    </form>
  );
}

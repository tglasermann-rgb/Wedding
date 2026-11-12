"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";

const friendly = (msg: string) =>
  /rate limit/i.test(msg)
    ? "Too many login emails were sent in the last hour. Wait a bit and try again, or use the code from an email you already received."
    : /expired|invalid/i.test(msg)
      ? "That code is invalid or has expired. Check the latest email or request a new one."
      : msg;

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "verifying">("idle");
  const [err, setErr] = useState("");

  async function sendLink(e?: React.FormEvent) {
    e?.preventDefault();
    setErr("");
    setState("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: true },
    });
    if (error) { setErr(friendly(error.message)); setState(code ? "sent" : "idle"); } else setState("sent");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setState("verifying");
    const sb = createClient();
    const { error } = await sb.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    if (error) { setErr(friendly(error.message)); setState("sent"); return; }
    await sb.rpc("accept_pending_invites");
    router.replace(next);
    router.refresh();
  }

  if (state === "sent" || state === "verifying")
    return (
      <form onSubmit={verifyCode} className="mt-6 space-y-3">
        <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
          We sent an email to <b>{email}</b>. Open the link on any device, or type the code from the email here.
        </p>
        <Input id="login-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" required placeholder="Code" aria-label="Login code"
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="text-center text-lg tracking-[0.4em]" />
        <Button className="w-full" disabled={state === "verifying"}>{state === "verifying" ? "Checking…" : "Log in"}</Button>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <p className="text-center text-xs text-stone-500">
          Wrong email? <button type="button" className="underline" onClick={() => { setState("idle"); setCode(""); setErr(""); }}>Start over</button>
        </p>
      </form>
    );

  return (
    <form onSubmit={sendLink} className="mt-6 space-y-3">
      <Input id="login-email" type="email" required placeholder="you@example.com" aria-label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button className="w-full" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Email me a link"}</Button>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <p className="text-center text-xs text-stone-500">
        Already have a code? <button type="button" className="underline" onClick={() => { if (email) setState("sent"); else setErr("Enter your email first."); }}>Enter it</button>
      </p>
    </form>
  );
}

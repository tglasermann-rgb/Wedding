"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Field, Input } from "@/components/ui";

const MIN = 8;

export function ChangePasswordForm() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < MIN) return setState({ ok: false, msg: `Use at least ${MIN} characters.` });
    if (pw !== confirm) return setState({ ok: false, msg: "The two passwords don’t match." });
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setState({ ok: false, msg: error.message });
    setPw(""); setConfirm("");
    setState({ ok: true, msg: "Password changed. Use the new one next time you log in." });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="New password"><Input id="new-password" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
      <Field label="Repeat new password"><Input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
      <Button disabled={busy}>{busy ? "Saving…" : "Change password"}</Button>
      {state && <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`} role="status">{state.msg}</p>}
    </form>
  );
}

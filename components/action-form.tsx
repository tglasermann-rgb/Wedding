"use client";
import { useActionState, useState, type ReactNode } from "react";

export type ActionState = { ok?: boolean; message?: string; secret?: string } | null;

/** Form wrapper for server actions returning {ok, message}; shows the result inline. A `secret` is shown once with a copy button. */
export function ActionForm({ action, children, className }: { action: (prev: ActionState, fd: FormData) => Promise<ActionState>; children: ReactNode; className?: string }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.message && (
        <p className={`mt-2 text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`} role="status">{state.message}</p>
      )}
      {state?.secret && <SecretBox value={state.secret} />}
    </form>
  );
}

function SecretBox({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-marigold/15 px-3 py-2 text-sm">
      <span className="text-stone-600">Password:</span>
      <code className="select-all rounded bg-white px-2 py-0.5 font-mono text-base text-stone-900">{value}</code>
      <button type="button" className="text-xs underline" onClick={() => navigator.clipboard.writeText(value).then(() => setCopied(true), () => setCopied(false))}>
        {copied ? "Copied" : "Copy"}
      </button>
      <span className="w-full text-xs text-stone-500">Share it with them now. It won’t be shown again.</span>
    </div>
  );
}

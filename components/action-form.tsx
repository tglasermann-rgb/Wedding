"use client";
import { useActionState, type ReactNode } from "react";

export type ActionState = { ok?: boolean; message?: string } | null;

/** Form wrapper for server actions returning {ok, message}; shows the result inline. */
export function ActionForm({ action, children, className }: { action: (prev: ActionState, fd: FormData) => Promise<ActionState>; children: ReactNode; className?: string }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.message && (
        <p className={`mt-2 text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`} role="status">{state.message}</p>
      )}
    </form>
  );
}

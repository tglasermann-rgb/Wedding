import type { GuestWithContext } from "@/lib/types";

export function guest(p: Partial<GuestWithContext> & { id: string }): GuestWithContext {
  return {
    event_id: "e1", household_id: "h1", first_name: "Ana", last_name: null, email: null, phone: null, locale: null,
    is_child: false, is_plus_one: false, dietary: null, notes: null, email_opt_out: false, whatsapp_opt_out: false,
    household: { id: p.household_id ?? "h1", name: "Fam", token: "tok", side: null, tags: [] },
    rsvps: [],
    ...p,
  };
}

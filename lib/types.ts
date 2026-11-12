// Row types mirroring supabase/migrations. Keep in sync with the schema.
export type EventType = "wedding" | "bar_mitzvah" | "bat_mitzvah" | "brit_milah" | "quinceanera" | "generic";
export type EventStatus = "draft" | "active" | "archived";
export type MemberRole = "owner" | "editor" | "viewer";
export type RsvpStatus = "pending" | "yes" | "no" | "maybe";
export type RsvpChannel = "web" | "whatsapp" | "email" | "admin";
export type MessageChannel = "email" | "whatsapp";
export type MessageStatus =
  | "queued" | "sending" | "sent" | "delivered" | "opened" | "read"
  | "clicked" | "replied" | "failed" | "bounced" | "skipped";
export type TableShape = "round" | "square" | "rect";

export interface EventRow {
  id: string;
  slug: string;
  type: EventType;
  title: string;
  hosts: string | null;
  event_date: string | null;
  timezone: string;
  locale: string;
  status: EventStatus;
  rsvp_deadline: string | null;
  limits: { max_guests: number; max_messages: number };
  created_at: string;
}

export interface SessionRow {
  id: string;
  event_id: string;
  name: string;
  starts_at: string | null;
  venue_name: string | null;
  address: string | null;
  map_url: string | null;
  sort: number;
}

export interface HouseholdRow {
  id: string;
  event_id: string;
  name: string;
  token: string;
  max_plus_ones: number;
  side: string | null;
  tags: string[];
  notes: string | null;
}

export interface GuestRow {
  id: string;
  event_id: string;
  household_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  locale: string | null;
  is_child: boolean;
  is_plus_one: boolean;
  dietary: string | null;
  notes: string | null;
  email_opt_out: boolean;
  whatsapp_opt_out: boolean;
}

export interface RsvpRow {
  guest_id: string;
  session_id: string;
  event_id: string;
  status: RsvpStatus;
  channel: RsvpChannel | null;
  responded_at: string | null;
}

export interface TemplateRow {
  id: string;
  event_id: string;
  channel: MessageChannel;
  name: string;
  subject: string | null;
  body: string;
  wa_template_name: string | null;
  wa_language: string | null;
}

export interface MessageRow {
  id: string;
  event_id: string;
  guest_id: string;
  campaign_id: string | null;
  automation_id: string | null;
  channel: MessageChannel;
  to_address: string;
  subject: string | null;
  body: string | null;
  template_id: string | null;
  status: MessageStatus;
  provider_message_id: string | null;
  error: string | null;
  attempts: number;
  queued_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  replied_at: string | null;
}

export interface SeatingTableRow {
  id: string;
  layout_id: string;
  event_id: string;
  label: string;
  shape: TableShape;
  capacity: number;
  x: number;
  y: number;
  rotation: number;
}

export interface SeatAssignmentRow {
  layout_id: string;
  guest_id: string;
  table_id: string;
  event_id: string;
  seat_index: number | null;
}

export interface SeatingConstraintRow {
  id: string;
  event_id: string;
  kind: "together" | "apart";
  guest_a: string;
  guest_b: string;
}

/** A guest joined with household + rsvp info, used across dashboard/messaging. */
export interface GuestWithContext extends GuestRow {
  household: Pick<HouseholdRow, "id" | "name" | "token" | "side" | "tags">;
  rsvps: Pick<RsvpRow, "session_id" | "status">[];
}

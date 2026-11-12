import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyStatus } from "@/lib/messaging/dispatcher";
import type { MessageStatus } from "@/lib/types";

/**
 * Generic email provider webhook (delivery / bounce). Configure the provider to POST here with
 * ?secret=CRON_SECRET. Opens and clicks are tracked by our own pixel/redirect instead.
 * Accepts { emailId|id|message_id, event|type|status } or an array of them.
 */
const MAP: Record<string, MessageStatus> = {
  delivered: "delivered", delivery: "delivered", bounced: "bounced", bounce: "bounced", hard_bounce: "bounced",
  soft_bounce: "bounced", failed: "failed", dropped: "failed", opened: "opened", open: "opened", clicked: "clicked", click: "clicked",
};

export async function POST(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.nextUrl.searchParams.get("secret") !== process.env.CRON_SECRET)
    return new NextResponse("forbidden", { status: 403 });
  const body = await req.json().catch(() => null);
  const items = (Array.isArray(body) ? body : [body]).filter(Boolean) as Record<string, string>[];
  const sb = createAdminClient();
  for (const it of items) {
    const id = it.emailId ?? it.email_id ?? it.message_id ?? it.id;
    const status = MAP[String(it.event ?? it.type ?? it.status ?? "").toLowerCase()];
    if (id && status) await applyStatus(sb, { providerId: String(id) }, status, { payload: it });
  }
  return NextResponse.json({ ok: true });
}

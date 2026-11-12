import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyStatus } from "@/lib/messaging/dispatcher";
import { parseWhatsAppWebhook, sendWhatsAppText, verifyMetaSignature } from "@/lib/messaging/whatsapp";
import { parseReply, RSVP_LABELS } from "@/lib/rsvp/logic";
import { setGuestStatusAllSessions } from "@/lib/rsvp/service";

// Meta webhook verification handshake
export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === env.whatsappVerifyToken() && env.whatsappVerifyToken())
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  return new NextResponse("forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = env.whatsappAppSecret();
  if (!secret || !verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"), secret))
    return new NextResponse("invalid signature", { status: 401 });

  const sb = createAdminClient();
  const wa = env.whatsapp();
  for (const ev of parseWhatsAppWebhook(JSON.parse(raw))) {
    if (ev.kind === "status") {
      await applyStatus(sb, { providerId: ev.providerId }, ev.status, { error: ev.error, payload: ev, at: new Date(ev.timestamp * 1000) });
      continue;
    }
    // Reply: find the message it answers (context id), else the latest WhatsApp message to this number.
    let q = sb.from("messages").select("id, guest_id, event_id").eq("channel", "whatsapp");
    q = ev.contextId ? q.eq("provider_message_id", ev.contextId) : q.eq("to_address", ev.from).order("sent_at", { ascending: false }).limit(1);
    const { data: m } = await q.maybeSingle();
    if (!m) continue;
    await applyStatus(sb, { id: m.id }, "replied", { payload: ev, at: new Date(ev.timestamp * 1000) });

    const parsed = parseReply(ev.text);
    if (parsed === "stop") {
      await sb.from("guests").update({ whatsapp_opt_out: true }).eq("id", m.guest_id);
      if (wa) await sendWhatsAppText(wa, ev.from, "Done — you won't receive more WhatsApp messages from us.");
    } else if (parsed && parsed !== "pending") {
      await setGuestStatusAllSessions(sb, m.guest_id, m.event_id, parsed, "whatsapp");
      if (wa) await sendWhatsAppText(wa, ev.from, `Thank you! We recorded your answer: ${RSVP_LABELS[parsed]}.`);
    }
  }
  return NextResponse.json({ ok: true });
}

import { createHmac, timingSafeEqual } from "node:crypto";
import type { SendResult } from "./email-provider";

const GRAPH = "https://graph.facebook.com/v21.0";

export interface WhatsAppConfig { token: string; phoneNumberId: string; fetchImpl?: typeof fetch }

export interface WaTemplateSend {
  to: string;               // E.164 (with or without +)
  templateName: string;     // approved template name
  language: string;         // e.g. "es", "es_MX", "en_US"
  bodyParams: string[];     // values for {{1}}, {{2}}, ...
}

/** Send an approved template message (required outside the 24h customer-service window). */
export async function sendWhatsAppTemplate(cfg: WhatsAppConfig, m: WaTemplateSend): Promise<SendResult> {
  const f = cfg.fetchImpl ?? fetch;
  const payload = {
    messaging_product: "whatsapp",
    to: m.to.replace(/^\+/, ""),
    type: "template",
    template: {
      name: m.templateName,
      language: { code: m.language },
      components: m.bodyParams.length
        ? [{ type: "body", parameters: m.bodyParams.map((text) => ({ type: "text", text })) }]
        : [],
    },
  };
  return post(f, cfg, payload);
}

/** Free-form text reply (only valid within 24h of the guest's last message). */
export async function sendWhatsAppText(cfg: WhatsAppConfig, to: string, body: string): Promise<SendResult> {
  return post(cfg.fetchImpl ?? fetch, cfg, { messaging_product: "whatsapp", to: to.replace(/^\+/, ""), type: "text", text: { body } });
}

async function post(f: typeof fetch, cfg: WhatsAppConfig, payload: unknown): Promise<SendResult> {
  try {
    const res = await f(`${GRAPH}/${cfg.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message: string } };
    if (!res.ok) return { ok: false, error: data.error?.message ?? `HTTP ${res.status}`, retryable: res.status === 429 || res.status >= 500 };
    return { ok: true, providerId: data.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message, retryable: true };
  }
}

/** Verify Meta's X-Hub-Signature-256 header against the raw request body. */
export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(header.slice(7), "hex"), b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export type WaWebhookEvent =
  | { kind: "status"; providerId: string; status: "sent" | "delivered" | "read" | "failed"; timestamp: number; error?: string }
  | { kind: "reply"; from: string; text: string; contextId?: string; timestamp: number };

interface WaPayload {
  entry?: { changes?: { value?: {
    statuses?: { id: string; status: string; timestamp: string; errors?: { title?: string; message?: string }[] }[];
    messages?: {
      from: string; timestamp: string; type: string;
      text?: { body: string };
      button?: { text: string; payload?: string };
      interactive?: { button_reply?: { id: string; title: string } };
      context?: { id: string };
    }[];
  } }[] }[];
}

/** Flatten a Cloud API webhook payload into simple events. */
export function parseWhatsAppWebhook(body: WaPayload): WaWebhookEvent[] {
  const out: WaWebhookEvent[] = [];
  for (const e of body.entry ?? [])
    for (const c of e.changes ?? []) {
      const v = c.value ?? {};
      for (const s of v.statuses ?? [])
        if (["sent", "delivered", "read", "failed"].includes(s.status))
          out.push({
            kind: "status",
            providerId: s.id,
            status: s.status as "sent" | "delivered" | "read" | "failed",
            timestamp: Number(s.timestamp),
            error: s.errors?.[0]?.message ?? s.errors?.[0]?.title,
          });
      for (const m of v.messages ?? []) {
        const text = m.button?.payload || m.button?.text || m.interactive?.button_reply?.id || m.text?.body;
        if (text) out.push({ kind: "reply", from: `+${m.from.replace(/^\+/, "")}`, text, contextId: m.context?.id, timestamp: Number(m.timestamp) });
      }
    }
  return out;
}

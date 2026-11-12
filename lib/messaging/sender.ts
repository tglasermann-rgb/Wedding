import type { EmailProvider, EmailSend, SendResult } from "./email-provider";

/**
 * Sender (sender.net) transactional email API.
 * POST https://api.sender.net/v2/message/send  (Bearer token)
 * Open/click tracking is done by our own pixel + redirect so we do not depend on provider webhooks.
 */
export function senderProvider(opts: { apiKey: string; fromEmail: string; fromName: string; fetchImpl?: typeof fetch }): EmailProvider {
  const f = opts.fetchImpl ?? fetch;
  return {
    name: "sender",
    async send(msg: EmailSend): Promise<SendResult> {
      try {
        const res = await f("https://api.sender.net/v2/message/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            from: { email: opts.fromEmail, name: opts.fromName },
            to: { email: msg.to, name: msg.toName ?? "" },
            subject: msg.subject,
            html: msg.html,
            text: msg.text ?? "",
            ...(msg.replyTo ? { headers: { "Reply-To": msg.replyTo } } : {}),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { success?: boolean; emailId?: string; message?: string };
        if (!res.ok || data.success === false)
          return { ok: false, error: data.message ?? `HTTP ${res.status}`, retryable: res.status === 429 || res.status >= 500 };
        return { ok: true, providerId: data.emailId };
      } catch (e) {
        return { ok: false, error: (e as Error).message, retryable: true };
      }
    },
  };
}

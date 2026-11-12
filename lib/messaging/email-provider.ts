export interface EmailSend {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}
export interface SendResult { ok: boolean; providerId?: string; error?: string; retryable?: boolean }

export interface EmailProvider {
  name: string;
  send(msg: EmailSend): Promise<SendResult>;
}

/** Logs instead of sending. Used in dev/tests or when no provider key is configured. */
export const consoleEmailProvider: EmailProvider = {
  name: "console",
  async send(msg) {
    console.info(`[email:console] to=${msg.to} subject=${msg.subject}`);
    return { ok: true, providerId: `console-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  },
};

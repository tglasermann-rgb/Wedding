import type { MessageStatus } from "../types";

/** Status progression rank. A message never moves backwards (webhooks can arrive out of order). */
const RANK: Record<MessageStatus, number> = {
  queued: 0, sending: 1, skipped: 1, failed: 2, bounced: 2, sent: 3, delivered: 4, opened: 5, read: 5, clicked: 6, replied: 7,
};

export function nextStatus(current: MessageStatus, incoming: MessageStatus): MessageStatus {
  // failures only apply before delivery
  if ((incoming === "failed" || incoming === "bounced") && RANK[current] >= RANK.delivered) return current;
  return RANK[incoming] > RANK[current] || incoming === "failed" || incoming === "bounced" ? incoming : current;
}

export const STATUS_LABELS: Record<MessageStatus, string> = {
  queued: "En cola", sending: "Enviando", sent: "Enviado", delivered: "Entregado", opened: "Abierto", read: "Leído",
  clicked: "Click", replied: "Respondió", failed: "Falló", bounced: "Rebotó", skipped: "Omitido",
};

/** Timestamp column to set when a status is reached. */
export const STATUS_TIMESTAMP: Partial<Record<MessageStatus, string>> = {
  sent: "sent_at", delivered: "delivered_at", opened: "opened_at", read: "opened_at", clicked: "clicked_at", replied: "replied_at",
};

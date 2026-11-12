import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseWhatsAppWebhook, verifyMetaSignature } from "@/lib/messaging/whatsapp";

describe("whatsapp webhook", () => {
  it("parses statuses and button replies", () => {
    const ev = parseWhatsAppWebhook({
      entry: [{ changes: [{ value: {
        statuses: [{ id: "wamid.1", status: "read", timestamp: "1700000000" }, { id: "wamid.2", status: "failed", timestamp: "1", errors: [{ title: "bad" }] }],
        messages: [
          { from: "5215512345678", timestamp: "1700000001", type: "button", button: { text: "Yes", payload: "RSVP_YES" }, context: { id: "wamid.1" } },
          { from: "5215512345678", timestamp: "1700000002", type: "text", text: { body: "tal vez" } },
        ],
      } }] }],
    });
    expect(ev).toEqual([
      { kind: "status", providerId: "wamid.1", status: "read", timestamp: 1700000000, error: undefined },
      { kind: "status", providerId: "wamid.2", status: "failed", timestamp: 1, error: "bad" },
      { kind: "reply", from: "+5215512345678", text: "RSVP_YES", contextId: "wamid.1", timestamp: 1700000001 },
      { kind: "reply", from: "+5215512345678", text: "tal vez", contextId: undefined, timestamp: 1700000002 },
    ]);
  });
  it("verifies signatures", () => {
    const body = '{"a":1}';
    const sig = "sha256=" + createHmac("sha256", "secret").update(body).digest("hex");
    expect(verifyMetaSignature(body, sig, "secret")).toBe(true);
    expect(verifyMetaSignature(body, sig, "other")).toBe(false);
    expect(verifyMetaSignature(body, null, "secret")).toBe(false);
  });
});

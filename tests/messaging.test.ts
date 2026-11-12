import { describe, expect, it } from "vitest";
import { renderTemplate, templateVariables } from "@/lib/messaging/render-template";
import { guestStatus, resolveAudience } from "@/lib/messaging/audience";
import { nextStatus } from "@/lib/messaging/status";
import { guest } from "./fixtures";

describe("renderTemplate", () => {
  it("replaces variables and blanks unknown ones", () => {
    expect(renderTemplate("Hi {{ first_name }}, {{x}}!", { first_name: "Anna" })).toBe("Hi Anna, !");
  });
  it("lists variables in order without duplicates", () => {
    expect(templateVariables("{{a}} {{b}} {{a}}")).toEqual(["a", "b"]);
  });
});

describe("audience", () => {
  const gs = [
    guest({ id: "1", email: "a@x.com", rsvps: [{ session_id: "s1", status: "yes" }] }),
    guest({ id: "2", email: "b@x.com", rsvps: [{ session_id: "s1", status: "pending" }] }),
    guest({ id: "3", rsvps: [] }),
    guest({ id: "4", email: "d@x.com", email_opt_out: true }),
    guest({ id: "5", email: "e@x.com", household: { id: "h2", name: "B", token: "t", side: "novio", tags: ["trabajo"] } }),
  ];
  it("aggregates rsvp status", () => {
    expect(guestStatus(guest({ id: "x", rsvps: [{ session_id: "a", status: "no" }, { session_id: "b", status: "maybe" }] }))).toBe("maybe");
    expect(guestStatus(guest({ id: "x", rsvps: [{ session_id: "a", status: "no" }] }))).toBe("no");
    expect(guestStatus(guest({ id: "x" }))).toBe("pending");
  });
  it("filters by rsvp and reports guests without contact", () => {
    const r = resolveAudience(gs, { rsvp: ["pending"] }, "email");
    expect(r.recipients.map((x) => x.guest.id)).toEqual(["2", "5"]);
    expect(r.skippedNoContact.map((g) => g.id)).toEqual(["3", "4"]);
  });
  it("filters by tag and side", () => {
    expect(resolveAudience(gs, { tags: ["trabajo"] }, "email").recipients.map((x) => x.guest.id)).toEqual(["5"]);
    expect(resolveAudience(gs, { side: "novio" }, "email").recipients).toHaveLength(1);
  });
});

describe("nextStatus", () => {
  it("never regresses", () => {
    expect(nextStatus("read", "delivered")).toBe("read");
    expect(nextStatus("sent", "delivered")).toBe("delivered");
  });
  it("ignores failures after delivery", () => {
    expect(nextStatus("delivered", "failed")).toBe("delivered");
    expect(nextStatus("sending", "failed")).toBe("failed");
  });
});

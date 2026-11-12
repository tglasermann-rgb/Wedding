import { describe, expect, it } from "vitest";
import { parseReply, validateRsvp, type RsvpContext, type RsvpSubmission } from "@/lib/rsvp/logic";

const G = "11111111-1111-4111-8111-111111111111";
const S = "22222222-2222-4222-8222-222222222222";
const ctx: RsvpContext = {
  today: "2026-11-12", deadline: "2026-12-01", eventActive: true,
  householdGuestIds: [G], sessionIds: [S], maxPlusOnes: 1, existingPlusOnes: 0,
};
const sub = (p: Partial<RsvpSubmission> = {}): RsvpSubmission => ({
  token: "abcdefghij", responses: [{ guestId: G, sessionId: S, status: "yes" }], plusOnes: [], answers: [], dietary: [], ...p,
});

describe("validateRsvp", () => {
  it("accepts a valid submission", () => expect(validateRsvp(sub(), ctx)).toBeNull());
  it("rejects after deadline", () => expect(validateRsvp(sub(), { ...ctx, today: "2026-12-02" })).toBe("deadline_passed"));
  it("rejects guests outside the household", () =>
    expect(validateRsvp(sub({ responses: [{ guestId: S, sessionId: S, status: "yes" }] }), ctx)).toBe("unknown_guest"));
  it("enforces plus-one limit", () =>
    expect(validateRsvp(sub({ plusOnes: [{ firstName: "A" }, { firstName: "B" }] }), ctx)).toBe("too_many_plus_ones"));
  it("rejects inactive events", () => expect(validateRsvp(sub(), { ...ctx, eventActive: false })).toBe("event_inactive"));
});

describe("parseReply", () => {
  it.each([
    ["Yes", "yes"], ["Yes, I'll be there!", "yes"], ["count me in", "yes"], ["RSVP_YES", "yes"], ["No", "no"], ["Can't make it", "no"], ["Maybe", "maybe"], ["not sure", "maybe"], ["STOP", "stop"], ["Unsubscribe", "stop"], ["hello", null],
    ["Sí", "yes"], ["si!", "yes"], ["Tal vez", "maybe"], ["quizás", "maybe"],
  ])("%s -> %s", (input, out) => expect(parseReply(input)).toBe(out));
});

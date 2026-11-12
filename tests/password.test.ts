import { describe, expect, it } from "vitest";
import { generatePassword, MIN_PASSWORD } from "../lib/password";

describe("generatePassword", () => {
  it("makes readable grouped passwords without look-alike characters", () => {
    const p = generatePassword();
    expect(p).toMatch(/^[a-km-np-z2-9]{4}-[a-km-np-z2-9]{4}-[a-km-np-z2-9]{4}$/);
    expect(p.length).toBeGreaterThanOrEqual(MIN_PASSWORD);
    expect(p).not.toMatch(/[01ilo]/);
  });
  it("does not repeat", () => {
    expect(new Set(Array.from({ length: 50 }, () => generatePassword())).size).toBe(50);
  });
});

import { describe, expect, it } from "vitest";
import { PW_RULES, validatePassword } from "./passwordRules";

const rule = (id: string) => PW_RULES.find((r) => r.id === id)!;

describe("passwordRules", () => {
  it("len: at least 12 characters", () => {
    expect(rule("len").test("short")).toBe(false);
    expect(rule("len").test("exactlytwelve")).toBe(true);
  });

  it("upper / lower / digit", () => {
    expect(rule("upper").test("abc")).toBe(false);
    expect(rule("upper").test("Abc")).toBe(true);
    expect(rule("lower").test("ABC")).toBe(false);
    expect(rule("lower").test("aBC")).toBe(true);
    expect(rule("digit").test("abc")).toBe(false);
    expect(rule("digit").test("a1c")).toBe(true);
  });

  it("special: any non-alphanumeric", () => {
    expect(rule("special").test("abc123")).toBe(false);
    expect(rule("special").test("abc!23")).toBe(true);
  });

  it("valid aggregate is true only when every rule passes", () => {
    expect(validatePassword("short").valid).toBe(false);
    expect(validatePassword("LongEnough1!xx").valid).toBe(true);
    const v = validatePassword("alllowercase1!");
    expect(v.valid).toBe(false);
    expect(v.rules.find((r) => r.id === "upper")?.ok).toBe(false);
  });

  it("labels match wiki-be exactly", () => {
    expect(rule("len").label).toBe("At least 12 characters");
    expect(rule("special").label).toBe("A special character ( ! @ # $ % ^ & * ? - _ )");
  });
});

import { describe, expect, it } from "vitest";
import { lineDiff } from "./lineDiff";

const kinds = (before: string, after: string) =>
  lineDiff(before, after)
    .map((l) => `${l.kind}${l.text}`)
    .join("|");

describe("lineDiff", () => {
  it("keeps equal lines and marks changed ones", () => {
    expect(kinds("ΑΡΧΗ\nΓΡΑΨΕ 1\nΤΕΛΟΣ", "ΑΡΧΗ\nΓΡΑΨΕ 2\nΤΕΛΟΣ")).toBe(" ΑΡΧΗ|-ΓΡΑΨΕ 1|+ΓΡΑΨΕ 2| ΤΕΛΟΣ");
  });

  it("handles an empty side", () => {
    expect(kinds("", "α\nβ")).toBe("+α|+β");
    expect(kinds("α", "")).toBe("-α");
  });

  it("marks insertions without touching the rest", () => {
    expect(kinds("α\nγ", "α\nβ\nγ")).toBe(" α|+β| γ");
  });
});

import { describe, expect, it } from "vitest";
import { normalizeWord } from "./language";

describe("normalizeWord", () => {
  it("ignores case and accents like the interpreter", () => {
    expect(normalizeWord("αλλιώς_αν")).toBe("ΑΛΛΙΩΣ_ΑΝ");
    expect(normalizeWord("Ή")).toBe("Η");
    expect(normalizeWord("ψευδής")).toBe("ΨΕΥΔΗΣ");
  });
});

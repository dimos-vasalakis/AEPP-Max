import { describe, expect, it } from "vitest";
import { lastWord } from "./words";

describe("lastWord", () => {
  it("finds what /[\\p{L}_][\\p{L}\\p{N}_]*$/u finds", () => {
    const regex = /[\p{L}_][\p{L}\p{N}_]*$/u;
    for (const text of ["", "ΓΡΑΨΕ", "x <- αβ", "x <- 12", "x <- 12ab3", "ΑΝ x ", "a_1", "_", "Α[ι", "𝑥y", "1𝑥"]) {
      expect(lastWord(text)).toBe(regex.exec(text)?.[0]);
    }
  });

  it("takes linear time on a long run of letters", () => {
    const text = "α".repeat(200_000);
    const started = performance.now();
    expect(lastWord(text)).toBe(text);
    expect(performance.now() - started).toBeLessThan(500);
  });
});

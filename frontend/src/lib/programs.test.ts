import { describe, expect, it } from "vitest";
import { copyTitle, matchesSearch, MAX_TITLE, timeAgo, titleFromCode } from "./programs";

describe("titleFromCode", () => {
  it("takes the program's name", () => {
    expect(titleFromCode("ΠΡΟΓΡΑΜΜΑ Εμβαδόν\nΑΡΧΗ", "glossa")).toBe("Εμβαδόν");
  });

  it("skips blank lines and comments, and ignores case and accents", () => {
    expect(titleFromCode("\n! Άσκηση 3\n  πρόγραμμα Μέσος_Όρος\n", "glossa")).toBe("Μέσος_Όρος");
  });

  it("takes an algorithm's name in Αλγόριθμος", () => {
    expect(titleFromCode("Αλγόριθμος Μέγιστο\nΤέλος Μέγιστο", "pseudocode")).toBe("Μέγιστο");
    expect(titleFromCode("Αλγόριθμος Μέγιστο", "glossa")).toBe("");
  });

  it("is empty without a header or a name", () => {
    expect(titleFromCode("", "glossa")).toBe("");
    expect(titleFromCode("ΓΡΑΨΕ 1", "glossa")).toBe("");
    expect(titleFromCode("ΠΡΟΓΡΑΜΜΑ", "glossa")).toBe("");
  });

  it("fits the title limit", () => {
    expect(titleFromCode(`ΠΡΟΓΡΑΜΜΑ ${"α".repeat(200)}`, "glossa")).toHaveLength(MAX_TITLE);
  });
});

describe("copyTitle", () => {
  it("names the copy and fits the limit", () => {
    expect(copyTitle("Εμβαδόν")).toBe("Αντίγραφο του Εμβαδόν");
    expect(copyTitle("α".repeat(MAX_TITLE))).toHaveLength(MAX_TITLE);
  });
});

describe("matchesSearch", () => {
  it("ignores case and accents", () => {
    expect(matchesSearch("Μέσος Όρος", "μεσος ορ")).toBe(true);
    expect(matchesSearch("Μέσος Όρος", "ΜΈΓΙΣΤΟ")).toBe(false);
    expect(matchesSearch("Εμβαδόν", "  ")).toBe(true);
  });
});

describe("timeAgo", () => {
  const now = Date.parse("2026-10-26T12:00:00Z");
  const ago = (ms: number) => timeAgo(new Date(now - ms).toISOString(), now);
  const MIN = 60_000;

  it("says how long ago", () => {
    expect(ago(10_000)).toBe("μόλις τώρα");
    expect(ago(MIN)).toBe("πριν από 1 λεπτό");
    expect(ago(5 * MIN)).toBe("πριν από 5 λεπτά");
    expect(ago(60 * MIN)).toBe("πριν από 1 ώρα");
    expect(ago(3 * 60 * MIN)).toBe("πριν από 3 ώρες");
    expect(ago(30 * 60 * MIN)).toBe("χθες");
    expect(ago(3 * 24 * 60 * MIN)).toBe("πριν από 3 μέρες");
  });

  it("gives the date after a week", () => {
    expect(ago(30 * 24 * 60 * MIN)).toMatch(/2026/);
  });
});

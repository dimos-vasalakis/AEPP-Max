import { describe, expect, it } from "vitest";
import { isThemeId, THEME_INIT_SCRIPT, THEME_STORAGE_KEY, THEMES } from "./theme";

/** Run the inline <head> script against a fake page with `saved` in storage. */
function boot(saved: string | null): string | undefined {
  const html = { dataset: {} as Record<string, string> };
  const storage = { getItem: (key: string) => (key === THEME_STORAGE_KEY ? saved : null) };
  new Function("document", "localStorage", THEME_INIT_SCRIPT)({ documentElement: html }, storage);
  return html.dataset.theme;
}

describe("themes", () => {
  it("has the three themes, each with a unique id", () => {
    expect(THEMES.map((t) => t.id)).toEqual(["dark", "light", "classic"]);
    expect(isThemeId("light")).toBe(true);
    expect(isThemeId("neon")).toBe(false);
  });

  it("applies a saved theme before paint and ignores junk", () => {
    expect(boot("classic")).toBe("classic");
    expect(boot("light")).toBe("light");
    expect(boot("neon")).toBeUndefined();
    expect(boot(null)).toBeUndefined();
  });
});

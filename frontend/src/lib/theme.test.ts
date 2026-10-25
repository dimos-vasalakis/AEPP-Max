import { describe, expect, it } from "vitest";
import { CUSTOM_CSS_KEY } from "./customTheme";
import { isThemeId, THEME_INIT_SCRIPT, THEME_STORAGE_KEY, THEMES } from "./theme";

/** Run the inline <head> script against a fake page with `saved` in storage. */
function boot(saved: string | null, css: string | null = null): string | undefined {
  const html = { dataset: {} as Record<string, string>, style: { setProperty: () => {} } };
  const values: Record<string, string | null> = { [THEME_STORAGE_KEY]: saved, [CUSTOM_CSS_KEY]: css };
  const storage = { getItem: (key: string) => values[key] ?? null };
  const doc = {
    documentElement: html,
    head: { appendChild: () => {} },
    createElement: () => ({}),
  };
  new Function("document", "localStorage", THEME_INIT_SCRIPT)(doc, storage);
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

  it("applies a saved custom theme only if its CSS is saved too", () => {
    const css = '[data-theme="custom-abc123"]{--bg:#000000}';
    expect(boot("custom-abc123", css)).toBe("custom-abc123");
    expect(boot("custom-abc123")).toBeUndefined();
    expect(boot("custom-zzz", css)).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { BASE_COLORS, customThemesCss, isDarkColors, parseCustomThemes } from "./customTheme";

describe("custom themes", () => {
  it("tells dark from light by the background", () => {
    expect(isDarkColors(BASE_COLORS.dark)).toBe(true);
    expect(isDarkColors(BASE_COLORS.light)).toBe(false);
  });

  it("keeps valid themes and drops malformed ones", () => {
    const good = { id: "custom-abc123", name: "Δοκιμή", colors: BASE_COLORS.dark };
    const badColor = { ...good, id: "custom-bad", colors: { ...BASE_COLORS.dark, bg: "red; } body{" } };
    const badId = { ...good, id: 'x"] {}' };
    expect(parseCustomThemes([good, badColor, badId, null, 3])).toEqual([good]);
    expect(parseCustomThemes("nope")).toEqual([]);
  });

  it("gives a theme saved before the agent color the panel's", () => {
    const older: Record<string, string> = { ...BASE_COLORS.dark };
    delete older.agent;
    const [theme] = parseCustomThemes([{ id: "custom-old", name: "Παλιό", colors: { ...older, panel: "#123456" } }]);
    expect(theme.colors.agent).toBe("#123456");
    expect(customThemesCss([theme])).toContain("--agent-bg:#123456");
  });

  it("emits one rule per theme, keyed on its id", () => {
    const css = customThemesCss([{ id: "custom-abc123", name: "Δοκιμή", colors: BASE_COLORS.light }]);
    expect(css).toContain('[data-theme="custom-abc123"]{');
    expect(css).toContain("--bg:#ffffff");
    expect(css).toContain("color-scheme:light");
  });
});

// Themes the user makes in the Επεκτάσεις panel. A custom theme is a handful of
// colors; the rest of the tokens in globals.css are derived from them here.
// Server-safe: no React, no browser APIs.

export const COLOR_FIELDS = [
  { key: "bg", label: "Φόντο editor" },
  { key: "panel", label: "Φόντο πάνελ" },
  { key: "text", label: "Κείμενο" },
  { key: "accent", label: "Έμφαση (κουμπιά)" },
  { key: "keyword", label: "Λέξεις-κλειδιά" },
  { key: "type", label: "Τύποι" },
  { key: "number", label: "Αριθμοί" },
  { key: "operator", label: "Σύμβολα" },
  { key: "builtin", label: "Συναρτήσεις" },
  { key: "string", label: "Κείμενα" },
  { key: "comment", label: "Σχόλια" },
] as const;

export type ColorKey = (typeof COLOR_FIELDS)[number]["key"];
export type ThemeColors = Record<ColorKey, string>;

export type CustomTheme = {
  id: `custom-${string}`;
  name: string;
  colors: ThemeColors;
};

/** Starting points: the two built-in palettes the editor form can copy. */
export const BASE_COLORS: Record<"dark" | "light", ThemeColors> = {
  dark: {
    bg: "#0c0c0e",
    panel: "#131316",
    text: "#ececf1",
    accent: "#e5141b",
    keyword: "#ff6464",
    type: "#f2a65a",
    number: "#f2a65a",
    operator: "#c792ea",
    builtin: "#82aaff",
    string: "#a5d6a7",
    comment: "#6b6b76",
  },
  light: {
    bg: "#ffffff",
    panel: "#fbf6f6",
    text: "#1c1416",
    accent: "#e5141b",
    keyword: "#d0101a",
    type: "#c2410c",
    number: "#a16207",
    operator: "#7c3aed",
    builtin: "#1d4ed8",
    string: "#15803d",
    comment: "#9a8c8e",
  },
};

const HEX = /^#[0-9a-f]{6}$/i;
const ID = /^custom-[a-z0-9]{1,16}$/;

export const CUSTOM_THEMES_KEY = "aepp-custom-themes";
export const CUSTOM_CSS_KEY = "aepp-custom-css";
export const CUSTOM_STYLE_ID = "aepp-custom-themes";
export const MAX_CUSTOM_THEMES = 12;

export function isCustomId(value: unknown): value is CustomTheme["id"] {
  return typeof value === "string" && ID.test(value);
}

export function newCustomId(): CustomTheme["id"] {
  return `custom-${Math.random().toString(36).slice(2, 10).padEnd(8, "0")}`;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** A theme counts as dark when its editor background is. */
export function isDarkColors(colors: ThemeColors): boolean {
  return luminance(colors.bg) < 0.4;
}

/** The CSS variables a theme sets (also used inline for live previews). */
export function themeVars(colors: ThemeColors): Record<string, string> {
  const dark = isDarkColors(colors);
  return {
    "color-scheme": dark ? "dark" : "light",
    "--bg": colors.bg,
    "--panel": colors.panel,
    "--text": colors.text,
    "--accent": colors.accent,
    "--on-accent": luminance(colors.accent) > 0.4 ? "#000000" : "#ffffff",
    "--panel-2": "color-mix(in srgb, var(--panel) 92%, var(--text))",
    "--border": "color-mix(in srgb, var(--panel) 82%, var(--text))",
    "--muted": "color-mix(in srgb, var(--text) 58%, var(--bg))",
    "--ok": dark ? "#3fb950" : "#1a7f37",
    "--warn": dark ? "#d9a03f" : "#9a6700",
    "--danger": dark ? "#ff6b6b" : "#c4161c",
    "--active-line": "color-mix(in srgb, var(--text) 5%, transparent)",
    "--output-bg": "var(--panel)",
    "--editor-font": "var(--font-jetbrains), ui-monospace, monospace",
    "--syn-keyword": colors.keyword,
    "--syn-type": colors.type,
    "--syn-number": colors.number,
    "--syn-operator": colors.operator,
    "--syn-builtin": colors.builtin,
    "--syn-string": colors.string,
    "--syn-comment": colors.comment,
  };
}

/** One rule per theme. Only validated ids and hex colors reach the CSS. */
export function customThemesCss(themes: CustomTheme[]): string {
  return themes
    .map((t) => {
      const body = Object.entries(themeVars(t.colors))
        .map(([k, v]) => `${k}:${v}`)
        .join(";");
      return `[data-theme="${t.id}"]{${body}}`;
    })
    .join("");
}

/** Reads what localStorage held, dropping anything malformed. */
export function parseCustomThemes(raw: unknown): CustomTheme[] {
  if (!Array.isArray(raw)) return [];
  const themes: CustomTheme[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const { id, name, colors } = item as Record<string, unknown>;
    if (!isCustomId(id) || typeof name !== "string" || typeof colors !== "object" || !colors) continue;
    const given = colors as Record<string, unknown>;
    const valid = COLOR_FIELDS.every(({ key }) => typeof given[key] === "string" && HEX.test(given[key]));
    if (!valid) continue;
    themes.push({
      id,
      name: name.slice(0, 40) || "Δικό μου θέμα",
      colors: Object.fromEntries(COLOR_FIELDS.map(({ key }) => [key, given[key]])) as ThemeColors,
    });
    if (themes.length === MAX_CUSTOM_THEMES) break;
  }
  return themes;
}

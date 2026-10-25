// Editor font size limits and storage key. Server-safe: THEME_INIT_SCRIPT
// (lib/theme.ts) reads the saved size before paint; the 10 and 28 in that script
// must match FONT_SIZES.
export const FONT_SIZES = { min: 10, max: 28 };
export const DEFAULT_FONT_SIZE = 14;
export const FONT_SIZE_KEY = "aepp-font-size";

/** What the theme sets before the user picks a size (--font-size-default in globals.css). */
export function defaultFontSize(theme: string): number {
  return theme === "classic" ? 18 : DEFAULT_FONT_SIZE;
}

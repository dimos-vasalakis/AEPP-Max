// Color themes, offered as extensions (components/extensions/ExtensionsMenu.tsx).
// Each id has a token block in app/globals.css. Server-safe: no React here; the
// hook lives in useTheme.ts.

import { CUSTOM_CSS_KEY, CUSTOM_STYLE_ID, type CustomTheme } from "./customTheme";

export type BuiltinThemeId = "dark" | "light" | "classic";
/** Built-in ids, or `custom-…` for a theme the user made (lib/customTheme.ts). */
export type ThemeId = BuiltinThemeId | CustomTheme["id"];

export type ThemeInfo = {
  id: ThemeId;
  name: string;
  description: string;
  /** Picks CodeMirror's dark or light variants (diff view, tooltips). */
  dark: boolean;
};

export const THEMES: ThemeInfo[] = [
  {
    id: "dark",
    name: "AEPP Max Σκούρο",
    description: "Το προεπιλεγμένο: σκούρο φόντο με το κόκκινο του λογότυπου.",
    dark: true,
  },
  {
    id: "light",
    name: "AEPP Max Λευκό",
    description: "Το αντίθετο: λευκό φόντο και κόκκινο, τα χρώματα του λογότυπου.",
    dark: false,
  },
  {
    id: "classic",
    name: "Διερμηνευτής",
    description: "Τα χρώματα του Διερμηνευτή της ΓΛΩΣΣΑΣ: μπλε εντολές, κόκκινα σύμβολα, πράσινοι αριθμοί.",
    dark: false,
  },
];

export const DEFAULT_THEME: ThemeId = "dark";
export const THEME_STORAGE_KEY = "aepp-theme";

export function isThemeId(value: unknown): value is BuiltinThemeId {
  return THEMES.some((t) => t.id === value);
}

export function themeInfo(id: ThemeId): ThemeInfo {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/**
 * Inlined in <head> by the root layout: applies the saved theme before the
 * first paint, so a light theme never flashes dark on load. Custom themes ship
 * their generated CSS in localStorage, which the script injects first.
 */
export const THEME_INIT_SCRIPT = `try{var d=document,s=localStorage,c=s.getItem(${JSON.stringify(
  CUSTOM_CSS_KEY,
)}),t=s.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(c){var e=d.createElement("style");e.id=${JSON.stringify(
  CUSTOM_STYLE_ID,
)};e.textContent=c;d.head.appendChild(e)}if(${JSON.stringify(
  THEMES.map((t) => t.id),
)}.indexOf(t)>=0||(c&&t&&c.indexOf('[data-theme="'+t+'"]')>=0))d.documentElement.dataset.theme=t}catch(e){}`;

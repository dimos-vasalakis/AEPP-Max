// Color themes, offered as extensions (components/extensions/ExtensionsMenu.tsx).
// Each id has a token block in app/globals.css. Server-safe: no React here; the
// hook lives in useTheme.ts.

export type ThemeId = "dark" | "light" | "classic";

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
    name: "AEPP-Max Σκούρο",
    description: "Το προεπιλεγμένο: σκούρο φόντο με το κόκκινο του λογότυπου.",
    dark: true,
  },
  {
    id: "light",
    name: "AEPP-Max Λευκό",
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

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function themeInfo(id: ThemeId): ThemeInfo {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/**
 * Inlined in <head> by the root layout: applies the saved theme before the
 * first paint, so a light theme never flashes dark on load.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(${JSON.stringify(THEMES.map((t) => t.id))}.indexOf(t)>=0)document.documentElement.dataset.theme=t}catch(e){}`;

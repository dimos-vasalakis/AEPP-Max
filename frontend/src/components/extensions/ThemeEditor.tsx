"use client";

import { type CSSProperties, type FormEvent, useState } from "react";
import {
  BASE_COLORS,
  COLOR_FIELDS,
  type ColorKey,
  type CustomTheme,
  MAX_CUSTOM_THEMES,
  newCustomId,
  type ThemeColors,
  themeVars,
} from "@/lib/customTheme";
import { saveCustomTheme, setTheme, useCustomThemes } from "@/lib/useTheme";
import { ThemePreview } from "./ThemePreview";

// color-scheme only matters on the page itself, and React rejects it as a style key.
function previewVars(colors: ThemeColors): CSSProperties {
  const vars = themeVars(colors);
  delete vars["color-scheme"];
  return vars as CSSProperties;
}

type Props = {
  /** The theme being edited, or null to make a new one. */
  theme: CustomTheme | null;
  onDone: () => void;
};

/** Name and colors of a custom theme, with a live preview. Saving also activates it. */
export function ThemeEditor({ theme, onDone }: Props) {
  const count = useCustomThemes().length;
  const [name, setName] = useState(theme?.name ?? "");
  const [colors, setColors] = useState<ThemeColors>(theme?.colors ?? BASE_COLORS.dark);
  const full = !theme && count >= MAX_CUSTOM_THEMES;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (full) return;
    const saved: CustomTheme = {
      id: theme?.id ?? newCustomId(),
      name: name.trim() || "Δικό μου θέμα",
      colors,
    };
    saveCustomTheme(saved);
    setTheme(saved.id);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className="text-sm font-semibold">{theme ? "Επεξεργασία θέματος" : "Νέο θέμα"}</h2>

      <ThemePreview vars={previewVars(colors)} />

      <label className="block text-xs text-muted">
        Όνομα
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Δικό μου θέμα"
          className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
        />
      </label>

      {!theme && (
        <div className="flex items-center gap-2 text-xs text-muted">
          Ξεκίνα από:
          <button type="button" onClick={() => setColors(BASE_COLORS.dark)} className="rounded bg-panel-2 px-2 py-1 hover:text-text">
            Σκούρο
          </button>
          <button type="button" onClick={() => setColors(BASE_COLORS.light)} className="rounded bg-panel-2 px-2 py-1 hover:text-text">
            Λευκό
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {COLOR_FIELDS.map(({ key, label }) => (
          <ColorField
            key={key}
            label={label}
            value={colors[key]}
            onChange={(value) => setColors((c) => ({ ...c, [key as ColorKey]: value }))}
          />
        ))}
      </div>

      {full && <p className="text-xs text-danger">Έφτασες το όριο των {MAX_CUSTOM_THEMES} θεμάτων.</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={full}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-on-accent hover:brightness-110 disabled:opacity-50"
        >
          Αποθήκευση
        </button>
        <button type="button" onClick={onDone} className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-text">
          Ακύρωση
        </button>
      </div>
    </form>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-9 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
      />
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
}

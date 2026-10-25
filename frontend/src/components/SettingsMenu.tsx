"use client";

import { NavPopover } from "@/components/NavPopover";
import { DEFAULT_FONT_SIZE, FONT_SIZES, setFontSize, useFontSize } from "@/lib/useSettings";

/** The gear: preferences kept in this browser. Colors live in Επεκτάσεις. */
export function SettingsMenu() {
  const size = useFontSize();
  return (
    <NavPopover label="Ρυθμίσεις" icon={<GearIcon />}>
      <h2 className="mb-3 font-semibold">Ρυθμίσεις</h2>
      <div className="text-xs font-medium text-muted">Μέγεθος γραμμάτων</div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFontSize(size - 1)}
          disabled={size <= FONT_SIZES.min}
          aria-label="Μικρότερα γράμματα"
          className="h-8 w-8 rounded-md bg-panel-2 hover:text-text disabled:opacity-40"
        >
          −
        </button>
        <span className="w-12 text-center tabular-nums">{size} px</span>
        <button
          type="button"
          onClick={() => setFontSize(size + 1)}
          disabled={size >= FONT_SIZES.max}
          aria-label="Μεγαλύτερα γράμματα"
          className="h-8 w-8 rounded-md bg-panel-2 hover:text-text disabled:opacity-40"
        >
          +
        </button>
        {size !== DEFAULT_FONT_SIZE && (
          <button
            type="button"
            onClick={() => setFontSize(DEFAULT_FONT_SIZE)}
            className="ml-auto text-xs text-muted hover:text-text"
          >
            Επαναφορά
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">Ισχύει για τον editor και την οθόνη εκτέλεσης.</p>
    </NavPopover>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

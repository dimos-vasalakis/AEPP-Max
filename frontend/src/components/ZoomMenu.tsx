"use client";

import { NavPopover } from "@/components/NavPopover";
import { DEFAULT_FONT_SIZE } from "@/lib/fontSize";
import { FONT_SIZES, setFontSize, useFontSize } from "@/lib/useSettings";

/** The magnifying lens: font size, for everyone (the only place it's set). */
export function ZoomMenu() {
  return (
    <NavPopover label="Μέγεθος γραμμάτων" title="Μέγεθος γραμμάτων (μεγέθυνση)" icon={<LensIcon />}>
      <h2 className="mb-3 font-semibold">Μέγεθος γραμμάτων</h2>
      <FontSizeSettings />
    </NavPopover>
  );
}

/** Preferences kept in this browser. Colors live in Επεκτάσεις. */
function FontSizeSettings() {
  const chosen = useFontSize();
  const size = chosen ?? DEFAULT_FONT_SIZE;
  return (
    <>
      <div className="flex items-center gap-2">
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
        {chosen !== null && (
          <button
            type="button"
            onClick={() => setFontSize(null)}
            className="ml-auto text-xs text-muted hover:text-text"
          >
            Επαναφορά
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">Ισχύει για τον editor και την οθόνη εκτέλεσης.</p>
    </>
  );
}

function LensIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" />
      <path d="M10.5 7.5v6M7.5 10.5h6" strokeWidth="1.8" />
    </svg>
  );
}

export function GearIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

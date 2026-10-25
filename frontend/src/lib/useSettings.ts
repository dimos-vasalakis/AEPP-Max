"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_FONT_SIZE, FONT_SIZE_KEY, FONT_SIZES } from "./fontSize";

// Preferences kept in this browser (localStorage). The font size reaches the
// editor and the output screen through the --editor-font-size CSS variable.

export { DEFAULT_FONT_SIZE, FONT_SIZES };

const listeners = new Set<() => void>();
let size: number | null | undefined; // undefined: not read yet; null: the user never chose

function load(): number | null {
  if (size !== undefined) return size;
  try {
    const raw = localStorage.getItem(FONT_SIZE_KEY);
    const saved = Number(raw);
    size = raw !== null && Number.isInteger(saved) && saved >= FONT_SIZES.min && saved <= FONT_SIZES.max ? saved : null;
  } catch {
    size = null;
  }
  return size;
}

function apply() {
  const saved = load();
  if (saved === null) document.documentElement.style.removeProperty("--editor-font-size");
  else document.documentElement.style.setProperty("--editor-font-size", `${saved}px`);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  apply();
  return () => {
    listeners.delete(listener);
  };
}

/** The size the user chose, or null to follow the theme's default. */
export function useFontSize(): number | null {
  return useSyncExternalStore(subscribe, load, () => null);
}

/** Saves a size; null goes back to the theme's default. */
export function setFontSize(next: number | null) {
  size = next === null ? null : Math.min(FONT_SIZES.max, Math.max(FONT_SIZES.min, Math.round(next)));
  try {
    if (size === null) localStorage.removeItem(FONT_SIZE_KEY);
    else localStorage.setItem(FONT_SIZE_KEY, String(size));
  } catch {
    // Blocked storage: the size applies for this visit only.
  }
  apply();
  listeners.forEach((listener) => listener());
}

"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_FONT_SIZE, FONT_SIZE_KEY, FONT_SIZES } from "./fontSize";

// Preferences kept in this browser (localStorage). The font size reaches the
// editor and the output screen through the --editor-font-size CSS variable.

export { DEFAULT_FONT_SIZE, FONT_SIZES };

const listeners = new Set<() => void>();
let size: number | null = null;

function load(): number {
  if (size !== null) return size;
  try {
    const saved = Number(localStorage.getItem(FONT_SIZE_KEY));
    size = Number.isInteger(saved) && saved >= FONT_SIZES.min && saved <= FONT_SIZES.max ? saved : DEFAULT_FONT_SIZE;
  } catch {
    size = DEFAULT_FONT_SIZE;
  }
  return size;
}

function apply() {
  document.documentElement.style.setProperty("--editor-font-size", `${load()}px`);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  apply();
  return () => {
    listeners.delete(listener);
  };
}

export function useFontSize(): number {
  return useSyncExternalStore(subscribe, load, () => DEFAULT_FONT_SIZE);
}

export function setFontSize(next: number) {
  size = Math.min(FONT_SIZES.max, Math.max(FONT_SIZES.min, Math.round(next)));
  try {
    localStorage.setItem(FONT_SIZE_KEY, String(size));
  } catch {
    // Blocked storage: the size applies for this visit only.
  }
  apply();
  listeners.forEach((listener) => listener());
}

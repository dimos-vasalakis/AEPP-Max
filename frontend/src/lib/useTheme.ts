"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_THEME, isThemeId, THEME_STORAGE_KEY, type ThemeId } from "./theme";

// The active theme is the <html data-theme> attribute (set before paint by
// THEME_INIT_SCRIPT). This store lets components re-render when it changes.

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function current(): ThemeId {
  const id = document.documentElement.dataset.theme;
  return isThemeId(id) ? id : DEFAULT_THEME;
}

export function useTheme(): ThemeId {
  return useSyncExternalStore(subscribe, current, () => DEFAULT_THEME);
}

export function setTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // Private mode or blocked storage: the theme still applies for this visit.
  }
  listeners.forEach((listener) => listener());
}

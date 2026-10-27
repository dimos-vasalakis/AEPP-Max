"use client";

import { useSyncExternalStore } from "react";
import {
  CUSTOM_CSS_KEY,
  CUSTOM_STYLE_ID,
  CUSTOM_THEMES_KEY,
  type CustomTheme,
  customThemesCss,
  isDarkColors,
  parseCustomThemes,
} from "./customTheme";
import {
  DEFAULT_THEME,
  isThemeId,
  THEME_STORAGE_KEY,
  type ThemeId,
  type ThemeInfo,
  themeInfo,
} from "./theme";

// The active theme is the <html data-theme> attribute (set before paint by
// THEME_INIT_SCRIPT). This store lets components re-render when it changes.
// Custom themes live in localStorage; their CSS sits in a <style> element.

const listeners = new Set<() => void>();
const NO_THEMES: CustomTheme[] = [];
let customCache: CustomTheme[] | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

/** The installed app's title bar (<meta name="theme-color">) in the navbar's color. */
function syncThemeColor() {
  const color = getComputedStyle(document.documentElement).getPropertyValue("--panel").trim();
  if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  ensureStyle();
  syncThemeColor();
  return () => {
    listeners.delete(listener);
  };
}

function loadCustom(): CustomTheme[] {
  if (customCache) return customCache;
  try {
    customCache = parseCustomThemes(JSON.parse(localStorage.getItem(CUSTOM_THEMES_KEY) ?? "[]"));
  } catch {
    customCache = [];
  }
  return customCache;
}

/** (Re)writes the <style> holding the custom themes' rules. */
function ensureStyle() {
  let el = document.getElementById(CUSTOM_STYLE_ID);
  if (!el) {
    el = document.createElement("style");
    el.id = CUSTOM_STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = customThemesCss(loadCustom());
}

function current(): ThemeId {
  const id = document.documentElement.dataset.theme;
  return isThemeId(id) || loadCustom().some((t) => t.id === id) ? (id as ThemeId) : DEFAULT_THEME;
}

export function useTheme(): ThemeId {
  return useSyncExternalStore(subscribe, current, () => DEFAULT_THEME);
}

export function useCustomThemes(): CustomTheme[] {
  return useSyncExternalStore(subscribe, loadCustom, () => NO_THEMES);
}

/** The active theme's name and light/dark flavor, custom ones included. */
export function useThemeInfo(): ThemeInfo {
  const id = useTheme();
  const custom = useCustomThemes().find((t) => t.id === id);
  if (!custom) return themeInfo(id);
  return { id, name: custom.name, description: "", dark: isDarkColors(custom.colors) };
}

export function setTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // Private mode or blocked storage: the theme still applies for this visit.
  }
  syncThemeColor();
  notify();
}

function saveCustom(themes: CustomTheme[]) {
  customCache = themes;
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
    localStorage.setItem(CUSTOM_CSS_KEY, customThemesCss(themes));
  } catch {
    // Blocked storage: the theme lasts for this visit only.
  }
  ensureStyle();
  notify();
}

/** Adds a custom theme, or replaces the one with the same id. */
export function saveCustomTheme(theme: CustomTheme) {
  const themes = loadCustom();
  const exists = themes.some((t) => t.id === theme.id);
  saveCustom(exists ? themes.map((t) => (t.id === theme.id ? theme : t)) : [...themes, theme]);
}

export function deleteCustomTheme(id: CustomTheme["id"]) {
  if (current() === id) setTheme(DEFAULT_THEME);
  saveCustom(loadCustom().filter((t) => t.id !== id));
}

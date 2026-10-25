"use client";

import { useSyncExternalStore } from "react";

// The output screen's height in px, as the student dragged it, kept in this
// browser (localStorage). null: the layout's default.

const KEY = "aepp-output-height";
const listeners = new Set<() => void>();
let height: number | null | undefined; // undefined: not read yet

function load(): number | null {
  if (height !== undefined) return height;
  try {
    const saved = Number(localStorage.getItem(KEY));
    height = Number.isInteger(saved) && saved > 0 ? saved : null;
  } catch {
    height = null;
  }
  return height;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The dragged height, or null for the default. */
export function useOutputHeight(): number | null {
  return useSyncExternalStore(subscribe, load, () => null);
}

/** Sets the height; `save` stores it too (once a drag ends, not on every move). */
export function setOutputHeight(next: number | null, save = true) {
  height = next === null ? null : Math.round(next);
  if (save) {
    try {
      if (height === null) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, String(height));
    } catch {
      // Blocked storage: the height applies for this visit only.
    }
  }
  listeners.forEach((listener) => listener());
}

"use client";

// Installing the site as an app (app/manifest.ts). Chrome and Edge offer it through
// `beforeinstallprompt`, kept on window from page load by INSTALL_INIT_SCRIPT (the
// layout's <head>) until the student asks. Elsewhere there's no such event: Safari
// on iOS has Κοινοποίηση → Προσθήκη στην οθόνη Αφετηρίας, Safari on the Mac Αρχείο →
// Προσθήκη στο Dock, and Firefox on computers can't install apps at all.
import { useSyncExternalStore } from "react";
import { INSTALL_FLAG_KEY } from "./installScript";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __aeppInstall?: InstallPrompt | null;
  }
}

/** How the app can be installed here, if at all. */
export type InstallWay = "installed" | "prompt" | "ios" | "mac-safari" | "firefox" | "menu";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  // After the inline script's handlers, which keep the event and the mark.
  window.addEventListener("beforeinstallprompt", notify);
  window.addEventListener("appinstalled", notify);
}

function wasInstalled(): boolean {
  try {
    return localStorage.getItem(INSTALL_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

function way(): InstallWay {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  // Offered again means it isn't installed (any more): uninstalled since the mark.
  if (window.__aeppInstall) return "prompt";
  if (wasInstalled()) return "installed";
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, but has touch.
  if (/iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/Firefox\//.test(ua) && !/Android/.test(ua)) return "firefox";
  if (ua.includes("Mac") && /Version\/[\d.]+ Safari/.test(ua)) return "mac-safari";
  return "menu";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** null on the server, where it can't be known. */
export function useInstallWay(): InstallWay | null {
  return useSyncExternalStore(subscribe, way, () => null);
}

/** Shows the browser's own install dialog (when useInstallWay() is "prompt"); false
 * when the student said no or it couldn't be shown. */
export async function install(): Promise<boolean> {
  const prompt = window.__aeppInstall;
  if (!prompt) return false;
  window.__aeppInstall = null; // it can be shown only once
  notify();
  try {
    await prompt.prompt();
    return (await prompt.userChoice).outcome === "accepted";
  } catch {
    return false;
  }
}

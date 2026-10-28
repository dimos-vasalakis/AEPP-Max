"use client";

import { useState } from "react";
import { install, useInstallWay } from "@/lib/install";
import type { Lang } from "./copy";

const LABELS = {
  el: { installed: "✓ Η εφαρμογή είναι εγκατεστημένη", install: "Εγκατάσταση εφαρμογής" },
  en: { installed: "✓ The app is installed", install: "Install the app" },
};

/**
 * The landing page's «Εγκατάσταση εφαρμογής»: the browser's own install dialog
 * where there is one (Chrome, Edge), and otherwise a jump to the page's
 * instructions for this browser (#download).
 */
export function InstallButton({ className, lang }: { className: string; lang: Lang }) {
  const label = LABELS[lang];
  const way = useInstallWay();
  const [declined, setDeclined] = useState(false);
  if (way === "installed") {
    return (
      <span className={`${className} cursor-default opacity-80`} aria-disabled>
        {label.installed}
      </span>
    );
  }
  if (way === "prompt" && !declined) {
    return (
      <button
        type="button"
        onClick={() => void install().then((done) => setDeclined(!done))}
        className={className}
      >
        <DownloadIcon />
        {label.install}
      </button>
    );
  }
  // On the server (way === null) too: a plain link that works without JavaScript.
  return (
    <a href="#download" className={className}>
      <DownloadIcon />
      {label.install}
    </a>
  );
}

/** Which instructions fit this browser, highlighted among the four on the page. */
export function useInstallPlatform(): "computer" | "mac" | "android" | "ios" | null {
  const way = useInstallWay();
  if (way === null || way === "installed") return null;
  if (way === "ios") return "ios";
  if (way === "mac-safari") return "mac";
  if (typeof navigator !== "undefined" && /Android/.test(navigator.userAgent)) return "android";
  return "computer";
}

function DownloadIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  );
}

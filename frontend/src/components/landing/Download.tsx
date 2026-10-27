"use client";

import type { ReactNode } from "react";
import { InstallButton, useInstallPlatform } from "./InstallButton";

type Platform = "computer" | "mac" | "android" | "ios";

const PLATFORMS: { id: Platform; title: string; where: string; steps: ReactNode }[] = [
  {
    id: "computer",
    title: "Υπολογιστής",
    where: "Windows, Mac ή Linux · Chrome ή Edge",
    steps: (
      <>
        Πάτα <b>Κατέβασε την εφαρμογή</b> εδώ, ή το εικονίδιο εγκατάστασης στη γραμμή
        διευθύνσεων του browser.
      </>
    ),
  },
  {
    id: "mac",
    title: "Mac με Safari",
    where: "macOS Sonoma ή νεότερο",
    steps: (
      <>
        Μενού <b>Αρχείο</b> → <b>Προσθήκη στο Dock</b>.
      </>
    ),
  },
  {
    id: "android",
    title: "Android",
    where: "Chrome",
    steps: (
      <>
        Πάτα <b>Κατέβασε την εφαρμογή</b>, ή μενού ⋮ → <b>Εγκατάσταση εφαρμογής</b>.
      </>
    ),
  },
  {
    id: "ios",
    title: "iPhone και iPad",
    where: "Safari",
    steps: (
      <>
        Πάτα <b>Κοινοποίηση</b> (το τετράγωνο με το βέλος) → <b>Προσθήκη στην οθόνη
        Αφετηρίας</b>. Μέσα στην εφαρμογή, συνδέσου με Google.
      </>
    ),
  },
];

/** The four ways to install the app; the one for this browser stands out. */
export function Download() {
  const mine = useInstallPlatform();
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PLATFORMS.map((p) => (
        <div
          key={p.id}
          className={`relative rounded-2xl border p-5 ${
            mine === p.id ? "border-accent bg-accent/5" : "border-border bg-panel"
          }`}
        >
          {mine === p.id && (
            <span className="absolute -top-2.5 left-5 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-on-accent">
              Η συσκευή σου
            </span>
          )}
          <h3 className="font-semibold">{p.title}</h3>
          <p className="mt-0.5 text-xs text-muted">{p.where}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted [&_b]:font-medium [&_b]:text-text">
            {p.steps}
          </p>
          {mine === p.id && (p.id === "computer" || p.id === "android") && (
            <InstallButton className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-on-accent hover:brightness-110" />
          )}
        </div>
      ))}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import type { Lang } from "./copy";
import { InstallButton, useInstallPlatform } from "./InstallButton";

type Platform = "computer" | "mac" | "android" | "ios";
type Way = { id: Platform; title: string; where: string; steps: ReactNode };

const GREEK: Way[] = [
  {
    id: "computer",
    title: "Υπολογιστής",
    where: "Windows, Mac ή Linux · Chrome ή Edge",
    steps: (
      <>
        Επιλέξτε <b>Εγκατάσταση εφαρμογής</b> σε αυτή τη σελίδα ή το εικονίδιο εγκατάστασης
        στη γραμμή διευθύνσεων του browser.
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
        Επιλέξτε <b>Εγκατάσταση εφαρμογής</b> σε αυτή τη σελίδα ή από το μενού ⋮ του Chrome.
      </>
    ),
  },
  {
    id: "ios",
    title: "iPhone και iPad",
    where: "Safari",
    steps: (
      <>
        <b>Κοινοποίηση</b> (το τετράγωνο με το βέλος) → <b>Προσθήκη στην οθόνη
        Αφετηρίας</b>. Μέσα στην εφαρμογή, η σύνδεση γίνεται με Google.
      </>
    ),
  },
];

// The browsers' menus are named as they appear in English.
const ENGLISH: Way[] = [
  {
    id: "computer",
    title: "Computer",
    where: "Windows, Mac or Linux · Chrome or Edge",
    steps: (
      <>
        Choose <b>Install the app</b> on this page, or the install icon in the browser&apos;s
        address bar.
      </>
    ),
  },
  {
    id: "mac",
    title: "Mac with Safari",
    where: "macOS Sonoma or later",
    steps: (
      <>
        <b>File</b> menu → <b>Add to Dock</b>.
      </>
    ),
  },
  {
    id: "android",
    title: "Android",
    where: "Chrome",
    steps: (
      <>
        Choose <b>Install the app</b> on this page, or from Chrome&apos;s ⋮ menu.
      </>
    ),
  },
  {
    id: "ios",
    title: "iPhone and iPad",
    where: "Safari",
    steps: (
      <>
        <b>Share</b> (the square with the arrow) → <b>Add to Home Screen</b>. Inside the app,
        sign in with Google.
      </>
    ),
  },
];

/** The four ways to install the app; the one for this browser stands out. */
export function Download({ lang }: { lang: Lang }) {
  const mine = useInstallPlatform();
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {(lang === "en" ? ENGLISH : GREEK).map((p) => (
        <div
          key={p.id}
          className={`relative rounded-2xl border p-5 ${
            mine === p.id ? "border-accent bg-accent/5" : "border-border bg-panel"
          }`}
        >
          {mine === p.id && (
            <span className="absolute -top-2.5 left-5 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-on-accent">
              {lang === "en" ? "Your device" : "Η συσκευή σας"}
            </span>
          )}
          <h3 className="font-semibold">{p.title}</h3>
          <p className="mt-0.5 text-xs text-muted">{p.where}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted [&_b]:font-medium [&_b]:text-text">
            {p.steps}
          </p>
          {mine === p.id && (p.id === "computer" || p.id === "android") && (
            <InstallButton lang={lang} className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-on-accent hover:brightness-110" />
          )}
        </div>
      ))}
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { ContactDialog } from "@/components/ContactDialog";
import { NavPopover } from "@/components/NavPopover";
import { useState } from "react";
import { install, type InstallWay, useInstallWay } from "@/lib/install";

/** The logo button: opens the copyright notice, and from it the contact form. */
export function AboutMenu() {
  const [contact, setContact] = useState(false);
  return (
    <>
      <NavPopover
        label="Πνευματικά δικαιώματα"
        title="Σχετικά με το AEPP Max"
        icon={<Image src="/logo-cloud.png" alt="" width={26} height={26} priority />}
      >
        {(close) => (
          <>
            <div className="mb-3 flex items-center gap-2">
              <Image src="/logo-cloud.png" alt="" width={32} height={32} />
              <h2 className="font-semibold">AEPP Max</h2>
            </div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Πνευματικά δικαιώματα
            </h3>
            <p>© 2026 Dimos Vasalakis. Με άδεια MIT.</p>
            <p className="mt-2 text-xs text-muted">
              Εμπνευσμένο από τον Διερμηνευτή της ΓΛΩΣΣΑΣ του Άλκη Γεωργόπουλου. Το AEPP Max είναι
              ανεξάρτητη υλοποίηση, χωρίς κώδικα από αυτόν, και δεν σχετίζεται με τον δημιουργό του. Η
              ΓΛΩΣΣΑ είναι η γλώσσα του σχολικού βιβλίου «Ανάπτυξη Εφαρμογών σε Προγραμματιστικό
              Περιβάλλον».
            </p>
            <GetApp />
            {/* The menu closes and the form opens in the middle of the page. */}
            <button
              type="button"
              onClick={() => {
                close();
                setContact(true);
              }}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:border-accent"
            >
              <MailIcon />
              Επικοινωνία
            </button>
            <div className="mt-3 flex gap-4 text-xs">
              <Link href="/" className="text-accent hover:underline">
                Αρχική σελίδα
              </Link>
              <Link href="/privacy" className="text-accent hover:underline">
                Πολιτική απορρήτου
              </Link>
            </div>
          </>
        )}
      </NavPopover>
      {contact && <ContactDialog onClose={() => setContact(false)} />}
    </>
  );
}

/** An envelope (Lucide's "mail", ISC license). */
function MailIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent"
      aria-hidden
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

/** Installs AEPP Max as an app (lib/install.ts): its own window and icon, no app store. */
function GetApp() {
  const way = useInstallWay();
  // The student closed the browser's dialog: it can't be shown again on this page.
  const [declined, setDeclined] = useState(false);
  const box = "mt-3 rounded-md px-3 py-2 text-sm";
  if (way === null) return null;
  if (way === "installed") {
    return (
      <p className={`${box} bg-panel-2 text-muted`}>
        ✓ Το AEPP Max είναι εγκατεστημένο: άνοιξέ το από τις εφαρμογές σου.
      </p>
    );
  }
  if (way === "prompt") {
    return (
      <button
        type="button"
        onClick={() => void install().then((done) => setDeclined(!done))}
        className={`${box} w-full btn-primary bg-accent font-medium text-on-accent hover:brightness-110`}
      >
        Εγκατάσταση εφαρμογής
      </button>
    );
  }
  return (
    <p className={`${box} bg-panel-2 text-xs text-muted`}>
      <b className="text-text">Εγκατάσταση εφαρμογής:</b> {HOW[way]}
      {declined && " (ή ξαναφόρτωσε τη σελίδα για το κουμπί)"}
    </p>
  );
}

const HOW: Record<Exclude<InstallWay, "installed" | "prompt">, string> = {
  ios: "στο Safari, πάτα Κοινοποίηση (το τετράγωνο με το βέλος) και μετά «Προσθήκη στην οθόνη Αφετηρίας». Μέσα στην εφαρμογή συνδέσου με Google: ο σύνδεσμος του email ανοίγει στο Safari.",
  "mac-safari": "στο Safari, μενού Αρχείο → «Προσθήκη στο Dock».",
  firefox: "ο Firefox δεν εγκαθιστά εφαρμογές στον υπολογιστή· άνοιξε το AEPP Max σε Chrome ή Edge.",
  menu: "από το μενού του browser, «Εγκατάσταση εφαρμογής» ή «Προσθήκη στην αρχική οθόνη».",
};

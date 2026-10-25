"use client";

import { type ReactNode, useId } from "react";
import { NavPopover } from "@/components/NavPopover";

/** The info button: a short guide to the whole app, one foldable section per part. */
export function HelpMenu() {
  return (
    <NavPopover label="Οδηγός χρήσης" icon={<InfoIcon />} wide>
      <h2 className="font-semibold">Πώς δουλεύει το AEPP Max</h2>
      <p className="mt-1 text-xs text-muted">
        Γράφεις ΓΛΩΣΣΑ, την τρέχεις και, αν κολλήσεις, ρωτάς τον agent. Πάτα μια ενότητα για να
        ανοίξει.
      </p>
      <div className="mt-3 space-y-1.5">
        <Section title="Γράψιμο κώδικα" open>
          <li>
            Γράψε στον editor. Οι εντολές γίνονται κεφαλαίες χωρίς τόνους μόλις τις τελειώσεις
            (<Kbd>γραψε</Kbd> → <Kbd>ΓΡΑΨΕ</Kbd>), και η εσοχή μπαίνει μόνη της μέσα σε ΑΝ, ΓΙΑ,
            ΟΣΟ κ.λπ.
          </li>
          <li>
            Οι προτάσεις εμφανίζονται καθώς γράφεις, χωρίς να μετράνε τόνοι ή πεζά-κεφαλαία
            (<Kbd>πρ</Kbd> → ΠΡΟΓΡΑΜΜΑ). Με <Kbd>Tab</Kbd> διαλέγεις μία· σε ολόκληρο μπλοκ (ΑΝ … ΤΕΛΟΣ_ΑΝ),
            το <Kbd>Tab</Kbd> πηγαίνει από κενό σε κενό.
          </li>
          <li>
            Μετρητής ΓΙΑ με ελληνικό γράμμα γίνεται λατινικό (<Kbd>ι</Kbd> → <Kbd>i</Kbd>,{" "}
            <Kbd>ξ</Kbd> → <Kbd>j</Kbd>) σε όλο το πρόγραμμα.
          </li>
          <li>
            Λάθη: κόκκινη κυματιστή υπογράμμιση. Πήγαινε το ποντίκι από πάνω για να δεις τι φταίει
            και πώς διορθώνεται.
          </li>
          <li>
            Το εικονίδιο σελίδας, πρώτο στη μπάρα, σβήνει όλο τον κώδικα (ρωτάει πρώτα).{" "}
            <Kbd>Ctrl/Cmd+Z</Kbd> τον φέρνει πίσω.
          </li>
        </Section>
        <Section title="Εκτέλεση">
          <li>
            Πάτα ▶ ή <Kbd>F9</Kbd> ή <Kbd>Ctrl/Cmd+Enter</Kbd>.
          </li>
          <li>
            Όταν το πρόγραμμα φτάσει σε ΔΙΑΒΑΣΕ, γράψε την τιμή στην οθόνη εκτέλεσης και πάτα{" "}
            <Kbd>Enter</Kbd>. Οι τιμές που έδωσες φαίνονται μέσα στα αποτελέσματα.
          </li>
          <li>
            Πάνω δεξιά στην οθόνη φαίνεται πώς τελείωσε: Ολοκληρώθηκε, Σφάλμα (με τη γραμμή), ή
            Σταμάτησε (όριο), που συνήθως σημαίνει ατέρμονο βρόχο.
          </li>
          <li>
            Η <b>Αντιγραφή</b> παίρνει τα αποτελέσματα, ο <b>Καθαρισμός</b> αδειάζει την οθόνη.
          </li>
          <li>
            Σύρε το πάνω άκρο της οθόνης εκτέλεσης για να τη μεγαλώσεις ή να τη μικρύνεις· διπλό
            κλικ την επαναφέρει.
          </li>
        </Section>
        <Section title="Agent (χρειάζεται λογαριασμό)">
          <li>
            Γράψε στο πλαίσιο δεξιά και πάτα <Kbd>Enter</Kbd>. Βλέπει τον κώδικά σου και μπορεί να
            τον τρέξει.
          </li>
          <li>
            <b>Tutor</b>: εξηγεί και δίνει υποδείξεις, δεν αλλάζει τον κώδικα. <b>Agent</b>: γράφει
            κατευθείαν στον κώδικα, και <Kbd>Ctrl/Cmd+Z</Kbd> αναιρεί την αλλαγή.
          </li>
          <li>
            <Kbd>Shift+Tab</Kbd> στο πλαίσιο (ή κλικ στην ένδειξη από κάτω) αλλάζει τρόπο. Από
            Agent σε Tutor ξεκινά νέα συζήτηση.
          </li>
          <li>
            <Kbd>Esc</Kbd> σταματά μια απάντηση. Υπάρχει ημερήσιο όριο, που μηδενίζεται τα
            μεσάνυχτα.
          </li>
        </Section>
        <Section title="Εμφάνιση">
          <li>Ο φακός αλλάζει το μέγεθος των γραμμάτων στον editor και στην οθόνη εκτέλεσης.</li>
          <li>
            Οι <b>Επεκτάσεις</b> (πάνω δεξιά) έχουν θέματα: Σκούρο, Λευκό, Κλασικό, ή δικό σου με
            τα χρώματα που θέλεις.
          </li>
        </Section>
        <Section title="Λογαριασμός">
          <li>
            Με <b>Εγγραφή</b> (email, Google ή Apple) ανοίγει ο agent. Ο editor και η εκτέλεση
            δουλεύουν και χωρίς λογαριασμό.
          </li>
          <li>
            Στο μενού του λογαριασμού είναι οι <b>Ρυθμίσεις</b>, η αποσύνδεση και η διαγραφή του
            λογαριασμού.
          </li>
        </Section>
      </div>
    </NavPopover>
  );
}

function Section({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group rounded-md bg-panel-2">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-1.5 font-medium hover:text-text [&::-webkit-details-marker]:hidden">
        {title}
        <span className="ml-auto text-muted transition-transform group-open:rotate-90" aria-hidden>
          ›
        </span>
      </summary>
      <ul className="list-disc space-y-1.5 px-3 pb-3 pl-7 text-xs leading-relaxed">{children}</ul>
    </details>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-border bg-bg px-1 font-mono text-[0.7rem]">{children}</kbd>;
}

/** A round "i" badge in the theme's accent: lighter at the top, a darker rim. */
function InfoIcon() {
  // useId's colons aren't valid in url(#…).
  const fill = `info-fill-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "color-mix(in srgb, var(--accent) 60%, var(--on-accent))" }} />
          <stop offset="1" style={{ stopColor: "var(--accent)" }} />
        </linearGradient>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="10.5"
        fill={`url(#${fill})`}
        style={{ stroke: "color-mix(in srgb, var(--accent) 75%, black)", strokeWidth: 1.5 }}
      />
      <circle cx="12" cy="7" r="1.7" style={{ fill: "var(--on-accent)" }} />
      <path d="M9.5 10h3.5v7h1.5v1.8h-5V17h1.5v-5.2h-1.5z" style={{ fill: "var(--on-accent)" }} />
    </svg>
  );
}

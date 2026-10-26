"use client";

import { type ReactNode, useId, useState } from "react";
import { NavPopover } from "@/components/NavPopover";

/** The info button: a short guide to the whole app, one foldable section per part. */
export function HelpMenu() {
  return (
    <NavPopover label="Οδηγός χρήσης" icon={<InfoIcon />} wide>
      <Guide />
    </NavPopover>
  );
}

/** One section open at a time: opening another closes the last. Each opening of the panel starts at the first. */
function Guide() {
  const [open, setOpen] = useState<string | null>("Γράψιμο κώδικα");
  const toggle = (title: string) => setOpen(open === title ? null : title);
  const section = (title: string) => ({ title, open: open === title, onToggle: () => toggle(title) });
  return (
    <>
      <h2 className="font-semibold">Πώς δουλεύει το AEPP Max</h2>
      <p className="mt-1 text-xs text-muted">
        Γράφεις ΓΛΩΣΣΑ ή ψευδογλώσσα, την τρέχεις και, αν κολλήσεις, ρωτάς τον agent. Πάτα μια
        ενότητα για να ανοίξει.
      </p>
      <div className="mt-3 space-y-1.5">
        <Section {...section("Γράψιμο κώδικα")}>
          <li>
            Γράψε στον editor. Οι εντολές γίνονται κεφαλαίες χωρίς τόνους μόλις τις τελειώσεις
            (<Kbd>γραψε</Kbd> → <Kbd>ΓΡΑΨΕ</Kbd>), και η εσοχή μπαίνει μόνη της μέσα σε ΑΝ, ΓΙΑ,
            ΟΣΟ κ.λπ.
          </li>
          <li>
            Οι προτάσεις εμφανίζονται καθώς γράφεις, χωρίς να μετράνε τόνοι ή πεζά-κεφαλαία
            (<Kbd>πρ</Kbd> → ΠΡΟΓΡΑΜΜΑ). Με <Kbd>Tab</Kbd> ή <Kbd>Enter</Kbd> διαλέγεις μία, και
            μπαίνει και το κενό για την επόμενη λέξη· σε ολόκληρο μπλοκ (ΑΝ … ΤΕΛΟΣ_ΑΝ), το{" "}
            <Kbd>Tab</Kbd> πηγαίνει από κενό σε κενό.
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
            Το εικονίδιο σελίδας, δίπλα στον διακόπτη, σβήνει όλο τον κώδικα (ρωτάει πρώτα).{" "}
            <Kbd>Ctrl/Cmd+Z</Kbd> τον φέρνει πίσω. Αν ήταν αποθηκευμένο πρόγραμμα, μένει στα
            προγράμματά σου.
          </li>
        </Section>
        <Section {...section("Πρόγραμμα και Αλγόριθμος")}>
          <li>
            Ο διακόπτης, πρώτος στη μπάρα, αλλάζει ανάμεσα σε <b>Πρόγραμμα</b> (ΓΛΩΣΣΑ) και{" "}
            <b>Αλγόριθμο</b> (ψευδογλώσσα, όπως στο κεφάλαιο 2 του βιβλίου), αφού ρωτήσει. Κάθε
            φορά που ανοίγεις τη σελίδα ξεκινά στο Πρόγραμμα. Ο καθένας κρατά τον δικό του κώδικα.
          </li>
          <li>
            Ένας αλγόριθμος ξεκινά με <Kbd>Αλγόριθμος Όνομα</Kbd> και τελειώνει με{" "}
            <Kbd>Τέλος Όνομα</Kbd>· αν αλλάξεις το όνομα στη μία γραμμή, αλλάζει και στην άλλη.
            Δεν δηλώνεις μεταβλητές· οι λέξεις γράφονται όπως στο βιβλίο (<Kbd>τελος_αν</Kbd> →{" "}
            <Kbd>Τέλος_αν</Kbd>).
          </li>
          <li>
            Τα <Kbd>Δεδομένα // α, β //</Kbd> (δεύτερη γραμμή) ζητούνται από το πληκτρολόγιο όταν
            τρέχει, και τα <Kbd>Αποτελέσματα // γ //</Kbd> (πριν από το Τέλος) εμφανίζονται στο τέλος.
            Μέσα στα // γράφεις μόνο ονόματα.
          </li>
          <li>
            Περισσότεροι αλγόριθμοι γράφονται ο ένας κάτω από τον άλλο· τρέχει ο πρώτος. Οι άλλοι
            καλούνται με <Kbd>Κάλεσε Όνομα(δεδομένα, αποτελέσματα)</Kbd> ή, αν δίνουν ένα
            αποτέλεσμα, μέσα σε έκφραση: <Kbd>x ← Όνομα(δεδομένα)</Kbd>.
          </li>
        </Section>
        <Section {...section("Εκτέλεση")}>
          <li>
            Πάτα ▶ ή <Kbd>F9</Kbd> ή <Kbd>Ctrl/Cmd+Enter</Kbd>. Όσο τρέχει (και όσο περιμένει
            τιμή), το ▶ γίνεται ■: πάτα το για να σταματήσει.
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
            Η <b>Αντιγραφή</b> παίρνει τα αποτελέσματα, ο <b>Καθαρισμός</b> αδειάζει την οθόνη
            (ρωτάει πρώτα).
          </li>
          <li>
            Σύρε το πάνω άκρο της οθόνης εκτέλεσης για να τη μεγαλώσεις ή να τη μικρύνεις· διπλό
            κλικ την επαναφέρει.
          </li>
        </Section>
        <Section {...section("Πίνακας τιμών")}>
          <li>
            Πάτα το εικονίδιο πίνακα, δίπλα στο ▶ (ή <Kbd>F10</Kbd> ή{" "}
            <Kbd>Ctrl/Cmd+Shift+Enter</Kbd>). Το πρόγραμμα τρέχει και φτιάχνεται ο πίνακας τιμών:
            μία γραμμή για κάθε εντολή που εκτελέστηκε, μία στήλη για κάθε μεταβλητή.
          </li>
          <li>
            Οι γραμμές εμφανίζονται μία μία: πρόβλεψε την επόμενη και πάτα <Kbd>→</Kbd> για να τη
            δεις (<Kbd>←</Kbd> πίσω, <Kbd>Home</Kbd>/<Kbd>End</Kbd> αρχή και τέλος, κενό για
            αναπαραγωγή). Στον editor φωτίζεται η εντολή του βήματος και δίπλα της οι τιμές που
            άλλαξε.
          </li>
          <li>
            Όπως στο χαρτί, κάθε κελί γράφει τιμή μόνο όταν αλλάζει. Με το <b>Όλες οι τιμές</b>{" "}
            βλέπεις τι κρατά κάθε μεταβλητή σε κάθε βήμα. Φαίνονται επίσης η τιμή κάθε συνθήκης
            και ό,τι γράφει το ΓΡΑΨΕ.
          </li>
          <li>
            Στα υποπρογράμματα, οι μεταβλητές τους έχουν δικές τους στήλες, και μια γραμμή στην
            κλήση δείχνει τι πήραν οι παράμετροι.
          </li>
        </Section>
        <Section {...section("Αποθήκευση (χρειάζεται λογαριασμό)")}>
          <li>
            Πάτα <b>Αποθήκευση</b>, πάνω από τον editor, ή <Kbd>Ctrl/Cmd+S</Kbd>, και δώσε ένα
            όνομα. Από εκεί και πέρα κάθε <Kbd>Ctrl/Cmd+S</Kbd> αποθηκεύει τις αλλαγές
            (✓ Αποθηκεύτηκε)· μέχρι τότε η λωρίδα γράφει ● Μη αποθηκευμένες αλλαγές.
          </li>
          <li>
            Στο <b>«Τα προγράμματά μου»</b> τα βρίσκεις όλα, από όποια συσκευή συνδεθείς: άνοιγμα,
            μετονομασία, αντίγραφο, διαγραφή, αναζήτηση. Ένας αλγόριθμος ανοίγει στον Αλγόριθμο.
          </li>
          <li>Κλικ στο όνομα του προγράμματος, πάνω από τον editor, το μετονομάζει.</li>
        </Section>
        <Section {...section("Agent (χρειάζεται λογαριασμό)")}>
          <li>
            Γράψε στο πλαίσιο δεξιά (ένα κλικ οπουδήποτε στο panel σε πάει εκεί) και πάτα{" "}
            <Kbd>Enter</Kbd>. Βλέπει τον κώδικά σου και μπορεί να τον τρέξει· γράφει σε ΓΛΩΣΣΑ ή
            σε ψευδογλώσσα, ανάλογα με τον διακόπτη.
          </li>
          <li>
            <b>Tutor</b>: εξηγεί και δίνει υποδείξεις, δεν αλλάζει τον κώδικα. <b>Agent</b>: γράφει
            τον κώδικα για σένα. Γράψε <Kbd>/switch</Kbd> για να αλλάξεις· από Agent σε Tutor ξεκινά
            νέα συζήτηση.
          </li>
          <li>
            Στον Agent, <Kbd>Shift+Tab</Kbd> (ή κλικ στην ένδειξη από κάτω) αλλάζει ανάμεσα σε{" "}
            <b>αυτόματα</b> (η αλλαγή μπαίνει κατευθείαν, <Kbd>Ctrl/Cmd+Z</Kbd> την αναιρεί) και{" "}
            <b>με έγκριση</b> (βλέπεις πρώτα τι αλλάζει και <Kbd>Ctrl/Cmd+Enter</Kbd> την περνά).
          </li>
          <li>
            Γράψε <Kbd>/</Kbd> για όλες τις εντολές: <Kbd>/switch</Kbd>, <Kbd>/new</Kbd> (νέα
            συζήτηση· το κουμπί <b>Νέα</b> ρωτάει πρώτα), <Kbd>/help</Kbd>.
          </li>
          <li>
            <Kbd>Esc</Kbd> σταματά μια απάντηση. Υπάρχει ημερήσιο όριο, που μηδενίζεται τα
            μεσάνυχτα.
          </li>
        </Section>
        <Section {...section("Εμφάνιση")}>
          <li>Ο φακός αλλάζει το μέγεθος των γραμμάτων στον editor και στην οθόνη εκτέλεσης.</li>
          <li>
            Οι <b>Επεκτάσεις</b> (πάνω δεξιά) έχουν θέματα: Σκούρο, Λευκό, Κλασικό, ή δικό σου με
            τα χρώματα που θέλεις (και ξεχωριστό φόντο για τον Agent).
          </li>
        </Section>
        <Section {...section("Λογαριασμός")}>
          <li>
            Με <b>Εγγραφή</b> (email ή Google) ανοίγουν ο agent και η αποθήκευση. Ο editor,
            η εκτέλεση και ο πίνακας τιμών δουλεύουν και χωρίς λογαριασμό.
          </li>
          <li>
            Οι <b>Ρυθμίσεις</b> (μενού λογαριασμού, πάνω δεξιά) δείχνουν πόσο από το σημερινό όριο
            του agent έχεις χρησιμοποιήσει, τα στοιχεία του λογαριασμού σου και τη διαγραφή του.
          </li>
        </Section>
      </div>
    </>
  );
}

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const body = useId();
  return (
    <div className="rounded-md bg-panel-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={body}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left font-medium hover:text-text"
      >
        {title}
        <span className={`ml-auto text-muted transition-transform ${open ? "rotate-90" : ""}`} aria-hidden>
          ›
        </span>
      </button>
      {open && (
        <ul id={body} className="list-disc space-y-1.5 px-3 pb-3 pl-7 text-xs leading-relaxed">
          {children}
        </ul>
      )}
    </div>
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

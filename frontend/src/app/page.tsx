import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Download } from "@/components/landing/Download";
import { InstallButton } from "@/components/landing/InstallButton";
import { DIAMOND_LIMITS, DIAMOND_PRICE, FREE_LIMITS } from "@/lib/planLimits";

export const metadata: Metadata = {
  title: "AEPP Max · ΓΛΩΣΣΑ με AI βοηθό για τις Πανελλαδικές",
  description:
    "Γράψε και τρέξε ΓΛΩΣΣΑ και ψευδογλώσσα στον browser, δες τον πίνακα τιμών βήμα-βήμα και ρώτα τον AI βοηθό. Για την Πληροφορική Γ' Λυκείου.",
};

const CTA =
  "btn-primary inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-on-accent shadow-lg shadow-accent/20 transition hover:brightness-110";
const SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-panel px-5 py-3 font-semibold text-text transition hover:border-muted";

/**
 * The landing page: what AEPP Max is, and the two ways in, the editor in the
 * browser (/editor) or the installed app. Always in the dark theme, the brand's
 * look, whatever theme the editor uses (data-theme scopes the tokens, as /login
 * does with Λευκό).
 */
export default function Landing() {
  return (
    <div data-theme="dark" className="min-h-dvh bg-bg text-text">
      <Header />
      <main>
        <Hero />
        <Features />
        <Assistants />
        <Steps />
        <Pricing />
        <section id="download" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <SectionTitle
              kicker="Εφαρμογή"
              title="Κατέβασέ το σαν εφαρμογή"
              text="Με δικό του εικονίδιο και παράθυρο, σε υπολογιστή και κινητό. Χωρίς app store, και ενημερώνεται μόνο του."
            />
            <Download />
          </div>
        </section>
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image src="/logo-cloud.png" alt="" width={30} height={30} priority />
          AEPP Max
        </Link>
        <nav aria-label="Ενότητες" className="hidden gap-5 text-sm text-muted md:flex">
          <a href="#features" className="hover:text-text">
            Δυνατότητες
          </a>
          <a href="#pricing" className="hover:text-text">
            Diamond
          </a>
          <a href="#download" className="hover:text-text">
            Εφαρμογή
          </a>
          <a href="#faq" className="hover:text-text">
            Ερωτήσεις
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <Link href="/login" className="hidden text-muted hover:text-text sm:inline">
            Σύνδεση
          </Link>
          <Link
            href="/editor"
            className="btn-primary rounded-lg bg-accent px-3.5 py-2 font-semibold text-on-accent hover:brightness-110"
          >
            Άνοιξε τον editor
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* A soft red glow behind the hero, from the accent. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[36rem] bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--accent)_22%,transparent),transparent_65%)]"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            Πληροφορική Γ&apos; Λυκείου · Πανελλαδικές 2027
          </p>
          <h1 className="mt-5 text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
            Γράψε, τρέξε και κατάλαβε{" "}
            <span className="text-accent">ΓΛΩΣΣΑ</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Ο editor για τις Πανελλαδικές: τρέχει ΓΛΩΣΣΑ και ψευδογλώσσα όπως το σχολικό βιβλίο,
            δείχνει τον πίνακα τιμών βήμα-βήμα και έχει AI βοηθό που ξέρει τα θέματα των
            εξετάσεων.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/editor" className={CTA}>
              Συνέχεια στον browser
              <span aria-hidden>→</span>
            </Link>
            <InstallButton className={SECONDARY} />
          </div>
          <p className="mt-4 text-sm text-muted">
            Δωρεάν · Ο editor δουλεύει και χωρίς λογαριασμό
          </p>
        </div>
        <EditorPreview />
      </div>
    </section>
  );
}

/** A picture of the editor, drawn with the theme's own syntax colors (not a screenshot). */
function EditorPreview() {
  const k = "font-semibold text-[var(--syn-keyword)]";
  const t = "text-[var(--syn-type)]";
  const s = "text-[var(--syn-string)]";
  const n = "text-[var(--syn-number)]";
  const o = "text-[var(--syn-operator)]";
  const lines: ReactNode[] = [
    <><span className={k}>ΠΡΟΓΡΑΜΜΑ</span> Μέσος_όρος</>,
    <><span className={k}>ΜΕΤΑΒΛΗΤΕΣ</span></>,
    <>  <span className={t}>ΑΚΕΡΑΙΕΣ</span>: i, x, σ</>,
    <><span className={k}>ΑΡΧΗ</span></>,
    <>  σ <span className={o}>&lt;-</span> <span className={n}>0</span></>,
    <>  <span className={k}>ΓΙΑ</span> i <span className={k}>ΑΠΟ</span> <span className={n}>1</span> <span className={k}>ΜΕΧΡΙ</span> <span className={n}>3</span></>,
    <>    <span className={k}>ΔΙΑΒΑΣΕ</span> x</>,
    <>    σ <span className={o}>&lt;-</span> σ <span className={o}>+</span> x</>,
    <>  <span className={k}>ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ</span></>,
    <>  <span className={k}>ΓΡΑΨΕ</span> <span className={s}>&apos;Μέσος όρος:&apos;</span>, σ <span className={o}>/</span> <span className={n}>3</span></>,
    <><span className={k}>ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ</span></>,
  ];
  const current = 7; // the step shown: σ <- σ + x
  return (
    <div className="relative" aria-hidden>
      <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl shadow-black/50">
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="ml-3 text-xs text-muted">Μέσος_όρος</span>
        </div>
        <div className="grid sm:grid-cols-[1fr_11rem]">
          <pre className="overflow-hidden bg-bg pt-3 pb-16 font-[family-name:var(--font-jetbrains)] text-[12.5px] leading-6">
            {lines.map((line, i) => (
              <div
                key={i}
                className={`flex pr-4 ${i === current ? "bg-accent/15 shadow-[inset_3px_0_var(--accent)]" : ""}`}
              >
                <span className="w-9 shrink-0 pr-3 text-right text-muted/60 select-none">{i + 1}</span>
                <span className="whitespace-pre">{line}</span>
                {i === current && <span className="ml-3 text-accent italic">σ = 12</span>}
              </div>
            ))}
          </pre>
          <div className="hidden border-l border-border p-3 text-xs sm:block">
            <p className="font-semibold">Μεταβλητές</p>
            <table className="mt-2 w-full font-[family-name:var(--font-jetbrains)]">
              <tbody>
                {[
                  ["i", "2"],
                  ["x", "7"],
                  ["σ", "12"],
                ].map(([name, value]) => (
                  <tr key={name} className="border-t border-border">
                    <td className="py-1.5 text-muted">{name}</td>
                    <td className={`py-1.5 text-right ${name === "σ" ? "font-semibold text-accent" : ""}`}>
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 font-semibold">Οθόνη</p>
            <p className="mt-1 font-[family-name:var(--font-jetbrains)] text-muted">
              5<br />7
            </p>
          </div>
        </div>
      </div>
      {/* The tutor, answering beside the editor. */}
      <div className="absolute -bottom-8 -left-2 flex max-w-xs items-start gap-3 rounded-xl border border-border bg-panel-2 p-3 shadow-xl sm:-left-8">
        <Image src="/mascot-tutor.png" alt="" width={40} height={40} className="h-10 w-auto shrink-0" />
        <p className="text-xs leading-relaxed">
          <span className="font-semibold text-warn">Tutor</span>
          <span className="text-muted"> · </span>
          Το σ κρατά το άθροισμα. Τι τιμή θα έχει μετά το 3ο ΔΙΑΒΑΣΕ;
        </p>
      </div>
    </div>
  );
}

const FEATURES: { title: string; text: string; icon: ReactNode }[] = [
  {
    title: "ΓΛΩΣΣΑ και ψευδογλώσσα",
    text: "Τρέχει προγράμματα και αλγορίθμους όπως τα ορίζει το σχολικό βιβλίο, με υποπρογράμματα, πίνακες και ΔΙΑΒΑΣΕ.",
    icon: <path d="M8 6l-6 6 6 6M16 6l6 6-6 6" />,
  },
  {
    title: "Λάθη στα ελληνικά",
    text: "Βλέπεις το λάθος την ώρα που γράφεις, στη σωστή γραμμή, με εξήγηση για το πώς διορθώνεται.",
    icon: <path d="M12 8v5M12 16.5v.5M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />,
  },
  {
    title: "Πίνακας τιμών βήμα-βήμα",
    text: "Πρόβλεψε την επόμενη γραμμή και μετά δες την. Μια στήλη για κάθε μεταβλητή, όπως τον γράφεις στο χαρτί.",
    icon: <path d="M3 5h18v14H3zM3 10h18M9 5v14" />,
  },
  {
    title: "Μεταβλητές",
    text: "Οι τιμές όλων των μεταβλητών στο σημείο που σταμάτησε η εκτέλεση, ή στο βήμα του πίνακα τιμών.",
    icon: <path d="M4 7h16M4 12h16M4 17h10" />,
  },
  {
    title: "Γράφεις πιο γρήγορα",
    text: "Αυτόματη συμπλήρωση εντολών και δομών, κεφαλαία μόνα τους, σωστές εσοχές, ακόμα κι αν το πληκτρολόγιο είναι στα αγγλικά.",
    icon: <path d="M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M8 14h8" />,
  },
  {
    title: "Όπως σου αρέσει",
    text: "Αποθήκευσε τα προγράμματά σου, διάλεξε θέμα (και το Κλασικό, με την εμφάνιση του Διερμηνευτή της ΓΛΩΣΣΑΣ) ή φτιάξε δικό σου.",
    icon: <path d="M12 3a9 9 0 100 18c1 0 1.5-.8 1.5-1.5 0-1.2-1-1.5-1-2.5S13.3 15 14.5 15H17a4 4 0 004-4c0-4.4-4-8-9-8zM7.5 11h.01M10 7.5h.01M15 7.5h.01" />,
  },
];

function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionTitle
          kicker="Δυνατότητες"
          title="Όλα όσα χρειάζεσαι για τα θέματα Γ και Δ"
          text="Ένα περιβάλλον φτιαγμένο για τον τρόπο που εξετάζεται η Πληροφορική."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-panel p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {f.icon}
                </svg>
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Assistants() {
  return (
    <section className="border-t border-border bg-panel/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionTitle
          kicker="AI βοηθός"
          title="Ένας καθηγητής δίπλα στον κώδικά σου"
          text="Βλέπει τον κώδικα στον editor και τον τρέχει στον πραγματικό διερμηνευτή πριν σου πει τι κάνει. Ξέρει τι ζητούν τα θέματα των Πανελλαδικών."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Assistant
            mascot="/mascot-tutor.png"
            name="Tutor"
            color="text-warn"
            text="Σε βοηθά να βρεις τη λύση μόνος σου: σου δείχνει πού είναι το λάθος, σου κάνει την κατάλληλη ερώτηση και σου εξηγεί τη θεωρία. Τη λύση σού τη δίνει μόνο αν τη ζητήσεις."
          />
          <Assistant
            mascot="/mascot-agent.png"
            name="Agent"
            color="text-accent"
            text="Γράφει και διορθώνει τον κώδικα για σένα, με σχόλια που εξηγούν κάθε κομμάτι. Τις αλλαγές μπορείς να τις εγκρίνεις πρώτα, και η αναίρεση είναι ένα Ctrl+Z."
          />
        </div>
      </div>
    </section>
  );
}

function Assistant({
  mascot,
  name,
  color,
  text,
}: {
  mascot: string;
  name: string;
  color: string;
  text: string;
}) {
  return (
    <div className="flex gap-5 rounded-2xl border border-border bg-panel p-6">
      <Image src={mascot} alt="" width={72} height={72} className="h-16 w-auto shrink-0" />
      <div>
        <h3 className={`text-lg font-semibold ${color}`}>{name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
      </div>
    </div>
  );
}

function Steps() {
  const steps = [
    ["Γράψε", "Άνοιξε τον editor και γράψε το πρόγραμμά σου, ή ζήτα από τον Agent να το ξεκινήσει."],
    ["Τρέξε", "Πάτα ▶ ή F9. Δίνεις τις τιμές του ΔΙΑΒΑΣΕ στην οθόνη εκτέλεσης, όπως στον υπολογιστή των εξετάσεων."],
    ["Κατάλαβε", "Πάρε τον πίνακα τιμών βήμα-βήμα και ρώτα τον Tutor ό,τι δεν καταλαβαίνεις."],
  ];
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionTitle kicker="Πώς δουλεύει" title="Τρία βήματα, κανένα setup" />
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map(([title, text], i) => (
            <li key={title} className="rounded-2xl border border-border bg-panel p-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-on-accent">
                {i + 1}
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Pricing() {
  const free = [
    "Editor, εκτέλεση και πίνακας τιμών χωρίς όριο",
    `Tutor και Agent: ${FREE_LIMITS.daily_tokens / 1000}k tokens τη μέρα`,
    `${FREE_LIMITS.max_programs} αποθηκευμένα προγράμματα`,
    `${FREE_LIMITS.max_themes} δικά σου θέματα`,
  ];
  const diamond = [
    "Όλα όσα έχει το δωρεάν",
    "Το καλύτερο μοντέλο για τον Tutor και τον Agent",
    `${DIAMOND_LIMITS.daily_tokens / 1000}k tokens τη μέρα και /effort high`,
    `${DIAMOND_LIMITS.max_programs} αποθηκευμένα προγράμματα`,
    `${DIAMOND_LIMITS.max_themes} δικά σου θέματα και μασκότ με διαμάντια`,
  ];
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-border bg-panel/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionTitle
          kicker="Πλάνα"
          title="Ξεκίνα δωρεάν"
          text="Ο editor είναι δωρεάν για πάντα. Το Diamond δίνει περισσότερο και καλύτερο AI βοηθό."
        />
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
          <PlanCard name="Δωρεάν" price="$0" items={free} cta={{ href: "/editor", label: "Ξεκίνα τώρα" }} />
          <PlanCard
            name="Diamond 💎"
            price={DIAMOND_PRICE}
            items={diamond}
            cta={{ href: "/login?mode=signup", label: "Απόκτησε το Diamond" }}
            highlight
            note="Από το μενού του λογαριασμού στον editor. Ακυρώνεις όποτε θέλεις."
          />
        </div>
      </div>
    </section>
  );
}

function PlanCard({
  name,
  price,
  items,
  cta,
  highlight = false,
  note,
}: {
  name: string;
  price: string;
  items: string[];
  cta: { href: string; label: string };
  highlight?: boolean;
  note?: string;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-7 ${
        highlight ? "border-accent bg-panel shadow-xl shadow-accent/10" : "border-border bg-panel"
      }`}
    >
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="mt-2 text-3xl font-bold tracking-tight">{price}</p>
      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span className="text-accent" aria-hidden>
              ✓
            </span>
            <span className="text-muted">{item}</span>
          </li>
        ))}
      </ul>
      <Link href={cta.href} className={`mt-7 ${highlight ? CTA : SECONDARY}`}>
        {cta.label}
      </Link>
      {note && <p className="mt-3 text-center text-xs text-muted">{note}</p>}
    </div>
  );
}

const FAQ: [string, ReactNode][] = [
  [
    "Είναι δωρεάν;",
    "Ναι. Ο editor, η εκτέλεση, ο πίνακας τιμών και οι Μεταβλητές είναι δωρεάν και χωρίς όριο. Ο AI βοηθός έχει ημερήσιο όριο στο δωρεάν πλάνο και μεγαλύτερο στο Diamond.",
  ],
  [
    "Χρειάζεται λογαριασμός;",
    "Όχι για τον editor. Λογαριασμό (με email ή Google) χρειάζεσαι για τον AI βοηθό και για να αποθηκεύεις προγράμματα.",
  ],
  [
    "Τρέχει τα ίδια προγράμματα με τον Διερμηνευτή της ΓΛΩΣΣΑΣ;",
    "Αυτός είναι ο στόχος: δέχεται ό,τι ορίζει το σχολικό βιβλίο και απορρίπτει τα υπόλοιπα, με μηνύματα λάθους στα ελληνικά. Ακολουθεί τον Διερμηνευτή της ΓΛΩΣΣΑΣ του Άλκη Γεωργόπουλου όπου το βιβλίο δεν λέει κάτι, αλλά είναι ανεξάρτητη υλοποίηση, χωρίς κώδικα από αυτόν.",
  ],
  [
    "Δουλεύει στο κινητό;",
    "Ναι, στον browser του κινητού ή σαν εφαρμογή (δες παραπάνω). Χρειάζεται σύνδεση στο internet, γιατί ο διερμηνευτής και ο βοηθός τρέχουν στον διακομιστή.",
  ],
  [
    "Μπορώ να εμπιστευτώ τον AI βοηθό;",
    "Τρέχει τον κώδικα στον πραγματικό διερμηνευτή πριν σου πει τι κάνει, και ακολουθεί τις συμβάσεις των θεμάτων. Μπορεί όμως να κάνει λάθη: έλεγχε ό,τι σου λέει, ειδικά πριν από τις εξετάσεις.",
  ],
  [
    "Τι γίνεται με τα δεδομένα μου;",
    <>
      Κρατάμε μόνο ό,τι χρειάζεται για να λειτουργεί η υπηρεσία, χωρίς διαφημίσεις. Όλα σβήνονται
      με τη διαγραφή του λογαριασμού. Δες την{" "}
      <Link href="/privacy" className="text-accent hover:underline">
        πολιτική απορρήτου
      </Link>
      .
    </>,
  ],
];

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <SectionTitle kicker="Ερωτήσεις" title="Συχνές ερωτήσεις" />
        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-panel">
          {FAQ.map(([question, answer]) => (
            <details key={question} className="group px-6 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {question}
                <span className="text-muted transition group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-panel px-6 py-14 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--accent)_18%,transparent),transparent_60%)]"
          />
          <Image src="/logo-cloud.png" alt="" width={56} height={56} className="relative mx-auto" />
          <h2 className="relative mt-5 text-3xl font-bold tracking-tight">Έτοιμος για τις Πανελλαδικές;</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-muted">
            Άνοιξε τον editor και τρέξε το πρώτο σου πρόγραμμα σε λιγότερο από ένα λεπτό.
          </p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/editor" className={CTA}>
              Συνέχεια στον browser
              <span aria-hidden>→</span>
            </Link>
            <InstallButton className={SECONDARY} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <div className="flex items-center gap-2 font-semibold text-text">
            <Image src="/logo-cloud.png" alt="" width={22} height={22} />
            AEPP Max
          </div>
          <p className="mt-3 text-xs leading-relaxed">
            Εμπνευσμένο από τον Διερμηνευτή της ΓΛΩΣΣΑΣ του Άλκη Γεωργόπουλου. Ανεξάρτητη υλοποίηση,
            χωρίς κώδικα από αυτόν, και δεν σχετίζεται με τον δημιουργό του.
          </p>
        </div>
        <div className="flex gap-6">
          <Link href="/editor" className="hover:text-text">
            Editor
          </Link>
          <Link href="/privacy" className="hover:text-text">
            Πολιτική απορρήτου
          </Link>
          <span>© 2026 Dimos Vasalakis</span>
        </div>
      </div>
    </footer>
  );
}

function SectionTitle({ kicker, title, text }: { kicker: string; title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold text-accent">{kicker}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 leading-relaxed text-muted">{text}</p>}
    </div>
  );
}

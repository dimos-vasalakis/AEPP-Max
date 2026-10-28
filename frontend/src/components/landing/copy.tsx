import Link from "next/link";
import type { ReactNode } from "react";
import { DIAMOND_AMOUNT, DIAMOND_LIMITS, DIAMOND_PRICE, FREE_LIMITS } from "@/lib/planLimits";

/**
 * The landing page's two languages: Greek at /, English at /en (the header's
 * EN/ΕΛ switch). Only this page has an English version: the editor, the agent and
 * the rest of the app stay Greek-only.
 */
export type Lang = "el" | "en";

const el = {
  title: "AEPP Max · Περιβάλλον ΓΛΩΣΣΑΣ για την Πληροφορική Γ' Λυκείου",
  description:
    "Περιβάλλον ανάπτυξης για ΓΛΩΣΣΑ και ψευδογλώσσα, με εκτέλεση σύμφωνα με το σχολικό βιβλίο, πίνακα τιμών βήμα προς βήμα και βοηθό τεχνητής νοημοσύνης. Για την προετοιμασία στην Πληροφορική των Πανελλαδικών.",
  home: "/",
  switchTo: { href: "/en", label: "EN", name: "English", lang: "en" },
  nav: {
    label: "Ενότητες",
    features: "Δυνατότητες",
    app: "Εφαρμογή",
    faq: "Ερωτήσεις",
    signIn: "Σύνδεση",
    openEditor: "Άνοιγμα editor",
  },
  hero: {
    badge: "Πληροφορική Γ' Λυκείου · Πανελλαδικές 2027",
    titleBefore: "Ολοκληρωμένο περιβάλλον ανάπτυξης για τη ",
    text: "Εκτέλεση προγραμμάτων ΓΛΩΣΣΑΣ και αλγορίθμων ψευδογλώσσας σύμφωνα με το σχολικό βιβλίο, πίνακας τιμών βήμα προς βήμα και βοηθός τεχνητής νοημοσύνης προσαρμοσμένος στις απαιτήσεις των Πανελλαδικών εξετάσεων.",
    cta: "Συνέχεια στον browser",
    note: "Δωρεάν · Ο editor δεν απαιτεί λογαριασμό",
  },
  features: {
    kicker: "Δυνατότητες",
    title: "Σχεδιασμένο για τα θέματα Γ και Δ",
    text: "Κάθε λειτουργία ακολουθεί τον τρόπο με τον οποίο εξετάζεται η Πληροφορική στις Πανελλαδικές.",
    items: [
      {
        title: "ΓΛΩΣΣΑ και ψευδογλώσσα",
        text: "Εκτέλεση προγραμμάτων και αλγορίθμων όπως τους ορίζει το σχολικό βιβλίο, με υποπρογράμματα, πίνακες και είσοδο δεδομένων.",
      },
      {
        title: "Μηνύματα λάθους στα ελληνικά",
        text: "Τα λάθη επισημαίνονται κατά την πληκτρολόγηση, στη σωστή γραμμή, με οδηγίες για τη διόρθωσή τους.",
      },
      {
        title: "Πίνακας τιμών βήμα προς βήμα",
        text: "Η εκτέλεση προχωρά μία γραμμή τη φορά, ώστε κάθε πρόβλεψη να ελέγχεται. Μία στήλη ανά μεταβλητή, όπως ζητείται στις εξετάσεις.",
      },
      {
        title: "Μεταβλητές",
        text: "Οι τιμές όλων των μεταβλητών στο σημείο όπου σταμάτησε η εκτέλεση ή στο τρέχον βήμα του πίνακα τιμών.",
      },
      {
        title: "Ταχύτερη συγγραφή κώδικα",
        text: "Αυτόματη συμπλήρωση εντολών και δομών, αυτόματα κεφαλαία και σωστές εσοχές, ακόμη και με το πληκτρολόγιο στα αγγλικά.",
      },
      {
        title: "Αποθήκευση και προσαρμογή",
        text: "Αποθήκευση προγραμμάτων στον λογαριασμό σας και θέματα εμφάνισης: έτοιμα, όπως το Κλασικό με την εμφάνιση του Διερμηνευτή της ΓΛΩΣΣΑΣ, ή δικά σας.",
      },
    ],
  },
  assistants: {
    kicker: "AI βοηθός",
    title: "Καθοδήγηση με βάση τον δικό σας κώδικα",
    text: "Ο βοηθός διαβάζει τον κώδικα του editor και τον εκτελεί στον πραγματικό διερμηνευτή πριν απαντήσει. Ακολουθεί τις απαιτήσεις και τις συμβάσεις των θεμάτων των Πανελλαδικών.",
    tutor:
      "Καθοδηγεί στη λύση αντί να τη δίνει έτοιμη: εντοπίζει το λάθος, θέτει τις κατάλληλες ερωτήσεις και εξηγεί τη θεωρία. Δίνει την πλήρη λύση μόνο όταν ζητηθεί.",
    agent:
      "Γράφει και διορθώνει κώδικα, με σχόλια που εξηγούν κάθε τμήμα. Οι αλλαγές μπορούν να εγκρίνονται πριν εφαρμοστούν και αναιρούνται με Ctrl+Z.",
  },
  steps: {
    kicker: "Πώς λειτουργεί",
    title: "Έτοιμο σε τρία βήματα",
    items: [
      ["Συγγραφή", "Γράψτε το πρόγραμμα στον editor ή ζητήστε από τον Agent να το ξεκινήσει."],
      ["Εκτέλεση", "Με ▶ ή F9. Οι τιμές για το ΔΙΑΒΑΣΕ δίνονται απευθείας στην οθόνη εκτέλεσης."],
      [
        "Ανάλυση",
        "Παρακολουθήστε την εκτέλεση στον πίνακα τιμών βήμα προς βήμα και απευθύνετε τις απορίες σας στον Tutor.",
      ],
    ] as [string, string][],
  },
  pricing: {
    kicker: "Πλάνα",
    title: "Δωρεάν, με δυνατότητα αναβάθμισης",
    text: "Ο editor παραμένει δωρεάν. Το Diamond προσφέρει πιο προηγμένο μοντέλο και υψηλότερα όρια για τον AI βοηθό.",
    free: "Δωρεάν",
    price: DIAMOND_PRICE,
    freeItems: [
      "Editor, εκτέλεση και πίνακας τιμών χωρίς περιορισμούς",
      `Tutor και Agent: ${FREE_LIMITS.daily_tokens / 1000}k tokens ημερησίως`,
      `${FREE_LIMITS.max_programs} αποθηκευμένα προγράμματα`,
      `${FREE_LIMITS.max_themes} προσαρμοσμένα θέματα`,
    ],
    diamondItems: [
      "Όλες οι δυνατότητες του δωρεάν πλάνου",
      "Το πιο προηγμένο μοντέλο για τον Tutor και τον Agent",
      `${DIAMOND_LIMITS.daily_tokens / 1000}k tokens ημερησίως και επίπεδο /effort high`,
      `${DIAMOND_LIMITS.max_programs} αποθηκευμένα προγράμματα`,
      `${DIAMOND_LIMITS.max_themes} προσαρμοσμένα θέματα και αποκλειστικές μασκότ`,
    ],
    start: "Έναρξη",
    upgrade: "Αναβάθμιση σε Diamond",
    note: "Ενεργοποιείται από το μενού λογαριασμού στον editor. Ακύρωση οποιαδήποτε στιγμή.",
  },
  download: {
    kicker: "Εφαρμογή",
    title: "Εγκατάσταση ως εφαρμογή",
    text: "Σε υπολογιστή και κινητό, με δικό της εικονίδιο και παράθυρο. Δεν απαιτείται app store και οι ενημερώσεις γίνονται αυτόματα.",
  },
  faq: {
    kicker: "Ερωτήσεις",
    title: "Συχνές ερωτήσεις",
    items: [
      [
        "Είναι δωρεάν;",
        "Ναι. Ο editor, η εκτέλεση, ο πίνακας τιμών και οι Μεταβλητές είναι δωρεάν και χωρίς περιορισμούς. Ο AI βοηθός έχει ημερήσιο όριο, το οποίο είναι υψηλότερο στο Diamond.",
      ],
      [
        "Χρειάζεται λογαριασμός;",
        "Όχι για τον editor. Λογαριασμός (με email ή Google) απαιτείται για τον AI βοηθό και την αποθήκευση προγραμμάτων.",
      ],
      [
        "Τρέχει τα ίδια προγράμματα με τον Διερμηνευτή της ΓΛΩΣΣΑΣ;",
        "Αυτός είναι ο σκοπός του: δέχεται ό,τι ορίζει το σχολικό βιβλίο και απορρίπτει τα υπόλοιπα, με μηνύματα λάθους στα ελληνικά. Όπου το βιβλίο δεν ορίζει κάτι, ακολουθεί τον Διερμηνευτή της ΓΛΩΣΣΑΣ του Άλκη Γεωργόπουλου. Πρόκειται για ανεξάρτητη υλοποίηση, χωρίς κώδικα από αυτόν.",
      ],
      [
        "Λειτουργεί σε κινητά;",
        "Ναι, μέσω του browser ή ως εφαρμογή (βλ. παραπάνω). Απαιτείται σύνδεση στο διαδίκτυο, καθώς ο διερμηνευτής και ο βοηθός εκτελούνται στον διακομιστή.",
      ],
      [
        "Πόσο αξιόπιστος είναι ο AI βοηθός;",
        "Εκτελεί τον κώδικα στον πραγματικό διερμηνευτή πριν απαντήσει και ακολουθεί τις συμβάσεις των θεμάτων. Ωστόσο μπορεί να κάνει λάθη, γι' αυτό οι απαντήσεις του χρειάζονται έλεγχο, ιδίως ενόψει των εξετάσεων.",
      ],
      [
        "Πώς χρησιμοποιούνται τα δεδομένα μου;",
        <>
          Αποθηκεύονται μόνο όσα απαιτούνται για τη λειτουργία της υπηρεσίας, χωρίς διαφημίσεις,
          και διαγράφονται όλα με τη διαγραφή του λογαριασμού. Περισσότερα στην{" "}
          <Link href="/privacy" className="text-accent hover:underline">
            πολιτική απορρήτου
          </Link>
          .
        </>,
      ],
    ] as [string, ReactNode][],
  },
  finalCta: {
    title: "Ξεκινήστε την προετοιμασία σας",
    text: "Ο editor ανοίγει απευθείας στον browser, χωρίς εγκατάσταση και χωρίς λογαριασμό.",
  },
  footer: {
    credit:
      "Εμπνευσμένο από τον Διερμηνευτή της ΓΛΩΣΣΑΣ του Άλκη Γεωργόπουλου. Ανεξάρτητη υλοποίηση, χωρίς κώδικα από αυτόν, και δεν σχετίζεται με τον δημιουργό του.",
    privacy: "Πολιτική απορρήτου",
  },
};

export type Copy = typeof el;

const en: Copy = {
  title: "AEPP Max · A ΓΛΩΣΣΑ IDE for Greek high-school Computer Science",
  description:
    "An IDE for ΓΛΩΣΣΑ and ψευδογλώσσα, the languages of the Greek school textbook, that runs programs the way the textbook defines them, with a step-by-step trace table and an AI tutor. For students preparing for Πληροφορική in the Panhellenic exams.",
  home: "/en",
  switchTo: { href: "/", label: "ΕΛ", name: "Ελληνικά", lang: "el" },
  nav: {
    label: "Sections",
    features: "Features",
    app: "App",
    faq: "FAQ",
    signIn: "Sign in",
    openEditor: "Open the editor",
  },
  hero: {
    badge: "Πληροφορική, Γ' Λυκείου · Panhellenic exams 2027",
    titleBefore: "A complete development environment for ",
    text: "Run ΓΛΩΣΣΑ programs and ψευδογλώσσα algorithms exactly as the school textbook defines them, follow them in a step-by-step trace table, and get help from an AI assistant built around what the Panhellenic exams ask for.",
    cta: "Continue in the browser",
    note: "Free · No account needed for the editor · The app itself is in Greek",
  },
  features: {
    kicker: "Features",
    title: "Built for exam topics Γ and Δ",
    text: "Every feature follows the way Πληροφορική is examined in the Panhellenic exams.",
    items: [
      {
        title: "ΓΛΩΣΣΑ and ψευδογλώσσα",
        text: "Runs programs and algorithms as the school textbook defines them, with subprograms, arrays and input.",
      },
      {
        title: "Error messages in Greek",
        text: "Mistakes are marked as you type, on the right line, with directions for fixing them.",
      },
      {
        title: "Step-by-step trace table",
        text: "Execution moves one line at a time, so every prediction can be checked. One column per variable, as the exams ask.",
      },
      {
        title: "Variables",
        text: "The values of every variable where the run stopped, or at the trace table's current step.",
      },
      {
        title: "Faster coding",
        text: "Autocomplete for statements and blocks, automatic capitals and indentation, even with the keyboard set to English.",
      },
      {
        title: "Saving and themes",
        text: "Save programs to your account and pick a theme: ready-made ones, such as Κλασικό, styled after the Διερμηνευτής της ΓΛΩΣΣΑΣ, or your own.",
      },
    ],
  },
  assistants: {
    kicker: "AI assistant",
    title: "Guidance based on your own code",
    text: "The assistant reads the code in the editor and runs it on the real interpreter before it answers. It follows the requirements and conventions of the Panhellenic exam topics. It replies in Greek.",
    tutor:
      "Guides you to the solution instead of handing it over: it finds the mistake, asks the right questions and explains the theory. It gives the full solution only when asked.",
    agent:
      "Writes and fixes code, with comments explaining each part. Its changes can be reviewed before they apply, and Ctrl+Z undoes them.",
  },
  steps: {
    kicker: "How it works",
    title: "Ready in three steps",
    items: [
      ["Write", "Write the program in the editor, or ask the Agent to start it."],
      ["Run", "With ▶ or F9. Values for ΔΙΑΒΑΣΕ are typed straight into the output screen."],
      ["Understand", "Follow the run in the step-by-step trace table and ask the Tutor about anything unclear."],
    ],
  },
  pricing: {
    kicker: "Plans",
    title: "Free, with an optional upgrade",
    text: "The editor stays free. Diamond brings a more advanced model and higher limits for the AI assistant.",
    free: "Free",
    price: `${DIAMOND_AMOUNT} / month`,
    freeItems: [
      "Editor, runs and trace table with no limits",
      `Tutor and Agent: ${FREE_LIMITS.daily_tokens / 1000}k tokens a day`,
      `${FREE_LIMITS.max_programs} saved programs`,
      `${FREE_LIMITS.max_themes} custom themes`,
    ],
    diamondItems: [
      "Everything in the free plan",
      "The most advanced model for the Tutor and the Agent",
      `${DIAMOND_LIMITS.daily_tokens / 1000}k tokens a day and /effort high`,
      `${DIAMOND_LIMITS.max_programs} saved programs`,
      `${DIAMOND_LIMITS.max_themes} custom themes and exclusive mascots`,
    ],
    start: "Get started",
    upgrade: "Upgrade to Diamond",
    note: "Turned on from the account menu in the editor. Cancel any time.",
  },
  download: {
    kicker: "App",
    title: "Install it as an app",
    text: "On computers and phones, with its own icon and window. No app store needed, and it updates itself.",
  },
  faq: {
    kicker: "FAQ",
    title: "Frequently asked questions",
    items: [
      [
        "Is it free?",
        "Yes. The editor, runs, the trace table and Variables are free, with no limits. The AI assistant has a daily limit, which is higher on Diamond.",
      ],
      [
        "Do I need an account?",
        "Not for the editor. An account (email or Google) is needed for the AI assistant and for saving programs.",
      ],
      [
        "Does it run the same programs as the Διερμηνευτής της ΓΛΩΣΣΑΣ?",
        "That is the goal: it accepts what the school textbook defines and rejects the rest, with error messages in Greek. Where the textbook says nothing, it follows the Διερμηνευτής της ΓΛΩΣΣΑΣ by Άλκης Γεωργόπουλος. It is an independent implementation, with none of its code.",
      ],
      [
        "Is the app in English?",
        "No. Only this page is. The editor, its error messages and the AI assistant are in Greek, as ΓΛΩΣΣΑ and the exams are.",
      ],
      [
        "Does it work on phones?",
        "Yes, in the browser or as an app (see above). It needs an internet connection, since the interpreter and the assistant run on the server.",
      ],
      [
        "How reliable is the AI assistant?",
        "It runs the code on the real interpreter before answering and follows the exam conventions. It can still make mistakes, so check its answers, especially before the exams.",
      ],
      [
        "How is my data used?",
        <>
          Only what the service needs is stored, with no ads, and all of it is deleted when you
          delete your account. More in the{" "}
          <Link href="/privacy" hrefLang="el" className="text-accent hover:underline">
            privacy policy
          </Link>{" "}
          (in Greek).
        </>,
      ],
    ],
  },
  finalCta: {
    title: "Start preparing",
    text: "The editor opens right in the browser, with nothing to install and no account.",
  },
  footer: {
    credit:
      "Inspired by the Διερμηνευτής της ΓΛΩΣΣΑΣ by Άλκης Γεωργόπουλος. An independent implementation, with none of its code, and not affiliated with its author.",
    privacy: "Privacy policy (Greek)",
  },
};

export const COPY: Record<Lang, Copy> = { el, en };

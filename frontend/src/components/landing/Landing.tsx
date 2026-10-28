import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ContactButton } from "@/components/ContactDialog";
import { type Copy, COPY, type Lang } from "./copy";
import { Download } from "./Download";
import { InstallButton } from "./InstallButton";

export function landingMetadata(lang: Lang): Metadata {
  const { title, description } = COPY[lang];
  return { title, description };
}

const CTA =
  "btn-primary inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-on-accent shadow-lg shadow-accent/20 transition hover:brightness-110";
const SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-panel px-5 py-3 font-semibold text-text transition hover:border-muted";

/**
 * The landing page: what AEPP Max is, and the two ways in, the editor in the
 * browser (/editor) or the installed app. Always in the dark theme, the brand's
 * look, whatever theme the editor uses (data-theme scopes the tokens, as /login
 * does with Λευκό). The installed app skips it (APP_LAUNCH_SCRIPT, in the layout).
 * In Greek at /, in English at /en (copy.tsx); the app itself is Greek-only.
 */
export function Landing({ lang }: { lang: Lang }) {
  const t = COPY[lang];
  return (
    <div lang={lang} data-theme="dark" className="min-h-dvh bg-bg text-text">
      <Header t={t} lang={lang} />
      <main>
        <Hero t={t} lang={lang} />
        <Features t={t} />
        <Assistants t={t} />
        <Steps t={t} />
        <Pricing t={t} />
        <section id="download" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <SectionTitle {...t.download} />
            <Download lang={lang} />
          </div>
        </section>
        <Faq t={t} />
        <FinalCta t={t} lang={lang} />
      </main>
      <Footer t={t} lang={lang} />
    </div>
  );
}

function Header({ t, lang }: { t: Copy; lang: Lang }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href={t.home} className="flex items-center gap-2 font-semibold">
          <Image src="/logo-cloud.png" alt="" width={30} height={30} priority />
          AEPP Max
        </Link>
        <nav aria-label={t.nav.label} className="hidden gap-5 text-sm text-muted md:flex">
          <a href="#features" className="hover:text-text">
            {t.nav.features}
          </a>
          <a href="#pricing" className="hover:text-text">
            Diamond
          </a>
          <a href="#download" className="hover:text-text">
            {t.nav.app}
          </a>
          <a href="#faq" className="hover:text-text">
            {t.nav.faq}
          </a>
          <ContactButton lang={lang} className="hover:text-text">
            {t.nav.contact}
          </ContactButton>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {/* The other language's version of this page. */}
          <Link
            href={t.switchTo.href}
            hrefLang={t.switchTo.lang}
            lang={t.switchTo.lang}
            aria-label={t.switchTo.name}
            className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-muted hover:border-muted hover:text-text"
          >
            {t.switchTo.label}
          </Link>
          <Link href="/login" className="hidden text-muted hover:text-text sm:inline">
            {t.nav.signIn}
          </Link>
          <Link
            href="/editor"
            className="btn-primary rounded-lg bg-accent px-3.5 py-2 font-semibold text-on-accent hover:brightness-110"
          >
            {t.nav.openEditor}
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero({ t, lang }: { t: Copy; lang: Lang }) {
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
            {t.hero.badge}
          </p>
          <h1 className="mt-5 text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
            {t.hero.titleBefore}
            <span className="text-accent">ΓΛΩΣΣΑ</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{t.hero.text}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/editor" className={CTA}>
              {t.hero.cta}
              <span aria-hidden>→</span>
            </Link>
            <InstallButton className={SECONDARY} lang={lang} />
          </div>
          <p className="mt-4 text-sm text-muted">{t.hero.note}</p>
        </div>
        <EditorPreview />
      </div>
    </section>
  );
}

/**
 * A picture of the editor, drawn with the theme's own syntax colors (not a
 * screenshot). Greek on both versions of the page, as the app is.
 */
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
    <div lang="el" className="relative" aria-hidden>
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
        <Image src="/mascot-tutor.png" alt="" width={40} height={40} unoptimized className="h-10 w-auto shrink-0" />
        <p className="text-xs leading-relaxed">
          <span className="font-semibold text-warn">Tutor</span>
          <span className="text-muted"> · </span>
          Το σ κρατά το άθροισμα. Τι τιμή θα έχει μετά το 3ο ΔΙΑΒΑΣΕ;
        </p>
      </div>
    </div>
  );
}

/** The features' icons (SVG paths), in the order of `COPY[lang].features.items`. */
const FEATURE_ICONS = [
  "M8 6l-6 6 6 6M16 6l6 6-6 6",
  "M12 8v5M12 16.5v.5M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  "M3 5h18v14H3zM3 10h18M9 5v14",
  "M4 7h16M4 12h16M4 17h10",
  "M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M8 14h8",
  "M12 3a9 9 0 100 18c1 0 1.5-.8 1.5-1.5 0-1.2-1-1.5-1-2.5S13.3 15 14.5 15H17a4 4 0 004-4c0-4.4-4-8-9-8zM7.5 11h.01M10 7.5h.01M15 7.5h.01",
];

function Features({ t }: { t: Copy }) {
  const { items, ...title } = t.features;
  return (
    <section id="features" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionTitle {...title} />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((f, i) => (
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
                  <path d={FEATURE_ICONS[i]} />
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

function Assistants({ t }: { t: Copy }) {
  const { tutor, agent, ...title } = t.assistants;
  return (
    <section className="border-t border-border bg-panel/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionTitle {...title} />
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Assistant
            mascot="/mascot-tutor.png"
            name="Tutor"
            color="text-warn"
            text={tutor}
          />
          <Assistant
            mascot="/mascot-agent.png"
            name="Agent"
            color="text-accent"
            text={agent}
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
      <Image src={mascot} alt="" width={72} height={72} unoptimized className="h-16 w-auto shrink-0" />
      <div>
        <h3 className={`text-lg font-semibold ${color}`}>{name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
      </div>
    </div>
  );
}

function Steps({ t }: { t: Copy }) {
  const { items, ...title } = t.steps;
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionTitle {...title} />
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {items.map(([title, text], i) => (
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

function Pricing({ t }: { t: Copy }) {
  const p = t.pricing;
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-border bg-panel/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionTitle kicker={p.kicker} title={p.title} text={p.text} />
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
          <PlanCard name={p.free} price="$0" items={p.freeItems} cta={{ href: "/editor", label: p.start }} />
          <PlanCard
            name="Diamond"
            price={p.price}
            items={p.diamondItems}
            cta={{ href: "/login?mode=signup", label: p.upgrade }}
            highlight
            note={p.note}
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

function Faq({ t }: { t: Copy }) {
  const { items, ...title } = t.faq;
  return (
    <section id="faq" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <SectionTitle {...title} />
        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-panel">
          {items.map(([question, answer]) => (
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

function FinalCta({ t, lang }: { t: Copy; lang: Lang }) {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-panel px-6 py-14 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--accent)_18%,transparent),transparent_60%)]"
          />
          <Image src="/logo-cloud.png" alt="" width={56} height={56} className="relative mx-auto" />
          <h2 className="relative mt-5 text-3xl font-bold tracking-tight">{t.finalCta.title}</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-muted">{t.finalCta.text}</p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/editor" className={CTA}>
              {t.hero.cta}
              <span aria-hidden>→</span>
            </Link>
            <InstallButton className={SECONDARY} lang={lang} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer({ t, lang }: { t: Copy; lang: Lang }) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <div className="flex items-center gap-2 font-semibold text-text">
            <Image src="/logo-cloud.png" alt="" width={22} height={22} />
            AEPP Max
          </div>
          <p className="mt-3 text-xs leading-relaxed">{t.footer.credit}</p>
        </div>
        <div className="flex gap-6">
          <Link href="/editor" className="hover:text-text">
            Editor
          </Link>
          <ContactButton lang={lang} className="hover:text-text">
            {t.nav.contact}
          </ContactButton>
          <Link href="/privacy" hrefLang="el" className="hover:text-text">
            {t.footer.privacy}
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

"use client";

import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api/client";
import { useUser } from "@/lib/supabase/useUser";

type Lang = "el" | "en";

const TEXT = {
  el: {
    title: "Επικοινώνησε μαζί μας",
    intro: "Μια ερώτηση, ένα πρόβλημα ή μια ιδέα; Γράψε μας και θα σου απαντήσουμε στο email σου.",
    name: "Όνομα",
    email: "Email",
    message: "Μήνυμα",
    cancel: "Άκυρο",
    send: "Αποστολή",
    sending: "Αποστολή…",
    sent: "Το μήνυμά σου στάλθηκε. Ευχαριστούμε!",
    close: "Κλείσιμο",
    reply: "Θα προσπαθήσουμε να σου απαντήσουμε το συντομότερο δυνατό.",
    tooMany: "Στάλθηκαν πολλά μηνύματα. Δοκίμασε ξανά αργότερα.",
    badEmail: "Έλεγξε το email σου.",
    blank: "Συμπλήρωσε το όνομα και το μήνυμα.",
    failed: "Το μήνυμα δεν στάλθηκε. Δοκίμασε ξανά αργότερα.",
  },
  en: {
    title: "Contact us",
    intro: "A question, a problem or an idea? Write to us and we'll reply to your email.",
    name: "Name",
    email: "Email",
    message: "Message",
    cancel: "Cancel",
    send: "Send",
    sending: "Sending…",
    sent: "Your message was sent. Thank you!",
    close: "Close",
    reply: "We'll try to reply as soon as possible.",
    tooMany: "Too many messages were sent. Please try again later.",
    badEmail: "Please check your email address.",
    blank: "Please fill in your name and message.",
    failed: "Your message wasn't sent. Please try again later.",
  },
};

const FIELD =
  "mt-1 w-full rounded-md border border-border bg-bg px-2.5 text-text outline-none focus:border-accent";

/**
 * The contact form (POST /api/v1/contact), centered on the page (a modal <dialog>).
 * Rendered only while open. A signed-in user's name and email are filled in.
 */
export function ContactDialog({ lang = "el", onClose }: { lang?: Lang; onClose: () => void }) {
  const t = TEXT[lang];
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const user = useUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  // Hidden from people (a honeypot): only bots fill it in, and the server drops theirs.
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  // showModal() centers it, traps focus and dims the page (as SettingsDialog does).
  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  // The account's name and email, once known, unless already typed.
  const [filled, setFilled] = useState(false);
  if (user && !filled) {
    setFilled(true);
    const meta = user.user_metadata ?? {};
    setName((n) => n || String(meta.full_name ?? meta.name ?? ""));
    setEmail((e) => e || (user.email ?? ""));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (state !== "idle") return;
    // `required` lets spaces through; the server strips them and would refuse.
    const body = { name: name.trim(), email: email.trim(), message: message.trim(), website };
    if (!body.name || !body.message) {
      setError(t.blank);
      return;
    }
    setState("sending");
    setError(null);
    try {
      await apiFetch<void>("/contact", { method: "POST", body: JSON.stringify(body) });
      setState("sent");
    } catch (err) {
      setState("idle");
      const status = err instanceof ApiError ? err.status : 0;
      // The other fields are checked above and by maxLength, so a 422 is the email.
      setError(status === 429 ? t.tooMany : status === 422 ? t.badEmail : t.failed);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      // Not while sending: the answer would have nowhere to show. A second Esc gets past
      // onCancel (the browser's close watcher), so it opens again until the answer.
      onCancel={(e) => state === "sending" && e.preventDefault()}
      onClose={() => (state === "sending" ? dialog.current?.showModal() : onClose())}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] overflow-auto rounded-xl border border-border bg-panel p-0 text-sm text-text shadow-2xl backdrop:bg-bg/70 backdrop:backdrop-blur-sm"
    >
      {state === "sent" ? (
        <div className="p-5">
          <h2 id={titleId} className="text-base font-semibold">
            {t.title}
          </h2>
          <p role="status" className="mt-2 leading-relaxed text-ok">
            ✓ {t.sent}
          </p>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              autoFocus
              onClick={() => dialog.current?.close()}
              className="rounded-md btn-primary bg-accent px-3 py-1.5 font-medium text-on-accent hover:brightness-110"
            >
              {t.close}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="p-5">
          <h2 id={titleId} className="text-base font-semibold">
            {t.title}
          </h2>
          <p className="mt-1 leading-relaxed text-muted">{t.intro}</p>
          <label className="mt-3 block text-xs font-medium text-muted">
            {t.name}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              autoComplete="name"
              className={`${FIELD} h-9`}
            />
          </label>
          <label className="mt-3 block text-xs font-medium text-muted">
            {t.email}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
              autoComplete="email"
              className={`${FIELD} h-9`}
            />
          </label>
          <label className="mt-3 block text-xs font-medium text-muted">
            {t.message}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              maxLength={2000}
              rows={5}
              className={`${FIELD} resize-y py-2 leading-relaxed`}
            />
          </label>
          <label aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
            Website
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </label>
          <p className="mt-2 text-xs text-muted">{t.reply}</p>
          {error && (
            <p
              role="alert"
              className="mt-3 rounded-md border-l-2 border-danger bg-danger/10 px-3 py-2 text-xs text-danger"
            >
              {error}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              disabled={state === "sending"}
              className="rounded-md bg-panel-2 px-3 py-1.5 hover:text-text disabled:opacity-50"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={state === "sending"}
              className="rounded-md btn-primary bg-accent px-3 py-1.5 font-medium text-on-accent hover:brightness-110 disabled:opacity-50"
            >
              {state === "sending" ? t.sending : t.send}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}

/** A button that opens the contact form, for pages that are server components. */
export function ContactButton({
  lang = "el",
  className,
  children,
}: {
  lang?: Lang;
  className: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && <ContactDialog lang={lang} onClose={() => setOpen(false)} />}
    </>
  );
}

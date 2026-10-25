"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { type AgentMode, streamChat } from "@/lib/api/agent";
import { ApiError } from "@/lib/api/client";
import { useUser } from "@/lib/supabase/useUser";

// A reply is its text and tool calls in the order they streamed, like Claude Code's
// transcript: `● text`, `● Tool` with its result under `⎿`.
type Part = { kind: "text"; text: string } | { kind: "tool"; name: string; detail?: string };
type Message = { role: "user"; text: string } | { role: "assistant"; parts: Part[] };

const TOOL_LABELS: Record<string, string> = {
  run_program: "Εκτέλεση προγράμματος",
  trace_program: "Πίνακας τιμών",
  write_code: "Άλλαξε τον κώδικα",
};

// Shift+Tab in the message box (or the label under it) switches between the two.
const MODES: Record<
  AgentMode,
  { label: string; short: string; hint: string; placeholder: string; mascot: string; color: string }
> = {
  ask: {
    label: "Tutor",
    short: "υποδείξεις",
    hint: "εξηγεί και δίνει υποδείξεις, δεν αλλάζει τον κώδικα",
    placeholder: "Ρώτα κάτι για τον κώδικά σου…",
    mascot: "/mascot-tutor.png",
    color: "text-accent",
  },
  agent: {
    label: "Agent",
    short: "γράφει στον κώδικα",
    hint: "γράφει κατευθείαν στον κώδικά σου",
    placeholder: "Πες τι να αλλάξει στον κώδικα…",
    mascot: "/mascot-agent.png",
    color: "text-warn",
  },
};

const VERBS = ["Σκέφτεται", "Μελετά", "Υπολογίζει", "Ψάχνει", "Γράφει", "Ελέγχει"];

type Props = {
  code: string;
  /** write_code's new program, written straight into the editor. */
  onEdit: (code: string) => void;
  /** True while an Agent-mode reply runs: write_code would overwrite anything typed meanwhile. */
  onWriting: (writing: boolean) => void;
};

export function AgentPanel({ code, onEdit, onWriting }: Props) {
  const user = useUser();
  const [mode, setMode] = useState<AgentMode>("ask");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  // Whether this chat has a message sent in Agent mode: only then does going back to Tutor clear it.
  const usedAgent = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  // Whether the transcript is scrolled to the bottom, so it may follow the reply.
  const atBottom = useRef(true);

  // Follow the reply as it streams, unless the student scrolled up to read.
  useEffect(() => {
    const el = scroller.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  // The box grows with the message, up to its max height.
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  function patchParts(update: (parts: Part[]) => Part[]) {
    setMessages((ms) => {
      const last = ms[ms.length - 1];
      if (last?.role !== "assistant") return ms;
      return [...ms.slice(0, -1), { ...last, parts: update(last.parts) }];
    });
  }

  function appendText(text: string) {
    patchParts((parts) => {
      const last = parts[parts.length - 1];
      return last?.kind === "text"
        ? [...parts.slice(0, -1), { kind: "text", text: last.text + text }]
        : [...parts, { kind: "text", text }];
    });
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const message = draft.trim();
    // `user` is undefined while sign-in loads, and there is no token to send yet.
    if (!message || busy || !user) return;
    setDraft("");
    setBusy(true);
    atBottom.current = true;
    const writing = mode === "agent";
    // Counts from the moment it is sent: even if stopped early, the server may
    // already be running it. Undone below if it never got that far.
    const usedBefore = usedAgent.current;
    let accepted = false; // the server answered with the conversation
    if (writing) {
      usedAgent.current = true;
      onWriting(true);
    }
    setMessages((ms) => [
      ...ms,
      { role: "user", text: message },
      { role: "assistant", parts: [] },
    ]);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const request = { conversation_id: conversationId, message, code, mode };
      for await (const event of streamChat(request, controller.signal)) {
        if (event.type === "conversation") {
          accepted = true;
          setConversationId(event.id);
        }
        else if (event.type === "text") appendText(event.delta);
        else if (event.type === "tool")
          patchParts((parts) => [...parts, { kind: "tool", name: event.name }]);
        else if (event.type === "edit") {
          onEdit(event.code);
          // The summary goes under the write_code call that made it.
          patchParts((parts) => {
            const i = parts.findLastIndex((p) => p.kind === "tool" && p.name === "write_code");
            if (i < 0) return [...parts, { kind: "tool", name: "write_code", detail: event.summary }];
            return parts.map((p, j) => (j === i ? { ...p, detail: event.summary } : p));
          });
        } else if (event.type === "error") appendText(`\n\n${event.message}`);
      }
    } catch (err) {
      if (controller.signal.aborted) {
        patchParts((parts) => [...parts, { kind: "tool", name: "", detail: "Διακόπηκε" }]);
      } else if (err instanceof ApiError && err.status === 404) {
        // The conversation was deleted (e.g. with the account, from another tab).
        // Keep the transcript to read, say the agent no longer remembers it, start a
        // new conversation next time, and give the message back (unless the box
        // already has something new in it). That new one hasn't used Agent mode.
        usedAgent.current = false;
        appendText(
          "Αυτή η συζήτηση δεν υπάρχει πια, οπότε ο agent δεν θυμάται τα παραπάνω. Στείλε ξανά το μήνυμά σου για να ξεκινήσει νέα.",
        );
        setConversationId(null);
        setDraft((d) => d || message);
      } else {
        if (!accepted) usedAgent.current = usedBefore; // never reached the agent: nothing ran
        appendText(failureText(err));
      }
    } finally {
      abort.current = null;
      setBusy(false);
      if (writing) onWriting(false);
    }
  }

  function toggleMode() {
    // Back to Tutor starts a clean chat, without the history of code the agent wrote
    // (a quick look at Agent mode, with nothing sent, keeps the Tutor chat).
    if (mode === "agent" && usedAgent.current) {
      // Also stops an Agent request still running or waiting (e.g. on a cold server).
      abort.current?.abort();
      newConversation();
    }
    setMode(mode === "ask" ? "agent" : "ask");
  }

  function newConversation() {
    usedAgent.current = false;
    setMessages([]);
    setConversationId(null);
  }

  const current = MODES[mode];

  return (
    <aside className="flex h-[80dvh] min-h-0 flex-col border-t border-border bg-panel font-mono text-[13px] lg:h-auto lg:border-t-0 lg:border-l">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 font-sans">
        <h2 className="text-sm font-semibold">Agent</h2>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={newConversation}
            disabled={busy}
            className="ml-auto text-xs text-muted hover:text-text"
          >
            Νέα
          </button>
        )}
      </div>

      {user === null ? (
        // Signed out: the logo in the middle and the way in, instead of an empty chat.
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center font-sans">
          <Image src="/logo-cloud.png" alt="" width={72} height={72} />
          <p className="max-w-60 text-sm text-muted">
            <Link href="/login" className="font-medium text-accent hover:underline">
              Συνδέσου
            </Link>{" "}
            για να ρωτήσεις τον agent για τον κώδικά σου.
          </p>
        </div>
      ) : (
        <div
          ref={scroller}
          onScroll={(e) => {
            const el = e.currentTarget;
            atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
          }}
          className="min-h-0 flex-1 space-y-3 overflow-auto p-3 leading-relaxed"
          aria-live="polite"
        >
          {messages.length === 0 && <Welcome mode={mode} />}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <Line key={i} mark=">" className="text-muted">
                {m.text}
              </Line>
            ) : (
              <div key={i} className="space-y-2">
                {m.parts.map((p, j) =>
                  p.kind === "text" ? (
                    <Line key={j} mark="●">
                      {p.text.trim()}
                    </Line>
                  ) : (
                    <div key={j}>
                      {p.name && (
                        <Line mark="●" markClass="text-ok">
                          <span className="font-semibold">{TOOL_LABELS[p.name] ?? p.name}</span>
                        </Line>
                      )}
                      {p.detail && (
                        <Line mark="⎿" className="text-muted">
                          {p.detail}
                        </Line>
                      )}
                    </div>
                  ),
                )}
              </div>
            ),
          )}
          {busy && <Working />}
        </div>
      )}

      {user !== null && (
        <form onSubmit={send} className="shrink-0 px-3 pt-2 pb-2">
          <div className="flex gap-2 rounded-md border border-border px-2.5 py-2 focus-within:border-muted">
            <span className="text-muted select-none" aria-hidden>
              &gt;
            </span>
            <textarea
              ref={input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab" && e.shiftKey) {
                  e.preventDefault();
                  toggleMode();
                } else if (e.key === "Escape" && busy) {
                  e.preventDefault();
                  abort.current?.abort();
                } else if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              placeholder={current.placeholder}
              aria-label="Μήνυμα προς τον agent"
              className="max-h-40 min-w-0 flex-1 resize-none bg-transparent outline-none placeholder:text-muted/70"
            />
            {/* Phones have no Esc and may not send on Enter: a button for both. */}
            {busy ? (
              <button
                type="button"
                onClick={() => abort.current?.abort()}
                aria-label="Διακοπή"
                title="Διακοπή (Esc)"
                className="self-end text-muted hover:text-text"
              >
                ■
              </button>
            ) : (
              <button
                type="submit"
                disabled={!draft.trim() || !user}
                aria-label="Αποστολή"
                title="Αποστολή (Enter)"
                className="self-end text-accent disabled:text-muted disabled:opacity-50"
              >
                ↑
              </button>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2 px-1 text-xs whitespace-nowrap">
            <span className="text-muted">⇧⇥ αλλαγή</span>
            <button
              type="button"
              onClick={toggleMode}
              title={`${current.label}: ${current.hint} · Shift+Tab για αλλαγή`}
              className={`ml-auto flex items-center gap-1.5 hover:opacity-80 ${current.color}`}
            >
              <Image src={current.mascot} alt="" width={20} height={20} className="h-5 w-auto" />
              <span className="font-semibold">{current.label}</span>
              <span className="text-muted">· {current.short}</span>
            </button>
          </div>
        </form>
      )}
    </aside>
  );
}

// Why a reply couldn't start, by the backend's status (endpoints/agent.py).
const FAILURES: Record<number, string> = {
  401: "Η σύνδεσή σου δεν ισχύει πια. Αποσυνδέσου και συνδέσου ξανά (ή κάνε Εγγραφή, αν διέγραψες τον λογαριασμό).",
  429: "Έφτασες το όριο του agent για σήμερα. Θα είναι ξανά διαθέσιμος από τα μεσάνυχτα. Μέχρι τότε, ο editor και η εκτέλεση δουλεύουν κανονικά.",
  503: "Ο βοηθός δεν είναι διαθέσιμος αυτή τη στιγμή.",
};

function failureText(err: unknown): string {
  const known = err instanceof ApiError ? FAILURES[err.status] : undefined;
  return known ?? "Δεν ήταν δυνατή η σύνδεση με τον βοηθό.";
}

/** One transcript line with its marker hanging in the left column, as in Claude Code. */
function Line({
  mark,
  markClass = "",
  className = "",
  children,
}: {
  mark: string;
  markClass?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex gap-2 ${className}`}>
      <span className={`w-3 shrink-0 select-none ${markClass}`} aria-hidden>
        {mark}
      </span>
      <div className="min-w-0 flex-1 break-words whitespace-pre-wrap">{children}</div>
    </div>
  );
}

/** The empty chat: the current mode's mascot, like Claude Code's welcome box. */
function Welcome({ mode }: { mode: AgentMode }) {
  const m = MODES[mode];
  return (
    <div className="flex items-center gap-3 rounded-md border border-accent/60 p-3">
      <Image src={m.mascot} alt="" width={56} height={56} className="h-14 w-auto shrink-0" />
      <div className="min-w-0 space-y-1">
        <p>
          <span className="text-accent">✻</span> Καλώς ήρθες στον{" "}
          <span className={`font-semibold ${m.color}`}>{m.label}</span>
        </p>
        <p className="text-xs text-muted">
          {mode === "ask"
            ? "Ρώτα γιατί βγάζει λάθος, τι τιμές παίρνουν οι μεταβλητές, πώς λύνεται ένα θέμα Πανελλαδικών."
            : "Πες του τι να γράψει ή να διορθώσει· οι αλλαγές μπαίνουν κατευθείαν στον κώδικα (Ctrl+Z για αναίρεση)."}
        </p>
      </div>
    </div>
  );
}

const SPINNER = ["·", "✢", "✳", "✶", "✻", "✽", "✻", "✶", "✳", "✢"];

/** `✻ Σκέφτεται… (3s · esc για διακοπή)` while a reply streams. */
function Working() {
  const [verb] = useState(() => VERBS[Math.floor(Math.random() * VERBS.length)]);
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 120);
    return () => clearInterval(id);
  }, []);
  const frame = SPINNER[Math.floor((now - start) / 120) % SPINNER.length];
  return (
    <Line mark={frame} markClass="text-accent">
      <span className="text-accent">{verb}…</span>{" "}
      <span className="text-muted">
        ({Math.floor((now - start) / 1000)}s · <b>esc</b> για διακοπή)
      </span>
    </Line>
  );
}

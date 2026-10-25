"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type AgentMode, streamChat } from "@/lib/api/agent";
import { ApiError } from "@/lib/api/client";
import type { Language } from "@/lib/glossa/types";
import { lineDiff } from "@/lib/lineDiff";
import { useUser } from "@/lib/supabase/useUser";

// A reply is its text and tool calls in the order they streamed, like Claude Code's
// transcript: `● text`, `● Tool` with its result under `⎿`. A `note` is the panel's
// own answer to a / command; it never reaches the agent.
type Part =
  | { kind: "text"; text: string }
  | { kind: "tool"; name: string; detail?: string; proposal?: Proposal };
type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; parts: Part[] }
  | { role: "note"; text: string };

/**
 * A write_code in approval mode: shown as a diff until the student applies or rejects it.
 * `base` is the editor when it arrived: Ctrl/Cmd+Enter applies it only while the editor
 * still holds that, so it never overwrites typing done since.
 */
type Proposal = {
  code: string;
  base: string;
  status: "pending" | "applied" | "rejected" | "replaced";
};

const PROPOSAL_STATUS: Record<Exclude<Proposal["status"], "pending">, string> = {
  applied: "✓ Εφαρμόστηκε",
  rejected: "✗ Απορρίφθηκε",
  replaced: "Αντικαταστάθηκε από νεότερη πρόταση",
};

const TOOL_LABELS: Record<string, string> = {
  run_program: "Εκτέλεση προγράμματος",
  trace_program: "Πίνακας τιμών",
  write_code: "Άλλαξε τον κώδικα",
};

// /switch moves between the two. In Agent mode, Shift+Tab in the message box (or
// the label under it) switches write_code between applying at once and asking first.
const MODES: Record<
  AgentMode,
  {
    label: string;
    short: string;
    /** The Agent's two settings get their own color (αυτόματα purple, με έγκριση green). */
    shortColor?: string;
    hint: string;
    placeholder: string;
    mascot: string;
    color: string;
  }
> = {
  ask: {
    label: "Tutor",
    short: "υποδείξεις",
    hint: "εξηγεί και δίνει υποδείξεις, δεν αλλάζει τον κώδικα",
    placeholder: "Ρώτα κάτι για τον κώδικά σου…",
    mascot: "/mascot-tutor.png",
    color: "text-warn",
  },
  agent: {
    label: "Agent",
    short: "αυτόματα",
    shortColor: "text-purple",
    hint: "γράφει κατευθείαν στον κώδικά σου",
    placeholder: "Πες τι να αλλάξει στον κώδικα…",
    mascot: "/mascot-agent.png",
    color: "text-accent",
  },
};

/** Agent mode with approval on: write_code proposes, Ctrl+Enter applies. */
const APPROVAL = {
  short: "με έγκριση",
  shortColor: "text-ok",
  hint: "προτείνει αλλαγές· Ctrl+Enter για να μπουν στον κώδικα",
};

const COMMANDS = [
  { name: "/switch", hint: "αλλαγή ανάμεσα σε Tutor και Agent" },
  { name: "/new", hint: "νέα συζήτηση" },
  { name: "/help", hint: "οι εντολές και τα πλήκτρα" },
];

const HELP = `Εντολές:
${COMMANDS.map((c) => `${c.name.padEnd(8)} ${c.hint}`).join("\n")}

Πλήκτρα: Enter αποστολή · Shift+Enter νέα γραμμή · Esc διακοπή.
Στον Agent: Shift+Tab αλλάζει ανάμεσα σε «αυτόματα» (γράφει κατευθείαν στον κώδικα) και «με έγκριση» (δείχνει πρώτα την αλλαγή· Ctrl+Enter για εφαρμογή).`;

/** Every pending proposal gets `status` (only one is ever pending). */
function settle(messages: Message[], status: Proposal["status"]): Message[] {
  return messages.map((m) =>
    m.role !== "assistant" || !m.parts.some((p) => p.kind === "tool" && p.proposal?.status === "pending")
      ? m
      : {
          ...m,
          parts: m.parts.map((p) =>
            p.kind === "tool" && p.proposal?.status === "pending"
              ? { ...p, proposal: { ...p.proposal, status } }
              : p,
          ),
        },
  );
}

function pendingProposal(messages: Message[]): Proposal | null {
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    for (const p of m.parts) {
      if (p.kind === "tool" && p.proposal?.status === "pending") return p.proposal;
    }
  }
  return null;
}

const VERBS = ["Σκέφτεται", "Μελετά", "Υπολογίζει", "Ψάχνει", "Γράφει", "Ελέγχει"];

type Props = {
  code: string;
  /** The editor's Προγράμματα or Αλγόριθμοι: the agent writes in that language. */
  language: Language;
  /** write_code's new program, for the editor: at once, or once the student approves it. */
  onEdit: (code: string) => void;
  /** True while an Agent-mode reply runs: write_code would overwrite anything typed meanwhile. */
  onWriting: (writing: boolean) => void;
  /** Applies the proposal waiting for approval, or null when Ctrl/Cmd+Enter should run instead (Ide.tsx). */
  onProposal: (apply: (() => void) | null) => void;
};

export function AgentPanel({ code, language, onEdit, onWriting, onProposal }: Props) {
  const user = useUser();
  const [mode, setMode] = useState<AgentMode>("ask");
  // Agent mode: false writes edits at once, true shows them for approval first.
  const [approve, setApprove] = useState(false);
  // The highlighted entry of the / command menu.
  const [pick, setPick] = useState(0);
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
  // The editor now, for a proposal's base while a reply streams (`code` there is the request's).
  const latestCode = useRef(code);
  useEffect(() => {
    latestCode.current = code;
  }, [code]);

  // Another account (or none) in this tab: its chat, and any proposal in it, isn't theirs.
  const [chatUser, setChatUser] = useState(user?.id);
  if (user !== undefined && user?.id !== chatUser) {
    setChatUser(user?.id);
    setMessages([]);
    setConversationId(null);
  }

  // The editor switched between Προγράμματα and Αλγόριθμοι: a proposal waiting was
  // written for the other code. An edit still on its way is dropped too (below).
  const [chatLanguage, setChatLanguage] = useState(language);
  const languageNow = useRef(language);
  useEffect(() => {
    languageNow.current = language;
  }, [language]);
  if (language !== chatLanguage) {
    setChatLanguage(language);
    setMessages((ms) => settle(ms, "rejected"));
  }

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

  // The proposal waiting for approval, offered to Ide's Ctrl/Cmd+Enter only while the
  // editor is unchanged since it arrived; otherwise the shortcut runs the program.
  const pending = pendingProposal(messages);
  const apply = useCallback(
    (proposal: Proposal) => {
      onEdit(proposal.code);
      setMessages((ms) => settle(ms, "applied"));
    },
    [onEdit],
  );
  const shortcut = pending !== null && pending.base === code && Boolean(user);
  useEffect(() => {
    if (!shortcut || pending === null) return;
    onProposal(() => apply(pending));
    return () => onProposal(null);
  }, [shortcut, pending, apply, onProposal]);

  function patchParts(update: (parts: Part[]) => Part[]) {
    // The last reply, which a command's note may have followed while it streamed.
    setMessages((ms) => {
      const i = ms.findLastIndex((m) => m.role === "assistant");
      if (i < 0) return ms;
      const reply = ms[i] as Extract<Message, { role: "assistant" }>;
      return ms.map((m, j) => (j === i ? { ...reply, parts: update(reply.parts) } : m));
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
    if (message.startsWith("/")) {
      setDraft("");
      runCommand(message);
      return;
    }
    // `user` is undefined while sign-in loads, and there is no token to send yet.
    if (!message || busy || !user) return;
    setDraft("");
    setBusy(true);
    atBottom.current = true;
    const writing = mode === "agent";
    // With approval on, nothing reaches the editor by itself, so it stays unlocked.
    const approving = writing && approve;
    // Counts from the moment it is sent: even if stopped early, the server may
    // already be running it. Undone below if it never got that far.
    const usedBefore = usedAgent.current;
    let accepted = false; // the server answered with the conversation
    if (writing) {
      usedAgent.current = true;
      if (!approving) onWriting(true);
    }
    setMessages((ms) => [
      ...ms,
      { role: "user", text: message },
      { role: "assistant", parts: [] },
    ]);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const request = {
        conversation_id: conversationId,
        message,
        code,
        language,
        mode,
        approve: approving,
      };
      for await (const event of streamChat(request, controller.signal)) {
        if (event.type === "conversation") {
          accepted = true;
          setConversationId(event.id);
        }
        else if (event.type === "text") appendText(event.delta);
        else if (event.type === "tool")
          patchParts((parts) => [...parts, { kind: "tool", name: event.name }]);
        else if (event.type === "edit") {
          // Written for the other language's code: the editor has moved on.
          if (languageNow.current !== request.language) continue;
          // A newer edit, proposed or written, replaces the proposal still waiting
          // (each is the whole program).
          const proposal: Proposal | undefined = approving
            ? { code: event.code, base: latestCode.current, status: "pending" }
            : undefined;
          setMessages((ms) => settle(ms, "replaced"));
          if (!proposal) onEdit(event.code);
          // The summary (and proposal) go under the write_code call that made it.
          const tool: Part = { kind: "tool", name: "write_code", detail: event.summary, proposal };
          patchParts((parts) => {
            const i = parts.findLastIndex((p) => p.kind === "tool" && p.name === "write_code");
            if (i < 0) return [...parts, tool];
            return parts.map((p, j) => (j === i ? tool : p));
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
      if (writing && !approving) onWriting(false);
    }
  }

  function runCommand(text: string) {
    const name = text.split(/\s/)[0].toLowerCase();
    if (name === "/switch") switchMode();
    else if (name === "/new") {
      if (busy) note("Περίμενε να τελειώσει η απάντηση ή σταμάτησέ την με Esc.", text);
      else newConversation();
    } else if (name === "/help") note(HELP, text);
    else note(`Άγνωστη εντολή ${name}. Γράψε /help για τις εντολές.`, text);
  }

  /** The panel's own answer, under the command that asked for it. */
  function note(text: string, command?: string) {
    setMessages((ms) => [
      ...ms,
      ...(command ? [{ role: "user" as const, text: command }] : []),
      { role: "note", text },
    ]);
  }

  function switchMode() {
    const next = mode === "ask" ? "agent" : "ask";
    // Back to Tutor starts a clean chat, without the history of code the agent wrote
    // (a quick look at Agent mode, with nothing sent, keeps the Tutor chat).
    if (mode === "agent" && usedAgent.current) {
      // Also stops an Agent request still running or waiting (e.g. on a cold server).
      abort.current?.abort();
      newConversation();
    } else if (messages.length > 0) {
      // Tutor can't edit, so a proposal still waiting is dropped.
      if (next === "ask") setMessages((ms) => settle(ms, "rejected"));
      note(`Τώρα μιλάς με τον ${MODES[next].label}.`);
    }
    setMode(next);
  }

  function newConversation() {
    usedAgent.current = false;
    setMessages([]);
    setConversationId(null);
  }

  const current = mode === "agent" && approve ? { ...MODES.agent, ...APPROVAL } : MODES[mode];
  // The / menu: commands matching what is typed, while it is still one word.
  const commands = /^\/\S*$/.test(draft)
    ? COMMANDS.filter((c) => c.name.startsWith(draft.toLowerCase()))
    : [];
  const picked = Math.min(pick, commands.length - 1);

  return (
    // A click anywhere in the panel goes to the message box, so typing and Shift+Tab work at
    // once; not on a button or link, and not when the click selected text to copy.
    <aside
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("button, a, input, textarea, select, summary, [role=button]")) return;
        if (window.getSelection()?.toString()) return;
        input.current?.focus({ preventScroll: true });
      }}
      className="flex h-[80dvh] min-h-0 flex-col border-t border-border bg-panel font-mono text-[13px] lg:h-auto lg:border-t-0 lg:border-l"
    >
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
          {messages.length === 0 && <Welcome mode={mode} approve={approve} />}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <Line key={i} mark=">" className="text-muted">
                {m.text}
              </Line>
            ) : m.role === "note" ? (
              <Line key={i} mark="⎿" className="text-muted">
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
                          <span className="font-semibold">
                            {p.proposal ? "Πρότεινε αλλαγή" : (TOOL_LABELS[p.name] ?? p.name)}
                          </span>
                        </Line>
                      )}
                      {p.detail && (
                        <Line mark="⎿" className="text-muted">
                          {p.detail}
                        </Line>
                      )}
                      {p.proposal && (
                        <div className="mt-1 ml-5">
                          {p.proposal.status === "pending" ? (
                            <ProposalBox
                              before={code}
                              proposal={p.proposal}
                              onApply={() => p.proposal && apply(p.proposal)}
                              onReject={() => setMessages((ms) => settle(ms, "rejected"))}
                            />
                          ) : (
                            <span className="text-xs text-muted">
                              {PROPOSAL_STATUS[p.proposal.status]}
                            </span>
                          )}
                        </div>
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
        <form onSubmit={send} className="relative shrink-0 px-3 pt-2 pb-2">
          {commands.length > 0 && (
            <ul
              role="listbox"
              aria-label="Εντολές"
              className="absolute inset-x-3 bottom-full z-10 mb-1 overflow-hidden rounded-md border border-border bg-panel py-1 shadow-lg"
            >
              {commands.map((c, i) => (
                <li
                  key={c.name}
                  role="option"
                  aria-selected={i === picked}
                  // mousedown, not click: the box keeps focus.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setDraft("");
                    runCommand(c.name);
                  }}
                  onMouseEnter={() => setPick(i)}
                  className={`flex cursor-pointer gap-3 px-3 py-1 ${i === picked ? "bg-panel-2 text-text" : "text-muted"}`}
                >
                  <span className="w-16 shrink-0 text-accent">{c.name}</span>
                  <span className="truncate">{c.hint}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 rounded-md border border-border px-2.5 py-2 focus-within:border-muted">
            <span className="text-muted select-none" aria-hidden>
              &gt;
            </span>
            <textarea
              ref={input}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setPick(0);
              }}
              onKeyDown={(e) => {
                if (commands.length > 0 && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                  e.preventDefault();
                  const step = e.key === "ArrowDown" ? 1 : -1;
                  setPick((picked + step + commands.length) % commands.length);
                } else if (commands.length > 0 && e.key === "Tab" && !e.shiftKey) {
                  e.preventDefault();
                  setDraft(commands[picked].name);
                } else if (commands.length > 0 && e.key === "Enter" && !e.shiftKey) {
                  // Runs only a command typed out (or the only one left); otherwise Enter
                  // just fills in the highlighted one, so `/` + Enter can't run /switch.
                  e.preventDefault();
                  const exact = commands.find((c) => c.name === draft.toLowerCase());
                  const chosen = exact ?? (commands.length === 1 ? commands[0] : null);
                  if (chosen) {
                    setDraft("");
                    runCommand(chosen.name);
                  } else setDraft(commands[picked].name);
                } else if (e.key === "Escape" && busy) {
                  e.preventDefault();
                  abort.current?.abort();
                } else if (commands.length > 0 && e.key === "Escape") {
                  e.preventDefault();
                  setDraft("");
                } else if (e.key === "Tab" && e.shiftKey && mode === "agent") {
                  e.preventDefault();
                  setApprove(!approve);
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
            {mode === "agent" ? (
              <>
                <span className="min-w-0 flex-1 truncate text-muted">⇧⇥ αλλαγή</span>
                <button
                  type="button"
                  onClick={() => setApprove(!approve)}
                  title={`${current.label}: ${current.hint} · Shift+Tab για αλλαγή`}
                  className={`flex shrink-0 items-center gap-1.5 hover:opacity-80 ${current.color}`}
                >
                  <ModeLabel mode={current} />
                </button>
              </>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate text-muted">/switch για Agent</span>
                {/* A tap target for phones, which have no keyboard to type /switch quickly. */}
                <button
                  type="button"
                  onClick={switchMode}
                  title={`${current.label}: ${current.hint} · /switch για Agent`}
                  className={`flex shrink-0 items-center gap-1.5 hover:opacity-80 ${current.color}`}
                >
                  <ModeLabel mode={current} />
                </button>
              </>
            )}
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
function Welcome({ mode, approve }: { mode: AgentMode; approve: boolean }) {
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
            ? "Ρώτα γιατί βγάζει λάθος, τι τιμές παίρνουν οι μεταβλητές, πώς λύνεται ένα θέμα Πανελλαδικών. Γράψε /switch για τον Agent."
            : approve
              ? "Πες του τι να γράψει ή να διορθώσει· κάθε αλλαγή σού δείχνεται πρώτα, και Ctrl+Enter την περνά στον κώδικα."
              : "Πες του τι να γράψει ή να διορθώσει· οι αλλαγές μπαίνουν κατευθείαν στον κώδικα (Ctrl+Z για αναίρεση)."}
        </p>
      </div>
    </div>
  );
}

function ModeLabel({
  mode,
}: {
  mode: { label: string; short: string; shortColor?: string; mascot: string };
}) {
  return (
    <>
      <Image src={mode.mascot} alt="" width={20} height={20} className="h-5 w-auto" />
      <span className="font-semibold">{mode.label}</span>
      <span className="text-muted">·</span>
      <span className={mode.shortColor ?? "text-muted"}>{mode.short}</span>
    </>
  );
}

/** A proposal waiting for approval: the diff against the editor, and the two answers. */
function ProposalBox({
  before,
  proposal,
  onApply,
  onReject,
}: {
  before: string;
  proposal: Proposal;
  onApply: () => void;
  onReject: () => void;
}) {
  const after = proposal.code;
  const lines = useMemo(() => lineDiff(before, after), [before, after]);
  const changed = lines.some((l) => l.kind !== " ");
  const edited = before !== proposal.base;
  return (
    <div className="space-y-2">
      {changed ? (
        <pre className="max-h-56 overflow-auto rounded border border-border bg-bg py-1 text-xs">
          {lines.map((l, i) => (
            <div
              key={i}
              className={
                l.kind === "+"
                  ? "bg-ok/15 text-ok"
                  : l.kind === "-"
                    ? "bg-danger/15 text-danger"
                    : "text-muted"
              }
            >
              <span className="inline-block w-4 text-center select-none">{l.kind}</span>
              {l.text}
            </div>
          ))}
        </pre>
      ) : (
        <p className="text-xs text-muted">Ίδιος με τον κώδικα στον editor.</p>
      )}
      {edited && (
        <p className="text-xs text-warn">
          Άλλαξες τον κώδικα μετά την πρόταση· η Εφαρμογή θα αντικαταστήσει και τις αλλαγές σου.
        </p>
      )}
      <div className="flex gap-2 font-sans text-xs">
        <button
          type="button"
          onClick={onApply}
          className="rounded-md bg-accent px-2.5 py-1 font-medium text-on-accent hover:brightness-110"
        >
          {edited ? "Εφαρμογή" : "Εφαρμογή (Ctrl+Enter)"}
        </button>
        <button
          type="button"
          onClick={onReject}
          className="rounded-md bg-panel-2 px-2.5 py-1 hover:text-text"
        >
          Απόρριψη
        </button>
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

"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { type AgentMode, streamChat } from "@/lib/api/agent";
import { ApiError } from "@/lib/api/client";
import { useUser } from "@/lib/supabase/useUser";

type Message = { role: "user" | "assistant"; text: string; activity: string[] };

const TOOL_LABELS: Record<string, string> = {
  run_program: "Έτρεξε το πρόγραμμα",
  trace_program: "Έφτιαξε πίνακα τιμών",
  propose_edit: "Πρότεινε αλλαγή στον κώδικα",
};

const MODES: { value: AgentMode; label: string; hint: string }[] = [
  { value: "ask", label: "Ερώτηση", hint: "Εξηγεί και δίνει υποδείξεις, χωρίς να αλλάζει τον κώδικα" },
  { value: "agent", label: "Agent", hint: "Μπορεί να προτείνει αλλαγές στον κώδικά σου" },
];

type Props = {
  code: string;
  onProposeEdit: (code: string, summary: string) => void;
};

export function AgentPanel({ code, onProposeEdit }: Props) {
  const user = useUser();
  const [mode, setMode] = useState<AgentMode>("ask");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function patchReply(update: (m: Message) => Message) {
    setMessages((ms) => [...ms.slice(0, -1), update(ms[ms.length - 1])]);
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    setBusy(true);
    setMessages((ms) => [
      ...ms,
      { role: "user", text: message, activity: [] },
      { role: "assistant", text: "", activity: [] },
    ]);
    try {
      const request = { conversation_id: conversationId, message, code, mode };
      for await (const event of streamChat(request)) {
        if (event.type === "conversation") setConversationId(event.id);
        else if (event.type === "text") patchReply((m) => ({ ...m, text: m.text + event.delta }));
        else if (event.type === "tool")
          patchReply((m) => ({
            ...m,
            activity: [...m.activity, TOOL_LABELS[event.name] ?? event.name],
          }));
        else if (event.type === "edit") onProposeEdit(event.code, event.summary);
        else if (event.type === "error")
          patchReply((m) => ({ ...m, text: [m.text, event.message].filter(Boolean).join("\n\n") }));
      }
    } catch (err) {
      const text =
        err instanceof ApiError && err.status === 503
          ? "Ο βοηθός δεν είναι διαθέσιμος αυτή τη στιγμή."
          : "Δεν ήταν δυνατή η σύνδεση με τον βοηθό.";
      patchReply((m) => ({ ...m, text }));
    } finally {
      setBusy(false);
    }
  }

  function newConversation() {
    setMessages([]);
    setConversationId(null);
  }

  return (
    <aside className="flex h-[80dvh] min-h-0 flex-col border-t border-border bg-panel lg:h-auto lg:border-t-0 lg:border-l">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <h2 className="text-sm font-semibold">Βοηθός</h2>
        <div className="ml-auto flex rounded-md bg-panel-2 p-0.5 text-xs" role="radiogroup">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={mode === m.value}
              title={m.hint}
              onClick={() => setMode(m.value)}
              className={`rounded px-2 py-1 ${mode === m.value ? "bg-accent text-on-accent" : "text-muted hover:text-text"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={newConversation}
            disabled={busy}
            className="text-xs text-muted hover:text-text"
          >
            Νέα
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-3 text-sm" aria-live="polite">
        {messages.length === 0 && (
          <p className="text-muted">
            Ρώτα για τον κώδικά σου: γιατί βγάζει λάθος, τι τιμές παίρνουν οι μεταβλητές, πώς
            λύνεται ένα θέμα Πανελλαδικών.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-8 rounded-lg bg-panel-2 px-3 py-2" : ""}>
            {m.activity.map((a, j) => (
              <div key={j} className="mb-1 text-xs text-muted">
                ⚙ {a}
              </div>
            ))}
            <div className="whitespace-pre-wrap">
              {m.text || (busy && i === messages.length - 1 ? "…" : "")}
            </div>
          </div>
        ))}
      </div>

      {user === null ? (
        <p className="border-t border-border p-3 text-sm text-muted">
          <Link href="/login" className="text-accent hover:underline">
            Συνδέσου
          </Link>{" "}
          για να μιλήσεις με τον βοηθό.
        </p>
      ) : (
        <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={2}
            placeholder="Γράψε την ερώτησή σου…"
            aria-label="Μήνυμα προς τον βοηθό"
            className="min-w-0 flex-1 resize-none rounded-md border border-border bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim() || user === undefined}
            className="self-end rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-on-accent disabled:opacity-50"
          >
            Αποστολή
          </button>
        </form>
      )}
    </aside>
  );
}

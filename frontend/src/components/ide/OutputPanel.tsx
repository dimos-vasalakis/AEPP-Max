"use client";

import { useEffect, useRef, useState } from "react";
import type { RunResult } from "@/lib/glossa/types";

/**
 * `marks[i]` is how many output lines existed when `inputs[i]` was typed, so the
 * typed values can be shown where they were read. (Each input re-runs the
 * program from the start with one more value; the output is the same up to there.)
 */
export type RunState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; inputs: string[]; marks: number[]; result: RunResult }
  | { kind: "failed"; message: string };

type Props = { run: RunState; onInput: (value: string) => void; onClear: () => void };

/** The badge in the header: where the last run ended up. */
function statusBadge(run: RunState): { label: string; tone: string } | null {
  if (run.kind === "running") return { label: "Εκτελείται…", tone: "text-muted" };
  if (run.kind === "failed") return { label: "Αποτυχία σύνδεσης", tone: "text-danger" };
  if (run.kind !== "done") return null;
  switch (run.result.status) {
    case "ok":
      return { label: "Ολοκληρώθηκε", tone: "text-ok" };
    case "needs_input":
      return { label: "Περιμένει τιμή", tone: "text-warn" };
    case "limit":
      return { label: "Σταμάτησε (όριο)", tone: "text-warn" };
    case "error":
      return { label: "Σφάλμα", tone: "text-danger" };
  }
}

export function OutputPanel({ run, onInput, onClear }: Props) {
  const body = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const badge = statusBadge(run);
  const hasContent = run.kind === "done" || run.kind === "failed";

  // New output scrolls into view, so a long run ends on its last line.
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight });
  }, [run]);

  async function copy() {
    if (run.kind !== "done") return;
    try {
      await navigator.clipboard.writeText(run.result.output.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: nothing to do.
    }
  }

  return (
    <section className="flex min-h-0 flex-col border-t border-border bg-output">
      <div className="output-header flex h-9 shrink-0 items-center gap-2 border-b border-border px-3 text-xs">
        <span className="output-title font-semibold uppercase tracking-wide text-muted">
          Οθόνη εκτέλεσης
        </span>
        {badge && (
          <span className={`flex items-center gap-1.5 font-medium ${badge.tone}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
            {badge.label}
          </span>
        )}
        <span className="ml-auto flex items-center gap-3 text-muted">
          {run.kind === "done" && <span>{run.result.steps} βήματα</span>}
          {run.kind === "done" && run.result.output.length > 0 && (
            <button type="button" onClick={copy} className="hover:text-text">
              {copied ? "✓ Αντιγράφηκε" : "Αντιγραφή"}
            </button>
          )}
          {hasContent && (
            <button type="button" onClick={onClear} className="hover:text-text">
              Καθαρισμός
            </button>
          )}
        </span>
      </div>
      <div
        ref={body}
        className="output-body min-h-0 flex-1 overflow-auto p-3 leading-6"
        style={{ fontSize: "var(--editor-font-size, 14px)" }}
        aria-live="polite"
      >
        {run.kind === "idle" && (
          <p className="flex items-center gap-2 text-muted">
            <span className="text-accent" aria-hidden>
              ▶
            </span>
            Πάτησε «Εκτέλεση» για να τρέξει το πρόγραμμα.
          </p>
        )}
        {run.kind === "running" && <p className="text-muted">Εκτέλεση…</p>}
        {run.kind === "failed" && <p className="text-danger">{run.message}</p>}
        {run.kind === "done" && <RunOutput {...run} onInput={onInput} />}
      </div>
    </section>
  );
}

function RunOutput({
  inputs,
  marks,
  result,
  onInput,
}: Extract<RunState, { kind: "done" }> & { onInput: (value: string) => void }) {
  const lines: { text: string; input: boolean }[] = [];
  let next = 0;
  const flushInputs = (upTo: number) => {
    while (next < marks.length && marks[next] <= upTo) {
      lines.push({ text: inputs[next++], input: true });
    }
  };
  result.output.forEach((text, i) => {
    flushInputs(i);
    lines.push({ text, input: false });
  });
  flushInputs(result.output.length);

  return (
    <>
      {lines.map((line, i) => (
        <div
          key={i}
          className={line.input ? "output-typed text-accent" : "output-line whitespace-pre-wrap"}
        >
          <span className="output-num" aria-hidden>
            {i + 1}
          </span>
          {line.input && (
            <span className="output-prompt" aria-hidden>
              ›{" "}
            </span>
          )}
          {line.text}
        </div>
      ))}
      {result.status === "needs_input" && (
        <InputLine key={inputs.length} number={lines.length + 1} onSubmit={onInput} />
      )}
      {result.status === "error" && result.error && (
        <p className="mt-2 rounded-md border-l-2 border-danger bg-danger/10 px-3 py-2 text-danger">
          {result.error.line !== null && <strong>Γραμμή {result.error.line}: </strong>}
          {result.error.message}
        </p>
      )}
      {result.status === "limit" && (
        <p className="mt-2 rounded-md border-l-2 border-warn bg-warn/10 px-3 py-2 text-warn">
          Η εκτέλεση σταμάτησε γιατί ξεπέρασε το όριο βημάτων ή χρόνου. Μήπως υπάρχει ατέρμονος
          βρόχος;
        </p>
      )}
      {result.status === "ok" && <p className="mt-2 text-xs text-muted">— Τέλος προγράμματος —</p>}
    </>
  );
}

function InputLine({ number, onSubmit }: { number: number; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="output-input mt-1 flex items-center gap-2 rounded-md border border-accent/50 bg-bg px-2 py-1 focus-within:border-accent"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
    >
      <span className="output-num" aria-hidden>
        {number}
      </span>
      <label
        htmlFor="read-input"
        className="output-input-label shrink-0 text-xs font-medium text-accent"
      >
        ΔΙΑΒΑΣΕ ›
      </label>
      <input
        id="read-input"
        autoFocus
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="γράψε μια τιμή και πάτα Enter"
        className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-muted"
      />
    </form>
  );
}

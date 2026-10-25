"use client";

import { useState } from "react";
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

type Props = { run: RunState; onInput: (value: string) => void };

export function OutputPanel({ run, onInput }: Props) {
  return (
    <section className="flex min-h-0 flex-col border-t border-border bg-panel">
      <div className="flex h-9 shrink-0 items-center border-b border-border px-3 text-xs font-medium text-muted">
        Έξοδος
        {run.kind === "done" && <span className="ml-auto">{run.result.steps} βήματα</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-sm" aria-live="polite">
        {run.kind === "idle" && (
          <p className="text-muted">Πάτησε «Εκτέλεση» για να τρέξει το πρόγραμμα.</p>
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
        <div key={i} className={line.input ? "text-accent" : "whitespace-pre-wrap"}>
          {line.input ? `› ${line.text}` : line.text}
        </div>
      ))}
      {result.status === "needs_input" && <InputLine key={inputs.length} onSubmit={onInput} />}
      {result.status === "error" && result.error && (
        <p className="mt-2 text-danger">
          {result.error.line !== null && `Γραμμή ${result.error.line}: `}
          {result.error.message}
        </p>
      )}
      {result.status === "limit" && (
        <p className="mt-2 text-warn">
          Η εκτέλεση σταμάτησε γιατί ξεπέρασε το όριο βημάτων ή χρόνου. Μήπως υπάρχει ατέρμονος
          βρόχος;
        </p>
      )}
      {result.status === "ok" && <p className="mt-2 text-muted">Τέλος προγράμματος.</p>}
    </>
  );
}

function InputLine({ onSubmit }: { onSubmit: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
    >
      <label htmlFor="read-input" className="text-accent">
        ΔΙΑΒΑΣΕ ›
      </label>
      <input
        id="read-input"
        autoFocus
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-w-0 flex-1 bg-transparent outline-none"
      />
    </form>
  );
}

"use client";

import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/Confirm";
import type { LimitReason, RunResult } from "@/lib/glossa/types";
import { TracePanel } from "./TracePanel";

/**
 * A run played back step by step: `slow` on its own (Αργή εκτέλεση, the 50 sign),
 * `step` one step per Επόμενο (Βηματική εκτέλεση).
 */
export type Pace = "slow" | "step";

/**
 * `marks[i]` is how many output lines existed when `inputs[i]` was typed, so the
 * typed values can be shown where they were read. (Each input re-runs the
 * program from the start with one more value; the output is the same up to there.)
 * `traced` runs (the «Πίνακας τιμών» button) carry the trace; `code` is what ran.
 * `pace`: a run traced to be played back (it shows no table).
 * `pending`: a re-run with one more ΔΙΑΒΑΣΕ value is on its way; `failure`: it didn't
 * get through (the box still holds the value: `RunEndProps`). `stopped`: the
 * student stopped it (■) while it waited for a value or re-ran; `kind: "stopped"`
 * when it was stopped before anything came back.
 * `autoSteps`: the trace step each value Αυτόματες τιμές gave was read at. They mix with
 * typed `inputs`, but those a played run hasn't reached yet are always made up.
 */
export type RunState =
  | { kind: "idle" }
  | { kind: "running"; traced: boolean; pace?: Pace }
  | {
      kind: "done";
      inputs: string[];
      marks: number[];
      autoSteps?: number[];
      result: RunResult;
      code: string;
      traced: boolean;
      pace?: Pace;
      pending?: boolean;
      failure?: string;
      stopped?: boolean;
    }
  | { kind: "stopped" }
  | { kind: "failed"; message: string };

export type OutputTab = "screen" | "trace";

/**
 * What is typed in the ΔΙΑΒΑΣΕ box, and for how many values read so far. The box remounts
 * on another tab or table step, so it's kept above them; in a ref, so that a keystroke
 * doesn't redraw a whole table.
 */
type Draft = { read: number; value: string };

/** What RunEnd needs from above the tabs. */
export type RunEndProps = {
  /** The dice is on: a typed value goes on with more made-up ones. */
  autoFill: boolean;
  draftRef: RefObject<Draft>;
};

type Props = {
  run: RunState;
  onInput: (value: string) => void;
  onClear: () => void;
  /** Which tab shows; there are tabs only for a traced run. */
  tab: OutputTab;
  onTab: (tab: OutputTab) => void;
  /** The πίνακας τιμών's current step (see TracePanel). */
  step: number;
  onStep: (step: number) => void;
  /** The editor's code is no longer what ran. */
  stale: boolean;
  /** A slow or step run is playing (or was stopped while it played): `run` holds the screen so far. */
  playing: boolean;
  /** The dice is on: a typed value goes on with more made-up ones. */
  autoFill: boolean;
};

/** Why the run stopped. Time is the server's, so a program with no bug may hit it. */
const LIMIT_MESSAGES: Record<LimitReason, string> = {
  steps: "Η εκτέλεση σταμάτησε γιατί ξεπέρασε το όριο βημάτων. Μήπως υπάρχει ατέρμονος βρόχος;",
  time: "Η εκτέλεση σταμάτησε γιατί ξεπέρασε το όριο χρόνου. Μήπως υπάρχει ατέρμονος βρόχος; Αν όχι, δοκίμασε ξανά: ο διακομιστής μπορεί να ήταν απασχολημένος.",
  output: "Η εκτέλεση σταμάτησε γιατί το πρόγραμμα έγραψε πάρα πολλά στην οθόνη. Μήπως υπάρχει ατέρμονος βρόχος;",
  inputs: "Η εκτέλεση σταμάτησε γιατί το πρόγραμμα ζήτησε περισσότερες από 1.000 τιμές, το όριο μίας εκτέλεσης.",
};

/** The badge in the header: where the last run ended up. */
function statusBadge(run: RunState, playing: boolean): { label: string; tone: string } | null {
  if (run.kind === "running" || (playing && run.kind === "done" && !run.stopped)) return { label: "Εκτελείται…", tone: "text-muted" };
  if (run.kind === "failed") return { label: "Αποτυχία σύνδεσης", tone: "text-danger" };
  if (run.kind === "stopped" || (run.kind === "done" && run.stopped)) {
    return { label: "Διακόπηκε", tone: "text-warn" };
  }
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

export function OutputPanel({
  run,
  onInput,
  onClear,
  tab,
  onTab,
  step,
  onStep,
  stale,
  playing,
  autoFill,
}: Props) {
  const body = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [askClear, setAskClear] = useState(false);
  const draftRef = useRef<Draft>({ read: 0, value: "" });
  const end: RunEndProps = { autoFill, draftRef };
  // A new run or a cleared screen forgets it.
  useEffect(() => {
    if (run.kind !== "done") draftRef.current = { read: 0, value: "" };
  }, [run.kind]);
  const badge = statusBadge(run, playing);
  const hasContent = run.kind === "done" || run.kind === "failed" || run.kind === "stopped";
  const traced = (run.kind === "running" || run.kind === "done") && run.traced;
  const showTrace = traced && tab === "trace";

  // New output scrolls into view, so a long run ends on its last line.
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight });
  }, [run, showTrace]);

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
        {traced ? (
          <div role="tablist" aria-label="Αποτελέσματα" className="flex h-full items-stretch gap-1">
            <OutputTabButton active={!showTrace} onClick={() => onTab("screen")}>
              Οθόνη<span className="hidden sm:inline"> εκτέλεσης</span>
            </OutputTabButton>
            <OutputTabButton active={showTrace} onClick={() => onTab("trace")}>
              Πίνακας τιμών
            </OutputTabButton>
          </div>
        ) : (
          <span className="output-title font-semibold uppercase tracking-wide text-muted">
            Οθόνη εκτέλεσης
          </span>
        )}
        {badge && (
          <span className={`output-badge flex items-center gap-1.5 font-medium ${badge.tone}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
            {badge.label}
          </span>
        )}
        <span className="ml-auto flex items-center gap-3 text-muted">
          {/* The table counts its own rows (a call adds some), so only the screen shows this. */}
          {run.kind === "done" && !showTrace && !playing && <span>{run.result.steps} βήματα</span>}
          {run.kind === "done" && !showTrace && run.result.output.length > 0 && (
            <button type="button" onClick={copy} className="hover:text-text">
              {copied ? "✓ Αντιγράφηκε" : "Αντιγραφή"}
            </button>
          )}
          {hasContent && (
            <button
              type="button"
              onClick={() => setAskClear(true)}
              className="flex items-center gap-1 rounded-md border border-danger/40 bg-danger/15 px-2 py-0.5 font-medium text-danger hover:bg-danger/25"
            >
              <BroomIcon />
              Καθαρισμός
            </button>
          )}
        </span>
      </div>
      {askClear && (
        <ConfirmDialog
          title="Καθαρισμός της οθόνης;"
          confirmLabel="Καθαρισμός"
          onConfirm={() => {
            setAskClear(false);
            onClear();
          }}
          onCancel={() => setAskClear(false)}
        >
          {traced
            ? "Θα σβηστούν τα αποτελέσματα και ο πίνακας τιμών αυτής της εκτέλεσης."
            : "Θα σβηστούν τα αποτελέσματα αυτής της εκτέλεσης."}{" "}
          Ο κώδικας δεν αλλάζει.
        </ConfirmDialog>
      )}
      {showTrace && run.kind === "done" ? (
        <TracePanel
          run={run}
          step={step}
          onStep={onStep}
          stale={stale}
          onInput={onInput}
          end={end}
        />
      ) : (
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
              Πάτησε «Εκτέλεση» για να τρέξει το πρόγραμμα, ή «Πίνακας τιμών» για να το δεις
              βήμα-βήμα.
            </p>
          )}
          {run.kind === "running" && <p className="text-muted">Εκτέλεση…</p>}
          {run.kind === "stopped" && <p className="text-warn">— Η εκτέλεση διακόπηκε —</p>}
          {run.kind === "failed" && <p className="text-danger">{run.message}</p>}
          {run.kind === "done" && <RunOutput run={run} onInput={onInput} playing={playing} end={end} />}
        </div>
      )}
    </section>
  );
}

function OutputTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`output-tab -mb-px border-b-2 px-1.5 whitespace-nowrap font-semibold uppercase tracking-wide ${
        active
          ? "output-title border-accent text-text"
          : "border-transparent text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

type Done = Extract<RunState, { kind: "done" }>;

function RunOutput({
  run,
  onInput,
  playing,
  end,
}: {
  run: Done;
  onInput: (value: string) => void;
  playing: boolean;
  end: RunEndProps;
}) {
  const { inputs, marks, result } = run;
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
      <RunEnd
        run={run}
        onInput={onInput}
        number={lines.length + 1}
        playing={playing}
        end={end}
      />
    </>
  );
}

/** How a run ended: the ΔΙΑΒΑΣΕ box, the error, the limit, or the end. Shared with TracePanel. */
export function RunEnd({
  run,
  onInput,
  number,
  playing = false,
  end,
}: {
  run: Done;
  onInput: (value: string) => void;
  /** The input line's number in the Κλασικό theme's strip. */
  number?: number;
  /** A played run (slow or step) hasn't reached its end. */
  playing?: boolean;
  end: RunEndProps;
}) {
  const { inputs, result } = run;
  const autoCount = run.autoSteps?.length ?? 0;
  if (run.stopped) return <p className="mt-2 text-xs text-warn">— Η εκτέλεση διακόπηκε —</p>;
  if (playing) return null;
  return (
    <>
      {autoCount > 0 &&
        (result.status === "needs_input" ? (
          <p className="mt-2 text-xs text-warn">
            Δόθηκαν αυτόματα {autoCount} τιμές και το πρόγραμμα ζητά κι άλλες.{" "}
            {end.autoFill &&
              "Μετά τη δική σου συνεχίζουν αυτόματα· για να γράψεις μόνο δικές σου, κλείσε πρώτα το ζάρι. "}
            Μήπως περιμένει μια συγκεκριμένη τιμή για να σταματήσει; Γράψε την εδώ:
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted">
            {autoCount === 1 ? "Η τιμή δόθηκε αυτόματα" : `Οι ${autoCount} τιμές δόθηκαν αυτόματα`}.
            {end.autoFill && " Με νέα εκτέλεση δίνονται άλλες."}
          </p>
        ))}
      {result.status === "needs_input" && (
        <InputLine
          key={inputs.length}
          number={number}
          onSubmit={onInput}
          waiting={run.pending === true}
          stepped={run.pace === "step"}
          read={inputs.length}
          draftRef={end.draftRef}
        />
      )}
      {run.failure && <p className="mt-2 text-danger">{run.failure}</p>}
      {result.status === "error" && result.error && (
        <p className="mt-2 rounded-md border-l-2 border-danger bg-danger/10 px-3 py-2 text-danger">
          {result.error.line !== null && <strong>Γραμμή {result.error.line}: </strong>}
          {result.error.message}
        </p>
      )}
      {result.status === "limit" && (
        <p className="mt-2 rounded-md border-l-2 border-warn bg-warn/10 px-3 py-2 text-warn">
          {/* A backend not yet redeployed doesn't say which. */}
          {result.limit
            ? LIMIT_MESSAGES[result.limit]
            : "Η εκτέλεση σταμάτησε γιατί ξεπέρασε το όριο βημάτων, χρόνου ή εξόδου. Μήπως υπάρχει ατέρμονος βρόχος;"}
        </p>
      )}
      {run.pace && result.trace_truncated && (
        <p className="mt-2 text-xs text-warn">
          Δείχτηκαν τα πρώτα {result.trace?.length} βήματα· το πρόγραμμα συνέχισε χωρίς να φαίνεται,
          μέχρι το βήμα {result.steps}.
        </p>
      )}
      {result.status === "ok" && <p className="mt-2 text-xs text-muted">— Τέλος προγράμματος —</p>}
    </>
  );
}

function InputLine({
  number,
  onSubmit,
  waiting,
  stepped,
  read,
  draftRef,
}: {
  number?: number;
  onSubmit: (value: string) => void;
  /** The value was sent; the re-run hasn't come back yet. */
  waiting: boolean;
  /** A step run, where the box appears from Enter on Επόμενο. */
  stepped: boolean;
  /** How many values the run has read: once one more is, the box starts empty. */
  read: number;
  draftRef: RefObject<Draft>;
}) {
  // Uncontrolled, so typing renders nothing; a remounted box picks the value back up.
  const input = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (input.current && draftRef.current.read === read) input.current.value = draftRef.current.value;
  }, [draftRef, read]);
  // A held Enter never sends a value; in a step run, nor does a quick second Enter
  // meant for Επόμενο (it would send an empty one).
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = performance.now();
  }, []);
  return (
    <form
      className="output-input mt-1 flex items-center gap-2 rounded-md border border-accent/50 bg-bg px-2 py-1 focus-within:border-accent"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(input.current?.value ?? "");
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
        ref={input}
        autoFocus
        autoComplete="off"
        readOnly={waiting}
        aria-busy={waiting}
        maxLength={1000} // schemas/run.py MAX_INPUT_CHARS
        onChange={(e) => {
          draftRef.current = { read, value: e.target.value };
        }}
        onKeyDown={(e) => {
          const early = stepped && performance.now() - shownAt.current < 400;
          if (e.key === "Enter" && (e.repeat || early)) {
            e.preventDefault();
          }
        }}
        placeholder="γράψε μια τιμή και πάτα Enter"
        className={`min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-muted ${waiting ? "opacity-60" : ""}`}
      />
    </form>
  );
}

/** A broom, for «Καθαρισμός». */
function BroomIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 3l-7.5 7.5M8.5 9.5l6 6M4 20c1-4 2.5-7 4.5-10.5l6 6C11 17.5 8 19 4 20z" />
    </svg>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  changeAt,
  conditionText,
  scopeGroups,
  sourceLine,
  traceColumns,
  valuesAfter,
} from "@/lib/glossa/trace";
import { RunEnd, type RunState } from "./OutputPanel";

type Done = Extract<RunState, { kind: "done" }>;

type Props = {
  run: Done;
  /** The current step (an index into the trace). Ide keeps it, to mark its line in the editor. */
  step: number;
  onStep: (step: number) => void;
  /** The code changed since this run: the table no longer matches the editor. */
  stale: boolean;
  onInput: (value: string) => void;
};

const PLAY_MS = 700;

/**
 * The πίνακας τιμών, step by step: one row per executed line, one column per
 * variable. Rows appear as the student steps, so they can predict each one
 * first; «Όλος ο πίνακας» shows the rest. By default a cell shows a value only
 * where it changed, as the table is written on paper; «Όλες οι τιμές» fills in
 * the value each variable holds at every step.
 */
export function TracePanel({ run, step, onStep, stale, onInput }: Props) {
  const trace = useMemo(() => run.result.trace ?? [], [run.result.trace]);
  const columns = useMemo(() => traceColumns(trace), [trace]);
  const [allValues, setAllValues] = useState(false);
  const values = useMemo(
    () => (allValues ? valuesAfter(trace, columns) : null),
    [allValues, trace, columns],
  );
  const [play, setPlay] = useState(false);
  const last = trace.length - 1;
  const atEnd = step >= last;
  const playing = play && !atEnd;
  const current = useRef<HTMLTableRowElement>(null);
  const body = useRef<HTMLDivElement>(null);

  const groups = scopeGroups(columns);
  const scopes = new Set(trace.map((s) => s.scope));
  const showScopes = scopes.size > 1;
  const hasCondition = trace.some((s) => s.condition !== null);
  const hasOutput = trace.some((s) => s.output.length > 0);
  const extra = Number(hasCondition) + Number(hasOutput);

  // Play: one step at a time, until the end.
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => onStep(step + 1), PLAY_MS);
    return () => clearTimeout(timer);
  }, [playing, step, onStep]);

  // Focused as it opens, and again after a ΔΙΑΒΑΣΕ value (its box goes, and the focus
  // with it), so the arrow keys step through it straight away. Never away from the box.
  const opened = useRef(false);
  useEffect(() => {
    const el = body.current;
    const active = document.activeElement;
    const lost = active === null || active === document.body;
    if (el && !el.contains(active) && (!opened.current || lost)) {
      el.focus({ preventScroll: true });
    }
    opened.current = true;
  }, [run]);

  // The current row stays in view as it moves.
  useEffect(() => {
    current.current?.scrollIntoView({ block: "nearest" });
  }, [step]);

  const go = (to: number) => {
    setPlay(false);
    onStep(Math.max(0, Math.min(last, to)));
  };

  function onKey(e: React.KeyboardEvent) {
    if (e.target instanceof HTMLInputElement) return;
    // On a button, Space presses it (Επόμενο, Αρχή…) rather than playing.
    if (e.key === " " && e.target instanceof HTMLButtonElement) return;
    const moves: Record<string, number> = {
      ArrowDown: step + 1,
      ArrowRight: step + 1,
      ArrowUp: step - 1,
      ArrowLeft: step - 1,
      Home: 0,
      End: last,
    };
    if (e.key in moves) {
      e.preventDefault();
      go(moves[e.key]);
    } else if (e.key === " ") {
      e.preventDefault();
      setPlay(!playing && !atEnd);
    }
  }

  if (trace.length === 0) {
    // Nothing ran: a syntax error, or input needed before the first statement.
    return (
      <div className="p-3 leading-6" style={{ fontSize: "var(--editor-font-size, 14px)" }}>
        {run.result.status === "error" ? (
          <p className="mb-2 text-xs text-muted">
            Ο πίνακας τιμών φτιάχνεται μόλις το πρόγραμμα τρέξει χωρίς λάθη σύνταξης.
          </p>
        ) : null}
        <RunEnd run={run} onInput={onInput} />
      </div>
    );
  }

  const row = trace[Math.min(step, last)];
  const visible = trace.slice(0, step + 1);

  return (
    <div className="flex min-h-0 flex-1 flex-col" onKeyDown={onKey}>
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-2 py-1 text-xs">
        <div className="flex items-center" role="group" aria-label="Βήματα">
          <StepButton label="Αρχή (Home)" onClick={() => go(0)} disabled={step === 0}>
            <path d="M6 5v14M18 5l-9 7 9 7z" />
          </StepButton>
          <StepButton
            label="Προηγούμενο βήμα (←)"
            onClick={() => go(step - 1)}
            disabled={step === 0}
          >
            <path d="M15 5l-7 7 7 7" />
          </StepButton>
          <button
            type="button"
            onClick={() => setPlay(!playing)}
            disabled={atEnd}
            aria-label={playing ? "Παύση" : "Αναπαραγωγή"}
            title={playing ? "Παύση (κενό)" : "Αναπαραγωγή: ένα βήμα κάθε λίγο (κενό)"}
            className="mx-0.5 flex h-7 items-center gap-1 rounded-md btn-primary bg-accent px-2 font-medium text-on-accent hover:brightness-110 disabled:opacity-40"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              {playing ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M6 4v16l14-8z" />}
            </svg>
            <span className="hidden sm:inline">{playing ? "Παύση" : "Αναπαραγωγή"}</span>
          </button>
          <StepButton label="Επόμενο βήμα (→)" onClick={() => go(step + 1)} disabled={atEnd}>
            <path d="M9 5l7 7-7 7" />
          </StepButton>
          <StepButton label="Όλος ο πίνακας (End)" onClick={() => go(last)} disabled={atEnd}>
            <path d="M18 5v14M6 5l9 7-9 7z" />
          </StepButton>
        </div>
        <span className="font-mono tabular-nums text-muted" aria-live="polite">
          Βήμα <b className="text-text">{step + 1}</b> από {trace.length}
          {run.result.trace_truncated && "+"} · Γραμμή <b className="text-text">{row.line}</b>
        </span>
        <label className="ml-auto flex cursor-pointer select-none items-center gap-1.5 text-muted hover:text-text">
          <input
            type="checkbox"
            checked={allValues}
            onChange={(e) => setAllValues(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Όλες οι τιμές
        </label>
      </div>

      {stale && (
        <p className="shrink-0 border-b border-border bg-warn/10 px-3 py-1 text-xs text-warn">
          Ο κώδικας άλλαξε από αυτή την εκτέλεση. Πάτα ξανά «Πίνακας τιμών» για να ενημερωθεί.
        </p>
      )}

      {/* Focusable, so the arrow keys step through it. */}
      <div
        ref={body}
        className="trace-body min-h-0 flex-1 overflow-auto outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
        tabIndex={0}
        aria-label="Πίνακας τιμών: τα βελάκια αλλάζουν βήμα"
        style={{ fontSize: "var(--editor-font-size, 14px)" }}
      >
        <table className="trace-table w-max min-w-full border-separate border-spacing-0 text-left">
          <thead className="sticky top-0 z-10 bg-panel-2 text-xs">
            {showScopes && (
              <tr>
                <th colSpan={3} className="border-b border-border" />
                {groups.map((g, i) => (
                  <th
                    key={i}
                    colSpan={g.span}
                    className="border-b border-l border-border px-2 pt-1 text-center font-medium text-muted"
                  >
                    {g.scope}
                  </th>
                ))}
                {extra > 0 && <th colSpan={extra} className="border-b border-l border-border" />}
              </tr>
            )}
            <tr className="text-muted">
              <th className="trace-th w-10 text-right">#</th>
              <th className="trace-th w-10 text-right" title="Γραμμή">
                Γρ.
              </th>
              <th className="trace-th">Εντολή</th>
              {columns.map((c, i) => (
                <th
                  key={c.key}
                  className={`trace-th text-center font-mono text-text ${i === 0 || columns[i - 1].scope !== c.scope ? "border-l" : ""}`}
                >
                  {c.name}
                </th>
              ))}
              {hasCondition && <th className="trace-th border-l text-center">Συνθήκη</th>}
              {hasOutput && <th className="trace-th border-l">Οθόνη</th>}
            </tr>
          </thead>
          <tbody className="font-[family-name:var(--editor-font)]">
            {visible.map((s, i) => {
              const isCurrent = i === step;
              const inCall = showScopes && s.scope !== trace[0].scope;
              return (
                <tr
                  key={i}
                  ref={isCurrent ? current : undefined}
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() => go(i)}
                  className={`trace-row cursor-pointer ${isCurrent ? "trace-current" : inCall ? "bg-panel-2/50" : ""}`}
                >
                  <td className="trace-td text-right text-xs tabular-nums text-muted">{i + 1}</td>
                  <td className="trace-td text-right tabular-nums text-muted">{s.line}</td>
                  <td
                    className="trace-td max-w-[18rem] truncate text-muted"
                    title={sourceLine(run.code, s.line)}
                  >
                    {inCall && <span className="mr-1 text-xs text-purple">{s.scope} ›</span>}
                    {sourceLine(run.code, s.line)}
                  </td>
                  {columns.map((c, j) => {
                    const changed = changeAt(s, c);
                    const shown = changed ?? values?.[i][j];
                    return (
                      <td
                        key={c.key}
                        className={`trace-td text-center tabular-nums ${j === 0 || columns[j - 1].scope !== c.scope ? "border-l" : ""} ${
                          changed === undefined
                            ? "text-muted/60"
                            : isCurrent
                              ? "trace-changed font-bold"
                              : "font-semibold text-text"
                        }`}
                      >
                        {shown}
                      </td>
                    );
                  })}
                  {hasCondition && (
                    <td
                      className={`trace-td border-l text-center text-xs font-semibold ${s.condition ? "text-ok" : "text-danger"}`}
                    >
                      {conditionText(s.condition)}
                    </td>
                  )}
                  {hasOutput && (
                    <td className="trace-td border-l whitespace-pre font-semibold text-text">
                      {s.output.join("\n")}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="px-3 py-2 leading-6">
          {!atEnd ? (
            <p className="text-xs text-muted">
              ⋯ ακόμα {last - step} {last - step === 1 ? "βήμα" : "βήματα"}: πρόβλεψε το επόμενο και
              πάτα <span className="text-accent">→</span>, ή{" "}
              <button type="button" onClick={() => go(last)} className="underline hover:text-text">
                δες όλο τον πίνακα
              </button>
              .
            </p>
          ) : (
            <>
              {run.result.trace_truncated && (
                <p className="mb-2 text-xs text-warn">
                  Ο πίνακας δείχνει τα πρώτα {trace.length} βήματα· το πρόγραμμα συνέχισε μέχρι το
                  τέλος του ({run.result.steps} βήματα).
                </p>
              )}
              <RunEnd run={run} onInput={onInput} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-panel-2 hover:text-text disabled:opacity-30"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {children}
      </svg>
    </button>
  );
}

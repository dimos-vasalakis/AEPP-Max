"use client";

import { type ReactNode, useMemo, useState } from "react";
import { conditionText } from "@/lib/glossa/trace";
import {
  type FrameView,
  framesAtStep,
  MAX_ELEMENTS,
  snapshotFrames,
  TYPE_WORD,
  type VariableRow,
} from "@/lib/glossa/variables";
import type { RunState } from "./OutputPanel";

type Done = Extract<RunState, { kind: "done" }>;

type Props = {
  run: RunState;
  /** The πίνακας τιμών's step while the table shows (values at that step); null: where the run stopped. */
  step: number | null;
  /** The code changed since this run. */
  stale: boolean;
  /** The column's tabs, for the header. */
  tabs: ReactNode;
};

/**
 * Μεταβλητές: every variable of the running calls and its value, where the run
 * stopped (the end, a ΔΙΑΒΑΣΕ waiting, an error) or, while the πίνακας τιμών
 * shows, at its current step. «Κλήσεις» picks the call when a subprogram runs.
 */
export function VariablesPanel({ run, step, stale, tabs }: Props) {
  const frames = useMemo((): FrameView[] => {
    if (run.kind !== "done") return [];
    const { trace, units, frames } = run.result;
    if (step !== null && trace?.length) return framesAtStep(trace, step, units);
    return snapshotFrames(frames);
  }, [run, step]);
  // A call picked in «Κλήσεις» stays picked until another call starts or ends.
  const [picked, setPicked] = useState<{ key: string; top: string } | null>(null);
  const top = frames.at(-1)?.key ?? "";
  const shown =
    frames.find((f) => picked !== null && picked.top === top && f.key === picked.key) ??
    frames.at(-1);
  // Arrays opened to show their elements, by name.
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (name: string) =>
    setOpen((was) => {
      const next = new Set(was);
      if (!next.delete(name)) next.add(name);
      return next;
    });

  return (
    <section className="ide-pane flex h-[80dvh] min-h-0 flex-col border-t border-border bg-output lg:h-auto lg:border-t-0 lg:border-l">
      <div className="side-header flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 font-sans">
        {tabs}
      </div>
      {run.kind !== "done" ? (
        <p className="p-4 text-sm text-muted">{waitingText(run)}</p>
      ) : (
        <>
          <div className="shrink-0 space-y-1.5 border-b border-border px-3 py-2 text-xs">
            <p className="text-muted">{where(run, step)}</p>
            {stale && <p className="text-warn">Ο κώδικας άλλαξε μετά την εκτέλεση.</p>}
            {frames.length > 1 && shown && (
              <label className="flex items-center gap-2 text-muted">
                Κλήσεις
                <select
                  value={shown.key}
                  onChange={(e) => setPicked({ key: e.target.value, top })}
                  className="min-w-0 flex-1 rounded-md border border-border bg-panel-2 px-1.5 py-1 text-text"
                >
                  {frames.map((f, i) => (
                    <option key={f.key} value={f.key}>
                      {i + 1}. {f.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {shown ? (
            <FrameTable frame={shown} open={open} onToggle={toggle} single={frames.length === 1} />
          ) : (
            <p className="p-4 text-sm text-muted">{notRun(run)}</p>
          )}
        </>
      )}
    </section>
  );
}

function FrameTable({
  frame,
  open,
  onToggle,
  single,
}: {
  frame: FrameView;
  open: ReadonlySet<string>;
  onToggle: (name: string) => void;
  /** No «Κλήσεις» list: the table names its unit itself. */
  single: boolean;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table
        className="var-table w-full border-separate border-spacing-0 text-left"
        style={{ fontSize: "var(--editor-font-size, 14px)" }}
      >
        <thead className="sticky top-0 z-10 bg-panel-2 text-xs">
          {single && (
            <tr>
              <th colSpan={2} className="trace-th font-[family-name:var(--editor-font)] text-text">
                {frame.title}
              </th>
            </tr>
          )}
          <tr className="text-muted">
            <th className="trace-th w-1/2">Μεταβλητή</th>
            <th className="trace-th border-l border-border">Τιμή</th>
          </tr>
        </thead>
        <tbody className="font-[family-name:var(--editor-font)]">
          {frame.rows.length === 0 && (
            <tr>
              <td colSpan={2} className="trace-td font-sans text-xs text-muted">
                Δεν έχει μεταβλητές ακόμα.
              </td>
            </tr>
          )}
          {frame.rows.map((row) =>
            row.elements === undefined ? (
              <ValueRow key={row.name} row={row} type={row.type} />
            ) : (
              <ArrayRows
                key={row.name}
                row={row}
                open={open.has(row.name)}
                onToggle={() => onToggle(row.name)}
              />
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function ArrayRows({ row, open, onToggle }: { row: VariableRow; open: boolean; onToggle: () => void }) {
  const dims = row.dims ?? [];
  return (
    <>
      <tr className="trace-row">
        <td className="trace-td">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="flex items-center gap-1.5 text-left hover:text-accent"
          >
            <span className="w-3 text-xs text-muted" aria-hidden>
              {open ? "▾" : "▸"}
            </span>
            <span className={row.changed ? "trace-changed" : ""}>{row.name}</span>
            <TypeWord type={row.type} />
          </button>
        </td>
        <td className="trace-td border-l border-border font-sans text-xs text-muted">
          πίνακας{dims.length > 0 && ` ${dims.join(" × ")}`}
        </td>
      </tr>
      {open &&
        row.elements!.map((element) => (
          <ValueRow key={element.name} row={element} type={row.type} nested />
        ))}
      {open && row.more && (
        <tr>
          <td colSpan={2} className="trace-td pl-8 font-sans text-xs text-muted">
            … είναι πολύ μεγάλος: φαίνονται τα πρώτα {MAX_ELEMENTS} στοιχεία το πολύ
          </td>
        </tr>
      )}
      {open && row.partial && (
        <tr>
          <td colSpan={2} className="trace-td pl-8 font-sans text-xs text-muted">
            … δεν χωράνε όλες οι τιμές του εδώ: ένα κενό στοιχείο μπορεί να έχει τιμή
          </td>
        </tr>
      )}
      {open && row.elements!.length === 0 && (
        <tr>
          <td colSpan={2} className="trace-td pl-8 font-sans text-xs text-muted">
            Κανένα στοιχείο δεν έχει τιμή ακόμα.
          </td>
        </tr>
      )}
    </>
  );
}

/** A variable or an array element; `type` is the declared one (an element's array's). */
function ValueRow({ row, type, nested }: { row: VariableRow; type: string | null; nested?: boolean }) {
  return (
    <tr className="trace-row">
      <td className={`trace-td ${nested ? "pl-8 text-muted" : ""}`}>
        <span className={row.changed ? "trace-changed" : ""}>{row.name}</span>
        {!nested && <TypeWord type={row.type} />}
      </td>
      <td
        className={`var-value trace-td border-l border-border whitespace-pre ${row.changed ? "trace-changed font-semibold" : ""}`}
        style={row.changed ? undefined : { color: valueColor(type, row.value) }}
      >
        {row.value === undefined ? "" : type === "ΧΑΡΑΚΤΗΡΑΣ" ? `"${row.value}"` : row.value}
      </td>
    </tr>
  );
}

function TypeWord({ type }: { type: string | null }) {
  if (type === null) return null;
  return <span className="var-type ml-2 font-sans text-[11px] text-muted">{TYPE_WORD[type] ?? type}</span>;
}

/** Values in the editor's colors: strings, logical values and numbers apart. */
function valueColor(type: string | null, value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const kind =
    type ??
    (value === "ΑΛΗΘΗΣ" || value === "ΨΕΥΔΗΣ"
      ? "ΛΟΓΙΚΗ"
      : /^-?\d+(\.\d+)?$/.test(value)
        ? "ΑΚΕΡΑΙΑ"
        : "ΧΑΡΑΚΤΗΡΑΣ");
  switch (kind) {
    case "ΧΑΡΑΚΤΗΡΑΣ":
      return "var(--syn-string)";
    case "ΛΟΓΙΚΗ":
      return "var(--syn-keyword)";
    case "ΠΡΑΓΜΑΤΙΚΗ":
      return "var(--syn-real, var(--syn-number))";
    default:
      return "var(--syn-number)";
  }
}

function waitingText(run: Exclude<RunState, Done>): string {
  switch (run.kind) {
    case "running":
      return "Εκτελείται…";
    case "failed":
      return run.message;
    case "stopped":
      return "Η εκτέλεση διακόπηκε πριν δώσει τιμές.";
    default:
      return "Τρέξε το πρόγραμμα (▶ ή F9) για να δεις εδώ τις μεταβλητές και τις τιμές τους.";
  }
}

/** Where the values on screen come from. */
function where(run: Done, step: number | null): ReactNode {
  const trace = run.result.trace;
  if (step !== null && trace?.length) {
    const s = trace[Math.min(step, trace.length - 1)];
    const condition = conditionText(s.condition);
    return (
      <>
        Βήμα <b className="text-text">{step + 1}</b> · γραμμή <b className="text-text">{s.line}</b>
        {condition && (
          <>
            {" "}
            · συνθήκη{" "}
            <b className={s.condition ? "text-ok" : "text-danger"}>{condition}</b>
          </>
        )}
      </>
    );
  }
  if (run.stopped) return "Οι τιμές όταν διακόπηκε η εκτέλεση.";
  const { result } = run;
  switch (result.status) {
    case "ok":
      return "Οι τιμές στο τέλος του προγράμματος.";
    case "needs_input":
      return (
        <>
          Περιμένει τιμή στη γραμμή <b className="text-text">{result.input_line}</b>.
        </>
      );
    case "limit":
      return "Οι τιμές όταν σταμάτησε (όριο βημάτων, χρόνου ή εξόδου).";
    case "error":
      return result.error?.line ? (
        <>
          Οι τιμές τη στιγμή του σφάλματος, στη γραμμή{" "}
          <b className="text-danger">{result.error.line}</b>.
        </>
      ) : (
        "Οι τιμές τη στιγμή του σφάλματος."
      );
  }
}

/** Why a finished run has no calls to show. */
function notRun(run: Done): string {
  const { error } = run.result;
  if (error?.kind === "syntax") {
    return `Το πρόγραμμα δεν εκτελέστηκε: έχει λάθος${error.line ? ` στη γραμμή ${error.line}` : ""}.`;
  }
  return "Δεν υπάρχουν μεταβλητές να δείξω.";
}

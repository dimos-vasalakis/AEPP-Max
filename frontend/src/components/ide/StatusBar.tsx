"use client";

import { useCursor } from "@/lib/cursor";
import type { RunState } from "./OutputPanel";

/**
 * The Κλασικό theme's status bar along the bottom, as in the Διερμηνευτής: the
 * cursor's line:column, whether the code has unsaved changes, and what the run
 * is doing. Hidden in the other themes (globals.css), which show the run in the
 * output's header instead.
 */
export function StatusBar({
  run,
  modified,
  playing,
}: {
  run: RunState;
  modified: boolean;
  /** A slow or step run is still playing back: its outcome isn't shown yet. */
  playing: boolean;
}) {
  const { line, column } = useCursor();
  return (
    <footer className="status-bar shrink-0 items-stretch font-sans" aria-hidden>
      <span className="status-cell tabular-nums">
        {line}:{column}
      </span>
      <span className="status-cell">{modified ? "Τροποποιημένο" : ""}</span>
      <span className="status-cell min-w-0 flex-1 truncate">{runText(run, playing)}</span>
    </footer>
  );
}

function runText(run: RunState, playing: boolean): string {
  if (playing && run.kind === "done" && !run.stopped) return "Εκτελείται…";
  switch (run.kind) {
    case "idle":
      return "";
    case "running":
      return "Εκτελείται…";
    case "stopped":
      return "Η εκτέλεση διακόπηκε.";
    case "failed":
      return run.message;
  }
  if (run.stopped) return "Η εκτέλεση διακόπηκε.";
  const { result } = run;
  switch (result.status) {
    case "ok":
      return "Η εκτέλεση ολοκληρώθηκε.";
    case "needs_input":
      return result.input_line
        ? `Διάβασμα τιμής στη γραμμή ${result.input_line}`
        : "Διάβασμα τιμής";
    case "limit":
      return "Η εκτέλεση σταμάτησε (όριο βημάτων, χρόνου ή εξόδου).";
    case "error":
      return result.error
        ? `${result.error.line ? `Γραμμή ${result.error.line}: ` : ""}${result.error.message}`
        : "Σφάλμα";
  }
}

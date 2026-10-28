"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AgentPanel } from "@/components/agent/AgentPanel";
import { ConfirmDialog } from "@/components/Confirm";
import { NavPopover } from "@/components/NavPopover";
import { Navbar } from "@/components/Navbar";
import { ApiError, apiFetch } from "@/lib/api/client";
import { getProgram, type Program, programError, updateProgram } from "@/lib/api/programs";
import { screenAt, stepSummary } from "@/lib/glossa/trace";
import type { TraceMark } from "@/lib/glossa/traceLine";
import type { Language, RunResult } from "@/lib/glossa/types";
import { stashForSignIn, takePendingSave } from "@/lib/pendingSave";
import { titleFromCode } from "@/lib/programs";
import { useUser } from "@/lib/supabase/useUser";
import { useOutputHeight } from "@/lib/useOutputHeight";
import { useProgramFiles } from "@/lib/useProgramFiles";
import { useThemeInfo } from "@/lib/useTheme";
import { CodeEditor, type EditorActions } from "./CodeEditor";
import { FileBar } from "./FileBar";
import { type OutputTab, OutputPanel, type Pace, type RunState } from "./OutputPanel";
import { MIN_EDITOR, OutputResizer } from "./OutputResizer";
import { ProgramsDialog } from "./ProgramsDialog";
import { SaveDialog } from "./SaveDialog";
import { type SideTab, SideTabs } from "./SideTabs";
import { StatusBar } from "./StatusBar";
import { VariablesPanel } from "./VariablesPanel";

/** A question before an editor's unsaved code is replaced; `message` says what would be lost. */
type Ask = { kind: "open"; program: Program; message: string } | { kind: "new"; message: string };

/** How long the slow run (the 50 sign) stays on each step. */
const SLOW_MS = 500;

/** A played run's step after `at`; null after the last one, so the whole result shows (its end, the ΔΙΑΒΑΣΕ box). */
function stepAfter(at: number, result: RunResult): number | null {
  return at >= (result.trace?.length ?? 0) - 1 ? null : at + 1;
}

const UNSAVED_HERE = "Ο κώδικας που γράφεις τώρα δεν έχει αποθηκευτεί και θα χαθεί.";

/** The question when a saved program has changes that weren't saved. */
function lostChanges(title: string): string {
  return `Οι αλλαγές στο «${title}» δεν έχουν αποθηκευτεί και θα χαθούν. Για να τις κρατήσεις, πάτα Άκυρο και Αποθήκευση (Ctrl/Cmd+S).`;
}

export function Ide() {
  // Πρόγραμμα (ΓΛΩΣΣΑ) or Αλγόριθμος (ψευδογλώσσα); every visit starts on Πρόγραμμα.
  const [language, setLanguage] = useState<Language>("glossa");
  // The switch asks first, in a dialog centered on the page.
  const [askSwitch, setAskSwitch] = useState(false);
  // Each has its own code: switching shows the other one's, as it was left.
  const [codes, setCodes] = useState<Record<Language, string>>({ glossa: "", pseudocode: "" });
  const code = codes[language];
  // The refs give execute() and updateCode the latest values, also from the key handler.
  const codeRef = useRef(code);
  const languageRef = useRef(language);
  const [run, setRun] = useState<RunState>({ kind: "idle" });
  // Bumped by every run and whenever the code is replaced: a reply to an older run is dropped.
  const runSeq = useRef(0);
  // Αργή εκτέλεση (the 50 sign): ▶ then runs traced and plays the steps back, the
  // running line marked in the editor and the screen growing; `play` is the step on
  // screen, null once it's done (or for any other run). Stopped (■), it stays there.
  // Βηματική εκτέλεση plays the same way, one step per Επόμενο.
  const [slowMode, setSlowMode] = useState(false);
  const [play, setPlay] = useState<number | null>(null);
  const playing = play !== null && run.kind === "done" && !run.stopped;
  // A ΔΙΑΒΑΣΕ re-run keeps the last result on screen (`pending`); either way it's busy,
  // and so is a slow or step run still playing.
  const busy = run.kind === "running" || (run.kind === "done" && run.pending === true) || playing;
  // Still running as far as the student can tell, waiting for a value included: ▶ becomes ■.
  const stoppable =
    busy || (run.kind === "done" && run.result.status === "needs_input" && !run.stopped);
  // A step run still going: the navbar shows Επόμενο and Διακοπή instead of its button.
  const stepping = stoppable && (run.kind === "running" || run.kind === "done") && run.pace === "step";
  const nextButton = useRef<HTMLButtonElement>(null);
  // The request of the run on screen, aborted when it is stopped or replaced.
  const request = useRef<AbortController | null>(null);
  // Bumped when a program is opened: a fresh editor, so Ctrl+Z can't bring back the last one's code.
  const [editorKey, setEditorKey] = useState(0);
  // Locked while an Agent-mode reply runs, so its write_code can't overwrite new typing.
  const [agentWriting, setAgentWriting] = useState(false);
  const darkTheme = useThemeInfo().dark;
  // The editor-plus-output column; the output's top edge drags to resize it.
  const column = useRef<HTMLDivElement>(null);
  const outputHeight = useOutputHeight();
  // The πίνακας τιμών: which tab the output shows, and the step it is on.
  const [outputTab, setOutputTab] = useState<OutputTab>("screen");
  const [traceStep, setTraceStep] = useState(0);
  // The column beside the editor: a run switches it from the agent to Μεταβλητές.
  // Before any run (or after Καθαρισμός) there is only the agent.
  const [pickedSide, setSideTab] = useState<SideTab>("agent");
  const sideTab: SideTab = run.kind === "idle" ? "agent" : pickedSide;

  // Saved programs: which one each editor holds, and the dialogs around them.
  const user = useUser();
  const signedIn = user === undefined ? undefined : user !== null;
  const files = useProgramFiles(codes, language, user === undefined ? undefined : (user?.id ?? null));
  const [dialog, setDialog] = useState<"programs" | "save" | null>(null);
  const [ask, setAsk] = useState<Ask | null>(null);

  // An Agent proposal waiting for approval: Ctrl/Cmd+Enter applies it instead of running.
  const applyProposal = useRef<(() => void) | null>(null);
  const setProposal = useCallback((apply: (() => void) | null) => {
    applyProposal.current = apply;
  }, []);

  // The editor's Τακτοποίηση (lib/glossa/format.ts).
  const editorActions = useRef<EditorActions | null>(null);

  /**
   * Τακτοποίηση: indentation and spaces, as one undo step. Every run does it first. Not
   * while an Agent proposal waits: it applies only to the code it was proposed against.
   */
  function tidy(): string {
    if (applyProposal.current) return codeRef.current;
    return editorActions.current?.format() ?? codeRef.current;
  }

  // Stable identity: CodeEditor must not get a new onChange on every render.
  const updateCode = useCallback((value: string) => {
    codeRef.current = value;
    setCodes((all) => ({ ...all, [languageRef.current]: value }));
  }, []);

  /** Clears the output; a run still on its way is dropped. */
  function resetRun() {
    runSeq.current++;
    request.current?.abort();
    setRun({ kind: "idle" });
    setPlay(null);
  }

  /**
   * ■: the run stops where it is. The interpreter runs on the server, so this drops
   * the reply (the server's own limits end a run nobody waits for); its output so
   * far stays on screen.
   */
  function stop() {
    runSeq.current++;
    request.current?.abort();
    setRun((last) =>
      last.kind === "done" ? { ...last, pending: false, stopped: true } : { kind: "stopped" },
    );
  }

  /** Shows `next`'s editor, with `code` in it if given. */
  function showLanguage(next: Language, code = codes[next]) {
    languageRef.current = next;
    codeRef.current = code;
    if (next !== language) {
      setLanguage(next);
      resetRun(); // the output was the other code's
    }
  }

  function switchLanguage() {
    showLanguage(language === "glossa" ? "pseudocode" : "glossa");
  }

  /**
   * Runs the editor's code (or `source`); `traced` also builds the πίνακας τιμών, and
   * `pace` plays the run back step by step. A re-run for ΔΙΑΒΑΣΕ keeps the last result
   * on screen until the new one arrives, the table stays on its step, and a played run
   * goes on from the ΔΙΑΒΑΣΕ (the steps before it are the same).
   */
  async function execute(
    inputs: string[],
    marks: number[],
    traced = false,
    source?: string,
    pace?: Pace,
  ) {
    // A new run tidies the code first; a ΔΙΑΒΑΣΕ re-run passes the code it asked for.
    const code = source ?? tidy();
    const seq = ++runSeq.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const from =
      inputs.length > 0 && run.kind === "done" ? Math.max(0, (run.result.trace?.length ?? 0) - 1) : 0;
    if (inputs.length === 0) {
      setPlay(null);
      setRun({ kind: "running", traced, pace });
      setOutputTab(traced ? "trace" : "screen");
      setTraceStep(0);
      setSideTab("variables");
    } else {
      setRun((last) => (last.kind === "done" ? { ...last, pending: true } : last));
    }
    try {
      const result = await apiFetch<RunResult>("/run", {
        method: "POST",
        body: JSON.stringify({ code, inputs, language: languageRef.current, trace: traced || pace !== undefined }),
        signal: controller.signal,
      });
      if (seq !== runSeq.current) return;
      setRun({ kind: "done", inputs, marks, result, code, traced, pace });
      const steps = result.trace?.length ?? 0;
      setPlay(pace && steps > 0 ? Math.min(from, steps - 1) : null);
    } catch (err) {
      if (seq !== runSeq.current) return;
      setRun({
        kind: "failed",
        message:
          err instanceof ApiError ? err.message : "Δεν ήταν δυνατή η σύνδεση με τον διερμηνευτή.",
      });
    }
  }

  /** Επόμενο: the step run's next step. */
  function nextStep() {
    if (playing && run.kind === "done") setPlay(stepAfter(play, run.result));
  }

  // A slow run takes the next step by itself; a step run waits for Επόμενο.
  useEffect(() => {
    if (!playing || run.kind !== "done" || run.pace !== "slow") return;
    const timer = setTimeout(() => setPlay(stepAfter(play, run.result)), SLOW_MS);
    return () => clearTimeout(timer);
  }, [playing, play, run]);

  // Επόμενο takes the focus whenever it can be pressed (the run is back, a ΔΙΑΒΑΣΕ answered),
  // so Enter or Space goes on; not from something the student moved to meanwhile (the agent's
  // input). The ▶| pressed and the answered ΔΙΑΒΑΣΕ box are gone by then, leaving it on body.
  const canStep = stepping && playing;
  useEffect(() => {
    const active = document.activeElement;
    if (canStep && (active === null || active === document.body)) nextButton.current?.focus();
  }, [canStep]);

  // F9 and Ctrl/Cmd+Enter run the program, like the button. (On a Mac, F9 only reaches
  // the page with fn held, hence the second shortcut.) While an Agent proposal waits,
  // Ctrl/Cmd+Enter applies it instead. F10 and Ctrl/Cmd+Shift+Enter build the πίνακας
  // τιμών; Ctrl/Cmd+S saves; Shift+Alt+F tidies the code. Capture phase, so the editor
  // doesn't swallow the key first. Re-attached each render to see the latest state.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const modEnter = mod && e.key === "Enter";
      // e.code too: with the Greek layout on, the key is «σ».
      const isSave =
        mod && !e.shiftKey && !e.altKey && (e.key.toLowerCase() === "s" || e.code === "KeyS");
      const isTrace = e.key === "F10" || e.code === "F10" || (modEnter && e.shiftKey);
      const isRun = e.key === "F9" || e.code === "F9" || (modEnter && !e.shiftKey);
      // e.code: Alt changes the key's character (ƒ on a Mac).
      const isTidy = e.shiftKey && e.altKey && !mod && e.code === "KeyF";
      // A step run: Enter goes on from the page, Επόμενο or the editor (read-only meanwhile),
      // not from an input, another button or behind an open dialog (Καθαρισμός's too).
      // preventDefault keeps a focused Επόμενο from stepping twice.
      if (canStep && e.key === "Enter" && !mod && !e.shiftKey && !e.altKey) {
        const target = e.target instanceof Element ? e.target : null;
        const free =
          target === document.body ||
          target === nextButton.current ||
          target?.closest(".cm-content") != null; // not its search or go-to-line panel
        if (free && !document.querySelector("dialog[open]") && ask === null && !askSwitch) {
          e.preventDefault();
          if (!e.repeat) nextStep();
          return;
        }
      }
      if (!isRun && !isTrace && !isSave && !isTidy) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      if (isTidy) {
        if (!agentWriting && !stepping) tidy();
      } else if (isSave) {
        if (dialog === null && ask === null && !askSwitch && !agentWriting) save();
      } else if (isRun && modEnter && applyProposal.current && sideTab === "agent") {
        // Only while the proposal is in sight: on Μεταβλητές, Ctrl/Cmd+Enter runs.
        applyProposal.current();
      } else if (!busy && !stepping) void execute([], [], isTrace, undefined, slowMode && !isTrace ? "slow" : undefined);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  function readInput(value: string) {
    if (run.kind !== "done" || run.pending || run.stopped) return;
    // The code that asked for the value, even if the editor changed since: the earlier
    // values were typed for it (the screen then says the code changed).
    execute(
      [...run.inputs, value],
      [...run.marks, run.result.output.length],
      run.traced,
      run.code,
      run.pace,
    );
  }

  // The table's step, marked in the editor while the table shows and still matches the code;
  // otherwise the ΔΙΑΒΑΣΕ waiting for a value.
  const traceLength = run.kind === "done" ? (run.result.trace?.length ?? 0) : 0;
  const step = Math.min(traceStep, Math.max(0, traceLength - 1));
  const stale = run.kind === "done" && run.code !== code;
  const traceMark = useMemo((): TraceMark => {
    if (run.kind !== "done" || stale) return null;
    const played = play === null ? undefined : run.result.trace?.[play];
    if (played) return { line: played.line, note: stepSummary(played) };
    const current = run.traced && outputTab === "trace" ? run.result.trace?.[step] : undefined;
    if (current) return { line: current.line, note: stepSummary(current) };
    const waiting = run.result.status === "needs_input" && !run.stopped;
    return waiting && run.result.input_line ? { line: run.result.input_line, note: "" } : null;
  }, [run, stale, outputTab, step, play]);
  // A played run shows the screen as it was at its step.
  const shownRun = useMemo((): RunState => {
    if (play === null || run.kind !== "done" || !run.result.trace) return run;
    return { ...run, result: { ...run.result, output: screenAt(run.result.output, run.result.trace, play) } };
  }, [run, play]);
  // Μεταβλητές follows the table's step while the table shows.
  const tracing = run.kind === "done" && run.traced && outputTab === "trace";
  const sideTabs = run.kind === "idle" ? undefined : <SideTabs tab={sideTab} onTab={setSideTab} />;

  // Saving

  function save() {
    if (files.file) files.flush();
    else if (code.trim()) setDialog("save");
  }

  /** Puts `program` in its editor, as the file Ctrl/Cmd+S saves to. */
  function load(program: Program) {
    codeRef.current = program.code;
    setCodes((all) => ({ ...all, [program.language]: program.code }));
    files.link(program);
    showLanguage(program.language, program.code);
    setEditorKey((k) => k + 1);
    resetRun();
  }

  async function openProgram(id: string): Promise<string | null> {
    let program: Program;
    try {
      program = await getProgram(id);
    } catch (err) {
      return programError(err);
    }
    const lang = program.language;
    const target = files.fileOf(lang);
    // The editor it opens in: this one, or the other side of the switch.
    const where =
      lang === language ? "" : lang === "pseudocode" ? " στον Αλγόριθμο" : " στο Πρόγραμμα";
    if (target?.id === program.id) {
      // Already open: the editor may hold newer code than the server.
      showLanguage(lang);
    } else if (target) {
      const before = lang === languageRef.current ? codeRef.current : null;
      const unsaved = await files.unsaved(lang);
      // Typed into (or another program opened in) that editor meanwhile: leave it be.
      if (before !== null && codeRef.current !== before) return null;
      if (unsaved) setAsk({ kind: "open", program, message: lostChanges(target.title) });
      else load(program);
    } else if (codes[lang].trim()) {
      const message = where
        ? `Ο κώδικας${where} δεν έχει αποθηκευτεί και θα χαθεί αν ανοίξεις το «${program.title}».`
        : `${UNSAVED_HERE} Για να τον κρατήσεις, πάτα Άκυρο και Αποθήκευση πρώτα.`;
      setAsk({ kind: "open", program, message });
    } else {
      load(program);
    }
    return null;
  }

  /** Empties the editor and unlinks it: its program, if any, stays as it was saved. */
  function clearPage() {
    files.unlink();
    updateCode("");
    resetRun();
  }

  /**
   * A blank editor. Code saved nowhere, or a saved program's unsaved changes, are
   * asked about first, unless `confirmed` (as the Κενή σελίδα popover is).
   */
  async function newPage(confirmed = false) {
    const file = files.file;
    if (file) {
      const lang = language;
      const before = codeRef.current;
      const unsaved = await files.unsaved();
      // Switched, typed or opened another program meanwhile: clearing now would lose that.
      if (languageRef.current !== lang || codeRef.current !== before) return;
      if (unsaved && !confirmed) setAsk({ kind: "new", message: lostChanges(file.title) });
      else clearPage();
    } else if (code.trim() && !confirmed) {
      setAsk({ kind: "new", message: UNSAVED_HERE });
    } else {
      clearPage();
    }
  }

  async function rename(title: string): Promise<string | null> {
    const file = files.file;
    if (!file) return null;
    try {
      const saved = await updateProgram(file.id, { title });
      files.renamed(file.id, saved.title);
      return null;
    } catch (err) {
      return programError(err);
    }
  }

  // Code stashed before signing in to save it (lib/pendingSave.ts) comes back once
  // the session is known, and a signed-in student is asked its name straight away.
  // Signed out (back from /login without signing in), it comes back but stays
  // stashed, for the magic link's tab; signing in here then takes it.
  const restored = useRef<"no" | "kept" | "taken">("no");
  useEffect(() => {
    if (user === undefined || restored.current === "taken") return;
    if (user === null && restored.current === "kept") return;
    // A timeout, so the state changes happen outside the effect's own pass.
    const timer = setTimeout(() => {
      restored.current = user ? "taken" : "kept";
      // Never over code typed while the session loaded (the page starts on Πρόγραμμα),
      // except the same code restored while signed out; it then stays stashed for the next visit.
      const pending = takePendingSave(
        Date.now(),
        (p) =>
          languageRef.current !== p.language ||
          !codeRef.current.trim() ||
          codeRef.current === p.code,
        !user,
      );
      if (!pending) return;
      setCodes((all) => ({ ...all, [pending.language]: pending.code }));
      languageRef.current = pending.language;
      codeRef.current = pending.code;
      setLanguage(pending.language);
      if (user) setDialog("save");
    }, 0);
    return () => clearTimeout(timer);
  }, [user]);

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <Navbar>
        {/* Not while a run or the agent's edit is on its way: each belongs to the code it was sent. */}
        <LanguageSwitch
          language={language}
          onSwitch={() => setAskSwitch(true)}
          disabled={agentWriting || busy}
        />
        {askSwitch && (
          <ConfirmDialog
            title={language === "glossa" ? "Αλλαγή σε Αλγόριθμο;" : "Αλλαγή σε Πρόγραμμα;"}
            confirmLabel="Αλλαγή"
            onConfirm={() => {
              setAskSwitch(false);
              switchLanguage();
            }}
            onCancel={() => setAskSwitch(false)}
          >
            {language === "glossa"
              ? "Ο editor θα δέχεται ψευδογλώσσα (Αλγόριθμος … Τέλος)."
              : "Ο editor θα δέχεται ΓΛΩΣΣΑ (ΠΡΟΓΡΑΜΜΑ … ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ)."}{" "}
            Ο κώδικας που γράφεις τώρα δεν χάνεται: θα τον βρεις όταν γυρίσεις.
          </ConfirmDialog>
        )}
        {/* A blank page; it asks first: one click opens the question, the second clears. */}
        <NavPopover
          label="Κενή σελίδα"
          title="Κενή σελίδα: σβήνει όλο τον κώδικα"
          icon={<BlankPageIcon />}
          disabled={!code || agentWriting}
        >
          {(close) => (
            <>
              <div className="flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger/10 p-2.5">
                <span className="mt-0.5 shrink-0 text-danger">
                  <TrashIcon />
                </span>
                <div>
                  <p className="font-medium text-danger">Να σβηστεί όλος ο κώδικας;</p>
                  <p className="mt-1 text-xs text-muted">
                    {files.file ? (
                      <>
                        Το «{files.file.title}» μένει στα προγράμματά σου
                        {code !== files.file.saved && (
                          <> όπως το αποθήκευσες τελευταία· όσες αλλαγές δεν αποθήκευσες χάνονται</>
                        )}
                        . Εδώ ξεκινάς νέο.
                      </>
                    ) : (
                      <>
                        Αν το μετανιώσεις, <span className="text-accent">Ctrl/Cmd+Z</span> στον
                        editor.
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void newPage(true);
                    close();
                  }}
                  className="rounded-md border border-danger/40 bg-danger/20 px-2.5 py-1 font-semibold text-danger hover:bg-danger/30"
                >
                  Σβήσιμο
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md bg-panel-2 px-2.5 py-1 hover:text-text"
                >
                  Άκυρο
                </button>
              </div>
            </>
          )}
        </NavPopover>
        {/* Τακτοποίηση without running (every run does it first). */}
        <button
          type="button"
          onClick={() => tidy()}
          disabled={!code.trim() || agentWriting || stepping}
          aria-label="Τακτοποίηση κώδικα"
          data-tip="Τακτοποίηση: εσοχές και κενά (Shift+Alt+F)"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-panel-2 disabled:opacity-50"
        >
          <TidyIcon />
        </button>
        {/* ▶ while nothing runs; ■ stops a run, also one waiting for a ΔΙΑΒΑΣΕ value.
            A step run has its own Διακοπή, so ▶ just waits. */}
        <button
          type="button"
          onClick={stoppable ? stop : () => execute([], [], false, undefined, slowMode ? "slow" : undefined)}
          disabled={stepping}
          aria-label={stoppable && !stepping ? "Διακοπή" : "Εκτέλεση"}
          data-tip={stoppable && !stepping ? "Διακοπή της εκτέλεσης" : "Εκτέλεση (F9 ή Ctrl+Enter)"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-panel-2 disabled:opacity-50"
        >
          {stoppable && !stepping ? <StopIcon /> : <RunIcon />}
        </button>
        <button
          type="button"
          onClick={() => execute([], [], true)}
          disabled={busy}
          aria-label="Πίνακας τιμών (βήμα-βήμα)"
          data-tip="Πίνακας τιμών, βήμα-βήμα (F10 ή Ctrl+Shift+Enter)"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-panel-2 disabled:opacity-50"
        >
          <TraceIcon />
        </button>
        {/* Βηματική εκτέλεση: one step per Επόμενο, for small programs; Διακοπή ends it. */}
        {stepping ? (
          <>
            <button
              ref={nextButton}
              type="button"
              onClick={nextStep}
              disabled={!canStep}
              aria-label="Επόμενο βήμα"
              data-tip="Επόμενο: εκτελεί την επόμενη εντολή (Enter)"
              className="btn-primary flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-accent px-2.5 text-sm font-semibold text-on-accent hover:brightness-110 disabled:opacity-50"
            >
              <StepIcon plain />
              <span className="hidden sm:inline">Επόμενο</span>
            </button>
            <button
              type="button"
              onClick={stop}
              aria-label="Διακοπή"
              data-tip="Διακοπή της βηματικής εκτέλεσης"
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm hover:bg-panel-2"
            >
              <StopIcon />
              <span className="hidden sm:inline">Διακοπή</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => execute([], [], false, undefined, "step")}
            disabled={busy}
            aria-label="Βηματική εκτέλεση"
            data-tip="Βηματική εκτέλεση: μία εντολή κάθε φορά που πατάς Επόμενο"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-panel-2 disabled:opacity-50"
          >
            <StepIcon />
          </button>
        )}
        {/* An on/off switch, not a run: with it on, ▶ runs slowly (SLOW_MS). */}
        <button
          type="button"
          onClick={() => setSlowMode((on) => !on)}
          aria-pressed={slowMode}
          aria-label="Αργή εκτέλεση"
          data-tip={
            slowMode
              ? "Αργή εκτέλεση: ενεργή. Το ▶ δείχνει μία-μία τις γραμμές που εκτελούνται"
              : "Αργή εκτέλεση: ανενεργή"
          }
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-panel-2 ${
            slowMode ? "bg-panel-2 ring-1 ring-accent/70" : "opacity-55 hover:opacity-100"
          }`}
        >
          <SlowIcon />
        </button>
      </Navbar>

      {dialog === "programs" && (
        <ProgramsDialog
          signedIn={signedIn}
          currentId={files.file?.id ?? null}
          onOpen={openProgram}
          onNew={() => void newPage()}
          onRenamed={files.renamed}
          onDeleted={files.deleted}
          onSignIn={() => stashForSignIn({ language, code })}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "save" && (
        <SaveDialog
          signedIn={signedIn}
          language={language}
          suggested={titleFromCode(code, language)}
          onSave={files.saveAs}
          onSignIn={() => stashForSignIn({ language, code })}
          onClose={() => setDialog(null)}
        />
      )}
      {ask && (
        <ConfirmDialog
          title={ask.kind === "open" ? `Άνοιγμα του «${ask.program.title}»;` : "Νέο πρόγραμμα;"}
          confirmLabel={ask.kind === "open" ? "Άνοιγμα" : "Νέο"}
          onConfirm={() => {
            setAsk(null);
            if (ask.kind === "open") load(ask.program);
            else clearPage();
          }}
          onCancel={() => setAsk(null)}
        >
          {ask.message}
        </ConfirmDialog>
      )}

      {/* minmax(0,1fr), not 1fr: long code lines scroll inside the editor instead of widening the page. */}
      <div className="ide-panes grid flex-1 grid-cols-[minmax(0,1fr)] lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* A dragged output height replaces the default rows; min() keeps the editor visible if the window shrinks later. */}
        <div
          ref={column}
          style={
            outputHeight === null
              ? undefined
              : { gridTemplateRows: `minmax(0,1fr) min(${outputHeight}px, calc(100% - ${MIN_EDITOR}px))` }
          }
          className="ide-column grid h-dvh min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-[60dvh_40dvh] lg:h-auto lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_minmax(140px,35%)]"
        >
          <main className="ide-pane flex min-h-0 flex-col">
            <FileBar
              file={files.file}
              dirty={files.file !== null && code !== files.file.saved}
              empty={!code.trim()}
              onPrograms={() => setDialog("programs")}
              onSave={save}
              onRename={rename}
              // Not during a slow run's playback: the run is already back, and it can last minutes.
              disabled={agentWriting || run.kind === "running" || (run.kind === "done" && run.pending === true)}
            />
            {agentWriting && (
              <div className="shrink-0 border-b border-border bg-panel-2 px-3 py-1.5 font-mono text-xs text-warn">
                Ο Agent δουλεύει στον κώδικα· ο editor ξεκλειδώνει μόλις τελειώσει.
              </div>
            )}
            <div className="min-h-0 flex-1">
              {/* A fresh editor per language: its own undo history, highlighting and checks. */}
              <CodeEditor
                key={`${language}:${editorKey}`}
                value={code}
                onChange={updateCode}
                language={language}
                // Also during a step run: Enter there goes on, and the code must stay the one stepping.
                readOnly={agentWriting || stepping}
                dark={darkTheme}
                trace={traceMark}
                ref={editorActions}
              />
            </div>
          </main>
          <div className="ide-pane relative grid min-h-0 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)]">
            <OutputResizer column={column} />
            <OutputPanel
              run={shownRun}
              playing={playing}
              onInput={readInput}
              onClear={resetRun}
              tab={outputTab}
              onTab={setOutputTab}
              step={step}
              onStep={setTraceStep}
              stale={stale}
            />
          </div>
        </div>
        {/* The agent's write_code goes into the editor at once (Ctrl+Z undoes it), or in approval
            mode once the student applies it: onProposal hands Ctrl/Cmd+Enter to it. */}
        <AgentPanel
          code={code}
          language={language}
          onEdit={updateCode}
          onWriting={setAgentWriting}
          onProposal={setProposal}
          hidden={sideTab !== "agent"}
          tabs={sideTabs}
        />
        {sideTab === "variables" && (
          <VariablesPanel run={run} step={tracing ? step : play} stale={stale} tabs={sideTabs} />
        )}
      </div>
      {/* Τροποποιημένο: a linked program's unsaved changes, or new code not saved yet. */}
      <StatusBar
        run={shownRun}
        modified={files.file ? code !== files.file.saved : code.trim() !== ""}
        playing={playing}
      />
    </div>
  );
}

/**
 * Πρόγραμμα ⇄ Αλγόριθμος: one button, both names, the current one highlighted.
 * On a phone only the current one shows, to fit the bar.
 */
function LanguageSwitch({
  language,
  onSwitch,
  disabled,
}: {
  language: Language;
  onSwitch: () => void;
  disabled: boolean;
}) {
  const segment = (on: boolean) =>
    `rounded px-2 py-0.5 ${on ? "bg-accent text-on-accent" : "hidden text-muted sm:inline"}`;
  const algorithms = language === "pseudocode";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={algorithms}
      aria-label="Αλγόριθμος (ψευδογλώσσα) αντί για Πρόγραμμα (ΓΛΩΣΣΑ)"
      data-tip={algorithms ? "Αλλαγή σε Πρόγραμμα (ΓΛΩΣΣΑ)" : "Αλλαγή σε Αλγόριθμο (ψευδογλώσσα)"}
      data-tip-align="left"
      onClick={onSwitch}
      disabled={disabled}
      className="flex shrink-0 items-center gap-0.5 rounded-md border border-border bg-panel-2 p-0.5 text-xs font-medium hover:border-accent/60 disabled:opacity-50"
    >
      <span className={segment(!algorithms)}>Πρόγραμμα</span>
      <span className={segment(algorithms)}>Αλγόριθμος</span>
    </button>
  );
}

/** A sheet with a folded corner: start again on a blank page. */
function BlankPageIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* The sheet tinted in the accent, its fold and two lines of text stronger. */}
      <path
        d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"
        style={{ fill: "var(--accent)", fillOpacity: 0.22 }}
      />
      <path d="M14 3v5h5" style={{ fill: "var(--accent)", fillOpacity: 0.55 }} />
      <path d="M9 13h6M9 17h4" style={{ stroke: "var(--accent)" }} />
    </svg>
  );
}

/** Lines stepping in, the indented ones in the accent: Τακτοποίηση. */
function TidyIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 5h12M4 19h12" />
      <path d="M9 10h11M9 14h8" style={{ stroke: "var(--accent)" }} />
      <path d="m4 10 2.5 2L4 14" style={{ stroke: "var(--accent)" }} />
    </svg>
  );
}

/** A small table with its header row in the accent: the πίνακας τιμών. */
function TraceIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" style={{ stroke: "var(--run, var(--accent))", strokeWidth: 2.4 }} />
      <path d="M9 9v11M15 9v11M3 14.5h18" style={{ opacity: 0.6 }} />
    </svg>
  );
}

/**
 * ▶ against a bar: one step, Βηματική εκτέλεση and Επόμενο. The bar is in the run color,
 * or `plain` (on the accent-filled Επόμενο) in the text's.
 */
function StepIcon({ plain = false }: { plain?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path d="M5 5v14l10-7z" fill="currentColor" strokeLinejoin="round" />
      <path
        d="M18.5 5v14"
        style={{
          stroke: plain ? "currentColor" : "var(--run, var(--accent))",
          strokeWidth: 2.6,
          strokeLinecap: "round",
        }}
      />
    </svg>
  );
}

/** A speed-limit sign: Αργή εκτέλεση. */
function SlowIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" style={{ fill: "var(--panel)", stroke: "var(--danger)", strokeWidth: 2.8 }} />
      <text
        x="12"
        y="12.5"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="9.5"
        fontWeight="800"
        fontFamily="var(--font-inter), sans-serif"
        fill="currentColor"
      >
        50
      </text>
    </svg>
  );
}

/** A bin, for the «σβήσιμο» question. */
function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
    </svg>
  );
}

/** The stop square, in the danger color: in the Κλασικό theme a green one would read as «run». */
function StopIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <rect
        x="3.5"
        y="3.5"
        width="11"
        height="11"
        rx="1.5"
        style={{ fill: "var(--danger)" }}
      />
    </svg>
  );
}

/**
 * The run triangle. Flat in the theme's --run color (the accent by default); a
 * theme can add a gradient and an outline (--run-light, --run-outline), as the
 * Διερμηνευτής's green XP button has.
 */
function RunIcon() {
  // A unique gradient id, in case the icon is ever drawn twice (useId's colons aren't valid in url(#…)).
  const fill = `run-fill-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <defs>
        <linearGradient id={fill} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" style={{ stopColor: "var(--run-light, var(--run, var(--accent)))" }} />
          <stop offset="1" style={{ stopColor: "var(--run, var(--accent))" }} />
        </linearGradient>
      </defs>
      <path
        d="M4 2v14l11.5-7z"
        fill={`url(#${fill})`}
        strokeLinejoin="round"
        style={{ stroke: "var(--run-outline, none)", strokeWidth: 1.2 }}
      />
    </svg>
  );
}

"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AgentPanel } from "@/components/agent/AgentPanel";
import { NavPopover } from "@/components/NavPopover";
import { Navbar } from "@/components/Navbar";
import { ApiError, apiFetch } from "@/lib/api/client";
import type { Language, RunResult } from "@/lib/glossa/types";
import { useOutputHeight } from "@/lib/useOutputHeight";
import { useThemeInfo } from "@/lib/useTheme";
import { CodeEditor } from "./CodeEditor";
import { OutputPanel, type RunState } from "./OutputPanel";
import { MIN_EDITOR, OutputResizer } from "./OutputResizer";

export function Ide() {
  // Προγράμματα (ΓΛΩΣΣΑ) or Αλγόριθμοι (ψευδογλώσσα); every visit starts on Προγράμματα.
  const [language, setLanguage] = useState<Language>("glossa");
  // Each has its own code: switching shows the other one's, as it was left.
  const [codes, setCodes] = useState<Record<Language, string>>({ glossa: "", pseudocode: "" });
  const code = codes[language];
  // The refs give execute() and updateCode the latest values, also from the key handler.
  const codeRef = useRef(code);
  const languageRef = useRef(language);
  const [run, setRun] = useState<RunState>({ kind: "idle" });
  // Locked while an Agent-mode reply runs, so its write_code can't overwrite new typing.
  const [agentWriting, setAgentWriting] = useState(false);
  const darkTheme = useThemeInfo().dark;
  // The editor-plus-output column; the output's top edge drags to resize it.
  const column = useRef<HTMLDivElement>(null);
  const outputHeight = useOutputHeight();

  // An Agent proposal waiting for approval: Ctrl/Cmd+Enter applies it instead of running.
  const applyProposal = useRef<(() => void) | null>(null);
  const setProposal = useCallback((apply: (() => void) | null) => {
    applyProposal.current = apply;
  }, []);

  // Stable identity: CodeEditor must not get a new onChange on every render.
  const updateCode = useCallback((value: string) => {
    codeRef.current = value;
    setCodes((all) => ({ ...all, [languageRef.current]: value }));
  }, []);

  function switchLanguage() {
    const next = language === "glossa" ? "pseudocode" : "glossa";
    languageRef.current = next;
    codeRef.current = codes[next];
    setLanguage(next);
    setRun({ kind: "idle" }); // the output was the other code's
  }

  async function execute(inputs: string[], marks: number[]) {
    setRun({ kind: "running" });
    try {
      const result = await apiFetch<RunResult>("/run", {
        method: "POST",
        body: JSON.stringify({ code: codeRef.current, inputs, language: languageRef.current }),
      });
      setRun({ kind: "done", inputs, marks, result });
    } catch (err) {
      setRun({
        kind: "failed",
        message:
          err instanceof ApiError ? err.message : "Δεν ήταν δυνατή η σύνδεση με τον διερμηνευτή.",
      });
    }
  }

  // F9 and Ctrl/Cmd+Enter run the program, like the button. (On a Mac, F9 only reaches
  // the page with fn held, hence the second shortcut.) While an Agent proposal waits,
  // Ctrl/Cmd+Enter applies it instead. Capture phase, so the editor doesn't swallow
  // the key first. Re-attached each render to see the latest run state.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const modEnter = (e.ctrlKey || e.metaKey) && e.key === "Enter";
      const isRun = e.key === "F9" || e.code === "F9" || modEnter;
      if (!isRun) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;
      if (modEnter && applyProposal.current) applyProposal.current();
      else if (run.kind !== "running") void execute([], []);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  function readInput(value: string) {
    if (run.kind !== "done") return;
    execute([...run.inputs, value], [...run.marks, run.result.output.length]);
  }

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <Navbar>
        {/* Not while a run or the agent's edit is on its way: each belongs to the code it was sent. */}
        <LanguageSwitch
          language={language}
          onSwitch={switchLanguage}
          disabled={agentWriting || run.kind === "running"}
        />
        {/* A blank page; it asks first: one click opens the question, the second clears. */}
        <NavPopover
          label="Κενή σελίδα"
          title="Κενή σελίδα (σβήνει όλο τον κώδικα)"
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
                    Αν το μετανιώσεις, <span className="text-accent">Ctrl/Cmd+Z</span> στον editor.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateCode("");
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
        <button
          type="button"
          onClick={() => execute([], [])}
          disabled={run.kind === "running"}
          aria-label="Εκτέλεση"
          title="Εκτέλεση (F9 ή Ctrl+Enter)"
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-panel-2 disabled:opacity-50"
        >
          <RunIcon />
        </button>
      </Navbar>

      {/* minmax(0,1fr), not 1fr: long code lines scroll inside the editor instead of widening the page. */}
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* A dragged output height replaces the default rows; min() keeps the editor visible if the window shrinks later. */}
        <div
          ref={column}
          style={
            outputHeight === null
              ? undefined
              : { gridTemplateRows: `minmax(0,1fr) min(${outputHeight}px, calc(100% - ${MIN_EDITOR}px))` }
          }
          className="grid h-dvh min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-[60dvh_40dvh] lg:h-auto lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_minmax(140px,35%)]"
        >
          <main className="flex min-h-0 flex-col">
            {agentWriting && (
              <div className="shrink-0 border-b border-border bg-panel-2 px-3 py-1.5 font-mono text-xs text-warn">
                Ο Agent δουλεύει στον κώδικα· ο editor ξεκλειδώνει μόλις τελειώσει.
              </div>
            )}
            <div className="min-h-0 flex-1">
              {/* A fresh editor per language: its own undo history, highlighting and checks. */}
              <CodeEditor
                key={language}
                value={code}
                onChange={updateCode}
                language={language}
                readOnly={agentWriting}
                dark={darkTheme}
              />
            </div>
          </main>
          <div className="relative grid min-h-0 grid-rows-[minmax(0,1fr)]">
            <OutputResizer column={column} />
            <OutputPanel run={run} onInput={readInput} onClear={() => setRun({ kind: "idle" })} />
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
        />
      </div>
    </div>
  );
}

/**
 * Προγράμματα ⇄ Αλγόριθμοι: one button, both names, the current one highlighted.
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
      aria-label="Αλγόριθμοι (ψευδογλώσσα) αντί για Προγράμματα (ΓΛΩΣΣΑ)"
      title={algorithms ? "Αλλαγή σε Προγράμματα (ΓΛΩΣΣΑ)" : "Αλλαγή σε Αλγόριθμους (ψευδογλώσσα)"}
      onClick={onSwitch}
      disabled={disabled}
      className="flex shrink-0 items-center gap-0.5 rounded-md border border-border bg-panel-2 p-0.5 text-xs font-medium hover:border-accent/60 disabled:opacity-50"
    >
      <span className={segment(!algorithms)}>Προγράμματα</span>
      <span className={segment(algorithms)}>Αλγόριθμοι</span>
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
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
      <path d="M14 3v5h5" />
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

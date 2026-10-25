"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AgentPanel } from "@/components/agent/AgentPanel";
import { NavPopover } from "@/components/NavPopover";
import { Navbar } from "@/components/Navbar";
import { ApiError, apiFetch } from "@/lib/api/client";
import type { RunResult } from "@/lib/glossa/types";
import { useOutputHeight } from "@/lib/useOutputHeight";
import { useThemeInfo } from "@/lib/useTheme";
import { CodeEditor } from "./CodeEditor";
import { OutputPanel, type RunState } from "./OutputPanel";
import { MIN_EDITOR, OutputResizer } from "./OutputResizer";

export function Ide() {
  const [code, setCode] = useState("");
  // The ref gives execute() the editor's latest text, also from the key handler.
  const codeRef = useRef(code);
  const [run, setRun] = useState<RunState>({ kind: "idle" });
  // Locked while an Agent-mode reply runs, so its write_code can't overwrite new typing.
  const [agentWriting, setAgentWriting] = useState(false);
  const darkTheme = useThemeInfo().dark;
  // The editor-plus-output column; the output's top edge drags to resize it.
  const column = useRef<HTMLDivElement>(null);
  const outputHeight = useOutputHeight();

  // Stable identity: CodeEditor must not get a new onChange on every render.
  const updateCode = useCallback((value: string) => {
    codeRef.current = value;
    setCode(value);
  }, []);

  async function execute(inputs: string[], marks: number[]) {
    setRun({ kind: "running" });
    try {
      const result = await apiFetch<RunResult>("/run", {
        method: "POST",
        body: JSON.stringify({ code: codeRef.current, inputs }),
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
  // the page with fn held, hence the second shortcut.) Capture phase, so the editor
  // doesn't swallow the key first. Re-attached each render to see the latest run state.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isRun =
        e.key === "F9" || e.code === "F9" || ((e.ctrlKey || e.metaKey) && e.key === "Enter");
      if (!isRun) return;
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat && run.kind !== "running") void execute([], []);
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
        {/* A blank page; it asks first: one click opens the question, the second clears. */}
        <NavPopover
          label="Κενή σελίδα"
          title="Κενή σελίδα (σβήνει όλο τον κώδικα)"
          icon={<BlankPageIcon />}
          disabled={!code || agentWriting}
        >
          {(close) => (
            <>
              <p className="font-medium">Να σβηστεί όλος ο κώδικας;</p>
              <p className="mt-1 text-xs text-muted">Αν το μετανιώσεις, Ctrl/Cmd+Z στον editor.</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateCode("");
                    close();
                  }}
                  className="rounded-md bg-danger/15 px-2.5 py-1 font-medium text-danger hover:bg-danger/25"
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
              <CodeEditor
                value={code}
                onChange={updateCode}
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
        {/* The agent's write_code goes straight into the editor (Ctrl+Z undoes it). */}
        <AgentPanel code={code} onEdit={updateCode} onWriting={setAgentWriting} />
      </div>
    </div>
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

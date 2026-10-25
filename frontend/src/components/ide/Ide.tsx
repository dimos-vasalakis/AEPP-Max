"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AgentPanel } from "@/components/agent/AgentPanel";
import { Navbar } from "@/components/Navbar";
import { ApiError, apiFetch } from "@/lib/api/client";
import type { RunResult } from "@/lib/glossa/types";
import { useThemeInfo } from "@/lib/useTheme";
import { CodeEditor } from "./CodeEditor";
import { OutputPanel, type RunState } from "./OutputPanel";

type PendingEdit = { original: string; summary: string };

export function Ide() {
  const [code, setCode] = useState("");
  // Agent edits arrive mid-stream; the ref gives them the editor's latest text.
  const codeRef = useRef(code);
  const [run, setRun] = useState<RunState>({ kind: "idle" });
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const darkTheme = useThemeInfo().dark;

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
      const isRun = e.key === "F9" || e.code === "F9" || ((e.ctrlKey || e.metaKey) && e.key === "Enter");
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

  function proposeEdit(proposed: string, summary: string) {
    // Further proposals still diff against the code from before the first one.
    setPendingEdit((prev) => ({ original: prev?.original ?? codeRef.current, summary }));
    updateCode(proposed);
  }

  function rejectEdit() {
    if (pendingEdit) updateCode(pendingEdit.original);
    setPendingEdit(null);
  }

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <Navbar>
        <button
          type="button"
          onClick={() => execute([], [])}
          disabled={run.kind === "running"}
          aria-label="Εκτέλεση"
          title="Εκτέλεση (F9 ή Ctrl+Enter)"
          className="flex h-8 w-8 items-center justify-center rounded-md text-accent hover:bg-panel-2 disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5.5 2.5 12.5 9l-7 6.5" />
          </svg>
        </button>
      </Navbar>

      {/* minmax(0,1fr), not 1fr: long code lines scroll inside the editor instead of widening the page. */}
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-[60dvh_40dvh] lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_minmax(140px,35%)]">
          <main className="flex min-h-0 flex-col">
            {pendingEdit && (
              <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-panel-2 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 text-muted">{pendingEdit.summary}</span>
                <button
                  type="button"
                  onClick={() => setPendingEdit(null)}
                  className="rounded-md bg-ok/20 px-2.5 py-1 font-medium text-ok hover:bg-ok/30"
                >
                  Αποδοχή
                </button>
                <button
                  type="button"
                  onClick={rejectEdit}
                  className="rounded-md bg-danger/15 px-2.5 py-1 font-medium text-danger hover:bg-danger/25"
                >
                  Απόρριψη
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1">
              <CodeEditor
                value={code}
                onChange={updateCode}
                original={pendingEdit?.original}
                dark={darkTheme}
              />
            </div>
          </main>
          <OutputPanel run={run} onInput={readInput} onClear={() => setRun({ kind: "idle" })} />
        </div>
        <AgentPanel code={code} onProposeEdit={proposeEdit} />
      </div>
    </div>
  );
}

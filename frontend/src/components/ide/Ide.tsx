"use client";

import { useCallback, useRef, useState } from "react";
import { AgentPanel } from "@/components/agent/AgentPanel";
import { Navbar } from "@/components/Navbar";
import { ApiError, apiFetch } from "@/lib/api/client";
import { WELCOME_PROGRAM } from "@/lib/glossa/samples";
import type { RunResult } from "@/lib/glossa/types";
import { themeInfo } from "@/lib/theme";
import { useTheme } from "@/lib/useTheme";
import { CodeEditor } from "./CodeEditor";
import { OutputPanel, type RunState } from "./OutputPanel";

type PendingEdit = { original: string; summary: string };

export function Ide() {
  const [code, setCode] = useState(WELCOME_PROGRAM);
  // Agent edits arrive mid-stream; the ref gives them the editor's latest text.
  const codeRef = useRef(code);
  const [run, setRun] = useState<RunState>({ kind: "idle" });
  const [pendingEdit, setPendingEdit] = useState<PendingEdit | null>(null);
  const darkTheme = themeInfo(useTheme()).dark;

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
          className="ml-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-on-accent hover:brightness-110 disabled:opacity-60"
        >
          ▶ Εκτέλεση
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
          <OutputPanel run={run} onInput={readInput} />
        </div>
        <AgentPanel code={code} onProposeEdit={proposeEdit} />
      </div>
    </div>
  );
}

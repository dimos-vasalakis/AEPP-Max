"use client";

import { useState } from "react";
import { MAX_TITLE } from "@/lib/programs";
import type { ProgramFile } from "@/lib/useProgramFiles";

type Props = {
  /** The saved program the editor holds, if any. */
  file: ProgramFile | null;
  /** The editor holds code the server doesn't have. */
  dirty: boolean;
  /** The editor is empty: nothing to save. */
  empty: boolean;
  onPrograms: () => void;
  /** Ctrl/Cmd+S: saves a linked file's changes, or asks a new one's title. */
  onSave: () => void;
  /** Resolves to an error message, or null once renamed. */
  onRename: (title: string) => Promise<string | null>;
  /** While the agent writes to the editor. */
  disabled: boolean;
};

/**
 * The strip above the editor, like a file's tab in an IDE: «Τα προγράμματά μου»,
 * the file's name (click to rename) and whether it is saved.
 */
export function FileBar({ file, dirty, empty, onPrograms, onSave, onRename, disabled }: Props) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);

  async function finishRename() {
    if (renaming === null || !file) return;
    const title = renaming.trim();
    setRenaming(null);
    if (!title || title === file.title) return;
    setRenameError(await onRename(title));
  }

  return (
    <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-border bg-panel px-2 text-xs">
      <button
        type="button"
        onClick={onPrograms}
        disabled={disabled}
        title="Τα προγράμματά μου"
        className="flex h-7 shrink-0 items-center gap-1.5 rounded-md px-1.5 font-medium text-muted hover:bg-panel-2 hover:text-text disabled:opacity-40"
      >
        <FolderIcon />
        <span className="hidden md:inline">Τα προγράμματά μου</span>
      </button>
      <span className="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden />

      <span className="shrink-0 text-muted" aria-hidden>
        <FileIcon />
      </span>
      {renaming !== null ? (
        <input
          autoFocus
          value={renaming}
          maxLength={MAX_TITLE}
          aria-label="Νέο όνομα"
          onChange={(e) => setRenaming(e.target.value)}
          onBlur={finishRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setRenaming(null);
          }}
          className="h-6 min-w-0 max-w-64 flex-1 rounded border border-accent bg-bg px-1.5 font-medium text-text outline-none"
        />
      ) : file ? (
        <button
          type="button"
          onClick={() => {
            setRenameError(null);
            setRenaming(file.title);
          }}
          disabled={disabled}
          title="Μετονομασία"
          className="min-w-0 truncate rounded px-1 py-0.5 font-medium text-text hover:bg-panel-2"
        >
          {file.title}
        </button>
      ) : (
        <span className="min-w-0 truncate px-1 italic text-muted">Χωρίς τίτλο</span>
      )}

      <Status file={file} dirty={dirty} empty={empty} error={renameError} onRetry={onSave} />

      <button
        type="button"
        onClick={onSave}
        disabled={disabled || (empty && !file)}
        title="Αποθήκευση (Ctrl/Cmd+S)"
        className={`ml-auto flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 font-medium disabled:opacity-40 ${
          (!file && !empty) || dirty
            ? "btn-primary bg-accent text-on-accent hover:brightness-110"
            : "text-muted hover:bg-panel-2 hover:text-text"
        }`}
      >
        <SaveIcon />
        <span className="hidden sm:inline">Αποθήκευση</span>
      </button>
    </div>
  );
}

function Status({
  file,
  dirty,
  empty,
  error,
  onRetry,
}: {
  file: ProgramFile | null;
  dirty: boolean;
  empty: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const shown = (tone: string, text: string, title?: string) => (
    <span
      className={`flex min-w-0 items-center gap-1 ${tone}`}
      title={title ?? text}
      aria-live="polite"
    >
      <span className="truncate">{text}</span>
    </span>
  );
  if (error) return shown("text-danger", error);
  if (!file) return empty ? null : shown("text-warn", "● Δεν έχει αποθηκευτεί");
  if (file.status === "saving") return shown("text-muted", "Αποθήκευση…");
  if (file.status === "error" && dirty) {
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-danger" aria-live="polite">
        <span className="truncate" title={file.error}>
          ⚠ {file.error}
        </span>
        <button type="button" onClick={onRetry} className="shrink-0 underline hover:text-text">
          Ξαναδοκίμασε
        </button>
      </span>
    );
  }
  if (dirty) return shown("text-warn", "● Μη αποθηκευμένες αλλαγές", "Αποθήκευση με Ctrl/Cmd+S");
  return shown("text-ok", "✓ Αποθηκεύτηκε");
}

export function FolderIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        style={{ fill: "var(--accent)", fillOpacity: 0.2, stroke: "var(--accent)" }}
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  );
}

"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import {
  createProgram,
  deleteProgram,
  getProgram,
  listPrograms,
  programError,
  type ProgramSummary,
  updateProgram,
} from "@/lib/api/programs";
import { usePlan } from "@/lib/plan";
import {
  copyTitle,
  LANGUAGE_NAME,
  MAX_TITLE,
  matchesSearch,
  timeAgo,
} from "@/lib/programs";
import { FolderIcon } from "./FileBar";

type Props = {
  /** undefined while the session loads. */
  signedIn: boolean | undefined;
  /** The program in the current editor, marked «ανοιχτό». */
  currentId: string | null;
  /** Opens a program; resolves to an error message, or null once it is open. */
  onOpen: (id: string) => Promise<string | null>;
  /** «Νέο»: a blank editor. */
  onNew: () => void;
  onRenamed: (id: string, title: string) => void;
  onDeleted: (id: string) => void;
  /** Signed out: before leaving for the login page, so the editor's code survives it. */
  onSignIn: () => void;
  onClose: () => void;
};

type ListState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  // `at` is when it was read, for «πριν από 5 λεπτά» without reading the clock while rendering.
  | { kind: "done"; programs: ProgramSummary[]; at: number };

/**
 * «Τα προγράμματά μου»: a centered dialog listing the student's saved programs,
 * newest first, to open, rename, copy or delete. Rendered only while open.
 */
export function ProgramsDialog({
  signedIn,
  currentId,
  onOpen,
  onNew,
  onRenamed,
  onDeleted,
  onSignIn,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const plan = usePlan();
  const [list, setList] = useState<ListState>({ kind: "loading" });
  const [query, setQuery] = useState("");
  // One row at a time is busy (opening, copying, deleting) or being renamed / asked about.
  const [busy, setBusy] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // As SettingsDialog: showModal() centers it, traps focus and dims the page.
  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    listPrograms()
      .then((programs) => live && setList({ kind: "done", programs, at: Date.now() }))
      .catch((err) => live && setList({ kind: "error", message: programError(err) }));
    return () => {
      live = false;
    };
  }, [signedIn]);

  const programs = list.kind === "done" ? list.programs : [];
  const shown = programs.filter((p) => matchesSearch(p.title, query));
  const close = () => dialog.current?.close();

  /** Runs one row's request; the list is updated by `done` with what came back. */
  async function act(id: string, run: () => Promise<void>) {
    setBusy(id);
    setError(null);
    try {
      await run();
    } catch (err) {
      setError(programError(err));
    } finally {
      setBusy(null);
    }
  }

  const replace = (update: (all: ProgramSummary[]) => ProgramSummary[]) =>
    setList((l) => (l.kind === "done" ? { ...l, programs: update(l.programs) } : l));

  async function open(id: string) {
    setBusy(id);
    setError(null);
    const failed = await onOpen(id);
    setBusy(null);
    if (failed) setError(failed);
    else close();
  }

  function rename(id: string, title: string) {
    setRenaming(null);
    const program = programs.find((p) => p.id === id);
    if (!program || !title || title === program.title) return;
    void act(id, async () => {
      const saved = await updateProgram(id, { title });
      replace((all) => all.map((p) => (p.id === id ? saved : p)));
      onRenamed(id, saved.title);
    });
  }

  function duplicate(id: string) {
    void act(id, async () => {
      const original = await getProgram(id);
      const copy = await createProgram({
        title: copyTitle(original.title),
        code: original.code,
        language: original.language,
      });
      replace((all) => [copy, ...all]);
    });
  }

  function remove(id: string) {
    setConfirmDelete(null);
    void act(id, async () => {
      await deleteProgram(id);
      replace((all) => all.filter((p) => p.id !== id));
      onDeleted(id);
    });
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      // The dialog itself is only hit outside the content, i.e. on the backdrop.
      onClick={(e) => e.target === e.currentTarget && close()}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-panel p-0 text-sm text-text shadow-2xl backdrop:bg-bg/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <div className="flex items-center gap-2.5 px-5 pt-5">
          <FolderIcon />
          <h2 id={titleId} className="text-base font-semibold">
            Τα προγράμματά μου
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Κλείσιμο"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-panel-2 hover:text-text"
          >
            ✕
          </button>
        </div>

        {signedIn === false ? (
          <SignedOut
            onSignIn={() => {
              // As SaveDialog's leave(): a dialog left open stays modal on the hidden page.
              onSignIn();
              dialog.current?.close();
            }}
          />
        ) : (
          <>
            <div className="flex items-center gap-2 px-5 pt-4">
              <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-bg px-2.5 focus-within:border-accent">
                <SearchIcon />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Αναζήτηση"
                  aria-label="Αναζήτηση προγράμματος"
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  close();
                  onNew();
                }}
                className="flex h-9 shrink-0 items-center gap-1 rounded-md btn-primary bg-accent px-3 font-medium text-on-accent hover:brightness-110"
              >
                <span aria-hidden className="text-base leading-none">
                  +
                </span>
                Νέο
              </button>
            </div>

            {error && (
              <p className="mx-5 mt-3 rounded-md border-l-2 border-danger bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}

            <div className="mt-3 min-h-40 flex-1 overflow-auto px-3 pb-3">
              {list.kind === "loading" && <Note>Φόρτωση…</Note>}
              {list.kind === "error" && <Note tone="text-danger">{list.message}</Note>}
              {list.kind === "done" && programs.length === 0 && <Empty />}
              {list.kind === "done" && programs.length > 0 && shown.length === 0 && (
                <Note>Κανένα πρόγραμμα δεν ταιριάζει με «{query.trim()}».</Note>
              )}
              <ul className="space-y-0.5">
                {list.kind === "done" &&
                  shown.map((p) => (
                    <li key={p.id}>
                      <Row
                        program={p}
                        now={list.at}
                        current={p.id === currentId}
                        busy={busy === p.id}
                        locked={busy !== null}
                        renaming={renaming?.id === p.id ? renaming.title : null}
                        confirming={confirmDelete === p.id}
                        onOpen={() => open(p.id)}
                        onStartRename={() => {
                          setConfirmDelete(null);
                          setRenaming({ id: p.id, title: p.title });
                        }}
                        onRenameChange={(title) => setRenaming({ id: p.id, title })}
                        onRename={(title) => rename(p.id, title.trim())}
                        onCancelRename={() => setRenaming(null)}
                        onDuplicate={() => duplicate(p.id)}
                        onAskDelete={() => {
                          setRenaming(null);
                          setConfirmDelete(p.id);
                        }}
                        onDelete={() => remove(p.id)}
                        onCancelDelete={() => setConfirmDelete(null)}
                      />
                    </li>
                  ))}
              </ul>
            </div>

            {list.kind === "done" && programs.length > 0 && (
              <p className="border-t border-border px-5 py-2.5 text-xs text-muted">
                {programs.length} από {plan.max_programs} · Τις
                αλλαγές σε ό,τι ανοίγεις από εδώ τις αποθηκεύεις με Ctrl/Cmd+S.
              </p>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}

type RowProps = {
  program: ProgramSummary;
  now: number;
  current: boolean;
  busy: boolean;
  /** Another row's request is running. */
  locked: boolean;
  renaming: string | null;
  confirming: boolean;
  onOpen: () => void;
  onStartRename: () => void;
  onRenameChange: (title: string) => void;
  onRename: (title: string) => void;
  onCancelRename: () => void;
  onDuplicate: () => void;
  onAskDelete: () => void;
  onDelete: () => void;
  onCancelDelete: () => void;
};

function Row(props: RowProps) {
  const { program, now, current, busy, locked, renaming, confirming } = props;
  const algorithm = program.language === "pseudocode";

  if (confirming) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2">
        <span className="min-w-0 flex-1 truncate text-danger">
          Να σβηστεί το «{program.title}»;
        </span>
        <button
          type="button"
          autoFocus
          onClick={props.onDelete}
          className="rounded-md border border-danger/40 bg-danger/20 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger/30"
        >
          Σβήσιμο
        </button>
        <button
          type="button"
          onClick={props.onCancelDelete}
          className="rounded-md bg-panel-2 px-2.5 py-1 text-xs hover:text-text"
        >
          Άκυρο
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-1 rounded-lg pr-1 ${current ? "bg-accent/10" : "hover:bg-panel-2"}`}
    >
      {renaming !== null ? (
        <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2">
          <LanguageBadge algorithm={algorithm} />
          <input
            autoFocus
            value={renaming}
            maxLength={MAX_TITLE}
            aria-label="Νέο όνομα"
            onChange={(e) => props.onRenameChange(e.target.value)}
            onBlur={() => props.onRename(renaming)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                // Esc would also close the dialog.
                e.preventDefault();
                props.onCancelRename();
              }
            }}
            className="h-7 min-w-0 flex-1 rounded border border-accent bg-bg px-2 font-medium outline-none"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={props.onOpen}
          disabled={locked}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-left disabled:cursor-wait"
        >
          <LanguageBadge algorithm={algorithm} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate font-medium">{program.title}</span>
              {current && (
                <span className="shrink-0 rounded bg-accent px-1.5 text-[0.65rem] font-semibold text-on-accent">
                  ανοιχτό
                </span>
              )}
            </span>
            <span className="block text-xs text-muted">
              {LANGUAGE_NAME[program.language]} ·{" "}
              {busy ? "Μισό λεπτό…" : timeAgo(program.updated_at, now)}
            </span>
          </span>
        </button>
      )}
      {renaming === null && (
        // Always visible on touch screens; on hover (or focus) elsewhere.
        <div className="flex shrink-0 items-center opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 sm:opacity-0">
          <RowButton label="Μετονομασία" onClick={props.onStartRename} disabled={locked}>
            <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />
          </RowButton>
          <RowButton label="Αντίγραφο" onClick={props.onDuplicate} disabled={locked}>
            <path d="M9 9h10v12H9zM5 15V3h10" />
          </RowButton>
          <RowButton label="Διαγραφή" onClick={props.onAskDelete} disabled={locked} danger>
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </RowButton>
        </div>
      )}
    </div>
  );
}

/** Π for a ΓΛΩΣΣΑ program, Α for an algorithm, like a file type's icon. */
function LanguageBadge({ algorithm }: { algorithm: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-mono text-sm font-bold ${
        algorithm ? "bg-purple/15 text-purple" : "bg-accent/15 text-accent"
      }`}
    >
      {algorithm ? "Α" : "Π"}
    </span>
  );
}

function RowButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-bg disabled:opacity-40 ${danger ? "hover:text-danger" : "hover:text-text"}`}
    >
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
        {children}
      </svg>
    </button>
  );
}

function Note({ children, tone = "text-muted" }: { children: ReactNode; tone?: string }) {
  return <p className={`px-2 py-6 text-center text-sm ${tone}`}>{children}</p>;
}

function Empty() {
  return (
    <div className="px-4 py-8 text-center">
      <p className="font-medium">Δεν έχεις αποθηκεύσει ακόμα κανένα πρόγραμμα.</p>
      <p className="mx-auto mt-1.5 max-w-80 text-xs leading-relaxed text-muted">
        Γράψε κάτι στον editor και πάτα <b className="text-text">Αποθήκευση</b> (ή{" "}
        <kbd className="rounded border border-border bg-bg px-1 font-mono">Ctrl/Cmd+S</kbd>). Θα το
        βρίσκεις εδώ, από όποια συσκευή συνδεθείς.
      </p>
    </div>
  );
}

function SignedOut({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="px-5 pt-4 pb-6">
      <p className="leading-relaxed">
        Συνδέσου για να κρατάς τα προγράμματά σου και να τα βρίσκεις από όποια συσκευή, στο σχολείο
        ή στο σπίτι.
      </p>
      <div className="mt-4 flex gap-2">
        <Link
          href="/login"
          onClick={onSignIn}
          className="rounded-md btn-primary bg-accent px-3 py-1.5 font-medium text-on-accent hover:brightness-110"
        >
          Σύνδεση
        </Link>
        <Link
          href="/login?mode=signup"
          onClick={onSignIn}
          className="rounded-md bg-panel-2 px-3 py-1.5 hover:text-text"
        >
          Εγγραφή
        </Link>
      </div>
      <p className="mt-3 text-xs text-muted">
        Ό,τι έχεις γράψει θα σε περιμένει στον editor μόλις συνδεθείς.
      </p>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="shrink-0 text-muted"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

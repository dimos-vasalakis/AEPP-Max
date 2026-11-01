"use client";

import { highlightCode } from "@lezer/highlight";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { NavPopover } from "@/components/NavPopover";
import {
  ALGORITHM_GROUPS,
  type Algorithm,
  type AlgorithmGroup,
  algorithmCode,
} from "@/lib/glossa/algorithms";
import { glossa } from "@/lib/glossa/language";
import { glossaHighlight } from "@/lib/glossa/theme";

type Props = {
  /** Puts the algorithm in the Πρόγραμμα editor, as a whole program. */
  onOpen: (algorithm: Algorithm) => void;
  /** A run or the agent's edit is on its way: the code can't be replaced now. */
  openDisabled?: boolean;
};

/**
 * The navbar's Αλγόριθμοι: topics → an algorithm's title → its code, to read, copy,
 * or open in the editor.
 */
export function AlgorithmsMenu({ onOpen, openDisabled }: Props) {
  const [group, setGroup] = useState<AlgorithmGroup | null>(null);
  const [algorithm, setAlgorithm] = useState<Algorithm | null>(null);
  return (
    <NavPopover
      label="Αλγόριθμοι"
      title="Γνωστοί αλγόριθμοι των Πανελλαδικών"
      icon={<AlgorithmsIcon />}
      pill
      align="right"
      wide
      onClose={() => {
        setGroup(null);
        setAlgorithm(null);
      }}
    >
      {(close) =>
        algorithm && group ? (
          <AlgorithmView
            group={group}
            algorithm={algorithm}
            onBack={() => setAlgorithm(null)}
            openDisabled={openDisabled}
            onOpen={() => {
              onOpen(algorithm);
              close();
            }}
          />
        ) : group ? (
          <>
            <Back onClick={() => setGroup(null)}>Αλγόριθμοι</Back>
            <h2 className="mb-2 font-semibold">{group.name}</h2>
            <ul className="space-y-1">
              {group.algorithms.map((item) => (
                <li key={item.title}>
                  <Row onClick={() => setAlgorithm(item)}>{item.title}</Row>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h2 className="font-semibold">Αλγόριθμοι</h2>
            <p className="mb-2 text-xs text-muted">Γνωστοί αλγόριθμοι των Πανελλαδικών</p>
            <ul className="space-y-1">
              {ALGORITHM_GROUPS.map((item) => (
                <li key={item.name}>
                  <Row onClick={() => setGroup(item)} count={item.algorithms.length}>
                    {item.name}
                  </Row>
                </li>
              ))}
            </ul>
          </>
        )
      }
    </NavPopover>
  );
}

/** One algorithm: its title, its code and what can be done with it. */
function AlgorithmView({
  group,
  algorithm,
  onBack,
  onOpen,
  openDisabled,
}: {
  group: AlgorithmGroup;
  algorithm: Algorithm;
  onBack: () => void;
  onOpen: () => void;
  openDisabled?: boolean;
}) {
  const code = algorithmCode(algorithm);
  const tokens = useMemo(() => highlighted(code), [code]);
  const [copied, setCopied] = useState<"copied" | "blocked" | null>(null);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied("copied");
    } catch {
      // Blocked, or no clipboard on plain http: the code can still be selected by hand.
      setCopied("blocked");
    }
  }

  return (
    <>
      <Back onClick={onBack}>{group.name}</Back>
      <h2 className="font-semibold">{algorithm.title}</h2>
      {algorithm.frame && (
        <p className="mt-1 text-xs text-muted">
          Τμήμα προγράμματος. Στον editor ανοίγει μέσα σε πλήρες πρόγραμμα, με τις δηλώσεις που
          χρειάζεται, για να τρέχει.
        </p>
      )}
      <pre
        tabIndex={0}
        aria-label="Ο κώδικας του αλγορίθμου"
        style={{ fontFamily: "var(--editor-font)" }}
        className="mt-2 overflow-x-auto rounded-md border border-border bg-bg p-2.5 text-xs leading-relaxed text-text"
      >
        {tokens}
      </pre>
      {algorithm.note && <p className="mt-2 text-xs text-muted">{algorithm.note}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onOpen}
          disabled={openDisabled}
          className="btn-primary rounded-md bg-accent px-2.5 py-1 font-semibold text-on-accent hover:brightness-110 disabled:opacity-50"
        >
          Άνοιγμα στον editor
        </button>
        <button
          type="button"
          onClick={() => void copy()}
          aria-live="polite"
          className="rounded-md bg-panel-2 px-2.5 py-1 hover:text-text"
        >
          {copied === "copied"
            ? "Αντιγράφηκε"
            : copied === "blocked"
              ? "Δεν αντιγράφηκε: επίλεξέ τον με το ποντίκι"
              : "Αντιγραφή"}
        </button>
      </div>
    </>
  );
}

/** The code with the editor's colors. CodeEditor, always on this page, mounts their styles. */
function highlighted(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  highlightCode(
    code,
    glossa.parser.parse(code),
    glossaHighlight,
    (text, classes) => {
      out.push(
        classes ? (
          <span key={out.length} className={classes}>
            {text}
          </span>
        ) : (
          text
        ),
      );
    },
    () => out.push("\n"),
  );
  return out;
}

function Back({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2 flex items-center gap-1 text-xs text-muted hover:text-text"
    >
      <span aria-hidden>‹</span>
      {children}
    </button>
  );
}

function Row({
  onClick,
  count,
  children,
}: {
  onClick: () => void;
  count?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-left hover:border-accent/60 hover:bg-accent/5"
    >
      <span className="min-w-0 flex-1">{children}</span>
      {count !== undefined && <span className="text-xs text-muted">{count}</span>}
      <span aria-hidden className="text-muted">
        ›
      </span>
    </button>
  );
}

/** Three steps joined by a line, the last in the accent: an algorithm. */
function AlgorithmsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="7" height="6" rx="1" />
      <rect x="14" y="9" width="7" height="6" rx="1" />
      <rect x="3" y="15" width="7" height="6" rx="1" style={{ stroke: "var(--accent)" }} />
      <path d="M10 6h7.5v3M17.5 15v3H10" />
    </svg>
  );
}

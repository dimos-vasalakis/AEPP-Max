"use client";

import { highlightCode } from "@lezer/highlight";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { NavPopover } from "@/components/NavPopover";
import {
  ALGORITHM_GROUPS,
  type Algorithm,
  type AlgorithmGroup,
  algorithmCode,
} from "@/lib/glossa/algorithms";
import { glossa } from "@/lib/glossa/language";
import { glossaHighlight } from "@/lib/glossa/theme";
import type { Language } from "@/lib/glossa/types";

type Props = {
  /**
   * Puts the algorithm in the Πρόγραμμα editor, as a whole program; resolves to why it
   * couldn't, or null. `cancelled` says the panel closed while it waited for a save.
   */
  onOpen: (algorithm: Algorithm, cancelled: () => boolean) => Promise<string | null>;
  /** A run or the agent's edit is on its way: the code can't be replaced now. */
  openDisabled?: boolean;
  /** The side of the switch the editor is on: the library itself is always ΓΛΩΣΣΑ. */
  language: Language;
};

/**
 * The navbar's Αλγόριθμοι: topics → an algorithm's title → its code, to read, copy,
 * or open in the editor.
 */
export function AlgorithmsMenu(props: Props) {
  return (
    <NavPopover
      label="Αλγόριθμοι"
      title="Γνωστοί αλγόριθμοι των Πανελλαδικών"
      icon={<AlgorithmsIcon />}
      pill
      align="right"
      wide
    >
      {(close) => <Browser {...props} close={close} />}
    </NavPopover>
  );
}

/** What the panel shows. Mounted only while it is open, so it always opens on the topics. */
function Browser({
  onOpen,
  openDisabled,
  language,
  close,
}: Props & { close: () => void }) {
  const [group, setGroup] = useState<AlgorithmGroup | null>(null);
  const [algorithm, setAlgorithm] = useState<Algorithm | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // Waiting for a save before it opens. Closing the panel (Esc, a click outside) gives up
  // on it: a save can hang as long as the connection does, and the page stays usable.
  const [opening, setOpening] = useState(false);
  const closed = useRef(false);
  useEffect(() => {
    closed.current = false;
    return () => {
      closed.current = true;
    };
  }, []);

  // A new view starts at its top, also where a long list had scrolled the panel, and takes
  // the focus from the button that just went.
  const view = useRef<HTMLDivElement>(null);
  const lastView = useRef({ group, algorithm });
  useEffect(() => {
    if (lastView.current.group === group && lastView.current.algorithm === algorithm) return;
    lastView.current = { group, algorithm };
    view.current?.parentElement?.scrollTo({ top: 0 });
    view.current?.focus({ preventScroll: true });
  }, [group, algorithm]);

  async function open(item: Algorithm) {
    // Its button disables itself next: some browsers would drop keys (Esc) with the focus on it.
    view.current?.focus({ preventScroll: true });
    setOpening(true);
    setProblem(null);
    let failed: string | null;
    try {
      failed = await onOpen(item, () => closed.current);
    } catch {
      failed = "Δεν ήταν δυνατό το άνοιγμα. Δοκίμασε ξανά.";
    }
    if (closed.current) return;
    setOpening(false);
    if (failed) setProblem(failed);
    else close();
  }

  return (
    <div ref={view} tabIndex={-1} className="outline-none">
      {algorithm && group ? (
        <AlgorithmView
          group={group}
          algorithm={algorithm}
          language={language}
          onBack={() => {
            setProblem(null);
            setAlgorithm(null);
          }}
          onOpen={() => void open(algorithm)}
          opening={opening}
          openDisabled={openDisabled}
          problem={problem}
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
          <p className="mb-2 text-xs text-muted">Γνωστοί αλγόριθμοι των Πανελλαδικών, σε ΓΛΩΣΣΑ</p>
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
      )}
    </div>
  );
}

/** One algorithm: its title, its code and what can be done with it. */
function AlgorithmView({
  group,
  algorithm,
  language,
  onBack,
  onOpen,
  opening,
  openDisabled,
  problem,
}: {
  group: AlgorithmGroup;
  algorithm: Algorithm;
  language: Language;
  onBack: () => void;
  onOpen: () => void;
  opening: boolean;
  openDisabled?: boolean;
  problem: string | null;
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

  const pseudocode = language === "pseudocode";
  const hint = opening
    ? "Ολοκληρώνεται η αποθήκευση… Με Esc ή κλικ έξω ακυρώνεις το άνοιγμα."
    : openDisabled
      ? "Περίμενε να τελειώσει η εκτέλεση ή ο Agent."
      : problem;

  return (
    <>
      <Back onClick={onBack} disabled={opening}>
        {group.name}
      </Back>
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
      {pseudocode && (
        <p className="mt-2 text-xs text-warn">
          Είναι σε ΓΛΩΣΣΑ, όχι σε ψευδογλώσσα, οπότε στον Αλγόριθμο δεν τρέχει. Το Άνοιγμα σε
          πηγαίνει στο Πρόγραμμα· ο κώδικας που έχεις εδώ μένει.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpen}
          disabled={openDisabled || opening}
          className="btn-primary rounded-md bg-accent px-2.5 py-1 font-semibold text-on-accent hover:brightness-110 disabled:opacity-50"
        >
          {opening ? "Άνοιγμα…" : pseudocode ? "Άνοιγμα στο Πρόγραμμα" : "Άνοιγμα στον editor"}
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
      {hint && (
        <p role="status" className="mt-2 text-xs text-warn">
          {hint}
        </p>
      )}
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

function Back({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mb-2 flex items-center gap-1 text-xs text-muted hover:text-text disabled:opacity-50"
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

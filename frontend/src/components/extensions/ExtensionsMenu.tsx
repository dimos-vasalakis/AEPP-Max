"use client";

import { useEffect, useId, useRef, useState } from "react";
import { type CustomTheme, newCustomId, parseThemeCode, themeCode } from "@/lib/customTheme";
import { DIAMOND, usePlan } from "@/lib/plan";
import { type ThemeId, THEMES } from "@/lib/theme";
import { deleteCustomTheme, saveCustomTheme, setTheme, useCustomThemes, useTheme } from "@/lib/useTheme";
import { ThemeEditor } from "./ThemeEditor";
import { ThemePreview } from "./ThemePreview";

/** The navbar's Επεκτάσεις button and its panel. For now it holds the color themes, built-in and the user's own. */
export function ExtensionsMenu() {
  const [open, setOpen] = useState(false);
  const active = useTheme();
  const custom = useCustomThemes();
  // null: the theme list; "new" or a theme: the editor.
  const [editing, setEditing] = useState<CustomTheme | "new" | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (root.current?.contains(e.target as Node)) return;
      setOpen(false);
      setEditing(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      setEditing(null);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Επεκτάσεις"
        data-tip="Θέματα εμφάνισης"
        data-tip-align="right"
        className={`group flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors ${
          open
            ? "border-accent bg-accent/10 text-text"
            : "border-border bg-panel-2 text-text hover:border-accent/60 hover:bg-accent/5"
        }`}
      >
        <ExtensionsIcon />
        <span className="hidden sm:inline">Επεκτάσεις</span>
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Επεκτάσεις"
          className="fixed inset-x-3 top-14 z-50 max-h-[calc(100dvh-4.5rem)] overflow-auto rounded-lg border border-border bg-panel p-3 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[26rem]"
        >
          {editing ? (
            <ThemeEditor
              theme={editing === "new" ? null : editing}
              onDone={() => setEditing(null)}
            />
          ) : (
            <>
              <h2 className="text-sm font-semibold">Επεκτάσεις</h2>
              <p className="mb-3 text-xs text-muted">
                Θέματα εμφάνισης · {THEMES.length + custom.length}
              </p>
              <ul className="space-y-2">
                {THEMES.map((theme) => (
                  <ThemeRow
                    key={theme.id}
                    id={theme.id}
                    name={theme.name}
                    description={theme.description}
                    active={theme.id === active}
                  />
                ))}
                {custom.map((theme) => (
                  <ThemeRow
                    key={theme.id}
                    id={theme.id}
                    name={theme.name}
                    description="Δικό σου θέμα"
                    active={theme.id === active}
                    code={themeCode(theme)}
                    onEdit={() => setEditing(theme)}
                    onDelete={() => deleteCustomTheme(theme.id)}
                  />
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setEditing("new")}
                className="mt-3 w-full rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted hover:border-accent hover:text-text"
              >
                + Φτιάξε δικό σου θέμα
              </button>
              <ThemeImport />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ThemeRow({
  id,
  name,
  description,
  active,
  code,
  onEdit,
  onDelete,
}: {
  id: ThemeId;
  name: string;
  description: string;
  active: boolean;
  /** The share code (custom themes only). */
  code?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  // "copied" for a moment after copying; "shown" when the clipboard is blocked, so
  // the code shows in a box to copy by hand.
  const [share, setShare] = useState<"copied" | "shown" | null>(null);

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setShare("copied");
      setTimeout(() => setShare((s) => (s === "copied" ? null : s)), 1500);
    } catch {
      setShare("shown");
    }
  }

  return (
    <li className={`flex gap-3 rounded-md border p-2 ${active ? "border-accent" : "border-border"}`}>
      <ThemePreview id={id} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{name}</span>
        <p className="mb-2 text-xs text-muted">{description}</p>
        <div className="mt-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme(id)}
            disabled={active}
            aria-pressed={active}
            className={`rounded px-2.5 py-1 text-xs font-medium ${
              active ? "bg-panel-2 text-muted" : "btn-primary bg-accent text-on-accent hover:brightness-110"
            }`}
          >
            {active ? "✓ Ενεργό" : "Ενεργοποίηση"}
          </button>
          {onEdit && (
            <button type="button" onClick={onEdit} className="text-xs text-muted hover:text-text">
              Επεξεργασία
            </button>
          )}
          {code && (
            <button
              type="button"
              onClick={copyCode}
              className="text-xs text-muted hover:text-text"
            >
              {share === "copied" ? "✓ Αντιγράφηκε" : "Κοινοποίηση"}
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} className="text-xs text-muted hover:text-danger">
              Διαγραφή
            </button>
          )}
        </div>
        {code && share === "shown" && (
          <input
            readOnly
            value={code}
            aria-label="Κώδικας θέματος"
            onFocus={(e) => e.currentTarget.select()}
            autoFocus
            className="mt-2 w-full rounded border border-border bg-bg px-2 py-1 font-mono text-[11px] text-text outline-none focus:border-accent"
          />
        )}
      </div>
    </li>
  );
}

/**
 * Pasting a theme's code (Κοινοποίηση) adds it to the user's themes and turns it on at
 * once. A code already among them only turns it on; a new one needs room in the plan.
 */
function ThemeImport() {
  const custom = useCustomThemes();
  const limit = usePlan().max_themes;
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function take(value: string) {
    setCode(value);
    if (!value.trim()) {
      setMessage(null);
      return;
    }
    const shared = parseThemeCode(value);
    if (!shared) {
      // Not while a code is still being typed by hand: «AEP», «AEPP1.0b1d…».
      const start = value.trim().slice(0, 6).toUpperCase();
      const typing = "AEPP1.".startsWith(start) && value.trim().length < 79;
      setMessage(typing ? null : { ok: false, text: "Αυτός δεν είναι κώδικας θέματος." });
      return;
    }
    const same = custom.find((t) => themeCode(t) === themeCode(shared));
    if (same) {
      setTheme(same.id);
      setMessage({ ok: true, text: `Το «${same.name}» το έχεις ήδη: ενεργοποιήθηκε.` });
    } else if (custom.length >= limit) {
      const more = limit < DIAMOND.max_themes ? ` (${DIAMOND.max_themes} με το Diamond 💎)` : "";
      setMessage({ ok: false, text: `Έφτασες το όριο των ${limit} θεμάτων${more}.` });
      return;
    } else {
      const theme: CustomTheme = { id: newCustomId(), ...shared };
      saveCustomTheme(theme);
      setTheme(theme.id);
      setMessage({ ok: true, text: `Προστέθηκε και ενεργοποιήθηκε το «${theme.name}».` });
    }
    setCode("");
  }

  return (
    <div className="mt-3">
      <label className="block text-xs text-muted">
        Έχεις κώδικα θέματος από φίλο; Επικόλλησέ τον εδώ:
        <input
          value={code}
          onChange={(e) => take(e.target.value)}
          placeholder="AEPP1.…"
          spellCheck={false}
          autoComplete="off"
          className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1.5 font-mono text-xs text-text outline-none focus:border-accent"
        />
      </label>
      {message && (
        <p role="status" className={`mt-1 text-xs ${message.ok ? "text-ok" : "text-danger"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

/** A puzzle piece (Lucide's "puzzle", ISC license), in the accent color. */
function ExtensionsIcon() {
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
      className="text-accent transition-transform group-hover:rotate-12"
      aria-hidden
    >
      <path d="M19.44 7.85c-.05.32.06.65.29.88l1.57 1.57c.47.47.7 1.09.7 1.7s-.23 1.24-.7 1.71l-1.61 1.61a.98.98 0 0 1-.84.28c-.47-.07-.8-.48-.97-.93a2.5 2.5 0 1 0-3.21 3.21c.45.17.86.5.93.97a.98.98 0 0 1-.28.84l-1.61 1.61c-.47.47-1.09.7-1.7.7s-1.24-.23-1.71-.7l-1.57-1.57a1.03 1.03 0 0 0-.88-.29c-.49.07-.84.5-1.02.97a2.5 2.5 0 1 1-3.24-3.24c.47-.18.9-.53.97-1.02a1.03 1.03 0 0 0-.29-.88l-1.57-1.57A2.4 2.4 0 0 1 2 12c0-.62.24-1.23.7-1.7l1.53-1.53c.24-.24.58-.35.92-.3.51.08.88.53 1.07 1.01a2.5 2.5 0 1 0 3.26-3.26c-.48-.19-.93-.56-1.01-1.07-.05-.34.06-.68.3-.92L10.3 2.7c.47-.47 1.09-.7 1.7-.7s1.24.23 1.7.7l1.58 1.57c.23.23.55.34.87.29.5-.07.84-.5 1.02-.97a2.5 2.5 0 1 1 3.24 3.24c-.47.18-.9.53-.97 1.02Z" />
    </svg>
  );
}

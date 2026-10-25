"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CustomTheme } from "@/lib/customTheme";
import { type ThemeId, THEMES } from "@/lib/theme";
import { deleteCustomTheme, setTheme, useCustomThemes, useTheme } from "@/lib/useTheme";
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
        className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm hover:bg-panel-2 hover:text-text ${open ? "bg-panel-2 text-text" : "text-muted"}`}
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
  onEdit,
  onDelete,
}: {
  id: ThemeId;
  name: string;
  description: string;
  active: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
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
              active ? "bg-panel-2 text-muted" : "bg-accent text-on-accent hover:brightness-110"
            }`}
          >
            {active ? "✓ Ενεργό" : "Ενεργοποίηση"}
          </button>
          {onEdit && (
            <button type="button" onClick={onEdit} className="text-xs text-muted hover:text-text">
              Επεξεργασία
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} className="text-xs text-muted hover:text-danger">
              Διαγραφή
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function ExtensionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="6.5" width="4" height="4" rx="0.8" stroke="currentColor" />
      <rect x="6" y="6.5" width="4" height="4" rx="0.8" stroke="currentColor" />
      <rect x="6" y="11" width="4" height="4" rx="0.8" stroke="currentColor" />
      <rect x="1.5" y="11" width="4" height="4" rx="0.8" stroke="currentColor" />
      <rect x="10" y="1" width="4" height="4" rx="0.8" transform="rotate(12 12 3)" stroke="currentColor" />
    </svg>
  );
}

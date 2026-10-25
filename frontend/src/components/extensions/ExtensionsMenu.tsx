"use client";

import { useEffect, useId, useRef, useState } from "react";
import { type ThemeId, THEMES } from "@/lib/theme";
import { setTheme, useTheme } from "@/lib/useTheme";

/** The navbar's Επεκτάσεις button and its panel. For now it holds the color themes. */
export function ExtensionsMenu() {
  const [open, setOpen] = useState(false);
  const active = useTheme();
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
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
          <h2 className="text-sm font-semibold">Επεκτάσεις</h2>
          <p className="mb-3 text-xs text-muted">Θέματα εμφάνισης · {THEMES.length}</p>
          <ul className="space-y-2">
            {THEMES.map((theme) => {
              const isActive = theme.id === active;
              return (
                <li
                  key={theme.id}
                  className={`flex gap-3 rounded-md border p-2 ${isActive ? "border-accent" : "border-border"}`}
                >
                  <ThemePreview id={theme.id} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium">{theme.name}</span>
                    <p className="mb-2 text-xs text-muted">{theme.description}</p>
                    <button
                      type="button"
                      onClick={() => setTheme(theme.id)}
                      disabled={isActive}
                      aria-pressed={isActive}
                      className={`mt-auto self-start rounded px-2.5 py-1 text-xs font-medium ${
                        isActive
                          ? "bg-panel-2 text-muted"
                          : "bg-accent text-on-accent hover:brightness-110"
                      }`}
                    >
                      {isActive ? "✓ Ενεργό" : "Ενεργοποίηση"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** A few lines of ΓΛΩΣΣΑ in the theme's own colors (its tokens apply via data-theme). */
function ThemePreview({ id }: { id: ThemeId }) {
  const kw = { color: "var(--syn-keyword)", fontWeight: "var(--syn-keyword-weight, 600)" };
  return (
    <div
      data-theme={id}
      aria-hidden
      className="w-36 shrink-0 overflow-hidden rounded border border-border bg-panel text-[10px] leading-4"
    >
      <div className="flex items-center gap-1 border-b border-border px-1.5 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        <span className="h-1 w-8 rounded bg-border" />
      </div>
      <div className="whitespace-pre bg-bg px-1.5 py-1 text-text" style={{ fontFamily: "var(--editor-font)" }}>
        <div>
          <span style={kw}>ΑΝ</span> x <span style={{ color: "var(--syn-operator)" }}>&gt;</span>{" "}
          <span style={{ color: "var(--syn-number)" }}>0</span> <span style={kw}>ΤΟΤΕ</span>
        </div>
        <div>
          {"  "}
          <span style={kw}>ΓΡΑΨΕ</span> <span style={{ color: "var(--syn-string)", fontStyle: "var(--syn-string-style, normal)" }}>&apos;ναι&apos;</span>
        </div>
        <div>
          <span style={kw}>ΤΕΛΟΣ_ΑΝ</span>{" "}
          <span style={{ color: "var(--syn-comment)", fontStyle: "italic" }}>! τέλος</span>
        </div>
      </div>
    </div>
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

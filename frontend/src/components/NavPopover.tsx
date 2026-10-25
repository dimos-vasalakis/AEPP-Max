"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";

type Props = {
  /** Accessible name of the button and the panel. */
  label: string;
  /** Tooltip; defaults to the label. */
  title?: string;
  icon: ReactNode;
  children: ReactNode;
};

/** An icon button in the navbar that opens a small panel; closes on outside click or Escape. */
export function NavPopover({ label, title, icon, children }: Props) {
  const [open, setOpen] = useState(false);
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
        aria-label={label}
        title={title ?? label}
        className={`flex h-8 w-8 items-center justify-center rounded-md hover:bg-panel-2 hover:text-text ${open ? "bg-panel-2 text-text" : "text-muted"}`}
      >
        {icon}
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className="fixed inset-x-3 top-14 z-50 max-h-[calc(100dvh-4.5rem)] overflow-auto rounded-lg border border-border bg-panel p-4 text-sm shadow-2xl sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 sm:w-80"
        >
          {children}
        </div>
      )}
    </div>
  );
}

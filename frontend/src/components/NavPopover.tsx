"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";

type Props = {
  /** Accessible name of the button and the panel. */
  label: string;
  /** Tooltip; defaults to the label. */
  title?: string;
  icon: ReactNode;
  /** Which edge of the button the panel lines up with, on wider screens. */
  align?: "left" | "right";
  /** Also closes an open panel, so its buttons can't act while the trigger couldn't. */
  disabled?: boolean;
  /** Keeps the panel open (no outside click, Escape or trigger click), e.g. while it waits for a request. */
  locked?: boolean;
  /** The panel; a function gets `close`, for panels whose buttons finish the job. */
  children: ReactNode | ((close: () => void) => ReactNode);
};

/** An icon button in the navbar that opens a small panel; closes on outside click or Escape. */
export function NavPopover({
  label,
  title,
  icon,
  align = "left",
  disabled,
  locked,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  // Close when it becomes disabled (state adjusted during render, not in an effect).
  const [wasDisabled, setWasDisabled] = useState(disabled);
  if (disabled !== wasDisabled) {
    setWasDisabled(disabled);
    if (disabled) setOpen(false);
  }
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open || locked) return;
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
  }, [open, locked]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => !locked && setOpen((o) => !o)}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        title={title ?? label}
        className={`flex h-8 w-8 items-center justify-center rounded-md hover:bg-panel-2 hover:text-text disabled:pointer-events-none disabled:opacity-40 ${open ? "bg-panel-2 text-text" : "text-muted"}`}
      >
        {icon}
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className={`fixed inset-x-3 top-14 z-50 max-h-[calc(100dvh-4.5rem)] overflow-auto rounded-lg border border-border bg-panel p-4 text-sm shadow-2xl sm:absolute sm:inset-x-auto ${align === "left" ? "sm:left-0" : "sm:right-0"} sm:top-full sm:mt-2 sm:w-80`}
        >
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

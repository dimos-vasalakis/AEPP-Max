"use client";

import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";

type Props = {
  /** Accessible name of the button and the panel. */
  label: string;
  /** The description shown on hover (`data-tip`, globals.css); defaults to the label. */
  title?: string;
  icon: ReactNode;
  /** Which edge of the button the panel lines up with, on wider screens. */
  align?: "left" | "right";
  /** A wider panel on wider screens, for longer text. */
  wide?: boolean;
  /** Also closes an open panel, so its buttons can't act while the trigger couldn't. */
  disabled?: boolean;
  /** Keeps the panel open (no outside click, Escape or trigger click), e.g. while it waits for a request. */
  locked?: boolean;
  /** Called whenever the panel closes, e.g. to reset what it showed. */
  onClose?: () => void;
  /** The panel; a function gets `close`, for panels whose buttons finish the job. */
  children: ReactNode | ((close: () => void) => ReactNode);
};

/** An icon button in the navbar that opens a small panel; closes on outside click or Escape. */
export function NavPopover({
  label,
  title,
  icon,
  align = "left",
  wide,
  disabled,
  locked,
  onClose,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  // onClose on every way of closing, including `disabled` below.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) onClose?.();
    wasOpen.current = open;
  }, [open, onClose]);
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
      if (!root.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, locked, close]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => {
          if (locked) return;
          if (open) close();
          else setOpen(true);
        }}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        data-tip={title ?? label}
        data-tip-align={align === "right" ? "right" : undefined}
        className={`flex h-8 w-8 items-center justify-center rounded-md hover:bg-panel-2 hover:text-text disabled:pointer-events-none disabled:opacity-40 ${open ? "bg-panel-2 text-text" : "text-muted"}`}
      >
        {icon}
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className={`fixed inset-x-3 top-14 z-50 max-h-[calc(100dvh-4.5rem)] overflow-auto rounded-lg border border-border bg-panel p-4 text-sm shadow-2xl sm:absolute sm:inset-x-auto ${align === "left" ? "sm:left-0" : "sm:right-0"} sm:top-full sm:mt-2 ${wide ? "sm:w-[26rem]" : "sm:w-80"}`}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}

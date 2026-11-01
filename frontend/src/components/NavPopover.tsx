"use client";

import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * Where a navbar panel goes. From lg, under its button. Below that, under the whole bar,
 * however many rows it took (the header is `relative`, the button's wrapper isn't), and
 * across it: a panel under a button in the middle would run off a tablet's screen.
 */
export const PANEL_PLACE =
  "absolute inset-x-3 top-full z-50 mx-auto mt-1 max-h-[calc(100dvh-9rem)] max-w-xl overflow-auto lg:inset-x-auto lg:mx-0 lg:mt-2 lg:max-h-[calc(100dvh-4.5rem)] lg:max-w-none";

/** A rounded navbar button with its label (AlgorithmsMenu, ExtensionsMenu). */
export function pillClass(open: boolean): string {
  return `flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium text-text transition-colors disabled:pointer-events-none disabled:opacity-40 ${
    open
      ? "border-accent bg-accent/10"
      : "border-border bg-panel-2 hover:border-accent/60 hover:bg-accent/5"
  }`;
}

/** The label of a rounded button: only an icon until the bar has room for words. */
export const PILL_LABEL = "hidden min-[1060px]:inline";

type Props = {
  /** Accessible name of the button and the panel. */
  label: string;
  /** The description shown on hover (`data-tip`, globals.css); defaults to the label. */
  title?: string;
  icon: ReactNode;
  /** Which edge of the button the panel lines up with, on wider screens. */
  align?: "left" | "right";
  /** Lines the hover description up with the button's right edge: a long one, late in a narrow bar. */
  tipRight?: boolean;
  /** A wider panel on wider screens, for longer text. */
  wide?: boolean;
  /** A rounded button like Επεκτάσεις, with the label beside the icon where the bar has room. */
  pill?: boolean;
  /** Also closes an open panel, so its buttons can't act while the trigger couldn't. */
  disabled?: boolean;
  /** The panel; a function gets `close`, for panels whose buttons finish the job. */
  children: ReactNode | ((close: () => void) => ReactNode);
};

/** An icon button in the navbar that opens a small panel; closes on outside click or Escape. */
export function NavPopover({
  label,
  title,
  icon,
  align = "left",
  tipRight,
  wide,
  pill,
  disabled,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  // Close when it becomes disabled (state adjusted during render, not in an effect).
  const [wasDisabled, setWasDisabled] = useState(disabled);
  if (disabled !== wasDisabled) {
    setWasDisabled(disabled);
    if (disabled) setOpen(false);
  }
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
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
  }, [open, close]);

  return (
    <div ref={root} className="lg:relative">
      <button
        type="button"
        onClick={() => {
          if (open) close();
          else setOpen(true);
        }}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        data-tip={title ?? label}
        data-tip-align={align === "right" || tipRight ? "right" : undefined}
        className={
          pill
            ? pillClass(open)
            : `flex h-8 w-8 items-center justify-center rounded-md hover:bg-panel-2 hover:text-text disabled:pointer-events-none disabled:opacity-40 ${open ? "bg-panel-2 text-text" : "text-muted"}`
        }
      >
        {icon}
        {pill && <span className={PILL_LABEL}>{label}</span>}
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className={`${PANEL_PLACE} rounded-lg border border-border bg-panel p-4 text-sm shadow-2xl ${align === "left" ? "lg:left-0" : "lg:right-0"} ${wide ? "lg:w-[26rem]" : "lg:w-80"}`}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}

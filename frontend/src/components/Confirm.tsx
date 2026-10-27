"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";

type Props = {
  title: string;
  children: ReactNode;
  /** The button that goes ahead. */
  confirmLabel: string;
  onConfirm: () => void;
  /** Άκυρο, Esc, or a click outside. */
  onCancel: () => void;
};

/**
 * A question before something the student can't simply take back, centered on
 * the page (a modal <dialog>). Rendered only while asking.
 */
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // showModal() centers it, traps focus and dims the page (as SettingsDialog does).
  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onCancel}
      // The dialog itself is only hit outside the content, i.e. on the backdrop.
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-border bg-panel p-0 text-sm text-text shadow-2xl backdrop:bg-bg/70 backdrop:backdrop-blur-sm"
    >
      <Body titleId={titleId} title={title} confirmLabel={confirmLabel} onConfirm={onConfirm} onCancel={() => dialog.current?.close()}>
        {children}
      </Body>
    </dialog>
  );
}

/**
 * The same question, centered over its panel only (the parent must be
 * positioned): the rest of the page stays usable.
 */
export function PanelConfirm({ title, children, confirmLabel, onConfirm, onCancel }: Props) {
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      // A click on the dimmed area cancels; clicks don't reach the panel underneath.
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onCancel();
      }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-bg/70 p-4 font-sans backdrop-blur-sm"
    >
      <div
        ref={box}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-72 rounded-xl border border-border bg-panel text-sm text-text shadow-2xl"
      >
        <Body titleId={titleId} title={title} confirmLabel={confirmLabel} onConfirm={onConfirm} onCancel={onCancel}>
          {children}
        </Body>
      </div>
    </div>
  );
}

function Body({
  titleId,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
}: Props & { titleId: string }) {
  return (
    <div className="p-4">
      <h2 id={titleId} className="font-semibold">
        {title}
      </h2>
      <div className="mt-1.5 text-xs text-muted">{children}</div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md bg-panel-2 px-3 py-1.5 hover:text-text">
          Άκυρο
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-md btn-primary bg-accent px-3 py-1.5 font-medium text-on-accent hover:brightness-110"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

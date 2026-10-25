"use client";

import { type RefObject, useState } from "react";
import { setOutputHeight, useOutputHeight } from "@/lib/useOutputHeight";

/** The output keeps its header and a couple of lines; the editor keeps a few lines. */
const MIN_OUTPUT = 80;
export const MIN_EDITOR = 120;
const KEY_STEP = 24;

/**
 * The top edge of the output screen: drag it (mouse or touch) to make the output
 * taller or shorter, or focus it and use ↑/↓. Double-click or Enter goes back to
 * the default height. `column` is the editor-plus-output grid, whose bottom is the
 * output's bottom.
 */
export function OutputResizer({ column }: { column: RefObject<HTMLDivElement | null> }) {
  const height = useOutputHeight();
  const [dragging, setDragging] = useState(false);

  function resize(next: number, save = true) {
    const box = column.current?.getBoundingClientRect();
    if (!box) return;
    setOutputHeight(Math.max(MIN_OUTPUT, Math.min(box.height - MIN_EDITOR, next)), save);
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Ύψος οθόνης εκτέλεσης (σύρε ή ↑/↓)"
      aria-valuenow={height ?? undefined}
      tabIndex={0}
      title="Σύρε για αλλαγή ύψους · διπλό κλικ για επαναφορά"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault(); // no text selection while dragging
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      }}
      onPointerMove={(e) => {
        if (!dragging) return;
        const bottom = column.current?.getBoundingClientRect().bottom;
        if (bottom !== undefined) resize(bottom - e.clientY, false);
      }}
      onPointerUp={() => {
        if (!dragging) return;
        setDragging(false);
        // Store where the drag ended (the moves only set it for this visit).
        if (height !== null) setOutputHeight(height);
      }}
      onPointerCancel={() => setDragging(false)}
      onDoubleClick={() => setOutputHeight(null)}
      onKeyDown={(e) => {
        const panel = e.currentTarget.parentElement;
        if (!panel) return;
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          resize(panel.offsetHeight + (e.key === "ArrowUp" ? KEY_STEP : -KEY_STEP));
        } else if (e.key === "Enter") {
          e.preventDefault();
          setOutputHeight(null);
        }
      }}
      className="group absolute inset-x-0 -top-1.5 z-10 h-3 cursor-row-resize touch-none outline-none"
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-accent transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${dragging ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

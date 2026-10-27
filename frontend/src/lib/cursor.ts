"use client";

import type { EditorState } from "@codemirror/state";
import { ViewPlugin } from "@codemirror/view";
import { useSyncExternalStore } from "react";

// The editor's cursor, line:column, for the Κλασικό theme's status bar
// (components/ide/StatusBar.tsx). A store of its own, so a cursor move
// re-renders only the status bar, not the whole IDE.

export type Cursor = { line: number; column: number };

let cursor: Cursor = { line: 1, column: 1 };
const listeners = new Set<() => void>();

function set(next: Cursor) {
  if (next.line === cursor.line && next.column === cursor.column) return;
  cursor = next;
  for (const listener of listeners) listener();
}

function cursorOf(state: EditorState): Cursor {
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  return { line: line.number, column: head - line.from + 1 };
}

/** An editor extension that keeps the store on the main cursor, from the moment a view starts (a remount starts at 1:1). */
export const trackCursor = ViewPlugin.define((view) => {
  set(cursorOf(view.state));
  return {
    update(update) {
      if (update.selectionSet || update.docChanged) set(cursorOf(update.state));
    },
  };
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const START: Cursor = { line: 1, column: 1 };

export function useCursor(): Cursor {
  return useSyncExternalStore(subscribe, () => cursor, () => START);
}

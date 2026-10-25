import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { toDiagnostic } from "./lint";
import type { ErrorInfo } from "./types";

const doc = Text.of(["ΠΡΟΓΡΑΜΜΑ Α", "ΑΡΧΗ", "  ΓΡΑΨΕ yy", "  ΑΝ x > 1", "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ"]);
const error = (line: number | null, column: number | null, end: number | null): ErrorInfo => ({
  kind: "syntax",
  message: "λάθος",
  line,
  column,
  end_column: end,
});

describe("toDiagnostic", () => {
  it("marks the token the backend points at", () => {
    const d = toDiagnostic(doc, error(3, 9, 11));
    expect(doc.sliceString(d!.from, d!.to)).toBe("yy");
    expect(d!.severity).toBe("error");
  });

  it("marks the line's text when the error is at the line end", () => {
    const d = toDiagnostic(doc, error(4, 11, 11));
    expect(doc.sliceString(d!.from, d!.to)).toBe("ΑΝ x > 1");
  });

  it("clamps positions past the end of the document", () => {
    const d = toDiagnostic(doc, error(99, 1, 3));
    expect(doc.sliceString(d!.from, d!.to)).toBe("ΤΕ");
  });

  it("ignores errors without a line", () => {
    expect(toDiagnostic(doc, error(null, null, null))).toBeNull();
  });
});

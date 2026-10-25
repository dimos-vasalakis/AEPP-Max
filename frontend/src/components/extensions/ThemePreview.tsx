import type { CSSProperties } from "react";
import type { ThemeId } from "@/lib/theme";

/** A few lines of ΓΛΩΣΣΑ in the theme's own colors (its tokens apply via data-theme). */
export function ThemePreview({ id, vars }: { id?: ThemeId; vars?: CSSProperties }) {
  const kw = { color: "var(--syn-keyword)", fontWeight: "var(--syn-keyword-weight, 600)" };
  return (
    <div
      data-theme={id}
      style={vars}
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

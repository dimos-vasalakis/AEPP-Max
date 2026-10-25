import { ensureSyntaxTree, StringStream } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { describe, expect, it, vi } from "vitest";
import { glossa, glossaParser, normalizeWord } from "./language";

describe("normalizeWord", () => {
  it("ignores case and accents like the interpreter", () => {
    expect(normalizeWord("αλλιώς_αν")).toBe("ΑΛΛΙΩΣ_ΑΝ");
    expect(normalizeWord("Ή")).toBe("Η");
    expect(normalizeWord("ψευδής")).toBe("ΨΕΥΔΗΣ");
  });
});

function tokens(line: string): [string, string | null][] {
  const stream = new StringStream(line, 2, 2);
  const out: [string, string | null][] = [];
  while (!stream.eol()) {
    stream.start = stream.pos;
    const style = glossaParser.token(stream, null);
    if (stream.current().trim()) out.push([stream.current(), style]);
  }
  return out;
}

describe("glossaParser", () => {
  it("tells integers, reals, symbols and Latin names apart", () => {
    expect(tokens("Α[i] <- 1.5 + 2, Α_Τ(x)")).toEqual([
      ["Α", "variableName"],
      ["[", "punctuation"],
      ["i", "variableName.special"],
      ["]", "punctuation"],
      ["<-", "operator"],
      ["1.5", "float"],
      ["+", "operator"],
      ["2", "integer"],
      [",", "punctuation"],
      ["Α_Τ", "variableName.standard"],
      ["(", "punctuation"],
      ["x", "variableName.special"],
      [")", "punctuation"],
    ]);
  });

  it("keeps a ΠΕΡΙΠΤΩΣΗ range's integers whole", () => {
    expect(tokens("1..5")).toEqual([
      ["1", "integer"],
      ["..", "operator"],
      ["5", "integer"],
    ]);
  });

  it("uses only tag names CodeMirror knows", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const state = EditorState.create({
      doc: "ΓΡΑΨΕ Α_Τ(i), 1.5, 'α' ! σχόλιο",
      extensions: glossa,
    });
    ensureSyntaxTree(state, state.doc.length, 1000);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

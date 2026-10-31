// The editor on Αλγόριθμος (ψευδογλώσσα): what differs from ΓΛΩΣΣΑ.
import { indentUnit, StringStream } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { glossaAutocase, keywordFix } from "./autocase";
import { completionOptions, namesIn, placeOf } from "./completion";
import { editorLanguage } from "./editorLanguage";
import { glossaIndent, indentFor } from "./indent";
import { pseudocodeParser } from "./language";

describe("autocase in ψευδογλώσσα", () => {
  it("writes the words as the textbook does", () => {
    expect(keywordFix("  τελος_αν", 10, "pseudocode")?.insert).toBe("Τέλος_αν");
    expect(keywordFix("ΤΟΤΕ", 4, "pseudocode")?.insert).toBe("τότε");
    expect(keywordFix("εμφανισε", 8, "pseudocode")?.insert).toBe("Εμφάνισε");
    expect(keywordFix("x MOD", 5, "pseudocode")?.insert).toBe("mod");
    expect(keywordFix("Αλγόριθμος", 10, "pseudocode")).toBeNull();
  });

  it("reads the language from the editor", () => {
    const state = EditorState.create({
      doc: "αν",
      extensions: [editorLanguage.of("pseudocode"), glossaAutocase],
    });
    const typed = state.update({ changes: { from: 2, insert: " " }, userEvent: "input.type" });
    expect(typed.state.doc.toString()).toBe("Αν ");
  });

  it("leaves ΓΛΩΣΣΑ-only words as names", () => {
    expect(keywordFix("αρχη", 4, "pseudocode")).toBeNull();
  });
});

describe("indentation in ψευδογλώσσα", () => {
  const at = (text: string, above: string) =>
    indentFor(text, above.split("\n").reverse(), 2, 2, "pseudocode");

  it("keeps an algorithm's statements at the left edge", () => {
    expect(at("", "Αλγόριθμος Α")).toBe(0);
    expect(at("", "Αλγόριθμος Α\nΔεδομένα // α //")).toBe(0);
    expect(at("  Τέλος Α", "Αλγόριθμος Α\nx ← 1")).toBe(0);
  });

  it("opens a block only when the branch's statements are on the next lines", () => {
    expect(at("", "Αν x > 0 τότε")).toBe(2);
    expect(at("", "Αν x > 0 τότε y ← 1")).toBe(0);
    expect(at("", "αλλιώς y ← 2")).toBe(0);
    expect(at("", "Για i από 1 μέχρι 10")).toBe(2);
  });

  it("lines up an end with the block that a one-line Αν sits inside", () => {
    expect(at("Τέλος_αν", "Αν a τότε\n  Αν b τότε x ← 1")).toBe(0);
  });

  it("lines up an end with a one-line Αν that goes on", () => {
    // The αλλιώς is as far in as the Αν, so it is the Αν's (algorithm_parser.if_goes_on).
    expect(at("Τέλος_αν", "Αν a τότε\n  Αν x > 5 τότε y ← 1\n  αλλιώς\n    y ← 2")).toBe(2);
    // Less indented, it belongs to the Αν further out.
    expect(at("Τέλος_αν", "Αν a τότε\n  Αν x > 5 τότε y ← 1\nαλλιώς\n  y ← 2")).toBe(0);
  });

  it("leaves an αλλιώς typed right after a one-line Αν where the student put it", () => {
    const typed = (doc: string, text: string) => {
      let state = EditorState.create({
        doc,
        selection: { anchor: doc.length },
        extensions: [editorLanguage.of("pseudocode"), glossaIndent, glossaAutocase, indentUnit.of("  ")],
      });
      for (const ch of text) {
        const head = state.selection.main.head;
        state = state.update({
          changes: { from: head, insert: ch },
          selection: { anchor: head + 1 },
          userEvent: "input.type",
        }).state;
      }
      return state.doc.toString();
    };
    expect(typed("Αν a τότε\n  Αν x > 5 τότε y ← 1\n  ", "αλλιώς ")).toBe(
      "Αν a τότε\n  Αν x > 5 τότε y ← 1\n  αλλιώς ",
    );
    // Not after a block's first line: there it still moves into place.
    expect(typed("Αν a τότε\n  y ← 1\n  ", "αλλιώς ")).toBe("Αν a τότε\n  y ← 1\nαλλιώς ");
    // A Τέλος_αν closes the outer Αν: the one-line Αν needs none.
    expect(typed("Αν a τότε\n  Αν b τότε x ← 1\n  ", "τέλος_αν ")).toBe(
      "Αν a τότε\n  Αν b τότε x ← 1\nΤέλος_αν ",
    );
    // With no outer Αν, it stays, and closes the one-line Αν.
    expect(typed("Για i από 1 μέχρι 3\n  Αν b τότε x ← 1\n  ", "τέλος_αν ")).toBe(
      "Για i από 1 μέχρι 3\n  Αν b τότε x ← 1\n  Τέλος_αν ",
    );
  });
});

describe("autocomplete in ψευδογλώσσα", () => {
  const labels = (typed: string, before: string, names: string[] = []) =>
    completionOptions(typed, placeOf(before, "pseudocode"), names, before.trim().split(/\s+/)[0], "pseudocode").map(
      (o) => o.label,
    );

  it("offers the textbook's blocks and words", () => {
    expect(labels("αλ", "")).toContain("Αλγόριθμος");
    expect(labels("τελ", "")).toEqual(expect.arrayContaining(["Τέλος_αν", "Τέλος_επανάληψης", "Τέλος"]));
    expect(labels("τ", "Αν x > 0 ")).toEqual(["τότε"]);
    expect(labels("ακ", "")).toEqual([]); // no declarations
  });

  it("lists names after Δεδομένα and Αντιμετάθεσε", () => {
    expect(placeOf("Δεδομένα // ", "pseudocode")).toBe("name");
    expect(placeOf("Αντιμετάθεσε ", "pseudocode")).toBe("name");
  });

  it("takes ΓΛΩΣΣΑ-only words for names", () => {
    expect(namesIn("x ← αρχη", -1, "pseudocode")).toEqual(["x", "αρχη"]);
  });
});

describe("pseudocodeParser", () => {
  it("highlights the textbook's symbols and keywords", () => {
    const stream = new StringStream("Όσο i ≤ n // x", 2, 2);
    const out: [string, string | null][] = [];
    while (!stream.eol()) {
      stream.start = stream.pos;
      const style = pseudocodeParser.token(stream, null);
      if (stream.current().trim()) out.push([stream.current(), style]);
    }
    expect(out).toEqual([
      ["Όσο", "keyword"],
      ["i", "variableName.special"],
      ["≤", "operator"],
      ["n", "variableName.special"],
      ["//", "operator"],
      ["x", "variableName.special"],
    ]);
  });
});

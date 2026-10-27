import { snippet } from "@codemirror/autocomplete";
import { EditorSelection, EditorState, type Transaction } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import {
  completionOptions,
  glossaAutocomplete,
  inCommentOrString,
  inDeclarations,
  namesIn,
  type Place,
  placeOf,
} from "./completion";

const labels = (typed: string, place: Place, names: string[] = [], first = "") =>
  completionOptions(typed, place, names, first).map((o) => o.label);

describe("placeOf", () => {
  it("knows where a value is expected", () => {
    for (const before of ["x <- ", "  ΓΡΑΨΕ ", "ΓΡΑΨΕ 'α', ", "ΑΝ ", "y <- Α_Τ(", "z <- 1 + ", "ΑΝ x ΚΑΙ "]) {
      expect(placeOf(before), before).toBe("value");
    }
  });

  it("knows when a value was just finished", () => {
    for (const before of ["ΑΝ x ", "ΓΙΑ i ΑΠΟ 1 ", "ΟΣΟ Α[i] ", "x <- (1 + 2) ", "ΓΡΑΨΕ 'α' ", "ΑΝ ΑΛΗΘΗΣ "]) {
      expect(placeOf(before), before).toBe("after-value");
    }
  });

  it("knows the other places", () => {
    expect(placeOf("   ")).toBe("line-start");
    expect(placeOf("ΓΙΑ ")).toBe("name");
    expect(placeOf("ΔΙΑΒΑΣΕ ")).toBe("name");
    expect(placeOf("ΔΙΑΒΑΣΕ α, ")).toBe("name");
    expect(placeOf("  ΑΚΕΡΑΙΕΣ: ")).toBe("name");
    expect(placeOf("  ΠΕΡΙΠΤΩΣΗ ")).toBe("case");
    expect(placeOf("ΣΥΝΑΡΤΗΣΗ Φ(α): ")).toBe("return-type");
    expect(placeOf("ΑΝ x > 0 ΤΟΤΕ ")).toBe("none");
  });
});

describe("completionOptions", () => {
  it("offers ΠΡΟΓΡΑΜΜΑ for «πρ», ignoring case and accents", () => {
    expect(labels("πρ", "line-start")[0]).toBe("ΠΡΟΓΡΑΜΜΑ");
    expect(labels("Πρό", "line-start")[0]).toBe("ΠΡΟΓΡΑΜΜΑ");
  });

  it("offers whole blocks at the start of a line", () => {
    expect(labels("αν", "line-start")).toEqual(["ΑΝ", "ΑΝ … ΑΛΛΙΩΣ"]);
    // The block stays on offer even once the keyword is fully typed.
    expect(labels("ΑΝ", "line-start")).toEqual(["ΑΝ", "ΑΝ … ΑΛΛΙΩΣ"]);
  });

  it("offers built-in functions where a value goes, even once fully typed", () => {
    expect(labels("τ", "value")).toEqual(["Τ_Ρ"]);
    expect(labels("α", "value")).toEqual(["Α_Μ", "Α_Τ", "ΑΛΗΘΗΣ"]);
    expect(labels("ε", "value")).toEqual(["ΕΦ", "Ε"]);
    expect(labels("Ε", "value")).toEqual(["ΕΦ", "Ε"]);
    const sqrt = completionOptions("τ", "value", []).find((o) => o.label === "Τ_Ρ");
    expect(sqrt?.displayLabel).toBe("Τ_Ρ()");
  });

  it("offers the student's names first where a value goes", () => {
    expect(labels("α", "value", ["άθροισμα"])[0]).toBe("άθροισμα");
  });

  it("offers what continues the statement after a value", () => {
    expect(labels("τ", "after-value", [], "ΑΝ")).toEqual(["ΤΟΤΕ"]);
    expect(labels("μ", "after-value", [], "ΓΙΑ")).toEqual(["ΜΕΧΡΙ", "ΜΕ_ΒΗΜΑ"]);
    expect(labels("m", "after-value", [], "x")).toEqual(["MOD"]);
    expect(labels("ε", "after-value", [], "ΟΣΟ")).toEqual(["ΕΠΑΝΑΛΑΒΕ"]);
    expect(labels("τ", "after-value", [], "x")).toEqual([]);
    expect(labels("τ", "after-value", [], "ΓΙΑ")).toEqual([]);
  });

  it("doesn't offer a keyword that's already fully typed", () => {
    expect(labels("ΤΟΤΕ", "after-value", [], "ΑΝ")).toEqual([]);
  });

  it("completes declaration types with the colon", () => {
    const option = completionOptions("ακ", "declaration", []).find((o) => o.label === "ΑΚΕΡΑΙΕΣ");
    expect(option?.apply).toBe("ΑΚΕΡΑΙΕΣ: ");
  });

  it("offers only the types in ΜΕΤΑΒΛΗΤΕΣ, and no types elsewhere", () => {
    expect(labels("α", "declaration", ["αθροισμα"])).toEqual(["ΑΚΕΡΑΙΕΣ"]);
    expect(labels("π", "declaration")).toEqual(["ΠΡΑΓΜΑΤΙΚΕΣ"]);
    expect(labels("", "declaration")).toEqual(["ΑΚΕΡΑΙΕΣ", "ΠΡΑΓΜΑΤΙΚΕΣ", "ΧΑΡΑΚΤΗΡΕΣ", "ΛΟΓΙΚΕΣ"]);
    expect(labels("ακ", "line-start")).not.toContain("ΑΚΕΡΑΙΕΣ");
  });

  it("offers only names where only a name fits", () => {
    expect(labels("σ", "name", ["Σύνολο", "x"])).toEqual(["Σύνολο"]);
    expect(labels("συν", "line-start", ["Σύνολο"])).toContain("Σύνολο");
  });

  it("offers ΑΛΛΙΩΣ after ΠΕΡΙΠΤΩΣΗ, and return types after a function's header", () => {
    expect(labels("αλ", "case")).toEqual(["ΑΛΛΙΩΣ", "ΑΛΗΘΗΣ"]);
    expect(labels("α", "return-type")).toEqual(["ΑΚΕΡΑΙΑ"]);
  });
});

describe("inDeclarations", () => {
  it("is true only below ΜΕΤΑΒΛΗΤΕΣ and before the next section", () => {
    expect(inDeclarations("ΠΡΟΓΡΑΜΜΑ α\nΜΕΤΑΒΛΗΤΕΣ\n")).toBe(true);
    expect(inDeclarations("ΠΡΟΓΡΑΜΜΑ α\nμεταβλητές\n  ΑΚΕΡΑΙΕΣ: x\n  ! σχόλιο\n")).toBe(true);
    expect(inDeclarations("ΠΡΟΓΡΑΜΜΑ α\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x\nΑΡΧΗ\n")).toBe(false);
    expect(inDeclarations("ΠΡΟΓΡΑΜΜΑ α\n")).toBe(false);
    expect(inDeclarations("")).toBe(false);
    expect(inDeclarations("ΔΙΑΔΙΚΑΣΙΑ Π(α)\nΜΕΤΑΒΛΗΤΕΣ\n")).toBe(true);
  });
});

describe("namesIn", () => {
  it("collects names once, skipping keywords and the word being typed", () => {
    const text = "ΑΚΕΡΑΙΕΣ: Σύνολο, i\nΣΥΝΟΛΟ <- i + Τ_Ρ(4)\nσυ";
    expect(namesIn(text, text.lastIndexOf("συ"))).toEqual(["Σύνολο", "i"]);
  });

  it("skips words in comments and strings", () => {
    const text = "! τυπώνει τον μέσο όρο τους\nΓΡΑΨΕ 'Πόσους αριθμούς;', ν ! κι εδώ\n";
    expect(namesIn(text, text.length)).toEqual(["ν"]);
  });
});

describe("inCommentOrString", () => {
  it("detects comments and open strings", () => {
    expect(inCommentOrString("x <- 1 ! σχόλ")).toBe(true);
    expect(inCommentOrString("ΓΡΑΨΕ 'Γει")).toBe(true);
    expect(inCommentOrString("ΓΡΑΨΕ 'α!', ")).toBe(false);
    expect(inCommentOrString("  ΑΝ x > ")).toBe(false);
  });
});

describe("picking a keyword", () => {
  const apply = (typed: string, place: Place, first = "") =>
    completionOptions(typed, place, [], first).map((o) => o.apply ?? o.label);

  it("types the space after it, so the next word can follow", () => {
    expect(apply("απ", "after-value", "ΓΙΑ")).toContain("ΑΠΟ ");
    expect(apply("δια", "line-start")).toContain("ΔΙΑΒΑΣΕ ");
  });

  it("adds no space after a word that ends the line", () => {
    expect(apply("το", "after-value", "ΑΝ")).toContain("ΤΟΤΕ");
    expect(apply("τελος_α", "line-start")).toContain("ΤΕΛΟΣ_ΑΝ");
  });
});

describe("a name typed in two linked blanks", () => {
  it("goes back to one cursor once the cursor leaves the blanks", () => {
    const editor = {
      // The editor's basic setup allows several cursors; a bare state doesn't.
      state: EditorState.create({
        doc: "",
        extensions: [EditorState.allowMultipleSelections.of(true), glossaAutocomplete],
      }),
      dispatch(tr: Transaction) {
        this.state = tr.state;
      },
    };
    snippet("Αλγόριθμος ${1}\n${2}\nΤέλος ${1}")(editor as never, null as never, 0, 0);
    expect(editor.state.selection.ranges).toHaveLength(2);
    editor.dispatch(editor.state.update(editor.state.replaceSelection("Α")));
    expect(editor.state.doc.toString()).toBe("Αλγόριθμος Α\n\nΤέλος Α");
    // An arrow key moves both cursors off the name.
    const moved = EditorSelection.create(editor.state.selection.ranges.map((r) => EditorSelection.cursor(r.head - 2)));
    editor.dispatch(editor.state.update({ selection: moved, userEvent: "select" }));
    expect(editor.state.selection.ranges).toHaveLength(1);
  });
});

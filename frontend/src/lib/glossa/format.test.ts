import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { formatChanges, formatCode } from "./format";

describe("formatCode", () => {
  it("indents blocks and spaces out a messy program", () => {
    const messy = [
      "προγραμμα  Δοκιμή",
      "μεταβλητες",
      "ακεραιες:i,x ,Α[10]",
      "  αρχη",
      "για i απο 1 μεχρι 10 με_βημα 2",
      "x<-i*2+Α[i-1]",
      "      αν x>=5 και οχι(x=7) τοτε",
      "γραψε 'τιμή:',x   ! ένα  σχόλιο",
      "   αλλιως",
      "ΓΡΑΨΕ -x,Α_Τ( -3 )",
      "τελος_αν",
      "  τελος_επαναληψης",
      "τελος_προγραμματος",
    ].join("\n");
    expect(formatCode(messy)).toBe(
      [
        "ΠΡΟΓΡΑΜΜΑ Δοκιμή",
        "ΜΕΤΑΒΛΗΤΕΣ",
        "  ΑΚΕΡΑΙΕΣ: i, x, Α[10]",
        "ΑΡΧΗ",
        "  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 10 ΜΕ_ΒΗΜΑ 2",
        "    x <- i * 2 + Α[i - 1]",
        "    ΑΝ x >= 5 ΚΑΙ ΟΧΙ (x = 7) ΤΟΤΕ",
        "      ΓΡΑΨΕ 'τιμή:', x ! ένα  σχόλιο",
        "    ΑΛΛΙΩΣ",
        "      ΓΡΑΨΕ -x, Α_Τ(-3)",
        "    ΤΕΛΟΣ_ΑΝ",
        "  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ",
        "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ",
      ].join("\n"),
    );
  });

  it("is already done on tidy code", () => {
    const tidy = formatCode("ΠΡΟΓΡΑΜΜΑ α\nΑΡΧΗ\nΑΝ 1>0 ΤΟΤΕ\nx<-1\nΤΕΛΟΣ_ΑΝ\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ");
    expect(formatCode(tidy)).toBe(tidy);
  });

  it("tells a minus sign from a subtraction", () => {
    const line = (code: string) => formatCode(`ΑΡΧΗ\n${code}`).split("\n")[1].trim();
    expect(line("x<--1")).toBe("x <- -1");
    expect(line("x<-2*-y")).toBe("x <- 2 * -y");
    expect(line("x<-(a)-1")).toBe("x <- (a) - 1");
    expect(line("x<-Α[2]-1")).toBe("x <- Α[2] - 1");
    expect(line("ΑΝ x=-1 ΤΟΤΕ")).toBe("ΑΝ x = -1 ΤΟΤΕ");
  });

  it("writes calls, subprograms and ranges tight", () => {
    expect(formatCode("ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ\nσυναρτηση Φ ( α , β ) : ακεραια")).toBe(
      "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ\nΣΥΝΑΡΤΗΣΗ Φ(α, β): ΑΚΕΡΑΙΑ",
    );
    expect(formatCode("ΑΡΧΗ\nκαλεσε Π( x )").split("\n")[1]).toBe("  ΚΑΛΕΣΕ Π(x)");
    expect(formatCode("ΕΠΙΛΕΞΕ x\nπεριπτωση 1 .. 5").split("\n")[1]).toBe("  ΠΕΡΙΠΤΩΣΗ 1..5");
  });

  it("leaves strings and comments as written, and lines it can't read", () => {
    const code = "ΑΡΧΗ\nΓΡΑΨΕ 'α  <-  β'   !  x<-1\nΓΡΑΨΕ 'ανοιχτό\nx <- 2x\ny = 3 ; z";
    expect(formatCode(code)).toBe(
      "ΑΡΧΗ\n  ΓΡΑΨΕ 'α  <-  β' !  x<-1\n  ΓΡΑΨΕ 'ανοιχτό\n  x <- 2x\n  y = 3 ; z",
    );
  });

  it("keeps blank lines (emptied) and indents continuation lines", () => {
    expect(formatCode("ΑΡΧΗ\n  \nΓΡΑΨΕ  α,\n&β")).toBe("ΑΡΧΗ\n\n  ΓΡΑΨΕ α,\n    & β");
  });

  it("writes ψευδογλώσσα as the textbook does", () => {
    const messy = "αλγοριθμος Μέγιστο\nδεδομενα // α,β //\nαν α>=β τοτε\nmax<-α\nαλλιως\nmax<-β\nτελος_αν\nαποτελεσματα // max //\nτελος Μέγιστο";
    expect(formatCode(messy, "pseudocode")).toBe(
      [
        "Αλγόριθμος Μέγιστο",
        "Δεδομένα // α, β //",
        "Αν α ≥ β τότε",
        "  max ← α",
        "αλλιώς",
        "  max ← β",
        "Τέλος_αν",
        "Αποτελέσματα // max //",
        "Τέλος Μέγιστο",
      ].join("\n"),
    );
  });
});

describe("ψευδογλώσσα's one-line Αν", () => {
  // Its αλλιώς belongs to it only when indented as far as the Αν: those lines stay as written.
  const nested = (lines: string[]) => ["Αλγόριθμος α", ...lines, "Τέλος α"].join("\n");

  it("leaves the lines whose layout says which Αν an αλλιώς belongs to", () => {
    const code = nested([
      "αν α τοτε",
      "    Αν β τότε x ← 1",
      "    αλλιώς x ← 2",
      "    Τέλος_αν",
      "x<-3",
      "Τέλος_αν",
    ]);
    expect(formatCode(code, "pseudocode")).toBe(
      // x ← 3 lines up with the Τέλος_αν kept above it.
      nested(["Αν α τότε", "    Αν β τότε x ← 1", "    αλλιώς x ← 2", "    Τέλος_αν", "    x ← 3", "Τέλος_αν"]),
    );
  });

  it("keeps them however the Αν is written", () => {
    const cases = [
      // An Αν after τότε, or after αλλιώς: its column is mid-line.
      ["Αν x > 0 τότε Αν x > 5 τότε Γράψε 1", "              αλλιώς Γράψε 2", "Τέλος_αν"],
      ["Αν   x > 0 τότε Αν x > 5 τότε Γράψε 1", "                αλλιώς Γράψε 2", "Τέλος_αν"],
      ["Αν x > 5 τότε Γράψε 1", "αλλιώς Αν x > 0 τότε Γράψε 2", "       αλλιώς Γράψε 3", "Τέλος_αν"],
      // Continued with &, or τότε on the & line.
      ["Αν x > 0 τότε", "  Αν x > 5 τότε Γράψε 1,", "  & 3", "  αλλιώς Γράψε 2", "  Τέλος_αν", "Τέλος_αν"],
      ["Αν x > 0", "& τότε", "  Αν x > 5 τότε Γράψε 1", "αλλιώς Γράψε 2", "Τέλος_αν"],
    ];
    for (const lines of cases) {
      const code = nested(["x ← 1", ...lines]);
      expect(formatCode(code, "pseudocode"), lines.join(" / ")).toBe(code);
    }
  });

  it("reads accents written as separate marks", () => {
    const decomposed = "αλλιώς".normalize("NFD");
    const code = nested(["Αν x > 0 τότε", "  Αν x > 5 τότε Γράψε 1", `${decomposed} Γράψε 2`, "Τέλος_αν"]);
    expect(formatCode(code, "pseudocode").split("\n")[3]).toBe(`${decomposed} Γράψε 2`);
  });
});

describe("whitespace the language doesn't have", () => {
  it("stays, so the error the editor marks is still there", () => {
    const code = "ΑΡΧΗ\nx <-\u00a01\n\u00a0";
    expect(formatCode(code)).toBe("ΑΡΧΗ\n  x <-\u00a01\n  \u00a0");
  });
});

describe("formatChanges", () => {
  it("changes only what differs, so the cursor keeps its place", () => {
    const doc = "ΑΡΧΗ\n  ΓΡΑΨΕ x\nx<-1";
    const state = EditorState.create({ doc, selection: { anchor: doc.length } });
    const next = state.update({ changes: formatChanges(state, "glossa") }).state;
    expect(next.doc.toString()).toBe("ΑΡΧΗ\n  ΓΡΑΨΕ x\n  x <- 1");
    expect(next.selection.main.head).toBe(next.doc.length);
    expect(formatChanges(next, "glossa")).toEqual([]);
  });
});

# ΓΛΩΣΣΑ: reference for the interpreter

The interpreter in `backend/app/glossa/` must accept what students are taught and graded on, and reject the rest. Sources, in order of authority:

1. The school textbook *Ανάπτυξη Εφαρμογών σε Προγραμματιστικό Περιβάλλον* (Γ' Λυκείου; the course is now called Πληροφορική).
2. The **Διερμηνευτής της ΓΛΩΣΣΑΣ** by Άλκης Γεωργόπουλος ([alkisg.mysch.gr](https://alkisg.mysch.gr/downloads/)), the desktop interpreter schools use. AEPP-Max aims to run the same programs, but it is an independent implementation: no code, text or images from it, and no claim of affiliation. It is freeware for non-commercial use with no published source, so it can't be forked the way Cursor forked VS Code's MIT-licensed Code - OSS. Its forum is [Το Στέκι των Πληροφορικών](https://alkisg.mysch.gr/steki/).
3. [js-glossa](https://github.com/armados/js-glossa), an independent JavaScript implementation. Its grammar (`src/grammar.js`) is a good cross-check. It has no license, so read it but don't copy code from it.

Items marked **Verify** are uncertain. Settle each one against (1) or (2) before implementing it, then update this file and add a test.

## Program layout

```
ΠΡΟΓΡΑΜΜΑ Παράδειγμα
ΣΤΑΘΕΡΕΣ
  π = 3.14
  Ν = 10
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: i, Π[Ν], Μ[3, 4]
  ΠΡΑΓΜΑΤΙΚΕΣ: x, μέσος
  ΧΑΡΑΚΤΗΡΕΣ: όνομα
  ΛΟΓΙΚΕΣ: βρέθηκε
ΑΡΧΗ
  ! εντολές
ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ

ΔΙΑΔΙΚΑΣΙΑ ... ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ
ΣΥΝΑΡΤΗΣΗ ... ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ
```

- `ΣΤΑΘΕΡΕΣ` and `ΜΕΤΑΒΛΗΤΕΣ` are optional, in that order. Subprograms come after `ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ`.
- One statement per line. A line whose first non-blank character is `&` continues the previous line.
- `!` starts a comment that runs to the end of the line.
- **Verify:** whether `ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ` may repeat the program name (js-glossa allows it).

## Lexical rules

- **Keywords** are written in capitals in the textbook. We match them without regard to case or accents (`αλλιώς_αν` = `ΑΛΛΙΩΣ_ΑΝ`, `ς` = `Σ`), the same way the editor's highlighter does (`normalizeWord` in `frontend/src/lib/glossa/language.ts`). Keep the two in sync.
- **Identifiers** start with a letter (Greek or Latin), followed by letters, digits or `_`. They can't be keywords, word operators or built-in names. **Verify:** whether identifiers are case-sensitive and accent-sensitive in the Διερμηνευτής. Pick one rule and use it in the lexer, the parser's name checks and the trace's variable names.
- **Numbers:** integer `12`; real `3.14` (decimal point, digits on both sides). **Verify:** whether `.5`, `5.` and exponent notation are allowed.
- **Strings:** `'...'` or `"..."`, on one line.
- **Logical constants:** `ΑΛΗΘΗΣ`, `ΨΕΥΔΗΣ`.
- **Assignment:** `<-`. The textbook prints `←`, so accept that too.

## Types

| Declaration | Type | Values |
|---|---|---|
| `ΑΚΕΡΑΙΕΣ` | ΑΚΕΡΑΙΑ | whole numbers |
| `ΠΡΑΓΜΑΤΙΚΕΣ` | ΠΡΑΓΜΑΤΙΚΗ | decimal numbers |
| `ΧΑΡΑΚΤΗΡΕΣ` | ΧΑΡΑΚΤΗΡΑΣ | strings |
| `ΛΟΓΙΚΕΣ` | ΛΟΓΙΚΗ | ΑΛΗΘΗΣ / ΨΕΥΔΗΣ |

- Every variable must be declared. A variable has no value until it is assigned or read, and using it before that is a runtime error.
- An integer can go into a ΠΡΑΓΜΑΤΙΚΗ variable. A real into an ΑΚΕΡΑΙΑ variable is an error, as is any other type mismatch.
- A constant's type comes from its value. Assigning to a constant is an error.

## Operators

Precedence, from highest to lowest:

1. `^`
2. `*` `/` `DIV` `MOD`
3. `+` `-`
4. `=` `<>` `<` `>` `<=` `>=`
5. `ΟΧΙ`
6. `ΚΑΙ`
7. `Ή` (also written `Η`)

- `/` always gives a real. `DIV` and `MOD` take only integers.
- A zero divisor for `/`, `DIV` or `MOD` is a runtime error.
- Strings compare alphabetically with the comparison operators. ΓΛΩΣΣΑ has no string functions and no `+` for strings.
- **Verify:** whether `^` is right-associative; how unary minus binds (`-2^2`); `DIV`/`MOD` results for negative operands; and whether `=`/`<>` work on ΛΟΓΙΚΗ values.

## Statements

- `x <- έκφραση`. `Π[i, j] <- ...` works too.
- `ΔΙΑΒΑΣΕ a, b, Π[i]` reads one input per variable and converts it to that variable's type. An integer variable rejects `3.5` and `abc`. A ΧΑΡΑΚΤΗΡΕΣ variable takes the input as typed.
- `ΓΡΑΨΕ e1, e2, ...` writes one output line. Booleans print as `ΑΛΗΘΗΣ` / `ΨΕΥΔΗΣ`. **Verify:** the separator between values, and how reals print (`2.0` → `2`? how many decimals?).
- Selection:
  ```
  ΑΝ συνθήκη ΤΟΤΕ ... [ΑΛΛΙΩΣ_ΑΝ συνθήκη ΤΟΤΕ ...]* [ΑΛΛΙΩΣ ...] ΤΕΛΟΣ_ΑΝ
  ΕΠΙΛΕΞΕ έκφραση
    ΠΕΡΙΠΤΩΣΗ 1, 3, 5..9, < 0
    ...
    ΠΕΡΙΠΤΩΣΗ ΑΛΛΙΩΣ
    ...
  ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ
  ```
  `ΕΠΙΛΕΞΕ` runs the first matching `ΠΕΡΙΠΤΩΣΗ` only. A case list can hold values, ranges `α..β` and comparisons such as `< 0`.
- Loops:
  ```
  ΟΣΟ συνθήκη ΕΠΑΝΑΛΑΒΕ ... ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ
  ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ ... ΜΕΧΡΙΣ_ΟΤΟΥ συνθήκη          ! runs at least once
  ΓΙΑ i ΑΠΟ α ΜΕΧΡΙ β [ΜΕ_ΒΗΜΑ γ] ... ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ
  ```
  `ΓΙΑ`: the step defaults to 1. With a negative step the loop counts down. The bounds and the step are evaluated once, at the start. After the loop, the counter holds the first value past the bound, which trace-table questions ask about. The textbook forbids changing the counter inside the loop. **Verify:** whether the Διερμηνευτής treats that as an error; what `ΜΕ_ΒΗΜΑ 0` does; whether real counters and steps are allowed.
- Conditions must be ΛΟΓΙΚΗ. A number as a condition is an error.
- ΓΛΩΣΣΑ has no break, continue or return statements, and no global variables.

## Arrays

- Declared with constant sizes, either literals or `ΣΤΑΘΕΡΕΣ`: `Π[100]`, `Μ[3, 4]`.
- Indices are integers from 1. An index out of range is a runtime error.
- Whole arrays are used only as subprogram arguments. Everything else works on elements.

## Subprograms

```
ΣΥΝΑΡΤΗΣΗ Μέγιστο(α, β): ΑΚΕΡΑΙΑ
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: α, β
ΑΡΧΗ
  ΑΝ α > β ΤΟΤΕ
    Μέγιστο <- α
  ΑΛΛΙΩΣ
    Μέγιστο <- β
  ΤΕΛΟΣ_ΑΝ
ΤΕΛΟΣ_ΣΥΝΑΡΤΗΣΗΣ

ΔΙΑΔΙΚΑΣΙΑ Αντιμετάθεση(α, β)
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: α, β, προσωρινή
ΑΡΧΗ
  προσωρινή <- α
  α <- β
  β <- προσωρινή
ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ
```

- Parameters are declared again, with their types, in the subprogram's own `ΜΕΤΑΒΛΗΤΕΣ`.
- A subprogram sees only its parameters and its own declarations; there are no global variables.
- A function returns a value of type `ΑΚΕΡΑΙΑ` / `ΠΡΑΓΜΑΤΙΚΗ` / `ΧΑΡΑΚΤΗΡΑΣ` / `ΛΟΓΙΚΗ` by assigning to its own name. It is called inside expressions: `μ <- Μέγιστο(x, y)`.
- A procedure is called with `ΚΑΛΕΣΕ Αντιμετάθεση(x, y)`. Changes it makes to its parameters are copied back to the caller's variables when it ends. That is how procedures return results.
- Recursion is allowed. Limit its depth and report runaway recursion as a runtime error.
- **Verify:**
  - whether the main program's constants are visible in subprograms;
  - whether a function needs at least one parameter (js-glossa requires one);
  - whether functions may use `ΔΙΑΒΑΣΕ`/`ΓΡΑΨΕ` or change their parameters;
  - what happens when a procedure changes a parameter whose argument was an expression or a constant, or when the same variable is passed twice.

## Built-in functions

Implemented and tested in `backend/app/glossa/builtins.py`.

| Function | Meaning |
|---|---|
| `Α_Μ(x)` | integer part (floor, so `Α_Μ(-2.5) = -3`). **Verify** this with the Διερμηνευτής; js-glossa uses floor. |
| `Α_Τ(x)` | absolute value |
| `Τ_Ρ(x)` | square root; an error if `x < 0` |
| `ΗΜ(x)`, `ΣΥΝ(x)`, `ΕΦ(x)` | sine, cosine, tangent of `x` **in degrees**; `ΕΦ` is an error at 90° + k·180° |
| `ΛΟΓ(x)` | natural logarithm; an error if `x <= 0` |
| `Ε(x)` | e^x |

## Errors

Report errors in Greek, with the line number, in the style of the Διερμηνευτής. For example:

- `Η μεταβλητή x δεν έχει δηλωθεί.` (syntax: caught by the parser, even in code that never runs)
- `Η μεταβλητή x δεν έχει πάρει τιμή.`
- `Διαίρεση με το μηδέν.`
- `Ο δείκτης 11 είναι εκτός ορίων του πίνακα Π (1..10).`
- `Δεν μπορεί να εκχωρηθεί πραγματική τιμή σε ακέραια μεταβλητή.`

Report syntax errors at the first problem. Students fix one error at a time.

## What the parser does on uncertain points

The parser (`backend/app/glossa/parser.py`, `checker.py`) had to pick something for several **Verify** items above. These choices are provisional. Change them once confirmed, and update the tests in `backend/tests/test_glossa_parser.py`.

| Point | Current choice |
|---|---|
| Name case and accents | Ignored, as for keywords: `Σύνολο`, `ΣΥΝΟΛΟ` and `συνολο` are one variable. |
| Name after `ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ` | Optional; if present, it must match the program's name. |
| `^` and unary minus | `^` is left-associative; `-2^2` is `-(2^2)` (as js-glossa does). |
| `ΓΙΑ` counter | A simple variable only, not an array element. |
| Main-program constants in subprograms | Visible; variables are not. |
| Functions with no parameters | Allowed. |
| `0 < x < 10` | An error that suggests `0 < x ΚΑΙ x < 10`. |
| Latin look-alikes (`APXH`, `TOTE`) | An error that suggests the Greek keyword. Not raised for `H`, which is a valid Latin variable name. |
| Constant values | A literal, a signed number, or an earlier constant. No other expressions. |

## Optional: inputs stored in the program

js-glossa reads a top comment `! KEYBOARD_INPUT: 5, 3` as preset inputs for `ΔΙΑΒΑΣΕ`. If we support it, a shared program can carry its test inputs. The IDE would then pass them as `inputs`.

## What the interpreter does on uncertain points

`backend/app/glossa/interpreter.py` follows the Διερμηνευτής's own defaults, as its help describes them (Εργαλεία → Επιλογές → Γλώσσα / Ασάφειες), where the textbook is silent. Tests: `backend/tests/test_glossa_interpreter.py`.

| Point | Choice |
|---|---|
| Printing reals | 2 decimals, trailing zeros dropped: `1/3` → `0.33`, `10/4` → `2.5`, `4/2` → `2`. |
| Comparing reals | Rounded to 8 decimals first, so `10 / 3 * 3 = 10` and `0.1 + 0.2 = 0.3` are ΑΛΗΘΗΣ. |
| `ΓΡΑΨΕ a, b` | Values are joined with no separator, except a space between two numbers (`ΓΡΑΨΕ 1, 2` → `1 2`). |
| `ΓΡΑΨΕ` ending in a space | The line stays open and the next ΓΡΑΨΕ continues it; that one trailing space is dropped (two spaces leave one). ΔΙΑΒΑΣΕ closes the line. |
| ΚΑΙ / Ή | Both sides are always evaluated, so `ΟΣΟ i <= 10 ΚΑΙ Α[i] <> 0` fails at `i = 11`, as the textbook warns. |
| DIV / MOD | Floored (the Διερμηνευτής's default, Knuth's definition): `-7 DIV 2 = -4`, `-7 MOD 2 = 1`. **Verify.** |
| `=` / `<>` on ΛΟΓΙΚΗ | Allowed; `<`, `>` on ΛΟΓΙΚΗ are errors. |
| `ΓΙΑ` | Bounds and step evaluated once; the counter is updated as `counter + step` each round, so after the loop it holds the first value past the bound. `ΜΕ_ΒΗΜΑ 0` is an error. Real counters and steps work. |
| Input | An integer variable takes only an integer; a real one also accepts a decimal comma (`2,5`); a ΛΟΓΙΚΗ one accepts ΑΛΗΘΗΣ/ΨΕΥΔΗΣ in any case or accents; ΧΑΡΑΚΤΗΡΕΣ take the text as typed. A wrong value ends the run with an error. |
| Strings with `+` | An error (no concatenation), as the textbook says. |
| Limits | Call depth 200, arrays up to 1,000,000 cells, integers up to 10^100: past them, a runtime error instead of a hung worker. |


## Αλγόριθμος (ψευδογλώσσα)

The editor's **Αλγόριθμος** switch runs the textbook's pseudocode (ch. 2.4 "Στοιχεία ψευδογλώσσας", with the examples in ch. 2 and 3) instead of ΓΛΩΣΣΑ. The Διερμηνευτής has had a ψευδογλώσσα mode since 1.5.1 (`.psg` files), but its help doesn't describe it, so the choices below come from the textbook. Code: `algorithm_parser.py`, `algorithm_checker.py`, `algorithm_interpreter.py`; tests: `backend/tests/test_glossa_algorithms.py`. The API takes `language: "pseudocode"`.

```
Αλγόριθμος Ευκλείδης
Δεδομένα // x, y //
z ← y
Όσο z ≠ 0 επανάλαβε
  z ← x mod y
  x ← y
  y ← z
Τέλος_επανάληψης
Αποτελέσματα // x //
Τέλος Ευκλείδης
```

- **Words** are matched like ΓΛΩΣΣΑ's (case and accents ignored), but the editor writes them as the textbook does: `Αν`, `τότε`, `Τέλος_αν`, `Όσο … επανάλαβε`, `Αρχή_επανάληψης … Μέχρις_ότου`, `Για … από … μέχρι … με_βήμα`, `Επίλεξε … Περίπτωση … Τέλος_επιλογών`, `Διάβασε`, `Εμφάνισε` / `Εκτύπωσε` / `Γράψε` (the same command), `Κάλεσε`, `Αντιμετάθεσε α, β`. ΓΛΩΣΣΑ's sections, types and subprogram words are ordinary names here.
- **Symbols:** `←` or `<-`; `≤ ≥ ≠` as well as `<= >= <>`. Numbers use a decimal point (the textbook also mentions a comma; **Verify**).
- **No declarations.** A variable holds whatever it was last given; using it before that is a runtime error. A name used with `[...]` is an array, with the same number of indices everywhere; arrays have no size, an element exists once it gets a value, and indices start at 1.
- **One-line Αν:** `Αν συνθήκη τότε εντολή` needs no `Τέλος_αν`. Branches may also hold their statement on their own line (`αλλιώς_αν a = 2 τότε εκτύπωσε "Β"`), as in the textbook's example 4; once an `αλλιώς_αν` or `αλλιώς` follows, the Αν ends with `Τέλος_αν`. A one-line Αν takes the `αλλιώς`/`Τέλος_αν` below it only if that word is indented at least as far as the Αν; less indented, it belongs to an Αν further out.
- **Δεδομένα / Αποτελέσματα:** `Δεδομένα // α, β //` on the second line, `Αποτελέσματα // γ //` just before `Τέλος`, at least one name and names only (the textbook's `// M1,M2 ακέραιοι //` is an error that says to move the description to a `!` comment).
- **Several algorithms:** they follow one another; the first one runs. It reads its Δεδομένα from the keyboard before its first statement and shows its Αποτελέσματα at the end, on one line, as `Εμφάνισε` would (an array: its elements in order). A whole array can't be read as a Δεδομένο.
- **Calls:** `Κάλεσε Χ(α, β, γ)` gives Χ's Δεδομένα in order, then its Αποτελέσματα that aren't also Δεδομένα; after Χ returns, every Αποτέλεσμα is copied back to the variable given in its place (a Δεδομένο that is also an Αποτέλεσμα, such as `table` in the textbook's Φυσαλίδα, returns through its own argument). Δεδομένα go in by value; arrays as copies. `Χ(α, β)` inside an expression takes only the Δεδομένα and is the value of Χ's single Αποτέλεσμα, as in the textbook's recursive Παραγοντικό, Ευκλείδης and Fibonacci. Recursion depth is capped as in ΓΛΩΣΣΑ, and so are the array cells copied into calls still running (1,000,000), since a deep recursion passing an array holds a copy per level.
- **Διάβασε** takes the type of what is typed: an integer, a real (`2.5` or `2,5`), `Αληθής`/`Ψευδής`, otherwise text.
- Everything else (operators, built-in functions, printing, comparisons, ΓΙΑ, limits) is as in ΓΛΩΣΣΑ above.

**Verify** against the Διερμηνευτής's ψευδογλώσσα mode: whether it reads the main algorithm's Δεδομένα and shows its Αποτελέσματα; the argument order of `Κάλεσε`; whether a variable may change type; how `Διάβασε` types its input; whether `Επανάλαβε … Μέχρις_ότου` (the Β' Λυκείου book's form) is accepted (now an error suggesting `Αρχή_επανάληψης`).

# Πληροφορική (formerly ΑΕΠΠ) Panhellenic exams: ψευδογλώσσα in exam answers, model-answer formats, 2019-2026 trends

Method note: the 2019-2026 main-session (Ιούνιος, ΓΕΛ ημερήσια/εσπερινά) exam papers were downloaded as PDFs and read in full: 2019-2025 from P. Mouziouras's archive, 2026 from minedu.gov.gr. Every per-year claim about what was asked comes from those primary PDFs, paraphrased. Difficulty comments and controversies come from press and teacher sources. I did not read the επαναληπτικές papers, the 2020 old-system ΑΕΠΠ paper, the official grading instructions or the ΟΕΦΕ answer PDFs (see Gaps).

Primary paper URLs (cited below by year):
- 2019: https://pmouziouras.mysch.gr/images/them_plir_op_c_hmer_190612.pdf (still titled «ΑΝΑΠΤΥΞΗ ΕΦΑΡΜΟΓΩΝ ΣΕ ΠΡΟΓΡΑΜΜΑΤΙΣΤΙΚΟ ΠΕΡΙΒΑΛΛΟΝ», 12 June 2019)
- 2020 (new system, «ΠΛΗΡΟΦΟΡΙΚΗ ΠΡΟΣΑΝΑΤΟΛΙΣΜΟΥ», 24 June 2020): https://pmouziouras.mysch.gr/images/SPdownload/them_Plhrof_op_NEO_200624.pdf
- 2021 (18 June 2021): https://pmouziouras.mysch.gr/images/PLHROFORIKH_NEO_HM_2021_10.pdf
- 2022 (8 June 2022): https://pmouziouras.mysch.gr/images/Plhroforikh_neo_hm_2022_1.pdf
- 2023 (8 June 2023): https://pmouziouras.mysch.gr/images/ΠΛΗΡΟΦΟΡΙΚΗ_ΝΕΟ_ΗΜ_2023_1.pdf
- 2024 (6 June 2024): https://pmouziouras.mysch.gr/images/them_plirof_gel_240606.pdf
- 2025 (4 June 2025): https://pmouziouras.mysch.gr/images/them_plirof_gel_250604.pdf
- 2026 (5 June 2026): https://www.minedu.gov.gr/publications/docs2026/panelladikes_2026_iounios/them_plirof_gel_260605.pdf
- Archive index: https://pmouziouras.mysch.gr/mathimata/aepp/panellhnies/12-aepp2011

## 1. When the exam asks for ψευδογλώσσα vs ΓΛΩΣΣΑ, and the expected ψευδογλώσσα conventions

### Takeaway
Θέμα Γ and Θέμα Δ always ask for a «πρόγραμμα σε ΓΛΩΣΣΑ» (every year 2019-2026), and the official teaching guidelines say students answer in ΓΛΩΣΣΑ unless the question names another representation. Ψευδογλώσσα is asked explicitly only in small Θέμα Β items: convert a flowchart to ψευδογλώσσα (2025), write stack/queue conditions «σε ψευδογλώσσα» (2023), or fill blanks in a given pseudocode algorithm (2019, 2022). The papers use the word «αλγόριθμος» loosely, often for code that is really in ΓΛΩΣΣΑ syntax, and the model answers write "pseudocode" with uppercase ΓΛΩΣΣΑ-style keywords. Minor mixing therefore looks tolerated in practice, but no official rule on it was found.

### Cited Findings
**Official rule (teaching guidelines)**
- The 2024-25 official teaching guidelines for Πληροφορική Γ' ΓΕΛ say three things. Algorithms are taught alongside their implementation in ΓΛΩΣΣΑ. Students work in "a purely programming environment, specifically ΓΛΩΣΣΑ". Students should write exercise solutions in ΓΛΩΣΣΑ "unless the question states a different representation of the algorithm". — [Οδηγίες διδασκαλίας Πληροφορικής Προσανατολισμού Γ' ΓΕΛ 2024-25 (copy on e-me blog)](https://blogs.e-me.edu.gr/krommyda/wp-content/uploads/sites/319501/2024/10/Ύλη-και-οδηγίες-ΠΛΗΡΟΦΟΡΙΚΗ-Γ-ΓΕΛ-2024-25.pdf)
- The same guidelines list the course books. [ΒΙΒΛΙΟ 1] is the textbook «Ανάπτυξη Εφαρμογών σε Προγραμματιστικό Περιβάλλον». [ΒΙΒΛΙΟ 2] is the ΙΤΥΕ «Διόφαντος» supplementary «Πληροφορική» Γ' ΓΕΛ book. [ΒΙΒΛΙΟ 3] is Παράρτημα Α / Οδηγίες Μελέτης. [ΒΙΒΛΙΟ 4] is the Τετράδιο Μαθητή. [ΒΙΒΛΙΟ 5] is the Διόφαντος book of indicative exercise solutions. Paragraphs 1.5 and 2.1-2.4 of [ΒΙΒΛΙΟ 3] are taught "βοηθητικά", and simple flowcharts are to be presented. — [same guidelines](https://blogs.e-me.edu.gr/krommyda/wp-content/uploads/sites/319501/2024/10/Ύλη-και-οδηγίες-ΠΛΗΡΟΦΟΡΙΚΗ-Γ-ΓΕΛ-2024-25.pdf)
- A 2015-16 ministry circular for ΑΕΠΠ, from the older curriculum, treats ψευδογλώσσα and flowcharts as already known from Β' Λυκείου; Γ' Λυκείου only fills gaps and implements in ΓΛΩΣΣΑ. I saw this only as a search-result summary. — [Stadiodromia: οδηγίες ΑΕΠΠ 2015-16](https://Stadiodromia.gr/enhmer2sh/15_16/odhgies_aepp.pdf)
- The Β' Λυκείου «Εισαγωγή στις Αρχές της Επιστήμης των Η/Υ» guidelines for 2026-27 have students read and write algorithms in ψευδογλώσσα: how an algorithm starts and ends, the ψευδογλώσσα alphabet, and the environment «Αλγοριθμική και Προγραμματισμός». ψευδογλώσσα is therefore Β' Λυκείου material that Γ' Λυκείου builds on. — [Οδηγίες διδασκαλίας Β' ΓΕΛ 2026-27 (stadiodromia.gr)](https://stadiodromia.gr/enhmer2sh/25_26/301.pdf)

**What the papers actually ask (primary PDFs)**
- **Θέμα Γ and Δ ask for ΓΛΩΣΣΑ every year.**
  - Every Θέμα Γ and Θέμα Δ from 2020 to 2026 says «Να αναπτύξετε/κατασκευάσετε πρόγραμμα σε ΓΛΩΣΣΑ» (2026 Γ: «Να γραφεί πρόγραμμα σε ΓΛΩΣΣΑ»).
  - In 2019, Θέμα Γ said only «πρόγραμμα» and Θέμα Δ said «πρόγραμμα σε ΓΛΩΣΣΑ».
  - Each starts with «Να περιλαμβάνει κατάλληλο τμήμα δηλώσεων» (Γ1/Δ1, 2 marks; in 2026 it is folded into Γ1 and Δ1α).
  - Sources: [2019](https://pmouziouras.mysch.gr/images/them_plir_op_c_hmer_190612.pdf), [2020](https://pmouziouras.mysch.gr/images/SPdownload/them_Plhrof_op_NEO_200624.pdf), [2021](https://pmouziouras.mysch.gr/images/PLHROFORIKH_NEO_HM_2021_10.pdf), [2022](https://pmouziouras.mysch.gr/images/Plhroforikh_neo_hm_2022_1.pdf), [2023](https://pmouziouras.mysch.gr/images/ΠΛΗΡΟΦΟΡΙΚΗ_ΝΕΟ_ΗΜ_2023_1.pdf), [2024](https://pmouziouras.mysch.gr/images/them_plirof_gel_240606.pdf), [2025](https://pmouziouras.mysch.gr/images/them_plirof_gel_250604.pdf), [2026](https://www.minedu.gov.gr/publications/docs2026/panelladikes_2026_iounios/them_plirof_gel_260605.pdf)
- **2019 Β1 (fill 10 blanks in a given pseudocode algorithm).**
  - The algorithm checks whether `key` occurs in `table[n]` at least 3 times and shows the position of the third occurrence.
  - It is in textbook ψευδογλώσσα: a header `Αλγόριθμος Β1`; `Δεδομένα // n, table, key //`; ← assignment; `Όσο … και … επανάλαβε`; `Αν … τότε … αλλιώς … Τέλος_αν`; `Τέλος_επανάληψης`; `Εμφάνισε "…", key, "…"`; and it closes with `Τέλος Β1`.
  - There is no Αποτελέσματα line (output is through Εμφάνισε) and there are no declarations. Keywords are in sentence case, with lowercase `ψευδής`.
  - Source: [2019 paper](https://pmouziouras.mysch.gr/images/them_plir_op_c_hmer_190612.pdf)
- **2019 Α5.** It gives the «πολλαπλασιασμός αλά ρωσικά» algorithm as numbered natural-language steps (Βήμα 1…7) and asks students to code it in ΓΛΩΣΣΑ (10 marks). — [2019 paper](https://pmouziouras.mysch.gr/images/them_plir_op_c_hmer_190612.pdf)
- **2022 Β2.**
  - The given «τμήμα αλγορίθμου» is in ψευδογλώσσα: `Διάβασε x`, `Αν x>0 τότε`, `Αρχή_επανάληψης … Μέχρις_ότου x ≤0`, `Τέλος_αν`. It uses the ≤ symbol.
  - Part α asks for the flowchart (6 marks).
  - Part β asks students to «κωδικοποιήσετε τμήμα αλγορίθμου» with the same function, using ΟΣΟ instead of ΜΕΧΡΙΣ_ΟΤΟΥ and no selection statement (4 marks). The keywords are uppercase there, so the language for β is ambiguous.
  - Source: [2022 paper](https://pmouziouras.mysch.gr/images/Plhroforikh_neo_hm_2022_1.pdf)
- **2022 Β1.** It calls a ΓΛΩΣΣΑ `ΔΙΑΔΙΚΑΣΙΑ ΟΛΙΣΘΗΣΗ(O, f, r)` with full declarations an «αλγόριθμος» with 5 blanks. — [2022 paper](https://pmouziouras.mysch.gr/images/Plhroforikh_neo_hm_2022_1.pdf)
- **2023 Β3.** It asks for the condition, «σε ψευδογλώσσα», for each of four checks: stack empty, queue full, stack has one element, queue has two elements. The array is Σ[Ν] with `top`; the queue is Ο[Ν] with `front`/`rear`. — [2023 paper](https://pmouziouras.mysch.gr/images/ΠΛΗΡΟΦΟΡΙΚΗ_ΝΕΟ_ΗΜ_2023_1.pdf)
- **2023 Β1 and Β4.** Both are called «τμήμα αλγορίθμου» but are written in ΓΛΩΣΣΑ syntax: ΓΙΑ…ΓΡΑΨΕ, ΟΣΟ…ΕΠΑΝΑΛΑΒΕ, `!` comments.
  - The official Β4 text itself mixes case and languages: `ΑΛΛΙΩΣ_ΑΝ x < 0 τότε`, with lowercase «τότε».
  - 2021 Α5 does the same: «τμήμα αλγορίθμου» in ΓΙΑ/ΓΡΑΨΕ syntax.
  - Sources: [2023 paper](https://pmouziouras.mysch.gr/images/ΠΛΗΡΟΦΟΡΙΚΗ_ΝΕΟ_ΗΜ_2023_1.pdf), [2021 paper](https://pmouziouras.mysch.gr/images/PLHROFORIKH_NEO_HM_2021_10.pdf)
- **2025 Β2 (9 marks).** It gives an algorithm as a flowchart and asks to convert it «από διάγραμμα ροής σε ψευδογλώσσα». This is the clearest recent explicit ψευδογλώσσα request. The flowchart itself is an image that did not extract. — [2025 paper](https://pmouziouras.mysch.gr/images/them_plirof_gel_250604.pdf)
- **2026.** No item asks for ψευδογλώσσα. Α1.3 is a Σ/Λ statement that the flowchart is one way to describe an algorithm. — [2026 paper](https://www.minedu.gov.gr/publications/docs2026/panelladikes_2026_iounios/them_plirof_gel_260605.pdf)
- **Instruction on every paper.** Each paper's ΟΔΗΓΙΕΣ say «Κάθε απάντηση επιστημονικά τεκμηριωμένη είναι αποδεκτή» (instruction 4), every year 2019-2026. — e.g. [2025 paper](https://pmouziouras.mysch.gr/images/them_plirof_gel_250604.pdf)

**Official ψευδογλώσσα style (the guidelines' own examples)**
- **Δυαδική αναζήτηση** (2024-25 guidelines). The header is `Αλγόριθμος Δυαδική_αναζήτηση`. A `!` comment line follows, describing the inputs. Then come `Δεδομένα // N, A, S //` and ← assignments with trailing `!` comments.
  - It uses `F ← FALSE` / `TRUE` (English boolean literals), `Όσο (Left ≤ Right) και (F = FALSE) επανάλαβε`, `div`, nested `Αν … τότε … αλλιώς … Τέλος_αν`, `Τέλος_επανάληψης`, output with `Εμφάνισε "…", S, "…", Μ`, and closes with `Τέλος Δυαδική_αναζήτηση`.
  - There is no Αποτελέσματα line.
  - The guidelines then give the same algorithm as a full ΓΛΩΣΣΑ ΠΡΟΓΡΑΜΜΑ, using ΨΕΥΔΗΣ, `<-` and ΚΑΙ.
  - Source: [2024-25 guidelines](https://blogs.e-me.edu.gr/krommyda/wp-content/uploads/sites/319501/2024/10/Ύλη-και-οδηγίες-ΠΛΗΡΟΦΟΡΙΚΗ-Γ-ΓΕΛ-2024-25.pdf)
- **Selection_Sort** (same guidelines). It has `Δεδομένα // table, n //` and `Για i από 1 μέχρι n - 1 … Τέλος_επανάληψης`, swaps through a temporary `x`, and closes with `Τέλος Selection_Sort`. Again there is no Αποτελέσματα line, even though the sorted table is the output. — [same](https://blogs.e-me.edu.gr/krommyda/wp-content/uploads/sites/319501/2024/10/Ύλη-και-οδηγίες-ΠΛΗΡΟΦΟΡΙΚΗ-Γ-ΓΕΛ-2024-25.pdf)
- **ΕΠΙΛΕΞΕ ranges.** The guidelines state that ΕΠΙΛΕΞΕ with range cases (`Περίπτωση 0..100`, `Περίπτωση Αλλιώς`) is valid ΓΛΩΣΣΑ, written in sentence case with `!` comments. — [same](https://blogs.e-me.edu.gr/krommyda/wp-content/uploads/sites/319501/2024/10/Ύλη-και-οδηγίες-ΠΛΗΡΟΦΟΡΙΚΗ-Γ-ΓΕΛ-2024-25.pdf)
- **Stacks, queues, binary search.**
  - The stack and queue are always implemented with static 1-D arrays. The textbook's stack implementation is "ενδεικτική": push/pop may happen at the end of the array instead of the start, as long as only one end is used.
  - Binary search is taught iteratively only (recursion is out of scope). The maximum-iterations formula [log2(n)+1] is applied only when log2(n) is given.
  - Source: [same](https://blogs.e-me.edu.gr/krommyda/wp-content/uploads/sites/319501/2024/10/Ύλη-και-οδηγίες-ΠΛΗΡΟΦΟΡΙΚΗ-Γ-ΓΕΛ-2024-25.pdf)
- **This project's spec.** It records the textbook ch. 2.4 «Στοιχεία ψευδογλώσσας» conventions: `Αλγόριθμος <όνομα>` … `Τέλος <όνομα>`, `Δεδομένα // … //` on the second line, `Αποτελέσματα // … //` just before Τέλος, `Εμφάνισε`/`Εκτύπωσε`, `Κάλεσε` for sub-algorithms, and the textbook's sentence-case spelling (`Αν … τότε`, `Τέλος_αν`, `Όσο … επανάλαβε`, `Αρχή_επανάληψης … Μέχρις_ότου`, `Για … από … μέχρι … με_βήμα`). — local file `docs/glossa.md`, section «Αλγόριθμος (ψευδογλώσσα)» (repo spec, not a web source)

**How model answers write ψευδογλώσσα**
- The Πουκαμισάς group's 2025 answer to Β2 (flowchart → ψευδογλώσσα) has these features:
  - It is in ALL CAPS: `ΑΛΓΟΡΙΘΜΟΣ Β2`, `ΟΣΟ i<=20 ΕΠΑΝΑΛΑΒΕ`, `ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ … ΜΕΧΡΙΣ_ΟΤΟΥ Π[i]>0`, `ΕΜΦΑΝΙΣΕ`, `ΔΙΑΒΑΣΕ Π[i]`, ending `ΤΕΛΟΣ Β2`.
  - It has no declarations and no Δεδομένα/Αποτελέσματα lines.
  - It gives an alternative version using ΓΙΑ.
  - So it is ΓΛΩΣΣΑ keywords plus the ψευδογλώσσα markers: the Αλγόριθμος header, Εμφάνισε, `Τέλος <name>`, and no declarations.
  - Source: [Πουκαμισάς 2025 answers PDF](https://www.poukamisas.gr/wp-content/uploads/2025/06/apantiseis-poukamisas-plhroforikh-gel.pdf)

### Inferences
- **When to answer in ψευδογλώσσα.** For a tutor, ψευδογλώσσα is right only when the question explicitly says «αλγόριθμο», «σε ψευδογλώσσα», or converts from a flowchart or natural-language steps to an algorithm. «Πρόγραμμα», «τμήμα προγράμματος» or «σε ΓΛΩΣΣΑ» means ΓΛΩΣΣΑ with declarations, and Θέμα Γ/Δ always do.
- **Safe exam-style ψευδογλώσσα** (from the 2019 paper, the guidelines' examples and the textbook):
  - Header `Αλγόριθμος Όνομα`, then `Δεδομένα // inputs //` only if the algorithm receives data (otherwise `Διάβασε`).
  - ← for assignment, no declarations, arrays used directly as `table[i]` or `Α[i, j]`.
  - Output with `Εμφάνισε` (or `Εκτύπωσε`), and `Αποτελέσματα // … //` before `Τέλος Όνομα` when results are returned rather than printed (sub-algorithms called with `Κάλεσε`).
  - Textbook spelling, `Τέλος_αν`/`Τέλος_επανάληψης`, `!` comments.
- **Mixing is unlikely to be penalised by itself.** Writing pseudocode with uppercase ΓΛΩΣΣΑ keywords (ΑΝ…ΤΟΤΕ, ΟΣΟ…ΕΠΑΝΑΛΑΒΕ) is evidently accepted:
  - the official papers mix styles themselves (2023 Β4);
  - a major frontistirio's model answer does it (2025 Β2);
  - the papers say any scientifically justified answer is accepted.
  The real risks are elsewhere: a missing Αλγόριθμος/Τέλος frame when an algorithm is asked, declarations or ΠΡΟΓΡΑΜΜΑ/ΑΡΧΗ where a pure algorithm is expected (probably harmless but un-idiomatic), or pseudocode-only constructs such as untyped arrays with no declarations in a Θέμα Γ/Δ ΓΛΩΣΣΑ program, where declarations carry their own 2 marks.
- **Δεδομένα vs Αποτελέσματα.** The guidelines' examples omit `Αποτελέσματα` when output is through `Εμφάνισε`. A tutor should include `Αποτελέσματα // … //` only for values the algorithm hands back (as the textbook's sub-algorithms do), not for printed messages.

### Gaps
- I found no official ΚΕΕ/ministry grading instruction on whether ψευδογλώσσα written instead of ΓΛΩΣΣΑ in Θέμα Γ/Δ, or mixed syntax, loses marks. The searches returned only general grading procedure (two graders, a third if they differ by more than 12 points; [Ethnos 2023](https://www.ethnos.gr/paideia/article/261900/panellhnies2023tiprosexoynoibathmologhtesstagraptaposginetaihbathmologhshtasosgiatismegistesbathmologies)). The confidential grader instructions (οδηγίες βαθμολόγησης) for Πληροφορική were not found online.
- I did not access the textbook's ch. 2.4 text directly; the conventions above come from the 2019 paper, the guidelines' examples and the project's spec.
- I could not confirm whether a 2025-26 Γ' ΓΕΛ guideline replaced the 2024-25 one with different wording.

## 2. What official and semi-official model answers (ενδεικτικές απαντήσεις) look like

### Takeaway
I found no publicly published official ministry/ΚΕΕ model answers for Πληροφορική. The "answers" that circulate on exam day come from ΟΕΦΕ (the federation of frontistiria) and from individual frontistiria (Πουκαμισάς, Διακρότημα, Παπαδέα and others), and the media republish them. Their shape is terse:
- Σ/Λ items as a bare list;
- theory as textbook-like bullet points;
- code as complete ALL-CAPS ΓΛΩΣΣΑ programs with declarations, almost no comments and short Greek uppercase identifiers;
- an occasional "Εναλλακτικά" second solution.

Spinellis has criticised this style as long, monolithic, uncommented code with unclear names.

### Cited Findings
- **Πουκαμισάς 2025 answers** (6-page PDF titled «ΠΡΟΤΕΙΝΟΜΕΝΕΣ ΑΠΑΝΤΗΣΕΙΣ ΘΕΜΑΤΩΝ», republished as images by CNN Greece):
  - Α1 is a plain list (1 ΣΩΣΤΟ, 2 ΣΩΣΤΟ, 3 ΛΑΘΟΣ, 4 ΣΩΣΤΟ, 5 ΛΑΘΟΣ).
  - Α2 (stack push in ΓΛΩΣΣΑ) is a 6-line fragment that checks `ΤΟΡ < 10`, increments ΤΟΡ, stores the element, and otherwise prints that the stack is full.
  - Α3 (array vs list differences) gives three bullet points paraphrasing the textbook: random vs sequential access, static vs dynamic, contiguous vs non-contiguous memory.
  - Α4 names the three kinds of scope and says ΓΛΩΣΣΑ uses περιορισμένη εμβέλεια.
  - Β3 is just blank numbers with their fill-ins.
  - Θέμα Γ and Θέμα Δ are full `ΠΡΟΓΡΑΜΜΑ … ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ` listings with a ΜΕΤΑΒΛΗΤΕΣ section and no comments. The Δ function `ΣΥΝΑΡΤΗΣΗ ΒΑΘΜΟΣ(ΑΠ, ΣΑ, Ι): ΑΚΕΡΑΙΑ` is written after the main program and re-declares its array parameters.
  - Sorting is the textbook bubble sort: `ΓΙΑ Χ ΑΠΟ 2 ΜΕΧΡΙ 100`, `ΓΙΑ Ι ΑΠΟ 100 ΜΕΧΡΙ Χ ΜΕ_ΒΗΜΑ -1`, `ΑΝ Β[Ι-1] < Β[Ι]`, swapping the parallel arrays with temporaries.
  - Input validation is `ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ ΔΙΑΒΑΣΕ … ΜΕΧΡΙΣ_ΟΤΟΥ cond`.
  - Β2 shows a ΟΣΟ version and an «Εναλλακτικά με ΓΙΑ» version.
  - Sources: [Πουκαμισάς PDF](https://www.poukamisas.gr/wp-content/uploads/2025/06/apantiseis-poukamisas-plhroforikh-gel.pdf); [CNN Greece republication](https://www.cnn.gr/ellada/story/475995/panellinies-2025-aftes-einai-oi-apantiseis-stin-pliroforiki-sta-gel)
- **ΟΕΦΕ 2026.** ΟΕΦΕ published 2026 Πληροφορική answers as a PDF on oefe.gr, linked from Athens Voice, together with a commentary saying the questions were clearly worded, covered most of the syllabus and were about as hard as the previous year's. The PDF link returned 404 when fetched, so I could not see its format. — [Athens Voice 2026](https://www.athensvoice.gr/epikairotita/ellada/967857/panellinies-2026-themata-sholiasmos-kai-apadiseis-stin-pliroforiki-ton-gel/)
- **Alfavita.** Alfavita republishes frontistirio answers each year as PDFs: in 2026 «ΑΠΑΝΤΗΣΕΙΣ_ΠΛΗΡΟΦΟΡΙΚΗ», with commentary by Π. Κάππος of «Διακρότημα». — [Alfavita 2026](https://www.alfavita.gr/panellinies/518578_panellinies-2026-oi-ektimiseis-kai-apantiseis-gia-ta-themata-tis-pliroforikis); [Alfavita 2024 answers](https://www.alfavita.gr/panellinies/448955_panellinies-2024-oi-apantiseis-sta-themata-tis-pliroforikis)
- **Spinellis on the 2024 answers.** Διομήδης Σπινέλλης (ΟΠΑ) said the frontistirio answers to Θέματα Γ and Δ showed long, monolithic code with few comments and unclear variable names, and argued for modular, readable code. He also suggested asking students for unit tests (e.g. in Β3.β). — [Alfavita, Spinellis 2024](https://www.alfavita.gr/panellinies/449149_panelladikes-2024-sholia-toy-kathigiti-toy-opa-k-diomidi-spinelli-gia-ta-fetina)
- **Errors in model answers.** The Ένωση Πληροφορικών Ελλάδας (ΕΠΕ) found the 2020 Β2 model solutions (prime test) gave the wrong result for n=2, and said a corrected condition for blank (3) was released late. Model answers can therefore be wrong, and they get revised. — [ΕΠΕ commentary 2020](https://www.epe.org.gr/ola-ta-arthra/scholiasmos-ton-thematon-ton-panelladikon-exetaseon-sta-mathimata-pliroforiki-op-kai-anaptyxi-efarmogon-se-programmatistiko-periballon)
- **Mathematics practice.** Graders are told to mark a fully justified alternative solution normally even if it departs from the ενδεικτική απάντηση. This was reported for Mathematics, not Πληροφορική, so it is only an indirect parallel. — [aboutcareer 2025 (via search summary)](https://www.aboutcareer.gr/post/%CE%B2%CE%B1%CE%B8%CE%BC%CE%BF%CE%BB%CF%8C%CE%B3%CE%B7%CF%83%CE%B7-%CE%B3%CF%81%CE%B1%CF%80%CF%84%CF%8E%CE%BD-%CF%80%CE%B1%CE%BD%CE%B5%CE%BB%CE%BB%CE%B1%CE%B4%CE%B9%CE%BA%CF%8E%CE%BD-2025)

### Inferences
- **Shape to imitate.** To imitate exam-day model answers, a tutor's answer should:
  - number answers exactly as the paper does (Α1. 1. ΣΩΣΤΟ …; Β3: (1) …, (2) …);
  - keep theory to textbook-phrased bullets;
  - give Γ/Δ as one complete program (ΠΡΟΓΡΑΜΜΑ, ΜΕΤΑΒΛΗΤΕΣ by type, ΑΡΧΗ … ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ), followed by the subprograms with their own declarations;
  - use the textbook's canonical patterns: validation with ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ/ΜΕΧΡΙΣ_ΟΤΟΥ, sentinel loops with a read before ΟΣΟ and a re-read at the end, bubble sort with parallel-array swaps, sequential search with a flag/ΘΕΣΗ, max/min with ties in two passes.
- **Where a tutor can do better.** It can improve on the model answers pedagogically (brief `!` comments, labelling each part Γ2/Γ3 …) without departing from exam form. Comments are allowed ΓΛΩΣΣΑ, and the guidelines' own examples use `!` comments.
- **Possible flaws in the 2025 Πουκαμισάς Θέμα Γ answer.** These are my own reading, unverified against an official key:
  - it updates the "two best performances" from the last attempt read (ΕΠΙΔ after the loop) rather than each student's best attempt;
  - it leaves ΜΑΧ2 uninitialised.
  Same-day answers should be treated as fallible, consistent with the 2020 ΕΠΕ note.

### Gaps
- I could not confirm whether the ministry ever publishes official ενδεικτικές απαντήσεις for Πληροφορική; none were found on minedu.gov.gr in this search. The 2026 page links only the paper.
- I did not see an ΟΕΦΕ Πληροφορική answer PDF (the 2026 link was 404), so ΟΕΦΕ's own format is unverified.
- I did not compare alkisg.mysch.gr or pliroforiki.edu.gr solutions; time and tool budget ran out.

## 3. What the 2019-2026 exams asked, what was hard, and controversies

### Takeaway
The structure has been stable since 2020:
- **Θέμα Α:** 5 Σ/Λ items (10 marks) plus theory, matching and short code.
- **Θέμα Β:** loop conversions, fill-in-the-blanks, counting iterations, stack/queue pointers, OOP class hierarchies, flowcharts.
- **Θέμα Γ:** a "loop with unknown repetitions" scenario: sentinel or compound termination, validation, max/second max, percentages, tiered charges, often a small function.
- **Θέμα Δ:** names in a 1-D array plus a 2-D array [N,M], row or column statistics, max/min with ties, descending sort with an alphabetical tie-break, and a subprogram (since 2024 almost always a function that takes the 2-D array and a row number, or a search function).

Commentators most often name Θέμα Γ as the hard part (2021-2025), with Θέμα Δ "classic" but long; in 2026 opinions split.

### Cited Findings

**2019 (12 June; last «ΑΕΠΠ»-titled paper)** — [paper](https://pmouziouras.mysch.gr/images/them_plir_op_c_hmer_190612.pdf)
- **Α:**
  - Σ/Λ items: array index must be an integer; `Χ ΚΑΙ (ΟΧΙ Χ)`; string comparison "ΚΑΛΗΜΕΡΑ" > "ΚΑΛΗΣΠΕΡΑ"; hierarchical design; ΓΛΩΣΣΑ has unlimited scope.
  - Α2: four operations on data structures.
  - Α3: trace ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ output for three (Κ, Μ) pairs.
  - Α4: draw flowcharts of ΟΣΟ and ΜΕΧΡΙΣ_ΟΤΟΥ.
  - Α5: natural-language steps → ΓΛΩΣΣΑ.
- **Β:** Β1 fills blanks in a ψευδογλώσσα algorithm (third occurrence of a key). Β2: five subprogram calls, one error each; describe and correct them (function vs procedure, argument types/arity, assigning a procedure call).
- **Γ:** educational videos read until title «ΤΕΛΟΣ», visits validated ≥0. Find the title with the most visits, counts in 3 categories (1-100 / 101-1000 / >1000; 0 visits uncategorised), and the category with the most videos.
- **Δ:** Βαλκανιάδα with 40 students × 6 problems. Names into ΟΝ[40] and ΒΑΘ[40,6] initialised to 0. Repeated submissions (code, problem, score) keep the maximum and end on a «ΝΑΙ/ΟΧΙ» prompt. A subprogram ΥΣΒ called once fills the row sums ΣΒ[40] (a procedure returning an array). Names are then sorted by total descending, alphabetically on ties.

**2020 (24 June; first «Πληροφορική Προσανατολισμού» paper, «Νέο Σύστημα»)** — [paper](https://pmouziouras.mysch.gr/images/SPdownload/them_Plhrof_op_NEO_200624.pdf)
- **Α:**
  - Σ/Λ items: `ΓΙΑ i ΑΠΟ 0 ΜΕΧΡΙ 0` runs zero times (false: it runs once); logic errors in loop conditions; overflow on push; sorted arrays "must" use sequential search; prefer ΜΕΧΡΙΣ_ΟΤΟΥ when at least one iteration.
  - Α2: typical array operations, parameter-list rules, four maths functions.
  - Α3: how many pops/dequeues empty a given 6-slot stack/queue, with justification.
  - Α4: count ΓΡΑΨΕ executions of a ΟΣΟ loop for M = A+5, A-4, A+1, and give M for exactly 5.
- **Β:** Β1 converts a ΕΠΙΛΕΞΕ with mixed cases (7; 11,13; <20; 50..100; ΑΛΛΙΩΣ) into one ΑΝ…ΑΛΛΙΩΣ_ΑΝ chain. Β2: 5 blanks in a prime test (ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ … ΜΕΧΡΙΣ_ΟΤΟΥ i>n-1 Ή …).
- **Γ:** ship loading. Read the weight limit and the current load (validated < limit). Repeated ΝΑΙ/ΟΧΙ loading with a "doesn't fit" check, a tiered cost (first 500 kg at 0.5 €/kg, next 1000 at 0.3, rest at 0.1), and totals.
- **Δ:** COVID-19 testing with 20 mobile units × up to 100 samples. Π[20] names; ΑΠ[20,100] chars 'Α'/'Θ' read until «ΤΕΛΟΣ», with the rest of the row padded with 'Χ'. Region(s) with the most positives (ties). Sort descending by positives, alphabetical on ties, through a ΤΑΞΙΝΟΜΗΣΗ subprogram (Δ5).
- **Difficulty:** «Πληροφορική στο Σχολείο» called 2020 the easiest paper in years, with Δ2β (filling the row up to a point) the most confusing. — [pliroforikiatschool blog](https://pliroforikiatschool.blogspot.com/2020/06/pliroforiki-panelladikes-2020-sxoliasmos.html)
- **Controversy (ΕΠΕ):**
  - Α1 items were ambiguous or poorly grounded in the textbook.
  - Α2 should accept answers drawn from two overlapping textbook sections.
  - The Α3 stack/queue figures were generic rather than array-based.
  - The Β2 model solutions were wrong for n=2, and the corrected condition for blank (3) came late.
  - The Δ point split was unfair: Δ3 carried more marks but becomes easier once Δ4/Δ5 are solved.
  - Source: [ΕΠΕ](https://www.epe.org.gr/ola-ta-arthra/scholiasmos-ton-thematon-ton-panelladikon-exetaseon-sta-mathimata-pliroforiki-op-kai-anaptyxi-efarmogon-se-programmatistiko-periballon)

**2021 (18 June)** — [paper](https://pmouziouras.mysch.gr/images/PLHROFORIKH_NEO_HM_2021_10.pdf)
- **Α:**
  - Σ/Λ items: the compiler finds logic errors; LIFO = stack; binary search = διαίρει και βασίλευε; ΓΙΑ body runs at least once; in pure sequence each statement runs once.
  - Α2: object program, procedure/function definitions, criteria of an algorithm.
  - Α3: ΟΣΟ → ΜΕΧΡΙΣ_ΟΤΟΥ.
  - Α4: ΑΝ chain → ΕΠΙΛΕΞΕ.
  - Α5: fill bounds and steps of nested ΓΙΑ to print 1..5, 1..4, 1..3.
- **Β:** Β1 asks for a subprogram that reads 1000 positive integers (validated) and returns the count of multiples of 3 and the sum of three-digit numbers, so the student must choose a procedure. Β2: 4 blanks in queue dequeue (empty, last element resets front=rear=0).
- **Γ:** aircraft loading with a max total weight ≥5000 and volume ≥300, validated. Load boxes until one would breach either limit. Report the count and mean weight of loaded boxes, and the max box weight with how many share it.
- **Δ:** long jump, 20 athletes × 6 jumps. Names 1-D, results 2-D. Best jump overall and its jump number. Athletes with ≥2 fouls (0). Each athlete's jumps sorted descending, i.e. sort within each row. The lalibi teaching material cites this Δ as its example of sorting multi-dimensional arrays. — [lalibi presentation](https://lalibi.github.io/aepp-presentation/)

**2022 (8 June)** — [paper](https://pmouziouras.mysch.gr/images/Plhroforikh_neo_hm_2022_1.pdf)
- **Α:**
  - Σ/Λ items: black-box testing; modular programming saves writing time; sequential search is διαίρει και βασίλευε; singly linked list traversed both ways; an interpreter is slower.
  - Α2: binary tree definition plus inserting 20/15/8/40 into a given BST.
  - Α3: OOP properties and methods, and classifying 8 terms as υποκλάση/υπερκλάση/μέθοδος/ιδιότητα.
  - Α4: find 5 errors in a numbered program and classify each as syntax, runtime or logic, with justification.
- **Β:** Β1 has 5 blanks in a procedure that shifts a queue's elements to the start of array Ο[10]. Β2: flowchart of a ψευδογλώσσα fragment, then rewrite it with ΟΣΟ and no ΑΝ.
- **Γ:** e-shop with 2 products. Stocks validated > 0, prices given. Serve students until both stocks run out or unserved students exceed 20% of arrivals. Revenue. A boolean function ΥΠΑΡΧΕΙ(product, stock1, stock2).
- **Δ:** ERASMUS+ with 6 schools. ΟΝ[6]; the jury's grades go on the main diagonal of Β[6,6] and the other schools' grades off the diagonal. Mean per school. The school with the jury's top grade, read from the diagonal. Sort by mean descending, alphabetical on ties.

**2023 (8 June)** — [paper](https://pmouziouras.mysch.gr/images/ΠΛΗΡΟΦΟΡΙΚΗ_ΝΕΟ_ΗΜ_2023_1.pdf)
- **Α:**
  - Σ/Λ items: any ΟΣΟ converts to ΓΙΑ; FIFO = queue; a function returns one value; `A MOD 5` with real A is valid; lists insert only in the middle.
  - Α2: place 5 values into a BST.
  - Α3: list operations.
  - Α4: criteria of an algorithm.
- **Β:**
  - Β1: how many times ΓΙΑ runs for 3 (A, M, B) triples (2,0,-1 / 5,0,2 / -3,3,2).
  - Β2: valid superclass/subclass pairs (ΝΑΙ/ΟΧΙ).
  - Β3: stack/queue conditions «σε ψευδογλώσσα».
  - Β4: 5 blanks in a loop summing positives that stops at 100 numbers or 3 consecutive negatives (a counter reset when zero or positive).
- **Γ:** phone calls billed per started minute; the first 3 minutes at 0.06 €/min, the rest at 0.04 €/min. Read durations (validated > 0) until total charges exceed 10 € or 100 calls. Percentage of calls ≥2 €. Function ΧΡΕΩΣΗ(seconds).
- **Δ:** 10 hotels × 12 months, ΟΝ[10] and ΕΠ[10,12]. For each month, the count of hotels with >1000 visitors, or «ΚΑΝΕΝΑ ΞΕΝΟΔΟΧΕΙΟ». Hotels with the minimum annual total, with ties (9 marks, the biggest item). Sort by annual total descending, alphabetical on ties.

**2024 (6 June)** — [paper](https://pmouziouras.mysch.gr/images/them_plirof_gel_240606.pdf)
- **Α:**
  - Σ/Λ items: the compiler produces the object program; binary tree nodes have 0/1/2 subtrees; encapsulation makes internals visible; push at the top; vehicle is a subclass of car.
  - Α2: match error situations to syntax/runtime/logic (missing declaration, wrong result, division by zero, letter into an integer, name «3Α»).
  - Α3: typical array operations.
  - Α4: graph definition and graph types.
- **Β:**
  - Β1: nested ΓΙΑ (j counting down 20→1) → nested ΟΣΟ.
  - Β2: 5 blanks to fill a 4×4 array (odd rows multiples of 2, even rows multiples of 3).
  - Β3: queue front/rear values after a sequence of operations.
  - Β4: rewrite a ΔΙΑΔΙΚΑΣΙΑ as a ΣΥΝΑΡΤΗΣΗ F and rewrite the calling code.
- **Γ:** contest with 6 sections. Name plus 6 scores (validated 0-100) until «ΤΕΛΟΣ». Mean, with ΕΠΙΤΥΧΩΝ if >60. The top mean's name if unique, otherwise the count of those tied. Success percentage.
- **Δ:** 10 salespeople × 12 months, ΟΝ[10] and Π[10,12]. Monthly winner per column. First vs second semester totals, with three messages. Read a name and show its annual total, or «Ανύπαρκτος πωλητής», using a search subprogram ΑΝΑΖ(ΟΝ, name) that returns the position or 0. No sort this year.
- **Difficulty (Κάππος, Διακρότημα):** not especially hard but more demanding than the two previous years; Β4 harder than usual; Γ demanding; Δ used well-known methods. — [Alfavita 2024 estimates](https://alfavita.gr/panellinies/448961_panellinies-2024-oi-ektimiseis-gia-tin-pliroforiki)
- **Controversy (Spinellis):** Spinellis criticised Α2's terminology:
  - «λάθος» conflates a defect with a failure;
  - a missing declaration is a semantic error, not a syntax error;
  - division by zero may be a logic defect that never occurs at runtime.
  He did not ask for Α2 to be voided. — [Alfavita, Spinellis](https://www.alfavita.gr/panellinies/449149_panelladikes-2024-sholia-toy-kathigiti-toy-opa-k-diomidi-spinelli-gia-ta-fetina)

**2025 (4 June)** — [paper](https://pmouziouras.mysch.gr/images/them_plirof_gel_250604.pdf)
- **Α:**
  - Σ/Λ items: binary search is διαίρει και βασίλευε; a letter read into an integer causes abnormal termination; the interpreter produces an object program; `X ← 'α' < 'β'` is valid ΓΛΩΣΣΑ; logical operations are evaluated before arithmetic.
  - Α2: ΓΛΩΣΣΑ fragment for push onto a stack in a 10-slot array.
  - Α3: arrays vs lists.
  - Α4: kinds of variable scope, and the one ΓΛΩΣΣΑ uses.
- **Β:** Β1 builds an OOP class hierarchy (digital content: video/audio with shared and specific properties, a polymorphic «αναπαραγωγή»). Β2: flowchart → ψευδογλώσσα (9 marks). Β3: 7 blanks in a ΣΥΝΑΡΤΗΣΗ CHECK testing that a 5×5 array has the X pattern (1 on both diagonals, 0 elsewhere).
- **Γ:** shot put with a qualifying mark of 10.30 m and up to 5 attempts, stopping on qualification. Names until «ΤΕΛΟΣ». Per student: qualified, with mark and attempt count, or not. The top two performances with names (no ties assumed). Percentage qualified.
- **Δ:** quiz with 100 students × 30 questions (answers 'Α'/'Β'/'Γ', +2 per correct answer). ΣΑ[30] correct answers; ΟΝ[100]; ΑΠ[100,30] validated to Α/Β/Γ. Scores into Β[100] via a function ΒΑΘΜΟΣ(ΑΠ, ΣΑ, row). Sort descending and show the top 10 plus anyone tied with the 10th.
- **Difficulty:**
  - Πουκαμισάς (Γεωργακόπουλος): no surprises; Γ the only part likely to cause trouble; Δ classic except a more original Δ4. — [CNN Greece 2025](https://www.cnn.gr/ellada/story/480191/panellinies-2025-xoris-ekplikseis-ta-themata-stin-pliroforiki-gel)
  - Σκάι live coverage: Δ normal, without much difficulty. — [Skai 2025](https://www.skai.gr/news/greece/panelladikes-2025-deite-ta-themata-se-latinika-ximeia-kai-pliroforiki-gia-tous-mathites-to)

**2026 (5 June)** — [paper](https://www.minedu.gov.gr/publications/docs2026/panelladikes_2026_iounios/them_plirof_gel_260605.pdf)
- **Α:**
  - Σ/Λ items: definition of πληροφορία; parameters are stored on the runtime stack; a flowchart describes an algorithm; `ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 5 ΜΕ_ΒΗΜΑ 5` runs twice; black-box testing can't be applied to subprograms.
  - Α2: singly linked list, NULL, Κεφαλή.
  - Α3: definition of a data structure.
  - Α4: match MOD, ΚΑΙ, <>, *, ^ to logical/comparison/arithmetic operator.
- **Β:** Β1 completes a class hierarchy (car, motorcycle, e-bike; polymorphic Φρενάρει()). Β2: ΜΕΧΡΙΣ_ΟΤΟΥ → ΟΣΟ (5 marks). Β3: 5 blanks in a bubble sort of ΒΙΒΛΙΑ[100] holding title/author pairs. Titles sit in odd cells, so the step is 2 and both cells of each pair are swapped.
- **Γ:** 150 supermarket branches, ΑΠΟΘ[150] stocks validated > 0. Customers (branch, quantity) until branch = 0. Buy all, buy what remains, or «Δεν υπάρχει απόθεμα». The branch whose stock ran out first, or a message if none. Percentage of fully served requests.
- **Δ:** 15 AI models × 30 days of power use. ΟΝ[15]; ΚΑΤ[15,30] validated > 0. Means into ΜΟ[15] through a function ΜΕΣΟΣ(ΚΑΤ, row). Read a model name; if found, show the day with the lowest use, otherwise «Το μοντέλο ΤΝ δεν υπάρχει» (8 marks). Sort names by mean descending (means distinct).
- **Difficulty (conflicting views):**
  - Κάππος (Διακρότημα): "increased difficulty" and long; Γ hard; a trap in the Β2 conversion. — [Alfavita 2026](https://www.alfavita.gr/panellinies/518578_panellinies-2026-oi-ektimiseis-kai-apantiseis-gia-ta-themata-tis-pliroforikis)
  - ΟΕΦΕ: comparable to 2025; Β3 needs understanding of ευθεία ανταλλαγή plus creativity; Γ will separate the algorithmically strong. — [Athens Voice](https://www.athensvoice.gr/epikairotita/ellada/967857/panellinies-2026-themata-sholiasmos-kai-apadiseis-stin-pliroforiki-ton-gel/)
  - Παπαδέα frontistiria: Δ the hardest, the differentiator. — [news247](https://www.news247.gr/paideia/panellinies-2026-ta-themata-pou-epesan-stin-pliroforiki/)
  - iefimerida headline: «βατά». — [iefimerida](https://www.iefimerida.gr/panellinies/panelladikes-2026-latinika-pliroforiki-himeia-sholia)
- **Possible errors in published solutions:** a reader comment on panellinies.net claims that one set of published answers had errors in Γ and Δ. This is weak, anonymous evidence. — [panellinies.net 2026](https://www.panellinies.net/pliroforiki-aepp-2026/)

**Recurring item types (tallied from the eight papers above)**
- **Σ/Λ:** 5 items for 10 marks every year 2019-2026. Often about ΓΙΑ iteration counts, compiler vs interpreter vs object program, διαίρει και βασίλευε, LIFO/FIFO, error types.
- **Loop conversion:** 2021 (ΟΣΟ→ΜΕΧΡΙΣ_ΟΤΟΥ), 2022 (ΜΕΧΡΙΣ_ΟΤΟΥ→ΟΣΟ without ΑΝ), 2024 (nested ΓΙΑ→ΟΣΟ), 2026 (ΜΕΧΡΙΣ_ΟΤΟΥ→ΟΣΟ). ΕΠΙΛΕΞΕ↔ΑΝ in 2020 and 2021.
- **Fill-in-the-blanks code:** every year (2019 Β1, 2020 Β2, 2021 Α5/Β2, 2022 Β1, 2023 Β4, 2024 Β2, 2025 Β3, 2026 Β3).
- **Counting executions or tracing output:** 2019 Α3, 2020 Α4, 2023 Β1, 2026 Α1.4. No full πίνακας τιμών (trace table) was asked in 2019-2026 main sessions.
- **Stack/queue:** 2020 Α3, 2021 Β2, 2022 Β1, 2023 Β3, 2024 Β3, 2025 Α2.
- **OOP:** 2022 Α3, 2023 Β2, 2025 Β1, 2026 Β1. **Trees/graphs/lists:** BST 2022/2023, graph 2024, lists 2023/2025/2026.
- **Flowcharts:** 2019 Α4, 2022 Β2α, 2025 Β2. **Error classification:** 2022 Α4, 2024 Α2.
- **Θέμα Δ 2-D arrays:** ΒΑΘ[40,6], ΑΠ[20,100], [20,6], Β[6,6], ΕΠ[10,12], Π[10,12], ΑΠ[100,30], ΚΑΤ[15,30], always with a parallel names array ΟΝ.
- **Θέμα Δ sort:** 2019-2023 and 2025-2026 (not 2024). Usually descending by a computed total or mean, with an alphabetical tie-break in 2019, 2020, 2022 and 2023.
- **Θέμα Δ subprogram:** 2019 (procedure filling an array), 2020 (sort procedure), 2024 (search returning position/0), 2025 and 2026 (function taking the 2-D array plus a row index).
- **Search by name with a «δεν υπάρχει» message:** 2024 and 2026.
- **Θέμα Γ functions:** 2022 ΥΠΑΡΧΕΙ (boolean), 2023 ΧΡΕΩΣΗ.
- **Tiered charge (κλιμακωτή χρέωση):** 2020, 2023.
- **Compound termination:** 2021, 2022, 2023, 2025 (5 attempts or qualification).

### Inferences
- **Trending for 2027.** Expect a Θέμα Δ with ΟΝ[N] plus a 2-D array, input validation in Δ1, a function taking (2-D array, row index) or a search function returning position/0, a lookup by name with a not-found message, max/min with ties, and a descending sort, possibly with an alphabetical tie-break or "top K plus ties". Expect Θέμα Γ to be an unknown-length loop with a sentinel or compound stop condition, validation, percentages, max/second max, and possibly a 1-D array as in 2026.
- **Θέμα Β drill.** Loop conversions (especially ΜΕΧΡΙΣ_ΟΤΟΥ→ΟΣΟ preserving the at-least-once semantics), fill-in-the-blanks on bubble-sort variants, stack/queue pointer arithmetic, OOP hierarchies, and flowchart↔ψευδογλώσσα.
- **ψευδογλώσσα's role.** It appears roughly every other year in Θέμα Β (2019, 2022, 2023, 2025), usually as a conversion or fill-in, never as a whole Θέμα.

### Gaps
- **Επαναληπτικές.** I did not verify any επαναληπτικές session (July/September) papers for 2019-2026, nor whether such sessions were held for Πληροφορική every year.
- **2020 old system.** The «Παλαιό Σύστημα» ΑΕΠΠ paper of 2020 was not read ([PDF](https://pmouziouras.mysch.gr/images/SPdownload/them_AEPP_op_hmer_PALIO_200624.pdf)).
- **Difficulty per year.** I found no difficulty commentary for 2021-2023 beyond the papers themselves.
- **Corrections during the exams.** I found no official διευκρινίσεις issued during exam hours for 2021-2026; the only correction found is the 2020 Β2 late fix ΕΠΕ mentions. I could not verify ΕΠΕ's claim of a "late correction" independently.
- **Flowchart images.** The 2025 Β2 and 2022 Α2/2023 Α2 figures (flowchart and trees) are images that did not extract, so their exact content is unknown.
- **Εσπερινά/ΕΠΑΛ.** I did not check the εσπερινά-only or ΕΠΑΛ variants.

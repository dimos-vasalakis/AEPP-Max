# ΓΛΩΣΣΑ solution patterns and conventions expected in Πληροφορική (ΑΕΠΠ) Θέμα Γ / Θέμα Δ

Scope note. The primary sources are: (1) the official ΙΕΠ/Υπουργείο teaching directions for **2026–2027** («Οδηγίες διδασκαλίας Πληροφορικής προσανατολισμού Γ΄ τάξης ΓΕΛ για το σχολικό έτος 2026–2027»). The copy fetched sits at a URL labelled 25_26, but its heading reads 2026–2027, and the ΙΕΠ index page for 2026–27 lists it. (2) The actual Θέμα Γ/Δ papers of 2022, 2024, 2025 and 2026. (3) Teacher and φροντιστήριο solutions to those papers. **No official ΚΕΕ marking scheme (κριτήρια βαθμολόγησης) for Πληροφορική is public.** The "ενδεικτικές απαντήσεις" circulating online are written by teachers or φροντιστήρια, not by the ΚΕΕ, so marks per line are not officially documented. All ΓΛΩΣΣΑ snippets below are my own illustrations, not copied from the textbook or the exams.

Key source URLs used throughout:
- Official directions 2026–27 (PDF): https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf. The ΙΕΠ index is https://www.iep.edu.gr/yli-kai-odigies-didaskalias-genikou-lykeiou-gia-to-scholiko-etos-2026-2027/
- Exam papers: 2025 https://pmouziouras.mysch.gr/images/them_plirof_gel_250604.pdf · 2024 https://pmouziouras.mysch.gr/images/them_plirof_gel_240606.pdf · 2022 https://pmouziouras.mysch.gr/images/Plhroforikh_neo_hm_2022_1.pdf. The index of papers 2011–2025 is https://pmouziouras.mysch.gr/mathimata/aepp/panellhnies/12-aepp2011
- Teacher solutions (Π. Μουζιούρας, unofficial): https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2025.doc · …_2024.doc · …_2022.doc
- 2026 paper with φροντιστήριο indicative answers (unofficial): https://baharakis.gr/Panellinies2026/GEL07/Answers.pdf
- Διερμηνευτής της ΓΛΩΣΣΑΣ documentation (Άλκης Γεωργόπουλος): https://alkisg.mysch.gr/

---

## Q1. Pattern by pattern: expected form and common pitfalls

### Takeaway
Θέμα Γ and Δ are built from a small, very stable set of building blocks. Θέμα Γ: a sentinel-terminated loop, nested validation, counters, percentages, max/top-2 with names, early stop. Θέμα Δ: arrays with ΓΙΑ, 2D validation, a ΣΥΝΑΡΤΗΣΗ that takes arrays, sequential search with a flag, bubble sort on parallel arrays (descending, sometimes with a second key), and ties with the k-th element. The expected form of each is the textbook form. Early exit is always done with a flag or a compound loop condition, never a jump.

### Cited Findings

**How the exam is built (what keeps appearing)**
- The exam has 4 θέματα × 25 marks, in increasing difficulty — [CNN Greece 2023](https://www.cnn.gr/ellada/story/365051/panellinies-2023-pos-tha-vathmologithei-to-mathima-tis-pliroforikis); [christriantafyllou.eu study guide 2025–26](https://christriantafyllou.eu/node/34)
- **2025 Θέμα Γ.** A sentinel on the *name* ('ΤΕΛΟΣ'). For each student, up to 5 attempts, with an early stop once the limit is exceeded. Print the qualified students with their performance and number of attempts. Top-2 performances with names. Percentage qualified. The note says ≥2 qualify and there are no ties — [2025 paper](https://pmouziouras.mysch.gr/images/them_plirof_gel_250604.pdf)
- **2025 Θέμα Δ.** Answer key ΣΑ[30] read *without* validation. Names ΟΝ[100]. Answers ΑΠ[100,30], validated as 'Α'/'Β'/'Γ' (3 marks for the validation). A function ΒΑΘΜΟΣ that takes the 2D array, the 1D array and a row number. Results stored in Β[100]. Sort names+scores in descending order, then print the top 10 *plus anyone tied with the 10th* — [2025 paper](https://pmouziouras.mysch.gr/images/them_plirof_gel_250604.pdf). Commentators said the function part was the hard bit — [alfavita 2025](https://www.alfavita.gr/panellinies/479894_panellinies-2025-ektimiseis-kai-apantiseis-gia-ta-themata-tis-pliroforikis)
- **2024 Θέμα Γ.** Names with a sentinel 'ΤΕΛΟΣ'. 6 scores per candidate, validated 0..100. Average. ΕΠΙΤΥΧΩΝ/ΑΠΟΤΥΧΩΝ. Highest average: print the name if it is unique, otherwise *how many* share it. Percentage of passes — [2024 paper](https://pmouziouras.mysch.gr/images/them_plirof_gel_240606.pdf)
- **2024 Θέμα Δ.** ΟΝ[10] and Π[10,12], read with no validation. Max per *column* (month), printing the name. Sums of two half-ranges of columns compared three ways. Read a name and search for it via the subprogram ΑΝΑΖ, which returns the position or 0 — [2024 paper](https://pmouziouras.mysch.gr/images/them_plirof_gel_240606.pdf)
- **2022 Θέμα Γ.** Validation of stock > 0. A loop with two termination conditions: both stocks exhausted, *or* the unserved count exceeds 20% of arrivals so far. A function ΥΠΑΡΧΕΙ returning ΛΟΓΙΚΗ — [2022 paper](https://pmouziouras.mysch.gr/images/Plhroforikh_neo_hm_2022_1.pdf)
- **2022 Θέμα Δ.** Read the main diagonal of Β[6,6] separately from the off-diagonal cells (ΑΝ i <> j). Row averages. Max on the diagonal. Sort names by average descending, alphabetically on ties (two keys) — [2022 paper](https://pmouziouras.mysch.gr/images/Plhroforikh_neo_hm_2022_1.pdf)
- **2026 Θέμα Γ.** ΑΠΟΘ[150], validated > 0. A sentinel 0 on the branch number. Three-way stock update. The "first branch to run out" (needs a flag). Percentage of fully served customers — [2026 paper + answers](https://baharakis.gr/Panellinies2026/GEL07/Answers.pdf)
- **2026 Θέμα Δ.** ΟΝ[15] and ΚΑΤ[15,30], validated > 0. A function ΜΕΣΟΣ(table, row) whose results are stored in ΜΟ[15]. Search a name, then find the day of minimum consumption for that row. Sort names by average descending — [2026 paper + answers](https://baharakis.gr/Panellinies2026/GEL07/Answers.pdf)
- Exam papers state for each sub-question whether validation is required: «χωρίς έλεγχο εγκυρότητας», «δεν απαιτείται έλεγχος εγκυρότητας» or «ελέγχοντας ότι…». Validation carries its own marks: 2022 Γ2α gave 2 marks for two validations, and 2025 Δ2γ gave 3 marks — [2022](https://pmouziouras.mysch.gr/images/Plhroforikh_neo_hm_2022_1.pdf), [2025](https://pmouziouras.mysch.gr/images/them_plirof_gel_250604.pdf)
- Papers routinely add a «ΣΗΜΕΙΩΣΗ» that removes edge cases: «υπάρχει ένας τουλάχιστον υποψήφιος» (2024), «προκρίνονται δύο τουλάχιστον… δεν υπάρχουν μαθητές με την ίδια επίδοση» (2025), «εξυπηρετήθηκε τουλάχιστον ένας πελάτης» (2026) — [2024](https://pmouziouras.mysch.gr/images/them_plirof_gel_240606.pdf), [2025](https://pmouziouras.mysch.gr/images/them_plirof_gel_250604.pdf), [2026](https://baharakis.gr/Panellinies2026/GEL07/Answers.pdf)

**P1. Input validation (έλεγχος εγκυρότητας)**
- The textbook-style form is ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ / ΔΙΑΒΑΣΕ / ΜΕΧΡΙΣ_ΟΤΟΥ <valid condition>. A teacher's notes give the bare loop, and a variant with an ΑΝ inside that prints an error message when the value is invalid. The message is presented as optional ("Αν θέλουμε να εμφανίζουμε και μήνυμα λάθους") — [Ουγιάρογλου, ΓΕΛ Θέρμου notes, 2008 (old ΑΕΠΠ, form unchanged)](https://people.iee.ihu.gr/~stoug/papers/aepp.pdf)
- None of the published exam solutions put an error message in validation loops. All are the bare ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ…ΜΕΧΡΙΣ_ΟΤΟΥ, for scalars (2022: four separate loops for απ1, απ2, τ1, τ2), for 1D elements (2026: ΑΠΟΘ[Ι] > 0) and for 2D elements inside nested ΓΙΑ (2025: ΑΠ[i,j] = 'Α' Ή … ; 2026: ΚΑΤ[Ι,J] > 0) — [Μουζιούρας 2022](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2022.doc), [Μουζιούρας 2025](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2025.doc), [2026 answers](https://baharakis.gr/Panellinies2026/GEL07/Answers.pdf)
- The 2026 answer prints a prompt inside the validation loop before ΔΙΑΒΑΣΕ (ΓΡΑΨΕ 'Δώστε το απόθεμα του ', Ι, …). The Μουζιούρας answers print no prompts at all. So prompts are a matter of style, and leaving them out was not treated as an error by these authors — [2026 answers](https://baharakis.gr/Panellinies2026/GEL07/Answers.pdf); [Μουζιούρας 2024](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2024.doc)
- The official directions say the black-box testing material considers only invalid values *defined by the problem statement*. Empty input, or typing text where a number is expected, «δεν μπορούν να αντιμετωπιστούν στη ΓΛΩΣΣΑ». So validation means checking a range or set, never checking types — [Οδηγίες 2026–27 §38](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- Illustration (mine):
  ```
  ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ
    ΔΙΑΒΑΣΕ β
  ΜΕΧΡΙΣ_ΟΤΟΥ β >= 0 ΚΑΙ β <= 20
  ```
  Pitfalls: writing the *invalid* condition after ΜΕΧΡΙΣ_ΟΤΟΥ (it must be the condition for *exit*, i.e. the valid one); `0 <= β <= 20` (chained comparison is not ΓΛΩΣΣΑ); Ή instead of ΚΑΙ; validating a 2D cell outside the inner ΓΙΑ.

**P2. Sentinel value (τιμή φρουρός)**
- The exam sentinel is usually a *string* on the name field ('ΤΕΛΟΣ': 2024, 2025) or a number on a key field (0: 2026) — [2024](https://pmouziouras.mysch.gr/images/them_plirof_gel_240606.pdf), [2025](https://pmouziouras.mysch.gr/images/them_plirof_gel_250604.pdf), [2026](https://baharakis.gr/Panellinies2026/GEL07/Answers.pdf)
- The canonical form, used in the 2025 and 2026 answers: read once *before* ΟΣΟ, test `<> sentinel`, process, then read again as the *last* statement of the body (ΔΙΑΒΑΣΕ όνομα / ΟΣΟ όνομα <> 'ΤΕΛΟΣ' ΕΠΑΝΑΛΑΒΕ … ΔΙΑΒΑΣΕ όνομα / ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ) — [Μουζιούρας 2025](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2025.doc); [2026 answers](https://baharakis.gr/Panellinies2026/GEL07/Answers.pdf)
- The official directions name «τιμή φρουρός» or a «Θέλετε άλλη αναζήτηση; (Ν/Ο)» question as the two ways to end repeated processing — [Οδηγίες 2026–27 §24](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- **Pitfall seen in a published teacher solution.** The 2024 Θέμα Γ answer by Μουζιούρας uses ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ…ΜΕΧΡΙΣ_ΟΤΟΥ όνομα = 'ΤΕΛΟΣ' with the read *inside* the loop. As written, the sentinel name is itself processed: it reads 6 scores, is counted in πλ, is printed, and joins the max. Its own comment flags «β' τρόπος με εντολή ΟΣΟ» — [Μουζιούρας 2024](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2024.doc). See Inferences.
- Thermou notes show the same ΜΕΧΡΙΣ_ΟΤΟΥ (α=0) summing loop. It works for sums only because adding 0 is harmless — [Ουγιάρογλου 2008](https://people.iee.ihu.gr/~stoug/papers/aepp.pdf)
- Illustration (mine):
  ```
  πλ <- 0
  ΔΙΑΒΑΣΕ όνομα
  ΟΣΟ όνομα <> 'ΤΕΛΟΣ' ΕΠΑΝΑΛΑΒΕ
    πλ <- πλ + 1
    ! ... read the rest of this record and process it ...
    ΔΙΑΒΑΣΕ όνομα
  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ
  ```

**P3. Counting, summing, averages, percentages**
- Accumulators are initialised before the loop. Per-group accumulators (sum per candidate, per row) are reset *inside* the outer loop: `sum <- 0` before the inner ΓΙΑ in 2024 Γ and in 2022 Δ3 — [Μουζιούρας 2024](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2024.doc), [Μουζιούρας 2022](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2022.doc)
- Placing the reset wrongly is a named common mistake: inside the inner loop it discards earlier elements, and printing a row result inside the inner loop gives intermediate values — [Βιτωράτος, infoclass 31.07.2026](https://infoclass.gr/disdiastatoi-pinakes-methodologia-20-lymenes-askiseis/)
- Percentages are written `πλπ / πλ * 100` or `πλε*100/πλ`. The published answers do **not** guard against division by zero when the paper's ΣΗΜΕΙΩΣΗ guarantees at least one record (2024, 2025, 2026) — [Μουζιούρας 2024](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2024.doc), [Μουζιούρας 2025](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2025.doc), [2026 answers](https://baharakis.gr/Panellinies2026/GEL07/Answers.pdf)
- The official directions stress the difference between `div` and `/`, and operator precedence with parentheses. Example: `sum / 6` gives a ΠΡΑΓΜΑΤΙΚΗ average, so it must be stored in a ΠΡΑΓΜΑΤΙΚΗ variable — [Οδηγίες 2026–27 §9](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- Illustration (mine), when no "at least one" guarantee is given:
  ```
  ΑΝ πλ > 0 ΤΟΤΕ
    ΓΡΑΨΕ 'Μέσος όρος: ', σ / πλ
  ΑΛΛΙΩΣ
    ΓΡΑΨΕ 'Δεν δόθηκαν τιμές'
  ΤΕΛΟΣ_ΑΝ
  ```

**P4. Max/min with position or name; ties; top-2**
- *Arrays.* Initialise from the first element and loop from 2. Examples: `max <- Π[1,j]; ονmax <- ON[1]; ΓΙΑ i ΑΠΟ 2 ΜΕΧΡΙ 10` for max per column (2024 Δ2); `max <- B[1,1]` for the diagonal (2022 Δ4); `ΜΙΝ <- ΚΑΤ[POS,1]; ΘΜΙΝ <- 1; ΓΙΑ J ΑΠΟ 2 ΜΕΧΡΙ 30` (2026 Δ3) — [Μουζιούρας 2024](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2024.doc), [Μουζιούρας 2022](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2022.doc), [2026 answers](https://baharakis.gr/Panellinies2026/GEL07/Answers.pdf)
- A methodology article insists on initialising with a real element (Α[1,1] or Α[i,1]), "not an arbitrary number". It lists "max starting at 0 fails when all values are negative" as a common mistake. A strict `>` keeps the *first* occurrence — [infoclass 2026](https://infoclass.gr/disdiastatoi-pinakes-methodologia-20-lymenes-askiseis/)
- *Streams (sentinel loops).* Here there is no "first element" without extra code, so the published answers initialise to a value below the valid range: `max <- -1` for averages that are ≥0 (2024 Γ), `max1 <- 0` for shot-put distances (2025 Γ). The 2025 answer also initialises the name `ονmax1 <- ''` — [Μουζιούρας 2024](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2024.doc), [Μουζιούρας 2025](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2025.doc). φροντιστήριο notes (seen only as a search snippet) describe the alternative: read the first value outside the loop and use it as the initial max — [noisis-frontistirio notes (search snippet only)](https://www.noisis-frontistirio.gr/wp-content/uploads/2016/09/%CE%98%CE%B5%CF%89%CF%81%CE%AF%CE%B1-%CE%9C%CE%B5%CE%B8%CE%BF%CE%B4%CE%BF%CE%BB%CE%BF%CE%B3%CE%AF%CE%B5%CF%82.pdf)
- *Ties: "unique max, otherwise how many".* The one-pass form keeps a count: `ΑΝ μο > max ΤΟΤΕ max <- μο; ονmax <- όνομα; πλmax <- 1 ΑΛΛΙΩΣ_ΑΝ μο = max ΤΟΤΕ πλmax <- πλmax + 1`, then `ΑΝ πλmax = 1` prints the name, else the count (2024 Γ4) — [Μουζιούρας 2024](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2024.doc). The two-pass form (find max, then scan again for all equal values) is the method recommended for arrays — [infoclass 2026](https://infoclass.gr/disdiastatoi-pinakes-methodologia-20-lymenes-askiseis/)
- *Top-2 in one pass (2025 Γ4).* If the new value is greater than max1, then max1 moves down to max2 *with its name*, and max1 takes the new value. Otherwise, if it is greater than max2, only max2 is replaced — [Μουζιούρας 2025](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2025.doc)
- The official directions require the textbook example "smallest element of a 1D array" and an analogous max program, plus max/min per row *and* per column in 2D arrays — [Οδηγίες 2026–27 §22, §28](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)

**P5. Sequential search with a flag, early stop without break**
- The official directions require teaching the logical variable «done» as a «σημαία» to avoid unnecessary iterations. The flag also ensures correct behaviour when the item is absent, "so that control does not go outside the array bounds". Teachers are to show examples that violate the bounds — [Οδηγίες 2026–27 §24](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- Exam-answer form (2024 Δ5 function ΑΝΑΖ, 2026 Δ3): `θέση <- 0; i <- 1; βρέθηκε <- ΨΕΥΔΗΣ; ΟΣΟ i <= N ΚΑΙ βρέθηκε = ΨΕΥΔΗΣ ΕΠΑΝΑΛΑΒΕ ΑΝ Α[i] = x ΤΟΤΕ θέση <- i; βρέθηκε <- ΑΛΗΘΗΣ ΑΛΛΙΩΣ i <- i + 1 ΤΕΛΟΣ_ΑΝ`. The function then returns θέση, which is 0 if not found — [Μουζιούρας 2024](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2024.doc), [2026 answers](https://baharakis.gr/Panellinies2026/GEL07/Answers.pdf)
- **Out-of-bounds pitfall with ΚΑΙ.** The Διερμηνευτής help explains the problem with `ι <= 10 ΚΑΙ Α[ι] <> 0`: when ι reaches 11, Α[11] is evaluated and the program stops with a runtime error. The textbook ΓΛΩΣΣΑ does not define short-circuit evaluation, and the interpreter has an option «Να γίνεται πλήρης αποτίμηση των λογικών εκφράσεων» — [alkisg Βοήθεια](https://alkisg.mysch.gr/%CE%92%CE%BF%CE%AE%CE%B8%CE%B5%CE%B9%CE%B1/)
- The 2025 Θέμα Δ4 teacher answer prints "everyone tied with the 10th" with `ΟΣΟ i <= 100 ΚΑΙ B[i] >= B[10] ΕΠΑΝΑΛΑΒΕ`. Under full evaluation this reads B[101] if all 100 students tie or beat the 10th — [Μουζιούρας 2025](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2025.doc). See Inferences for the safe alternative.
- Illustration (mine), the safe "ties with the 10th" pattern after a descending sort:
  ```
  ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 10
    ΓΡΑΨΕ ΟΝ[i]
  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ
  i <- 11
  τέλος <- ΨΕΥΔΗΣ
  ΟΣΟ i <= 100 ΚΑΙ τέλος = ΨΕΥΔΗΣ ΕΠΑΝΑΛΑΒΕ
    ΑΝ Β[i] = Β[10] ΤΟΤΕ
      ΓΡΑΨΕ ΟΝ[i]
      i <- i + 1
    ΑΛΛΙΩΣ
      τέλος <- ΑΛΗΘΗΣ
    ΤΕΛΟΣ_ΑΝ
  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ
  ```
- An early stop inside a counted process is expressed with a compound exit condition and a manual counter, not ΓΙΑ. In 2025 Γ the answer is `i <- 0; ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ ΔΙΑΒΑΣΕ επίδοση; i <- i + 1 ΜΕΧΡΙΣ_ΟΤΟΥ επίδοση >= 10.30 Ή i = 5`, and then uses i as the number of attempts. The 2022 Γ loop ends on `(απ1 = 0 ΚΑΙ απ2 = 0) Ή πλδε > 0.2*πλ` — [Μουζιούρας 2025](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2025.doc), [Μουζιούρας 2022](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2022.doc)
- "First event" (2026 Γ4, the first branch to run out) is a flag that latches: `ΑΝ ΑΠΟΘ[ΥΠΟΚ] = 0 ΚΑΙ FLAG = ΨΕΥΔΗΣ ΤΟΤΕ ΚΑΤΑΣΤΗΜΑ <- ΥΠΟΚ; FLAG <- ΑΛΗΘΗΣ`, then after the loop `ΑΝ FLAG … ΑΛΛΙΩΣ` prints the "none" message — [2026 answers](https://baharakis.gr/Panellinies2026/GEL07/Answers.pdf)

**P6. Binary search**
- It is taught *as an exercise* (book 3.6, connected to «Διαίρει και Βασίλευε»), applies only to sorted arrays, and is **iterative only**: recursion is outside the syllabus. The max-iterations formula log2(n)+1 is not proven, and log2(n) "must always be given" when used — [Οδηγίες 2026–27 §19, §24](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- Official program shape: `Left <- 1; Right <- N; f <- ΨΕΥΔΗΣ; ΟΣΟ (Left <= Right) ΚΑΙ (f = ΨΕΥΔΗΣ) ΕΠΑΝΑΛΑΒΕ M <- (Left + Right) div 2; ΑΝ A[M] = S ΤΟΤΕ f <- ΑΛΗΘΗΣ ΑΛΛΙΩΣ ΑΝ A[M] < S ΤΟΤΕ Left <- M + 1 ΑΛΛΙΩΣ Right <- M - 1 …`. After the loop, M is the position if f is true. The array is assumed ascending — [Οδηγίες 2026–27 §24](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- Pitfalls: using `/` instead of `div` for M (gives a real index); forgetting ±1, which makes an infinite loop; applying it to unsorted data; for a descending array, the `<` must flip.

**P7. Sorting: bubble sort (ευθεία ανταλλαγή) and selection sort**
- The syllabus sort is «ταξινόμηση ευθείας ανταλλαγής» (book 3.7). Others, e.g. selection sort, are given as exercises where the algorithm is described and implementation is asked. «Ιδιαίτερη προσοχή» is required for sorting parallel arrays (Ονόματα–Βαθμολογίες). Sorting 2D arrays by row and by column is also listed — [Οδηγίες 2026–27 §25, §28](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- The exam-answer bubble sort form is identical in 2022, 2025 and 2026: `ΓΙΑ i ΑΠΟ 2 ΜΕΧΡΙ N` / `ΓΙΑ j ΑΠΟ N ΜΕΧΡΙ i ΜΕ_ΒΗΜΑ -1` / `ΑΝ Κ[j-1] < Κ[j] ΤΟΤΕ` (descending). Inside, swap the key with a temp of the key's type and the parallel name array with a ΧΑΡΑΚΤΗΡΕΣ temp — [Μουζιούρας 2022](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2022.doc), [Μουζιούρας 2025](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2025.doc), [2026 answers](https://baharakis.gr/Panellinies2026/GEL07/Answers.pdf)
- *Two keys (2022 Δ5: average descending, names alphabetical on ties).* `ΑΝ MO[j-1] < MO[j] ΤΟΤΕ` swaps both arrays; `ΑΛΛΙΩΣ_ΑΝ MO[j-1] = MO[j] ΤΟΤΕ ΑΝ ON[j-1] > ON[j] ΤΟΤΕ` swaps the names only. Strings compare alphabetically with > and < — [Μουζιούρας 2022](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2022.doc)
- *Selection sort*, official exercise form: `ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ n-1: k <- i; x <- A[i]; ΓΙΑ j ΑΠΟ i+1 ΜΕΧΡΙ n: ΑΝ x > A[j] ΤΟΤΕ k <- j; x <- A[j]` …, then `A[k] <- A[i]; A[i] <- x` — [Οδηγίες 2026–27 §25](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- The directions add that in an array, sorting rearranges the *contents* of the nodes, not the nodes themselves — [Οδηγίες 2026–27 §20–21](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- Pitfalls (illustrative): swapping only the key and not the parallel array; one temp variable for different types (a real key and a ΧΑΡΑΚΤΗΡΕΣ name); wrong bounds (j from N down to i, comparing j-1 and j); a step written `ΜΕ ΒΗΜΑ` instead of `ΜΕ_ΒΗΜΑ` (one published answer has this typo — [Μουζιούρας 2025](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2025.doc)).

**P8. 2D arrays**
- Official scope: max/min, search, sorting per row *and* per column; copying 2D↔1D; reading or writing by row or by column as needed; what each dimension means. 3D arrays get only a brief mention — [Οδηγίες 2026–27 §28](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- Method: the outer loop picks the group (i for per-row, j for per-column). Initialise per-group accumulators inside the outer loop. Main diagonal i=j (Α[i,i]); secondary diagonal i+j=N+1 (Α[i,N+1−i]). In an odd-order matrix the centre is shared and must be counted once. For symmetric checks, test only j>i — [infoclass 2026](https://infoclass.gr/disdiastatoi-pinakes-methodologia-20-lymenes-askiseis/)
- Exam variants: max per *column* with the row's name (2024 Δ2); reading the diagonal first, then the other cells with `ΑΝ i <> j ΤΟΤΕ ΔΙΑΒΑΣΕ B[i,j]` (2022 Δ2); sums over column sub-ranges (ΓΙΑ j ΑΠΟ 1 ΜΕΧΡΙ 6 / ΑΠΟ 7 ΜΕΧΡΙ 12, 2024 Δ3); a row passed to a function by its index (2025 Δ5, 2026 Δ5) — [Μουζιούρας 2024](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2024.doc), [Μουζιούρας 2022](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2022.doc)
- Illustration (mine): column maximum with the row's name
  ```
  ΓΙΑ j ΑΠΟ 1 ΜΕΧΡΙ 12
    μ <- Π[1, j]
    θ <- 1
    ΓΙΑ i ΑΠΟ 2 ΜΕΧΡΙ 10
      ΑΝ Π[i, j] > μ ΤΟΤΕ
        μ <- Π[i, j]
        θ <- i
      ΤΕΛΟΣ_ΑΝ
    ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ
    ΓΡΑΨΕ j, ' ', ΟΝ[θ]
  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ
  ```

**P9. Merging (συγχώνευση)**
- The official directions list «η συγχώνευση μονοδιάστατων πινάκων» among the typical 1D array processes to teach — [Οδηγίες 2026–27 §22](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf). It did not appear in Θέμα Γ/Δ of 2022/2024/2025/2026 (papers above).
- Illustration (mine), merging two ascending arrays into Γ[N+M]:
  ```
  i <- 1
  j <- 1
  κ <- 0
  ΟΣΟ i <= N ΚΑΙ j <= M ΕΠΑΝΑΛΑΒΕ
    κ <- κ + 1
    ΑΝ Α[i] <= Β[j] ΤΟΤΕ
      Γ[κ] <- Α[i]
      i <- i + 1
    ΑΛΛΙΩΣ
      Γ[κ] <- Β[j]
      j <- j + 1
    ΤΕΛΟΣ_ΑΝ
  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ
  ! copy whatever remains of Α, then of Β
  ΓΙΑ μ ΑΠΟ i ΜΕΧΡΙ N
    κ <- κ + 1
    Γ[κ] <- Α[μ]
  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ
  ΓΙΑ μ ΑΠΟ j ΜΕΧΡΙ M
    κ <- κ + 1
    Γ[κ] <- Β[μ]
  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ
  ```
  (A ΓΙΑ whose start is greater than its end runs zero times, so no ΑΝ is needed around the tails.)

**P10. Stacks and queues with arrays**
- Official: in ΓΛΩΣΣΑ stack and queue are *static* structures, implemented with 1D arrays. The book's stack implementation is «ενδεικτική». Push and pop may happen at the end of the array instead of the start; what matters is that processing happens at **one end only**. For queues, «αρκεί» the *linear* implementation. «Ολίσθηση» (shift) is taught for when the problem asks to reuse freed front positions. Without a shift, the queue counts as full when its last position is occupied — [Οδηγίες 2026–27 §30, §31](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- Teacher stack pattern: `ΑΝ top < N ΤΟΤΕ top <- top + 1; στοίβα[top] <- x ΑΛΛΙΩΣ ΓΡΑΨΕ` overflow. Pop: `ΑΝ top > 0 ΤΟΤΕ x <- στοίβα[top]; top <- top - 1 ΑΛΛΙΩΣ` underflow. top starts at 0 — [Κατηφόρης, stack/queue notes](https://pkatiforis.mysch.gr/aespp/theoria/th_53_stoiba_oura.pdf)
- Teacher queue pattern with front/rear starting at 0. Insert: if rear = N, full; else if front = 0 and rear = 0, set both to 1; else rear+1; then store. Remove: if both are 0, empty; else if front = rear, take the item and reset both to 0; else take the item and front+1 — [Κατηφόρης](https://pkatiforis.mysch.gr/aespp/theoria/th_53_stoiba_oura.pdf)
- The official directions include a full menu-driven bank-queue program (exercise Ε.4: insert customer, serve from cashier, print totals) as an indicative solution — [Οδηγίες 2026–27 §31](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)

**P11. ΣΥΝΑΡΤΗΣΗ vs ΔΙΑΔΙΚΑΣΙΑ**
- Official: «οι συναρτήσεις δεν μπορούν να έχουν εντολές εισόδου-εξόδου και ως εκ τούτου δε δύναται να πραγματοποιηθεί κλήση διαδικασίας από συνάρτηση». Teaching should show the same example done once with a procedure and once with a function — [Οδηγίες 2026–27 §34–35](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- A function's type is declared after its parameter list (ΑΚΕΡΑΙΑ/ΠΡΑΓΜΑΤΙΚΗ/ΧΑΡΑΚΤΗΡΑΣ/ΛΟΓΙΚΗ). It must contain `Όνομα <- τιμή`, or the Διερμηνευτής gives a runtime error. **Functions may not return arrays.** Any value can be passed, arrays included — [alkisg Συναρτήσεις](https://alkisg.mysch.gr/%CE%93%CE%9B%CE%A9%CE%A3%CE%A3%CE%91/%CE%A3%CF%85%CE%BD%CE%B1%CF%81%CF%84%CE%AE%CF%83%CE%B5%CE%B9%CF%82/)
- Parameter passing: functions take values. Procedures use copy-in/copy-out (textbook p.218), so changed parameters return only at ΤΕΛΟΣ_ΔΙΑΔΙΚΑΣΙΑΣ, and only when a *variable* was passed (an expression such as `(α)` or `α+0` passes a value only). Variable arguments must match the parameter type exactly. Aliasing (`Αύξηση(α, α)`) should be avoided — [alkisg Μεταβίβαση παραμέτρων](https://alkisg.mysch.gr/%CE%93%CE%9B%CE%A9%CE%A3%CE%A3%CE%91/%CE%9C%CE%B5%CF%84%CE%B1%CE%B2%CE%AF%CE%B2%CE%B1%CF%83%CE%B7_%CF%80%CE%B1%CF%81%CE%B1%CE%BC%CE%AD%CF%84%CF%81%CF%89%CE%BD/)
- Subprograms have their own declarations. Main-program variables «δεν υφίστανται στο υποπρόγραμμα και ανάποδα», and communication is only through parameters. Procedures are called with ΚΑΛΕΣΕ, functions by name inside an expression — [Ουγιάρογλου 2008](https://people.iee.ihu.gr/~stoug/papers/aepp.pdf)
- Exam-answer form: the parameters, *including arrays with their full dimensions*, are redeclared in the function's ΜΕΤΑΒΛΗΤΕΣ along with its locals. Example: `ΣΥΝΑΡΤΗΣΗ ΒΑΘΜΟΣ(ΑΠ, ΣΑ, γρ): ΑΚΕΡΑΙΑ / ΜΕΤΑΒΛΗΤΕΣ / ΑΚΕΡΑΙΕΣ: ΣΒ, j, γρ / ΧΑΡΑΚΤΗΡΕΣ: ΑΠ[100,30], ΣΑ[30]`; a local accumulator, with the result assigned to the name at the end. It is called as `B[i] <- ΒΑΘΜΟΣ(ΑΠ, ΣΑ, i)` inside ΓΙΑ — [Μουζιούρας 2025](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2025.doc); same shape in 2026 ΜΕΣΟΣ(ΚΑΤ, Ι): ΠΡΑΓΜΑΤΙΚΗ — [2026 answers](https://baharakis.gr/Panellinies2026/GEL07/Answers.pdf)
- When the paper says only «υποπρόγραμμα» that "returns" a position (2024 Δ5 ΑΝΑΖ), the published answer chose a ΣΥΝΑΡΤΗΣΗ: one result, no I/O — [2024 paper](https://pmouziouras.mysch.gr/images/them_plirof_gel_240606.pdf), [Μουζιούρας 2024](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2024.doc)
- A ΛΟΓΙΚΗ function can assign a comparison directly (`ΥΠΑΡΧΕΙ <- απ1 > 0`), and the caller can write `ΑΝ ΥΠΑΡΧΕΙ(απ, απ1, απ2) ΤΟΤΕ`. The solution author offers both as alternatives to the explicit ΑΝ…ΑΛΗΘΗΣ/ΨΕΥΔΗΣ form — [Μουζιούρας 2022](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2022.doc)
- Common mistakes: a different number, type or order of parameters between definition and call; forgetting to update the variables a procedure should change; returning the wrong value or not using the returned value — [Ζήτης, csc.gr 31.10.2025](https://csc.gr/articles/ypoprogrammata-stin-aepp-diadikasies-kai-synartiseis-me-apla-paradeigmata/)

**P12. ΓΙΑ vs ΟΣΟ vs ΜΕΧΡΙΣ_ΟΤΟΥ**
- ΓΙΑ when the number of iterations is known in advance. If ΜΕ_ΒΗΜΑ is omitted, the step is 1. A real ΑΠΟ or ΜΕ_ΒΗΜΑ is not allowed with an integer counter. After `ΓΙΑ i ΑΠΟ 1 ΜΕΧΡΙ 10` the counter is 11 (textbook and Διερμηνευτής; Pascal would give 10) — [alkisg ΓΙΑ](https://alkisg.mysch.gr/%CE%93%CE%9B%CE%A9%CE%A3%CE%A3%CE%91/%CE%93%CE%99%CE%91/)
- Official: emphasise negative, positive and zero steps. «όταν το βήμα είναι μηδέν, σε κάθε περίπτωση, ο βρόχος εκτελείται άπειρες φορές». Nested-loop rules and conversions between the three loops are taught explicitly (§17) — [Οδηγίες 2026–27 §14, §17](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- Official: ΜΕΧΡΙΣ_ΟΤΟΥ is taught in the Γ' book form (ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ … ΜΕΧΡΙΣ_ΟΤΟΥ). **In answers, the Β' ΓΕΛ form (Επανάλαβε … Μέχρις_ότου) is also accepted** — [Οδηγίες 2026–27 §13](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- The changing counter must not be altered inside ΓΙΑ: «Δεν επιτρέπεται μέσα στον βρόχο να υπάρχει εντολή που να αλλάζει την τιμή του μετρητή» — [Ουγιάρογλου 2008](https://people.iee.ihu.gr/~stoug/papers/aepp.pdf)
- Usage in the exam answers: ΓΙΑ for fixed counts (6 scores, 30 answers, array traversals, sorting); ΟΣΟ for sentinels and searches with a flag; ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ for validation and for "at least once" processes with compound exits (2022 Γ3, 2025 Γ2) — answers cited above.
- The "continue while true" (ΟΣΟ) vs "continue until true" (ΜΕΧΡΙΣ_ΟΤΟΥ) confusion is a classic error. Suggested check: write down the initial value, the update and the stop point, then trace a small example — [Ζήτης, csc.gr 01.11.2025](https://csc.gr/articles/synthikes-sti-glossa-gia-aepp-pos-na-apofeygeis-ta-klasika-lathi-1/)

### Inferences
- **Sentinel processed by mistake.** The ΜΕΧΡΙΣ_ΟΤΟΥ-with-read-inside sentinel pattern (2024 Μουζιούρας) processes the sentinel record. Under the usual reading of «η επαναληπτική διαδικασία να τερματίζεται όταν δοθεί… η λέξη ΤΕΛΟΣ», that is a logic error a marker could penalise. The ΟΣΟ read-before/read-at-end form (2025, 2026 answers) avoids it. An AI tutor should recommend the ΟΣΟ form and flag the other.
- **Do not count on short-circuit ΚΑΙ.** Because the textbook does not define it and the official directions explicitly motivate the flag as the way to avoid out-of-bounds access, a safe answer never relies on short-circuit ΚΑΙ to protect an array index. Use a flag, or keep the index test separate. Conditions like `ΟΣΟ i <= 100 ΚΑΙ B[i] >= B[10]` are a latent bug, even though a published teacher answer uses one. Whether markers penalise it is not documented.
- **Validation messages are optional.** Exam answers never include error messages in validation loops, and the papers never ask for one. A message is harmless but not required. Mark-bearing validation is whatever the sub-question names, and only that.
- **The "at least one" note.** The ΣΗΜΕΙΩΣΗ «τουλάχιστον ένας» is what lets answers skip the division-by-zero guard. When it is absent, a full-marks answer should guard (ΑΝ πλ > 0) and print a message.
- **Initial values for max/min.** Initialise from the first element for arrays. In stream loops, use a value outside the valid range only when the statement bounds the range (e.g. averages ≥ 0, so −1 works). Otherwise read the first record outside the loop.
- **Counted loops with early stop.** When the problem needs "up to K attempts, stop early, report how many", use a manual counter with ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ or ΟΣΟ, never a ΓΙΑ that would need altering or exiting.
- **Boundary wording.** «ξεπεράσει το όριο» literally means >, yet the 2025 answer used >= 10.30. Boundary wording is a recurring place where answers diverge. The tutor should make students justify the choice (the 2025 note on unique performances does not resolve it).

### Gaps
- No official ΚΕΕ marking criteria (per-line mark deductions) for Πληροφορική could be found. All "full-marks form" claims rest on the papers' sub-question mark splits and on teacher/φροντιστήριο solutions, not on an official rubric.
- No source found that states explicitly whether markers deduct marks for relying on short-circuit ΚΑΙ, for processing the sentinel record, or for missing prompts (ΓΡΑΨΕ before ΔΙΑΒΑΣΕ).
- The alternative ΕΠΙΛΕΞΕ syntax the 2026–27 directions declare valid was an image that didn't survive text extraction. Only the note «όπου <τιμή>: ακέραια μεταβλητή» was readable — [Οδηγίες §11](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf). It needs checking against the PDF.
- Merging, binary search, selection sort and stack/queue code did not appear in the 2022–2026 Θέμα Γ/Δ papers reviewed. The 2023 and 2021 papers were not reviewed.

---

## Q2. Constructs that are not allowed or that lose marks

### Takeaway
ΓΛΩΣΣΑ answers must stay within the textbook language. That means no jumps or early exits, no I/O or procedure calls in functions, no globals (parameters only), no arrays returned from functions, no changing the ΓΙΑ counter in the body, no ΜΕ_ΒΗΜΑ 0, no recursion for binary search, and no string or utility functions beyond the eight built-ins. Several "programming hygiene" rules (exact equality of reals, using the ΓΙΑ counter after the loop) are **not** treated as errors in exam answers, though some teachers advise avoiding them.

### Cited Findings
- **No goto, break or exit.** Structured programming and the drawbacks of «Goto» are taught explicitly. Early termination is done through loop conditions and a flag («done»/«σημαία») — [Οδηγίες 2026–27 §5, §24](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- **No I/O in functions, and functions may not call procedures** — [Οδηγίες 2026–27 §34](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- **Functions may not return arrays. The function name must be assigned**, or there is a runtime error in the Διερμηνευτής — [alkisg Συναρτήσεις](https://alkisg.mysch.gr/%CE%93%CE%9B%CE%A9%CE%A3%CE%A3%CE%91/%CE%A3%CF%85%CE%BD%CE%B1%CF%81%CF%84%CE%AE%CF%83%CE%B5%CE%B9%CF%82/)
- **No global variables.** Subprograms see only their parameters and their own declarations — [Ουγιάρογλου 2008](https://people.iee.ihu.gr/~stoug/papers/aepp.pdf)
- **Do not change the ΓΙΑ counter inside the loop** — [Ουγιάρογλου 2008](https://people.iee.ihu.gr/~stoug/papers/aepp.pdf)
- **ΜΕ_ΒΗΜΑ 0** makes the loop run forever «σε κάθε περίπτωση» (official position) — [Οδηγίες 2026–27 §14](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- **ΓΙΑ counter after the loop.** It holds final+step (11 after 1..10) per the textbook and the Διερμηνευτής, so it *is* defined in ΓΛΩΣΣΑ — [alkisg ΓΙΑ](https://alkisg.mysch.gr/%CE%93%CE%9B%CE%A9%CE%A3%CE%A3%CE%91/%CE%93%CE%99%CE%91/)
- **A real ΑΠΟ or ΜΕ_ΒΗΜΑ with an integer counter is not allowed** — [alkisg ΓΙΑ](https://alkisg.mysch.gr/%CE%93%CE%9B%CE%A9%CE%A3%CE%A3%CE%91/%CE%93%CE%99%CE%91/)
- **Recursion is outside the syllabus** (binary search is iterative only) — [Οδηγίες 2026–27 §19](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- **Built-in functions are only** ΗΜ, ΣΥΝ, ΕΦ, Τ_Ρ, ΛΟΓ, Ε, Α_Μ, Α_Τ — [school ebook ch. 7](https://ebooks.edu.gr/ebooks/v/html/8547/2718/Pliroforiki_G-Lykeiou_html-empl/index7_1.html). The directions clarify that ΗΜ/ΣΥΝ/ΕΦ take degrees, that Α_Μ(χ) is the mathematical floor (Α_Μ(χ) ≤ χ < Α_Μ(χ)+1), and that Α_Τ returns an integer for an integer argument and a real for a real one — [Οδηγίες 2026–27 §9](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- **Types are fixed.** The four types are ΑΚΕΡΑΙΑ, ΠΡΑΓΜΑΤΙΚΗ, ΧΑΡΑΚΤΗΡΑΣ, ΛΟΓΙΚΗ. A variable's type cannot change, and an assignment's variable and expression must be type-compatible — [school ebook ch. 7](https://ebooks.edu.gr/ebooks/v/html/8547/2718/Pliroforiki_G-Lykeiou_html-empl/index7_1.html)
- **Arrays must be declared with their size before use** (static structures, declared in the declarations section) — [Οδηγίες 2026–27 §21](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- **Out-of-bounds indices** are a named logic error to demonstrate. The official text treats bounds violation as something the flag pattern exists to prevent — [Οδηγίες 2026–27 §24](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf). Swapping dimensions in 2D arrays is a common mistake that produces invalid indices — [infoclass 2026](https://infoclass.gr/disdiastatoi-pinakes-methodologia-20-lymenes-askiseis/)
- **Uninitialised variables.** The Διερμηνευτής treats them as empty and reports «Μη αρχικοποιημένη μεταβλητή» — [alkisg Βοήθεια](https://alkisg.mysch.gr/%CE%92%CE%BF%CE%AE%CE%B8%CE%B5%CE%B9%CE%B1/)
- **Comparing reals.** The Διερμηνευτής compares reals to 8 significant decimals (configurable), because reals «δεν έχουν άπειρη ακρίβεια» (10/3*3 may not equal 10) — [alkisg Βοήθεια](https://alkisg.mysch.gr/%CE%92%CE%BF%CE%AE%CE%B8%CE%B5%CE%B9%CE%B1/). The official directions warn that with real inputs, black-box interval endpoints depend on the desired precision — [Οδηγίες 2026–27 §38](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf). Yet published exam answers compare real averages with `=` for ties (2024 Γ4 `μο = max`; 2022 Δ5 `MO[j-1] = MO[j]`) — [Μουζιούρας 2024](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2024.doc), [Μουζιούρας 2022](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2022.doc)
- **Chained or wrong comparisons, wrong ΚΑΙ/Ή, missing parentheses** are classic condition errors. The directions also ask for attention to the precedence of comparison and logical operators and for using parentheses — [csc.gr conditions](https://csc.gr/articles/synthikes-sti-glossa-gia-aepp-pos-na-apofeygeis-ta-klasika-lathi-1/); [Οδηγίες 2026–27 §11](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- **Out of scope in ΓΛΩΣΣΑ:** dynamic structures (lists, trees, graphs are theory only), and type-mismatch or empty-input handling — [Οδηγίες 2026–27 §21, §38](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)

### Inferences
- **Comparing reals with =.** "Never compare reals for equality" is a general programming warning, not an exam rule. Exam answers do it for ties without comment. An AI tutor should not mark `=` on reals as an error in exam-style code. At most it can mention precision as a side note.
- **The ΓΙΑ counter after the loop.** Its value is defined (final+step), so using it is not a syntax error. But no exam answer reviewed relies on it. Where a count is needed after an early stop, answers use a manual counter. Recommending "don't rely on it" is safe style, though I found no official prohibition.
- **No string functions.** ΓΛΩΣΣΑ has no length, substring or upper-case functions, so any string handling must use whole-string comparison (=, <>, <, > for alphabetical order) only. This follows from the closed list of eight built-ins.
- **Reading a whole array.** ΔΙΑΒΑΣΕ of a whole array without a loop, or reading a 2D array with one index, has no basis in the textbook syntax. Every exam answer reads arrays element by element inside ΓΙΑ.
- **Β' ΓΕΛ loop form.** Since Επανάλαβε…Μέχρις_ότου is officially acceptable in answers, a strict-fidelity interpreter faces a design question: should it accept that form or reject it? The project's own policy (follow the Διερμηνευτής) has to decide this.

### Gaps
- I found no source confirming whether main-program ΣΤΑΘΕΡΕΣ are visible inside subprograms. This is also a Verify item in the project's own docs/glossa.md.
- I found no explicit official or teacher statement that using the ΓΙΑ counter after the loop loses marks.
- I found no explicit statement about ΓΡΑΨΕ inside procedures. It is allowed (only functions are barred from I/O), but whether markers prefer I/O to stay in the main program is undocumented.

---

## Q3. Official ΓΛΩΣΣΑ conventions: declarations, naming, comments, output

### Takeaway
A program is ΠΡΟΓΡΑΜΜΑ name → optional ΣΤΑΘΕΡΕΣ → mandatory ΜΕΤΑΒΛΗΤΕΣ (all variables typed, arrays with sizes) → ΑΡΧΗ … ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ → subprograms after it. Comments start with !, continuation lines start with &, and single or double quotes are both accepted. «Κατάλληλο τμήμα δηλώσεων» is worth 1–2 marks in every Θέμα Γ/Δ. Output format is not graded beyond showing the right values: answers print bare values or short labels.

### Cited Findings
- **Structure:** ΠΡΟΓΡΑΜΜΑ + name (naming rules apply); constants section (optional, only if constants exist); variables section (mandatory, every variable and its type); body between ΑΡΧΗ and ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ; subprograms after ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ — [school ebook ch. 7](https://ebooks.edu.gr/ebooks/v/html/8547/2718/Pliroforiki_G-Lykeiou_html-empl/index7_1.html)
- **Naming:** Greek or Latin letters, digits and underscore, starting with a letter; reserved words are forbidden (examples of invalid names: 100Α, Κόστος$) — [school ebook ch. 7](https://ebooks.edu.gr/ebooks/v/html/8547/2718/Pliroforiki_G-Lykeiou_html-empl/index7_1.html)
- **Comments and continuation:** a line starting with `!` is a comment, a continuation line starts with `&`, and otherwise there is one statement per line — [school ebook ch. 7](https://ebooks.edu.gr/ebooks/v/html/8547/2718/Pliroforiki_G-Lykeiou_html-empl/index7_1.html). Exam answers use `!Δ1`, `!Γ3` comments to label which sub-question each block answers, and `&` to wrap long ΓΡΑΨΕ strings — [Μουζιούρας 2024](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2024.doc), [2026 answers](https://baharakis.gr/Panellinies2026/GEL07/Answers.pdf)
- **Quotes:** «Είναι αποδεκτή η χρήση είτε μονών είτε διπλών εισαγωγικών» (official) — [Οδηγίες 2026–27 §10](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- **Language of answers:** students write solutions in ΓΛΩΣΣΑ unless the statement asks for another representation (e.g. ψευδογλώσσα or a flowchart) — [Οδηγίες 2026–27 §III](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf). Every Θέμα Γ/Δ reviewed says «Να κατασκευάσετε πρόγραμμα σε ΓΛΩΣΣΑ» — [2022](https://pmouziouras.mysch.gr/images/Plhroforikh_neo_hm_2022_1.pdf), [2024](https://pmouziouras.mysch.gr/images/them_plirof_gel_240606.pdf), [2025](https://pmouziouras.mysch.gr/images/them_plirof_gel_250604.pdf), [2026](https://baharakis.gr/Panellinies2026/GEL07/Answers.pdf)
- **Declarations are marked:** Γ1/Δ1 «κατάλληλο τμήμα δηλώσεων» = 2 marks (2022, 2024, 2025), or 1 mark (2026 Δ1α) — papers above.
- **Exam-answer declaration style:** variables grouped by type (ΑΚΕΡΑΙΕΣ / ΠΡΑΓΜΑΤΙΚΕΣ / ΧΑΡΑΚΤΗΡΕΣ / ΛΟΓΙΚΕΣ), arrays declared with the exact sizes the paper gives (ΣΑ[30], ΑΠ[100,30]), swap temps declared per type (temp for numbers, temp2 for names), and averages and percentages declared ΠΡΑΓΜΑΤΙΚΕΣ — [Μουζιούρας 2025](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2025.doc), [2026 answers](https://baharakis.gr/Panellinies2026/GEL07/Answers.pdf)
- **Array names must match the paper.** Papers name arrays and sizes explicitly (ΟΝ[100], Β[100], ΚΑΤ[15,30]) and award marks for storing in them, e.g. «να το καταχωρίζει στον πίνακα ON[100] (μονάδα 1)» — [2025 paper](https://pmouziouras.mysch.gr/images/them_plirof_gel_250604.pdf)
- **Output:** exam answers print bare values or short labels (`ΓΡΑΨΕ ονmax1, max1`, `ΓΡΑΨΕ πλε*100/πλ,'%'`). When the paper fixes the wording of messages («ΠΡΟΚΡΙΝΕΤΑΙ», «Ανύπαρκτος πωλητής», «Δεν υπάρχει απόθεμα»), answers reproduce that wording exactly — [Μουζιούρας 2024](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2024.doc), [Μουζιούρας 2025](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2025.doc)
- **Results after all input.** Some papers require that results be shown only after all input is read («Η εμφάνιση των αποτελεσμάτων θα πρέπει να γίνει μετά την εισαγωγή όλων των δεδομένων εισόδου») — [ΑΕΠΠ exam text via search summary, 2022 compilation](https://blogs.e-me.edu.gr/krommyda/wp-content/uploads/sites/319501/2022/08/Θέματα-πανελλαδικών-εξετάσεων-ΑΕΠΠ-2022.pdf) (seen only in a search-result summary; the exact year was not verified)
- **General instruction on every paper:** «Κάθε απάντηση επιστημονικά τεκμηριωμένη είναι αποδεκτή» — [2025 paper, ΟΔΗΓΙΕΣ §4](https://pmouziouras.mysch.gr/images/them_plirof_gel_250604.pdf)

### Inferences
- **Declaring parameters.** Formal parameters, arrays included, are redeclared with types (and sizes) inside the subprogram's own ΜΕΤΑΒΛΗΤΕΣ. Leaving them out would cost the subprogram's declaration marks. This is a consistent pattern across the answers, though no rubric states it.
- **Labelling answers.** Labelling each block with `!Γ2` and similar comments is a widespread exam habit. It helps markers find where each sub-question's marks are earned. It is not required.
- **Prompts and output wording.** Output formatting (prompts, labels, decimals) earns no marks of its own. Exact message wording matters only when the paper prescribes it.

### Gaps
- I found no official statement on whether ΣΤΑΘΕΡΕΣ must be used for fixed sizes (e.g. `ΣΤΑΘΕΡΕΣ Ν = 100`). The exam answers reviewed use literal sizes.
- I found no official guidance on naming style (Greek vs Latin, case). Answers freely mix them (max1, ονmax1, ΣΒ).

---

## Q4. "Safe" exam style recommended by experienced teachers

### Takeaway
The safe style is conservative and textbook-shaped:
- Do exactly the validation each sub-question names.
- Initialise every accumulator and flag explicitly.
- Use the ΟΣΟ read-before/read-at-end form for sentinels.
- Search with a flag, sort with the textbook double ΓΙΑ, and always swap parallel arrays together.
- Put no I/O in functions, and redeclare all parameters.
- Label each block with its sub-question.
- Trace small cases by hand.

Teachers stress reading the statement carefully over clever code.

### Cited Findings
- Teachers name the top causes of lost marks: misreading the statement («Αν δεν καταλάβετε τι ζητά η άσκηση, η λύση είναι λάθος από την αρχή»), careless slips, weak logical structure, too little practice on past papers, and poor time management. They advise starting with the easiest θέμα and leaving time to check — [Κυριακίδου, idietera 23.03.2026](https://www.idietera.gr/articles/pliroforiki/pliroforiki-panellinion-ta-pio-syhna-lathi-kai-pos-na-ta-apofygeis)
- For conditions: read a compound condition aloud as a Greek sentence, write the intervals on paper to check for gaps or overlaps, and test 2–3 representative values. For loops, write down the initial value, the update and the stop point, then trace a small example — [Ζήτης, csc.gr](https://csc.gr/articles/synthikes-sti-glossa-gia-aepp-pos-na-apofeygeis-ta-klasika-lathi-1/)
- For subprograms: before coding, state what input it expects and what result it must produce, and check that parameter types and order match between definition and call — [Ζήτης, csc.gr](https://csc.gr/articles/ypoprogrammata-stin-aepp-diadikasies-kai-synartiseis-me-apla-paradeigmata/)
- For 2D arrays: decide what each dimension means, sketch a small matrix, choose the scan direction from the per-row/per-column question, and initialise at the right level — [infoclass 2026](https://infoclass.gr/disdiastatoi-pinakes-methodologia-20-lymenes-askiseis/)
- The official directions push stepwise execution (βηματική εκτέλεση), debugging practice for selection, loops, arrays and subprograms, and the black-box method — [Οδηγίες 2026–27 §12–16, §23, §36, §38](https://www.stadiodromia.gr/enhmer2sh/25_26/302.pdf)
- **Where teachers disagree, or published answers diverge:**
  - (a) ΜΕΧΡΙΣ_ΟΤΟΥ vs ΟΣΟ for sentinel loops: the 2024 vs 2025 Μουζιούρας answers — [2024](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2024.doc), [2025](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2025.doc)
  - (b) The initial max: 0 or −1 in stream answers, the first element per the methodology article — [Μουζιούρας 2025](https://pmouziouras.mysch.gr/images/lyseis_plhroforikh_2025.doc), [infoclass](https://infoclass.gr/disdiastatoi-pinakes-methodologia-20-lymenes-askiseis/)
  - (c) Whether to add a separate «Δεν υπάρχει απόθεμα» test. A teacher commenting on the 2026 answers argued that an extra ΑΝ for zero stock was unnecessary and would print a duplicate message — [esos.gr reader comment, 2026](https://www.esos.gr/arthra/99458/endeiktikes-apantiseis-sta-latinika-himeia-kai-pliroforiki-ton-panelladikon-exetaseon)
  - (d) A teacher argued that an alternative loop form in 2026 Β3 should also be accepted, since the iterations and the values of j match — [esos.gr reader comment, 2026](https://www.esos.gr/arthra/99458/endeiktikes-apantiseis-sta-latinika-himeia-kai-pliroforiki-ton-panelladikon-exetaseon)
- **2026 Θέμα Δ3 answer.** After finding POS, the φροντιστήριο answer indexes ΚΑΤ[Ι,J] instead of ΚΑΤ[POS,J]. It works only because the flag loop leaves Ι = POS. This shows how published answers rely on loop side effects that a safer style would make explicit — [2026 answers](https://baharakis.gr/Panellinies2026/GEL07/Answers.pdf)

### Inferences
Safe-style checklist for an AI tutor, synthesised from the above:
1. **Declarations.** Declare every variable once, by type. Use the paper's array names and sizes. Use separate swap temps per type. Make averages and percentages ΠΡΑΓΜΑΤΙΚΕΣ.
2. **Initialisation.** Explicitly initialise counters, sums, flags, max/min *and* the name or position stored with them.
3. **Validation.** Validate exactly what the sub-question names, with ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ…ΜΕΧΡΙΣ_ΟΤΟΥ. Skip it where the paper says «χωρίς έλεγχο». An error message is optional.
4. **Sentinel.** Read before ΟΣΟ, read again last in the body, and never process the sentinel.
5. **Early stop.** Use a flag or a compound condition. Never alter a ΓΙΑ counter. Never rely on short-circuit ΚΑΙ to guard an index.
6. **Division.** Guard division unless the paper guarantees a non-zero divisor.
7. **Sorting.** Use the textbook bubble form (i 2..N, j N down to i, compare j-1 with j), swapping *all* parallel arrays. For a second key, add ΑΛΛΙΩΣ_ΑΝ on equality of the first key.
8. **Functions.** No ΔΙΑΒΑΣΕ or ΓΡΑΨΕ in functions. Redeclare all parameters, arrays with sizes, plus locals. Assign the function name exactly once, at the end. Prefer a function when one value is returned, and a procedure when several values change or I/O is needed.
9. **Messages.** Reproduce the paper's message wording exactly when it is given.
10. **Clever tricks.** Avoid them, e.g. reusing a loop variable's leftover value, or relying on the ΓΙΑ counter after the loop, even though the latter is defined.

### Gaps
- I found no survey or official document ranking which mistakes cost the most marks. The teacher articles found are general (idietera) or partial (csc.gr), and none quantifies deductions.
- I found no ΟΕΦΕ solutions text for 2025–2026 (the oefe.gr page exists: https://www.oefe.gr/el/static/panelladikes-2025.aspx), and no esos/alfavita commentary detailing marking of specific constructs. More solution sets could confirm or contradict the patterns above.

"""
The navbar's Αλγόριθμοι (frontend/src/lib/glossa/algorithms.json), run through the
real interpreter: nothing a student opens from there may fail to compile or run.
"""

import json
from pathlib import Path

import pytest

from app import glossa

LIBRARY = json.loads(
    (Path(__file__).parents[2] / "frontend/src/lib/glossa/algorithms.json").read_text("utf-8")
)
ALGORITHMS = [item for group in LIBRARY["groups"] for item in group["algorithms"]]


def program(item: dict) -> str:
    """The program the editor opens: lib/glossa/algorithms.ts `algorithmProgram`."""
    frame = item.get("frame")
    if frame is None:
        return "\n".join(item["code"]) + "\n"
    parts = LIBRARY["frames"][frame]
    return (
        "\n".join(
            [*parts["before"], *(f"  {line}" for line in item["code"]), *parts["after"]],
        )
        + "\n"
    )


def by_title(part: str) -> str:
    matches = [item for item in ALGORITHMS if part in item["title"]]
    assert len(matches) == 1, part
    return program(matches[0])


def run_answering(source: str, trace: bool = False):
    """Runs to the end as a student would: ΝΑΙ to questions, otherwise 1, 2, 3, …"""
    lines = source.splitlines()
    inputs: list[str] = []
    numbers = 0
    while True:
        result = glossa.run(source, inputs, trace=trace)
        if result.status != "needs_input":
            return result
        if "ΔΙΑΒΑΣΕ ΑΠ" in lines[result.input_line - 1]:
            inputs.append("ΝΑΙ")
        else:
            numbers += 1
            inputs.append(str(numbers))


def titles() -> list[str]:
    return [item["title"] for item in ALGORITHMS]


@pytest.mark.parametrize("item", ALGORITHMS, ids=titles())
def test_compiles_and_runs_to_the_end(item):
    source = program(item)
    assert glossa.check(source, "glossa") is None
    result = run_answering(source)
    assert result.status == "ok", result.error


@pytest.mark.parametrize("item", ALGORITHMS, ids=titles())
def test_runs_traced_too(item):
    # Slow and step runs and the πίνακας τιμών all run this way.
    result = run_answering(program(item), trace=True)
    assert result.status == "ok", result.error
    assert result.trace


@pytest.mark.parametrize("item", ALGORITHMS, ids=titles())
def test_a_framed_part_has_the_code_shown(item):
    if "frame" in item:
        assert item["code"][0] != "ΠΡΟΓΡΑΜΜΑ ΑΑΑ"
        assert item["frame"] in LIBRARY["frames"]
    else:
        assert item["code"][0] == "ΠΡΟΓΡΑΜΜΑ ΑΑΑ"


# Each case: a program in, its expected output out.


def test_sum_of_ten():
    source = by_title("Υπολογισμός αθροίσματος")
    assert glossa.run(source, [str(n) for n in range(1, 11)]).output == ["55"]


def test_average_of_positives():
    source = by_title("Υπολογισμός μέσου όρου")
    values = ["2", "-1", "4", "-5", "6", "0", "-2", "-3", "-4", "-9"]
    assert glossa.run(source, values).output == ["4"]
    assert glossa.run(source, ["-1"] * 10).output == ["ΔΕΝ ΔΟΘΗΚΕ ΘΕΤΙΚΟΣ ΑΡΙΘΜΟΣ"]


def test_position_of_the_maximum():
    source = by_title("Διάβασμα τιμών πίνακα Π[10] και εύρεση θέσης")
    values = ["1", "9", "3", "4", "5", "6", "7", "8", "2", "0"]
    assert glossa.run(source, values).output == ["2"]


def test_diagonal_sum_both_ways():
    values = [str(n) for n in range(1, 101)]  # the diagonal: 1, 12, 23, …, 100
    methods = [program(item) for item in ALGORITHMS if "κύριας διαγωνίου" in item["title"]]
    assert len(methods) == 2
    for source in methods:
        assert glossa.run(source, values).output == ["505"]


@pytest.mark.parametrize(
    "start",
    ["Φθίνουσα ταξινόμηση μονοδιάστατου", "Φθίνουσα ταξινόμηση δυσδιάστατου"],
)
def test_every_sort_ends_descending(start):
    for item in ALGORITHMS:
        if not item["title"].startswith(start):
            continue
        result = glossa.run(program(item), [])
        assert result.status == "ok", (item["title"], result.error)
        rows = [[int(cell) for cell in line.split()] for line in result.output]
        assert len(rows) == 100
        firsts = [row[0] for row in rows]
        assert firsts == sorted(firsts, reverse=True), item["title"]


@pytest.mark.parametrize("item", ALGORITHMS, ids=titles())
def test_stays_well_inside_the_time_limit(item):
    # /run allows 10 s, by the clock: a slow host must still finish the heaviest one.
    assert run_answering(program(item)).steps <= 50_000


def sample(row: int, column: int) -> int:
    """The 2D frames' sample value: Α[Κ, Λ] <- 100 - Κ + (Κ MOD 10) * 2 + Λ."""
    return 100 - row + (row % 10) * 2 + column


def whole_rows(item: dict) -> list[list[int]]:
    """Runs a 2D sort printing all ten columns of each row, then ΟΝ if it has one."""
    parts = LIBRARY["frames"][item["frame"]]
    cells = ", ".join(f"Α[Κ, {column}]" for column in range(1, 11))
    if any("ΟΝ[100]" in line for line in parts["before"]):
        cells += ", ΟΝ[Κ]"
    after = [
        "  ΓΙΑ Κ ΑΠΟ 1 ΜΕΧΡΙ 100",
        f"    ΓΡΑΨΕ {cells}",
        "  ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ",
        "ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ",
    ]
    lines = [*parts["before"], *(f"  {line}" for line in item["code"]), *after]
    result = glossa.run("\n".join(lines) + "\n", [])
    assert result.status == "ok", result.error
    return [[int(cell) for cell in line.split()] for line in result.output]


SORTS_2D = [item for item in ALGORITHMS if item.get("frame", "").startswith("sort-2d")]


@pytest.mark.parametrize("item", SORTS_2D, ids=[item["title"] for item in SORTS_2D])
def test_a_2d_sort_moves_whole_rows(item):
    rows = whole_rows(item)
    assert len(rows) == 100
    third = [row[2] for row in rows]
    assert third == sorted(third, reverse=True)

    def expected(number: int) -> list[int]:
        row = [sample(number, column) for column in range(1, 11)]
        if item["frame"] == "sort-2d-ties":
            row[2] = (100 - number) // 20 + number % 2
        return row

    if item["frame"] == "sort-2d":
        assert sorted(rows) == sorted(expected(number) for number in range(1, 101))
    else:
        # ΟΝ[Κ] started as Κ: it still names the row it belongs to.
        assert sorted(row[10] for row in rows) == list(range(1, 101))
        for row in rows:
            assert row[:10] == expected(row[10])


def test_sort_breaks_ties_by_the_first_column():
    source = by_title("και έπειτα ως προς την 1η στήλη")
    rows = [[int(cell) for cell in line.split()] for line in glossa.run(source, []).output]
    assert rows == sorted(rows, key=lambda row: (row[0], row[1]), reverse=True)


def test_parallel_array_moves_with_the_sort():
    source = by_title("Φθίνουσα ταξινόμηση μονοδιάστατου πίνακα Π[100] και του Α[100]")
    rows = [[int(cell) for cell in line.split()] for line in glossa.run(source, []).output]
    # Π[Κ] was (Κ * 37) MOD 101 and Α[Κ] was Κ: the pairs must stay together.
    assert all(value == (index * 37) % 101 for value, index in rows)


def test_serial_search_stops_at_the_first_match():
    source = by_title("με τη μέθοδο της σειριακής")
    values = ["7"] * 100 + ["7"]
    assert glossa.run(source, values).output == ["Βρέθηκε στη θέση: 1"]
    assert glossa.run(source, values[:-1] + ["8"]).output == ["Δεν βρέθηκε"]


def test_serial_search_with_for_finds_the_last_position():
    source = by_title("Σειριακή αναζήτηση με ΓΙΑ")
    assert glossa.run(source, ["84"]).output == ["Βρέθηκε στη θέση: 42"]
    assert glossa.run(source, ["3"]).output == ["Δεν βρέθηκε"]


def test_binary_search():
    source = by_title("με τη μέθοδο της δυαδικής")
    values = [str(n * 2) for n in range(1, 101)]
    assert glossa.run(source, [*values, "84"]).output == ["Βρέθηκε στη θέση: 42"]
    assert glossa.run(source, [*values, "3"]).output == ["Δεν βρέθηκε"]


def test_push_until_full_keeps_the_order():
    for item in ALGORITHMS:
        if item["title"].startswith("Ώθηση πολλών") and "ερώτησης" not in item["title"]:
            result = glossa.run(program(item), ["1", "2", "3", "4", "5"])
            assert result.output == ["ΣΤΟΙΒΑ ΓΕΜΑΤΗ", "1", "2", "3", "4", "5"], item["title"]


def test_push_stops_when_the_student_says_no():
    for item in ALGORITHMS:
        if "ερώτησης" in item["title"]:
            result = glossa.run(program(item), ["ΝΑΙ", "7", "ΟΧΙ"])
            assert result.output == ["ΝΑ ΓΙΝΕΙ ΕΙΣΑΓΩΓΗ;", "ΝΑ ΓΙΝΕΙ ΕΙΣΑΓΩΓΗ;", "7"], item["title"]


def test_pop():
    source = by_title("Απώθηση ενός στοιχείου")
    assert glossa.run(source, []).output == ["30", "10", "20"]
    many = by_title(
        "Απώθηση πολλών στοιχείων από στοίβα Σ, Ν κελιών, μέχρι να αδειάσει (αλγόριθμος 1)"
    )
    assert glossa.run(many, []).output == ["30", "20", "10"]
    other = by_title("μέχρι να αδειάσει (αλγόριθμος 2)")
    assert glossa.run(other, []).output == ["30", "20", "10"]


def test_queue_insert_many_reads_a_value_each_time():
    source = by_title(
        "Εισαγωγή πολλών στοιχείων σε ουρά Ο, Ν θέσεων μέχρι να γεμίσει (αλγόριθμος 1)"
    )
    result = glossa.run(source, ["1", "2", "3", "4", "5"])
    assert result.output == ["ΟΥΡΑ ΓΕΜΑΤΗ", "1", "2", "3", "4", "5"]


def test_queue_is_not_called_full_when_the_student_stops():
    source = by_title("Εισαγωγή πολλών στοιχείων σε ουρά Ο, Ν θέσεων μέχρι να γεμίσει ή")
    result = glossa.run(source, ["ΝΑΙ", "7", "ΟΧΙ"])
    assert result.output == ["ΘΑ ΕΙΣΑΓΕΤΕ ΣΤΟΙΧΕΙΟ;", "ΘΑ ΕΙΣΑΓΕΤΕ ΣΤΟΙΧΕΙΟ;", "7"]


def test_queue_remove():
    source = by_title("Εξαγωγή ενός στοιχείου")
    assert glossa.run(source, []).output == ["ΕΞΑΓΕΤΑΙ ΤΟ 10", "20", "30"]
    many = by_title("Εξαγωγή πολλών στοιχείων")
    assert glossa.run(many, []).output == ["ΕΞΑΓΕΤΑΙ ΤΟ 10", "ΕΞΑΓΕΤΑΙ ΤΟ 20", "ΕΞΑΓΕΤΑΙ ΤΟ 30"]

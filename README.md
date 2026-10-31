<p align="center">
  <img src="frontend/public/logo-cloud.png" alt="AEPP Max" width="96" />
</p>

<h1 align="center">AEPP Max</h1>

<p align="center">
  <strong>ΓΛΩΣΣΑ in the browser, with an AI tutor built in.</strong><br />
  For Γ' Λυκείου students preparing for Πληροφορική (ΑΕΠΠ) in the Panhellenic exams.
</p>

<p align="center">
  <a href="docs/user-guide.md">User guide (Greek)</a> ·
  <a href="docs/glossa.md">Language reference</a> ·
  <a href="CLAUDE.md">Developer guide</a>
</p>

---

AEPP Max lets students write and run **ΓΛΩΣΣΑ**, the teaching pseudo-language of the school textbook, directly in the browser. Nothing to install, and it works on a phone. Next to the editor sits an AI assistant that explains errors, gives hints and, when asked, writes changes into the code. What Cursor did for code editors, AEPP Max does for ΓΛΩΣΣΑ.

AEPP Max runs the same programs as the Διερμηνευτής της ΓΛΩΣΣΑΣ by Άλκης Γεωργόπουλος, the desktop interpreter schools use, but it is an independent implementation: it contains no code, text or images from it and is not affiliated with its author.

## Why AEPP Max

**Faithful to the exam.** Students are graded on textbook ΓΛΩΣΣΑ, so the interpreter accepts what the textbook and the Διερμηνευτής accept and rejects the rest. A program that runs here but would lose marks in the exam is treated as a bug. The rules it follows are written down in [docs/glossa.md](docs/glossa.md), and every rule has a test.

**Errors a student can act on.** Messages are in Greek, with the line number, and say how to fix the common mistakes: `=` instead of `<-`, `ΤΕΛΟΣ ΑΝ` without the underscore, `0 < x < 10`, Latin look-alike letters in keywords, a forgotten `ΑΡΧΗ`, a procedure called without `ΚΑΛΕΣΕ`. Errors are underlined in red while typing, and the line number turns red. Code that never runs is checked too.

**An editor that knows the language.**
- Context-aware autocomplete that ignores case and accents, and offers whole blocks (`ΑΝ … ΤΕΛΟΣ_ΑΝ`, `ΓΙΑ`, subprograms) with blanks to fill in using Tab.
- Reserved words are capitalized automatically, blocks indent themselves, and a Greek loop counter typed on the Greek keyboard becomes the Latin letter.
- No AI and no tokens involved, so all of it works signed out.

**A tutor that doesn't guess.** The agent runs your code on the real interpreter before it says anything about its output, replies in Greek, and uses only constructs from the textbook. **Tutor** mode gives hints before solutions and never touches your code. **Agent** mode writes changes into the editor: either at once (**αυτόματα**, Ctrl+Z undoes them) or as a diff you approve with Ctrl/Cmd+Enter first (**με έγκριση**). Shift+Tab switches between the two inside Agent mode. Slash commands work in the chat: `/switch` (Tutor ↔ Agent), `/new` and `/help`.

**Free to try, no account needed to run code.** Running programs, autocomplete and error checking are public. Only the agent needs an account (email link or Google), since it is the part that costs money.

**The πίνακας τιμών, step by step.** The exam asks students to trace a program by hand. One button builds the trace table: a row per executed line, a column per variable, each condition's value and what ΓΡΑΨΕ printed. Rows appear one at a time, so students predict each before they see it, while the editor highlights the line. Students can then check their paper table against it.

**Your programs, everywhere.** With an account, Ctrl/Cmd+S or Αποθήκευση saves the code; it never saves on its own, as students asked. «Τα προγράμματά μου» opens, renames, copies and deletes them from any device.

**Made for the screen you have.** Three built-in themes, including **Κλασικό**, with the colors students know from the school lab. Make your own theme from 12 colors in the Επεκτάσεις panel.

**One interpreter everywhere.** It lives on the backend, so the editor, the agent's tools and, later, exercise checking all give the same answer and can't be tampered with from the client.

## Status

Working: the full interpreter, the editor, running programs with input, the step-by-step πίνακας τιμών, saving and opening programs, the agent (Tutor and Agent modes, approval, slash commands, a daily limit per student), themes, an in-app guide (ⓘ) and sign-in.

Not built yet: a list of past agent conversations, and markdown in agent replies.

## Stack

| Part | Tech | Hosting |
|---|---|---|
| Frontend | Next.js 16, CodeMirror 6, Tailwind 4 | Vercel |
| Backend | FastAPI, ΓΛΩΣΣΑ interpreter (pure Python) | Render |
| Agent | OpenAI Agents SDK | (backend) |
| DB & Auth | Supabase (Postgres + Auth), Alembic migrations | Supabase |

## How the interpreter works

The interpreter is written by hand in pure Python, with no parser generator and no web or database imports (`backend/app/glossa/`). A program goes through four stages:

1. **Lexer** (`lexer.py`) turns the source into tokens. Keywords and names are compared after normalizing them (uppercase, no accents, `ς` → `Σ`), so `γραψε`, `Γράψε` and `ΓΡΑΨΕ` are the same word.
2. **Parser** (`parser.py`) is recursive descent, one function per grammar rule, and builds an AST of dataclasses (`nodes.py`: `Assign`, `If`, `For`, `Call`, `Procedure`, …), each node with its line and columns. Writing it by hand is what lets the first error come out in Greek, with a hint for the common mistakes.
3. **Checker** (`checker.py`) walks the AST before anything runs: undeclared or duplicate names, assignments to constants, array dimensions, calls. Errors in code that never runs are still reported.
4. **Interpreter** (`interpreter.py`) walks the checked AST and executes each node directly.

Ψευδογλώσσα algorithms use the same pipeline, through subclasses (`algorithm_*.py`).

**An interpreter, not a compiler.** Nothing is translated into another language, neither Python nor bytecode. Walking the tree is what makes the step-by-step πίνακας τιμών possible, a row per executed statement. It also keeps runtime errors in Greek on the right line. And it is safe: the interpreter counts its own steps, time, output, call depth and memory, so a student's program can never hang the server or reach anything outside it. Student programs are small, so speed doesn't matter.

**Values and memory.** ΑΚΕΡΑΙΑ, ΠΡΑΓΜΑΤΙΚΗ, ΧΑΡΑΚΤΗΡΑΣ and ΛΟΓΙΚΗ are Python `int`, `float`, `str` and `bool`; a variable starts as a special `UNSET` value. Each call pushes a frame on the interpreter's call stack (a list of frames) holding its variables, and arrays are flat lists inside the frame. Parameters are copies: a procedure copies them back to the caller when it returns, as the textbook says, so frames never share memory. The Μεταβλητές tab shows this stack.

**No garbage collector.** ΓΛΩΣΣΑ has no pointers and no dynamic allocation, so every value lives exactly as long as its call. When a call returns, its frame is dropped and Python frees it. What the interpreter does keep is a count of live array cells (`MAX_LIVE_CELLS`, freed on return) and a limit of 200 nested calls, so deep recursion with large arrays stops with an error instead of filling memory.

## Getting started

```bash
# backend
cd backend && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt && cp .env.example .env
fastapi dev app/main.py        # http://localhost:8000/docs

# frontend
cd frontend && npm install && cp .env.example .env.local
npm run dev                    # http://localhost:3000
```

Everything defaults to empty, so the app boots without secrets: running programs works, and the agent and sign-in switch on once you add `OPENAI_API_KEY` and the Supabase keys.

```bash
cd backend && pytest && ruff check .          # backend tests and lint
cd frontend && npm test && npm run lint       # frontend tests and lint
```

Code reviews in Claude Code go to the `code-reviewer` subagent in [`.claude/agents/`](.claude/agents/code-reviewer.md). It checks a change against the rules in CLAUDE.md, runs the tests and lint, and reports verified findings without editing anything.

## Documentation

| For | Read |
|---|---|
| Students | [User guide](docs/user-guide.md) (Greek) |
| Anyone checking what the interpreter accepts | [docs/glossa.md](docs/glossa.md) |
| Contributors | [CLAUDE.md](CLAUDE.md): commands, architecture, deployment |

## License

[MIT](LICENSE)

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

**A tutor that doesn't guess.** The agent runs your code on the real interpreter before it says anything about its output, replies in Greek, and uses only constructs from the textbook. In **Ερώτηση** mode it gives hints before solutions. In **Αλλαγές** mode it proposes edits that you review as a diff and accept or reject, change by change. Shift+Tab switches between the two.

**Free to try, no account needed to run code.** Running programs, autocomplete and error checking are public. Only the agent needs an account (email link, Google or Apple), since it is the part that costs money.

**Made for the screen you have.** Three built-in themes, including **Κλασικό**, with the colors students know from the school lab. Make your own theme from 11 colors in the Επεκτάσεις panel.

**One interpreter everywhere.** It lives on the backend, so the editor, the agent's tools and, later, exercise checking all give the same answer and can't be tampered with from the client.

## Status

Working: the full interpreter, the editor, running programs with input, the agent in both modes, themes and sign-in.

Not built yet: step-by-step execution and the trace table (πίνακας τιμών) in the UI, saving and opening programs in the UI, a list of past agent conversations, agent quotas, and markdown in agent replies.

## Stack

| Part | Tech | Hosting |
|---|---|---|
| Frontend | Next.js 16, CodeMirror 6, Tailwind 4 | Vercel |
| Backend | FastAPI, ΓΛΩΣΣΑ interpreter (pure Python) | Render |
| Agent | OpenAI Agents SDK | (backend) |
| DB & Auth | Supabase (Postgres + Auth), Alembic migrations | Supabase |

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

## Documentation

| For | Read |
|---|---|
| Students | [User guide](docs/user-guide.md) (Greek) |
| Anyone checking what the interpreter accepts | [docs/glossa.md](docs/glossa.md) |
| Contributors | [CLAUDE.md](CLAUDE.md): commands, architecture, deployment |

## License

[MIT](LICENSE)

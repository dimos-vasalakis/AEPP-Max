# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

AEPP Max is an online fork of the **Διερμηνευτής της ΓΛΩΣΣΑΣ** with an AI agent built in, as Cursor is to VS Code. It is for Γ' Λυκείου students preparing for Πληροφορική (formerly ΑΕΠΠ) in the Greek Panhellenic exams. ΓΛΩΣΣΑ is the Greek teaching pseudo-language of the school textbook, and the exams still use it (Πληροφορική is on 2 June 2027).

The repo is a monorepo:
- `frontend/`: Next.js 16, deployed on Vercel with Root Directory `frontend`.
- `backend/`: FastAPI, deployed on Render via `render.yaml` (Docker).
- `backend/alembic/`: the Supabase Postgres schema and RLS.

Supabase provides Auth, and the agent uses the OpenAI Agents SDK (`openai-agents`). The UI is Greek-only. Code, comments and docs are in English.

## Status

Programs run: the whole interpreter is in place (lexer, parser, static checks, `interpreter.py`). Not built yet:
- **Step-by-step execution and the trace table (πίνακας τιμών) in the UI.** The backend side works: `trace=true` returns `TraceStep`s.
- **Smaller pieces:**
  - save/open programs in the UI (the `/programs` API exists);
  - a list of past agent conversations;
  - agent quotas or rate limits;
  - highlighting the error line in the editor;
  - markdown in agent replies.

Update this section as features land.

## Commands

Frontend (run from `frontend/`):
```bash
npm run dev        # http://localhost:3000
npm run build      # stop `npm run dev` first: both use .next/ and the dev server can end up serving stale CSS
npm run lint       # eslint
npm run typecheck  # next typegen && tsc --noEmit
npm test           # vitest: src/**/*.test.ts
```

Backend (run from `backend/`, Python 3.12, venv in `backend/.venv`):
```bash
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt        # runtime deps (requirements.txt) + pytest + ruff
fastapi dev app/main.py                    # http://localhost:8000/docs (off when ENVIRONMENT=production)
pytest                                     # all tests
pytest tests/test_api.py::test_health      # single test
ruff check . && ruff format .
alembic upgrade head                       # uses DIRECT_URL
alembic revision --autogenerate -m "msg"   # after editing app/models
```

To check migrations without Supabase, use any local Postgres:
```bash
psql "$URL" -f tests/supabase_stub.sql
DIRECT_URL=$URL alembic upgrade head && alembic check
```

Env: copy `frontend/.env.example` → `.env.local` and `backend/.env.example` → `.env`. Backend settings live in `app/core/config.py` (pydantic-settings). Everything defaults to empty, so the app boots without secrets:
- no DB → 503 on DB endpoints;
- no `OPENAI_API_KEY` → 503 on `/agent/chat`;
- placeholder Supabase keys → sign-in disabled.

## Tests & CI

`.github/workflows/ci.yml` runs three jobs:
- **backend:** ruff; `tests/supabase_stub.sql` on a Postgres service; `alembic upgrade`, then `alembic check`, then a down/up round-trip; pytest.
- **docker:** builds the API image and smoke-tests `/health` the way Render runs it.
- **frontend:** lint, typecheck, vitest, build.

The stub mirrors Supabase's default grants to `anon`/`authenticated`, so grants that only look restrictive fail in CI. Backend tests never hit the DB or OpenAI: `conftest.py` blanks `DATABASE_URL`/`OPENAI_API_KEY` and signs HS256 test tokens (`auth_header()`).

Each ΓΛΩΣΣΑ language rule needs a pytest case (program in, expected output or error out) once the interpreter exists.

## Next.js version caveat

`frontend/AGENTS.md`: this is Next.js 16, which breaks things that worked in older versions. Read the relevant guide in `frontend/node_modules/next/dist/docs/` before writing Next.js code, and heed deprecation notices.
- Middleware is now `src/proxy.ts` exporting `proxy()`.
- `cacheComponents` is on (`next.config.ts`): request data such as `useSearchParams`, cookies or headers must sit under `<Suspense>`. See `(auth)/login/page.tsx`.
- `next dev` re-adds the AGENTS.md block; don't strip it from diffs.

## Architecture

**ΓΛΩΣΣΑ fidelity comes first.** Students are graded on textbook ΓΛΩΣΣΑ. The interpreter must accept exactly what the textbook and the Διερμηνευτής accept, reject the rest, and report errors in Greek with line numbers. A program that runs here but would lose marks in the exam is a bug. `docs/glossa.md` is the spec. Settle its **Verify** items (textbook or Διερμηνευτής) before implementing them, then update the doc.

**Interpreter (`backend/app/glossa/`).** Pure Python with no web or DB imports.
- Pipeline: `tokenize` (`lexer.py`) → `parse` (`parser.py`, recursive descent, which then runs `checker.check_program`) → `execute`. The entry points are `glossa.run(source, inputs, limits=, trace=) -> RunResult` and `glossa.check(source) -> ErrorInfo | None`.
- It never raises for student mistakes. They come back as status `error` with `ErrorInfo(kind, message, line, column, end_column)`, built from a `GlossaError`. Use `GlossaError.at(token, msg)` for syntax errors.
- Only the first error is reported, and it says how to fix common mistakes. Examples: `=` instead of `<-`; `ΤΕΛΟΣ ΑΝ` without the underscore; `0 < x < 10`; Latin look-alike letters (`APXH`); a forgotten ΑΡΧΗ; a procedure called without ΚΑΛΕΣΕ.
- Keywords and names are compared after `lexer.normalize()`: uppercase, no accents, `ς` → `Σ`. Nodes keep the student's spelling; compare names by `.key`.
- `checker.py` holds the static checks, so errors in code that never runs are still reported:
  - undeclared or duplicate names;
  - assigning to a constant;
  - array dimensions and indexing;
  - calls (arity, function vs procedure);
  - parameters declared in the subprogram;
  - a function that never assigns its name;
  - no globals; the main program's constants are visible in subprograms (a Verify item).

  Types are checked at runtime, not here.
- `interpreter.py` walks the checked AST. The checker has already resolved names, calls and dimensions, so it handles only what depends on values: types, unset variables, indices, division by zero, input, limits. Runtime errors carry the node's line and columns.
  - Values are Python `int`/`float`/`str`/`bool`. A variable starts `UNSET`; arrays are flat lists. An integer stored in a ΠΡΑΓΜΑΤΙΚΗ becomes a float, and a real into an ΑΚΕΡΑΙΑ is an error.
  - Procedures copy their parameters back to the caller's variables (or array elements) on return; expressions and constants passed in are not written back. Functions get copies only. An unset variable may be passed in (the procedure may fill it).
  - It follows the Διερμηνευτής's defaults where the textbook is silent (docs/glossa.md, "What the interpreter does"): reals print with 2 decimals, comparisons round reals to 8 decimals, ΓΡΑΨΕ joins values with no separator except a space between two numbers, a ΓΡΑΨΕ ending in a space keeps the line open, and ΚΑΙ/Ή evaluate both sides.
- It is CPU-bound, so async callers use `asyncio.to_thread`. A thread can't be killed, so `execute` enforces `RunLimits` itself: steps, wall-clock timeout (checked every 256 steps), output lines and trace length. It also caps call depth (200), array size and integer size, so no program can hang the worker.
- The dataclasses in `result.py` are the `/run` response. `frontend/src/lib/glossa/types.ts` mirrors them, so change both together.

Why the interpreter lives on the backend: one implementation serves the IDE, the agent's tools and, later, exercise checking, which can't trust the client.

**Editor: error marking and autocomplete (no AI, no tokens).**
- **Error marking.** Red wavy underline and hover message only; there is no gutter marker (students asked for it removed). `lib/glossa/lint.ts` sends the code to `POST /api/v1/check` (public) 500 ms after typing stops. That is the same parser `/run` uses, so the editor and Εκτέλεση never disagree. `toDiagnostic` turns the error's line and columns into a red underline, a gutter dot and a hover message. If the backend is unreachable, nothing is marked.
- **Autocomplete.** `lib/glossa/completion.ts` is browser-only. Matching ignores case and accents (`πρ` → ΠΡΟΓΡΑΜΜΑ).
  - At the start of a line it offers whole blocks as snippets (ΑΝ … ΤΕΛΟΣ_ΑΝ, ΓΙΑ, ΟΣΟ, ΕΠΙΛΕΞΕ, the program skeleton, subprograms) plus statement keywords.
  - Mid-line, `placeOf()` decides from the text before the word what fits there. Where a value goes (after `<-`, ΓΡΑΨΕ, ΑΝ, `(`, `,`, an operator) it offers names, built-in functions (`Α_Τ()`, kept on offer even when fully typed, since accepting adds the parentheses), ΑΛΗΘΗΣ/ΨΕΥΔΗΣ and ΟΧΙ. Right after a value it offers what continues that statement (ΤΟΤΕ on an ΑΝ line, ΑΠΟ/ΜΕΧΡΙ/ΜΕ_ΒΗΜΑ on a ΓΙΑ line, ΚΑΙ/DIV/MOD). After ΓΙΑ, ΔΙΑΒΑΣΕ and in declarations, only names.
  - The student's own names come from code only (`words.ts` `codeWords`), never from comments or strings.
  - Tab accepts a suggestion, then jumps between the block's blanks; Enter stays a plain new line. The blanks are empty (`ΓΙΑ ▯ ΑΠΟ ▯ ΜΕΧΡΙ ▯`): students asked for nothing pre-written.
- **Auto-capitals.** `lib/glossa/autocase.ts` is a transaction filter. When a reserved word is finished (space, Enter or punctuation typed after it), it rewrites the word in capitals without accents (`γραψε ` → `ΓΡΑΨΕ `). It only reacts to typing and Enter, never to pastes or completions, and skips strings, comments and the student's own names.
- **Indentation.** `lib/glossa/indent.ts` is an `indentService`. Enter after a block's first line (ΑΝ … ΤΟΤΕ, ΓΙΑ, ΟΣΟ, ΑΡΧΗ_ΕΠΑΝΑΛΗΨΗΣ, ΕΠΙΛΕΞΕ, ΠΕΡΙΠΤΩΣΗ, ΑΡΧΗ, ΜΕΤΑΒΛΗΤΕΣ) goes one level in. ΤΕΛΟΣ_ΑΝ, ΑΛΛΙΩΣ, ΤΕΛΟΣ_ΕΠΑΝΑΛΗΨΗΣ, ΜΕΧΡΙΣ_ΟΤΟΥ, ΠΕΡΙΠΤΩΣΗ and ΤΕΛΟΣ_ΕΠΙΛΟΓΩΝ line up with the line that opened their block (found by counting nested blocks backwards), and section words go to column 0. Such a word moves into place once finished: a transaction filter on space, and the Enter key binding (`newlineAndIndent`) before the new line. Other lines keep whatever indentation the student gave them.
- **Loop counters.** `lib/glossa/counter.ts`: students type ΓΙΑ with the Greek keyboard on, so a one-letter Greek counter becomes the Latin letter on the same key (ι → i, ξ → j, κ → k) once finished, renamed everywhere in that program or subprogram, declaration included. After that, a one-letter Greek word typed in the body that maps to a counter becomes the counter too, unless that Greek name is used elsewhere (a variable of its own) or is η/ε (also OR / e^x). `autocase.ts` never capitalizes a ΓΙΑ counter.
- **Filter order.** Transaction filters run last to first, so `glossaAutocase` sits after `glossaIndent` and `glossaCounter` in `CodeEditor`'s `BASE`: it must see the keystroke before they add their changes.
- **Shared vocabulary.** `lib/glossa/vocabulary.ts` holds the word lists for both the highlighter and autocomplete. Keep it in sync with `lexer.py`.
- **@uiw/react-codemirror caveat.** It reconfigures the whole editor whenever `extensions`, `theme`, `basicSetup` or `onChange` change identity, which also cancels a snippet's Tab stops. Keep them stable: module constants in `CodeEditor.tsx`, `useCallback` for `updateCode` in `Ide.tsx`.

**Running programs and input.** `POST /api/v1/run` is public, since only the agent costs money.
- `ΔΙΑΒΑΣΕ` reads from `inputs`. When they run out, the status is `needs_input`.
- The IDE then asks for a value and re-runs from the start with that value appended. This is stateless and correct because ΓΛΩΣΣΑ programs are deterministic.
- `OutputPanel`'s `marks` record where each typed value was read, so the values show up inline in the output.
- Status `limit` means an infinite loop, too much output, or the timeout.

**Agent (`backend/app/agent/`).** `POST /api/v1/agent/chat` needs auth. Dependencies run in parameter order (user → `AgentReady` → db), so callers get 401 before a 503.

There is one `Agent` (`tutor.py`, model from `OPENAI_MODEL`) with two modes, like Cursor's Ask/Agent. The panel is titled just "Agent"; Shift+Tab in its message box (or the chip in the header) switches the mode, and it starts in `ask`:
- `ask` is a tutor: hints and explanations, no edits.
- `agent` can also call `propose_edit`. The tool is gated by `is_enabled` reading `AgentContext.mode`.

`instructions.py` builds the system prompt per request:
- It holds the pedagogy rules: reply in Greek; use textbook constructs only; never state output without running the code; hints before solutions in ask mode. Change behavior there.
- It includes the current editor code, so the code reaches the model without being stored in the conversation history.

The tools (`tools.py`) run the real interpreter in a thread. `trace_program` is capped at 300 steps for the model's context.

`propose_edit` changes nothing on the server:
1. It queues a `ProposedEdit` on the run context.
2. `stream.py` emits it as an `edit` event after the tool output.
3. The IDE shows it as a CodeMirror unified diff (`@codemirror/merge`, with per-chunk accept/reject) plus Αποδοχή/Απόρριψη buttons. Rejecting restores the code from before the first pending proposal.

The SSE events, in order: `conversation {id}` first, then `text {delta}`, `tool {name}`, `edit {code, summary}`, and finally `error {message}` or `done {}`. `result.cancel()` runs when the client disconnects.

**Agent memory.**
- Each thread has a `conversations` row (owner, title, optional `program_id`, which must be the user's own).
- Messages live in the SDK's `SQLAlchemySession` (`session.py`, `session_id = str(conversation.id)`), on the app's engine.
- The SDK's tables (`agent_sessions`, `agent_messages`) come from migration 0001, not from the SDK (`create_tables=False`). RLS is on and they have no API grants, so only the backend can reach them.
- They are mirrored in `app/models/agent_session.py` so that `alembic check` passes. Compare that file with the SDK's own table definitions whenever `openai-agents` is upgraded. It is pinned `<0.25` because 0.x minor releases break APIs.
- The SDK reads only `os.environ`, so `main.py` hands it the key with `set_default_openai_key`.

**Auth spans three systems.**
- **Supabase Auth in the frontend.** Google OAuth or an email magic link from `components/auth/LoginForm.tsx` goes to `/auth/callback?next=…`. That route exchanges the code (or verifies the `token_hash`) and redirects only to same-site paths (`lib/redirect.ts`). `src/proxy.ts` only refreshes the session cookie. Every page is public: the IDE works signed out, while the agent and saving need an account.
- **Client components** get the user from `lib/supabase/useUser.ts`. There are three Supabase clients in `lib/supabase/` (`client.ts`, `server.ts`, `proxy.ts`); use the one that matches the runtime. With placeholder keys, `supabaseConfigured` is false and sign-in is disabled instead of crashing. The frontend uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the legacy anon key also works).
- **Backend.** `app/core/security.py` verifies the bearer token based on its own `alg`: HS256 with `SUPABASE_JWT_SECRET`, otherwise the JWKS at `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` (ES256/RS256), with audience `authenticated`. Protected endpoints take `user: CurrentUserDep`.

**Backend is fully async.**
- Every endpoint and dependency is `async def`. Wrap blocking work in `asyncio.to_thread`; that includes the interpreter and the JWKS fetch.
- DB access is async SQLAlchemy (psycopg 3) through the `DbSession` dependency (`app/core/db.py`).
- Routers live in `app/api/v1/endpoints/` and are registered in `app/api/v1/router.py`. Schemas live in `app/schemas/`.
- Settings and the engine are cached singletons.

**Database and migrations.**
- **Two URLs.** `DATABASE_URL` is the Supavisor transaction pooler (:6543), used by the app with prepared statements disabled. `DIRECT_URL` (:5432) is used only by Alembic. `sqlalchemy_url()` rewrites `postgresql://` to `postgresql+psycopg://`.
- **RLS is bypassed by the app.** The app connects as `postgres`, so every query must filter by `user.id` itself (see `owned_program()`).
- **Models vs. raw SQL.** Models live in `app/models/`; `auth.users` is a stub there just so foreign keys resolve. RLS policies, grants and the signup trigger are raw SQL in revisions.
- **Column grants.** A column-level `revoke` doesn't undo Supabase's table-level grant. Restrict columns with an explicit `grant update (cols)` allow-list.
- **Tables:**
  - `profiles`: created by a trigger on `auth.users`; users may update only `display_name`.
  - `programs`: RLS for own rows; `/programs` provides CRUD.
  - `conversations`: users can read their own.
  - `agent_sessions` / `agent_messages`: backend only.

**Frontend.**
- `/` is the IDE, `components/ide/Ide.tsx` (a client component): editor, output panel, agent panel. The editor starts blank (no sample program).
- The editor is CodeMirror 6 via `@uiw/react-codemirror`. It was chosen over Monaco because it works on phones and has the merge view.
- ΓΛΩΣΣΑ highlighting is a `StreamLanguage` in `lib/glossa/language.ts`, matching keywords without regard to case or accents. Its colors are in `lib/glossa/theme.ts`. Token names are `@lezer/highlight` tags, with modifiers after a dot (`variableName.standard`, not `standard(variableName)`, which CodeMirror silently drops with a console warning); a test checks for the warning. It tells integers from reals (`integer`/`float`), symbols (`punctuation`) and names with Latin letters (`variableName.special`).
- `lib/api/client.ts` `apiFetch()` adds the Supabase token, and `ApiError.message` carries FastAPI's `detail`.
- `lib/api/agent.ts` `streamChat()` reads the SSE stream with `fetch` plus `lib/api/sse.ts`, because EventSource can't POST or send headers.
- **Navbar.** `components/Navbar.tsx` is shared by pages; page actions such as Εκτέλεση go in as `children`. It holds the Επεκτάσεις panel (`components/extensions/ExtensionsMenu.tsx`) and the account menu.
- **Themes.** The panel lists them; the registry is `lib/theme.ts`.
  - The three themes are `dark` (default), `light` (the logo's white and red) and `classic`, the Διερμηνευτής της ΓΛΩΣΣΑΣ as students see it, matched to its help pages (alkisg.mysch.gr, Επιλογές → Χρώματα κώδικα) and a student's screenshot: Windows XP beige chrome (`#ece9d8`, borders `#aca899`), Courier New, bold blue words, bold red symbols, green integers, olive reals, purple italic strings, gray italic comments, gray Latin names, a light yellow current line, a blue-gray gradient line-number strip, a blue error region and a light yellow output screen whose lines are numbered in a pink-red strip, with typed input in blue italic (`.output-num`, hidden in the other themes).
  - Optional tokens fall back to their neighbors when a theme leaves them out (`--syn-real` → `--syn-number`, `--syn-punctuation`, `--syn-latin`, `--syn-keyword-weight`, `--syn-type-weight`, `--syn-operator-weight`, `--syn-string-style`, `--gutter-*` (`--gutter-bg` may be a gradient), `--selection`), so only `classic` sets them. In `lib/glossa/theme.ts`, keep one HighlightStyle rule per tag: a later rule for the same tag replaces an earlier one.
  - Every UI and editor color is a CSS token in `globals.css`: `--bg`, `--panel`, `--accent`, `--on-accent`, `--syn-*` for syntax, `--editor-font`. Tailwind exposes them as `bg-panel`, `text-muted`, `bg-accent`, `text-on-accent` and so on. Never hard-code colors.
  - Token blocks are keyed on `[data-theme]`, so any element can preview another theme by carrying the attribute; the panel's previews do this.
  - The active theme is `<html data-theme>`. It's saved in localStorage and applied before paint by `THEME_INIT_SCRIPT`, inlined in the layout's `<head>`; that's why `<html>` has `suppressHydrationWarning`.
  - Components read and set it with `useTheme()` / `setTheme()` in `lib/useTheme.ts`. That file is client-only; `theme.ts` stays server-safe.
  - The editor takes `darkEditorTheme` or `lightEditorTheme` (`lib/glossa/theme.ts`). The two differ only in CodeMirror's dark flag; their colors come from the same tokens.
  - To add a theme: add an entry to `THEMES` and a token block in `globals.css`.
  - **Custom themes.** Users make their own in the Επεκτάσεις panel (`ThemeEditor.tsx`): 11 hex colors, with the other tokens derived by `themeVars()` in `lib/customTheme.ts` (`color-mix` for borders and muted text, dark or light from the background's luminance). They are stored in localStorage (`aepp-custom-themes`) with their generated CSS (`aepp-custom-css`), which `THEME_INIT_SCRIPT` injects as a `<style>` before paint; ids are `custom-[a-z0-9]+` and colors are validated hex, so nothing else reaches the CSS. Read them with `useCustomThemes()`/`useThemeInfo()`; they are per browser, not saved to the account.
- **Layout.** Grid tracks use `minmax(0,1fr)`, not `1fr`, so long code lines scroll inside the editor instead of widening the page on phones.
- Fonts are Inter and JetBrains Mono, both with the Greek subset. JetBrains Mono's ligature draws `<-` as `←`, as the textbook does.
- The root `logo.png` is the original (cloud on black). `public/logo-cloud.png` and `src/app/icon.png` are cut out onto a transparent background (black flood-filled from the edges, rim un-premultiplied, cropped), so the logo sits on any theme. `apple-icon.png` keeps the black, since iOS fills transparency with black anyway.

**Deploy.**
- **Vercel:** set Root Directory to `frontend` and add the `NEXT_PUBLIC_*` env vars. `NEXT_PUBLIC_API_URL` is the Render URL.
- **Render:** Blueprint from `render.yaml`. Only `backend/**` changes deploy. Set `CORS_ORIGINS` to a JSON list of the Vercel domains.
- **Migrations:** these don't run on deploy. Run `alembic upgrade head` against production's `DIRECT_URL`.
- **Supabase Auth:** add `<site>/auth/callback` to the redirect URLs and enable the Google provider.
- **Render free tier:** it sleeps when idle, so the first Εκτέλεση after a pause can take a while.

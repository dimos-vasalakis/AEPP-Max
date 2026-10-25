# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

AEPP-Max is an online fork of the **Διερμηνευτής της ΓΛΩΣΣΑΣ** with an AI agent built in, as Cursor is to VS Code. It is for Γ' Λυκείου students preparing for Πληροφορική (formerly ΑΕΠΠ) in the Greek Panhellenic exams. ΓΛΩΣΣΑ is the Greek teaching pseudo-language of the school textbook, and the exams still use it (Πληροφορική is on 2 June 2027).

The repo is a monorepo:
- `frontend/`: Next.js 16, deployed on Vercel with Root Directory `frontend`.
- `backend/`: FastAPI, deployed on Render via `render.yaml` (Docker).
- `backend/alembic/`: the Supabase Postgres schema and RLS.

Supabase provides Auth, and the agent uses the OpenAI Agents SDK (`openai-agents`). The UI is Greek-only. Code, comments and docs are in English.

## Status

This is a scaffold. Not built yet:
- **Executing programs.** `app/glossa/interpreter.py` `execute()` raises `NotImplementedError`. `/run` already returns syntax errors, but a valid program gets 501, and the agent's tools return `"unavailable"`. Done so far: the lexer, parser, static checks (`checker.py`), AST (`nodes.py`) and `builtins.py`.
- **Step-by-step execution and the trace table (πίνακας τιμών).** The backend contract exists: `trace=true` returns `TraceStep`s.
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
npm run build
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
- It is CPU-bound, so async callers use `asyncio.to_thread`. A thread can't be killed, so `execute` must enforce `RunLimits` itself: steps, wall-clock timeout, output lines and trace length.
- The dataclasses in `result.py` are the `/run` response. `frontend/src/lib/glossa/types.ts` mirrors them, so change both together.

Why the interpreter lives on the backend: one implementation serves the IDE, the agent's tools and, later, exercise checking, which can't trust the client.

**Editor: error marking and autocomplete (no AI, no tokens).**
- **Error marking.** `lib/glossa/lint.ts` sends the code to `POST /api/v1/check` (public) 500 ms after typing stops. That is the same parser `/run` uses, so the editor and Εκτέλεση never disagree. `toDiagnostic` turns the error's line and columns into a red underline, a gutter dot and a hover message. If the backend is unreachable, nothing is marked.
- **Autocomplete.** `lib/glossa/completion.ts` is browser-only. Matching ignores case and accents (`πρ` → ΠΡΟΓΡΑΜΜΑ).
  - At the start of a line it offers whole blocks as snippets (ΑΝ … ΤΕΛΟΣ_ΑΝ, ΓΙΑ, ΟΣΟ, ΕΠΙΛΕΞΕ, the program skeleton, subprograms) plus statement keywords.
  - Mid-line it offers ΤΟΤΕ, ΑΠΟ, operators and built-ins.
  - In both positions it offers the student's own names.
  - Tab accepts a suggestion, then jumps between the block's blanks; Enter stays a plain new line.
- **Shared vocabulary.** `lib/glossa/vocabulary.ts` holds the word lists for both the highlighter and autocomplete. Keep it in sync with `lexer.py`.
- **@uiw/react-codemirror caveat.** It reconfigures the whole editor whenever `extensions`, `theme`, `basicSetup` or `onChange` change identity, which also cancels a snippet's Tab stops. Keep them stable: module constants in `CodeEditor.tsx`, `useCallback` for `updateCode` in `Ide.tsx`.

**Running programs and input.** `POST /api/v1/run` is public, since only the agent costs money.
- `ΔΙΑΒΑΣΕ` reads from `inputs`. When they run out, the status is `needs_input`.
- The IDE then asks for a value and re-runs from the start with that value appended. This is stateless and correct because ΓΛΩΣΣΑ programs are deterministic.
- `OutputPanel`'s `marks` record where each typed value was read, so the values show up inline in the output.
- Status `limit` means an infinite loop, too much output, or the timeout.

**Agent (`backend/app/agent/`).** `POST /api/v1/agent/chat` needs auth. Dependencies run in parameter order (user → `AgentReady` → db), so callers get 401 before a 503.

There is one `Agent` (`tutor.py`, model from `OPENAI_MODEL`) with two modes, like Cursor's Ask/Agent:
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
- `/` is the IDE, `components/ide/Ide.tsx` (a client component): editor, output panel, agent panel.
- The editor is CodeMirror 6 via `@uiw/react-codemirror`. It was chosen over Monaco because it works on phones and has the merge view.
- ΓΛΩΣΣΑ highlighting is a `StreamLanguage` in `lib/glossa/language.ts`, matching keywords without regard to case or accents. Its colors are in `lib/glossa/theme.ts`.
- `lib/api/client.ts` `apiFetch()` adds the Supabase token, and `ApiError.message` carries FastAPI's `detail`.
- `lib/api/agent.ts` `streamChat()` reads the SSE stream with `fetch` plus `lib/api/sse.ts`, because EventSource can't POST or send headers.
- Design tokens are in `globals.css` and give `bg-panel`, `text-muted`, `bg-accent` (the logo red) and so on. It is dark only.
- Fonts are Inter and JetBrains Mono, both with the Greek subset. JetBrains Mono's ligature draws `<-` as `←`, as the textbook does.
- `src/app/icon.png`, `apple-icon.png` and `public/logo.png` are resized from the root `logo.png`.

**Deploy.**
- **Vercel:** set Root Directory to `frontend` and add the `NEXT_PUBLIC_*` env vars. `NEXT_PUBLIC_API_URL` is the Render URL.
- **Render:** Blueprint from `render.yaml`. Only `backend/**` changes deploy. Set `CORS_ORIGINS` to a JSON list of the Vercel domains.
- **Migrations:** these don't run on deploy. Run `alembic upgrade head` against production's `DIRECT_URL`.
- **Supabase Auth:** add `<site>/auth/callback` to the redirect URLs and enable the Google provider.
- **Render free tier:** it sleeps when idle, so the first Εκτέλεση after a pause can take a while.

<p align="center">
  <img src="frontend/public/logo-cloud.png" alt="AEPP-Max" width="96" />
</p>

<h1 align="center">AEPP-Max</h1>

<p align="center">
  <strong>The Διερμηνευτής της ΓΛΩΣΣΑΣ, online, with an AI agent built in.</strong><br />
  For Γ' Λυκείου students preparing for Πληροφορική in the Panhellenic exams.
</p>

---

Students write ΓΛΩΣΣΑ, the pseudo-language of the school textbook, and run it in the browser like in the Διερμηνευτής. An AI assistant sits next to the editor. In **Ερώτηση** mode it explains errors, builds trace tables (πίνακες τιμών) and gives hints. In **Agent** mode it proposes changes that the student accepts or rejects as a diff. It runs code on the real interpreter before it claims anything about its output.

## Stack

| Part | Tech | Hosting |
|---|---|---|
| Frontend | Next.js 16, CodeMirror 6, Tailwind 4 | Vercel |
| Backend | FastAPI, ΓΛΩΣΣΑ interpreter (Python) | Render |
| Agent | OpenAI Agents SDK | (backend) |
| DB & Auth | Supabase (Postgres + Auth), Alembic migrations | Supabase |

## Getting started

```bash
# backend
cd backend && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt && cp .env.example .env
fastapi dev app/main.py

# frontend
cd frontend && npm install && cp .env.example .env.local
npm run dev
```

See [CLAUDE.md](CLAUDE.md) for commands, architecture and deployment, and [docs/glossa.md](docs/glossa.md) for the language rules the interpreter follows.

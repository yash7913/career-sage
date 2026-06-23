# Career Sage — Local Setup Guide

This guide is for collaborators who have access to the git repository and need to run Career Sage locally.

---

## Prerequisites

- Node.js 18+ (for frontend)
- Python 3.13 (for backend)
- Git
- Sublime Text or any code editor

---

## Step 1 — Clone the repo

```cmd
git clone https://github.com/your-org/career-sage.git
cd career-sage
```

---

## Step 2 — Backend setup

```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```
SUPABASE_URL=get_from_yashwanth
SUPABASE_SERVICE_KEY=get_from_yashwanth
ANTHROPIC_API_KEY=get_from_yashwanth
RESEND_API_KEY=get_from_yashwanth
SENTRY_DSN=get_from_yashwanth
APIFY_TOKEN=get_from_yashwanth
OPENAI_API_KEY=get_from_yashwanth
ENVIRONMENT=development
```

> Get the actual values from Yashwanth over a secure channel (not email).

---

## Step 3 — Frontend setup

```cmd
cd frontend
npm install
```

Create a `.env.local` file in the `frontend/` directory:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=get_from_yashwanth
NEXT_PUBLIC_SUPABASE_ANON_KEY=get_from_yashwanth
```

> The anon key is safe to share — it's the public-facing Supabase key.

---

## Step 4 — Supabase access

Ask Yashwanth to invite your email to the Supabase project:
- Supabase Dashboard → Settings → Team → Invite

You need **read access** to run the app locally.
You need **write access** if you're making schema changes.

---

## Step 5 — Run locally

**Terminal 1 — Backend:**
```cmd
cd backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```cmd
cd frontend
npm run dev
```

Open http://localhost:3000

---

## Step 6 — Verify it works

1. Go to http://localhost:3000 — landing page should load
2. Sign in with Google
3. Go to dashboard — Career DNA tab should load
4. Backend terminal should show API requests coming in

---

## Important — What NOT to do

- Never commit `.env` or `.env.local` to git — they are in `.gitignore`
- Never share `SUPABASE_SERVICE_KEY` publicly — it bypasses all security
- Never share `ANTHROPIC_API_KEY` or `RESEND_API_KEY` in Slack or email
- Never push directly to `main` — create a branch and PR

---

## Key accounts (ask Yashwanth for access)

| Service | Purpose | Who has access |
|---|---|---|
| Supabase | Database + auth + storage | Yashwanth |
| Anthropic | Claude API (AI calls) | Yashwanth |
| Vercel | Frontend deployment | Yashwanth |
| Railway | Backend deployment | Yashwanth |
| Resend | Email sending | Yashwanth |
| Sentry | Error monitoring | Yashwanth |
| Apify | Job scraping | Yashwanth |

---

## Deployed URLs

| Environment | URL |
|---|---|
| Frontend (prod) | https://career-sage-sigma.vercel.app |
| Backend (prod) | https://career-sage-production.up.railway.app |
| Frontend (local) | http://localhost:3000 |
| Backend (local) | http://localhost:8000 |
| API docs (local) | http://localhost:8000/docs |

---

## Common issues

**Backend won't start — `ModuleNotFoundError`**
```cmd
venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend 404 errors on JS chunks**
```cmd
cd frontend
rmdir /s /q .next
rmdir /s /q node_modules\.cache
npm run dev
```
Then open a fresh browser window (not a new tab).

**Supabase auth redirect loop**
Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly in `.env.local`.

**Career DNA not loading**
Check that the backend is running on port 8000 and `NEXT_PUBLIC_API_URL=http://localhost:8000` is set.

---

## Architecture overview

```
career-sage/
├── frontend/          # Next.js 14 — runs on port 3000
├── backend/           # FastAPI — runs on port 8000
└── DECISIONS.md       # Why things were built the way they were
```

Full architecture in `ARCHITECTURE.md`.
Full decision log in `DECISIONS.md`.
Key functions reference in `KEY-FUNCTIONS.md`.

---

## Questions?

Read `WORKING-WITH-CLAUDE.md` for how the project is built and maintained.
Ping Yashwanth for anything not covered here.

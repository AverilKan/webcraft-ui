# WebCraft — Front‑End Implementation Plan (Tempo)

This document is a **step‑by‑step guide** for building the **webcraft‑ui** front‑end with Tempo and wiring it to the `webcraft‑core` FastAPI back‑end you already have.  
It assumes you can run commands on macOS/Linux with **pnpm** (or npm) and have basic GitHub access.

---

## 1  Repository Topology

| Repo | Tech | Responsibility |
|------|------|----------------|
| **webcraft‑core** | Python 3.9+, FastAPI, Playwright, SQLite, Redis | Agents, orchestration, REST API (`/jobs`, `/jobs/{id}`, etc.) |
| **webcraft‑ui**  | React, Tailwind, Vite _or_ Next.js β, Tempo | UI, job form, status polling, result viewer |

> **Decision:** Keep UI & back‑end in **separate Git repos** so Tempo can own the UI without touching Python source.

---

## 2  Creating & Pushing `webcraft‑core`

```bash
# Inside your existing backend folder (skip if already pushed)
git init
git remote add origin git@github.com:your‑org/webcraft-core.git
git add .
git commit -m "feat: multi‑agent backend bootstrap"
git branch -M main
git push -u origin main
```

*Verify locally*:

```bash
uvicorn main:app --reload  # should serve http://localhost:8000/openapi.json
```

---

## 3  Scaffolding `webcraft‑ui`

1. **Create repo & Vite scaffold**

```bash
mkdir webcraft-ui && cd $_
pnpm create vite@latest . -- --template react-ts
pnpm install
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p   # generates tailwind.config.cjs & postcss.config.cjs
```

2. **(Recommended) Integrate Shadcn/UI**
   *   Initialize Shadcn/UI: Follow the [official Vite guide](https://ui.shadcn.com/docs/installation/vite).
   *   Install necessary components: `npx shadcn-ui@latest add button input textarea radio-group label badge card ...` (add as needed)

3. **Environment variables**

```bash
echo "VITE_API_URL=http://localhost:8000" > .env
```

4. **Git push**

```bash
git init
git remote add origin git@github.com:your‑org/webcraft-ui.git
git add .
git commit -m "chore: vite + tailwind scaffold"
git push -u origin main
```

5. **Smoke‑test**

```bash
pnpm dev   # http://localhost:5173 shows the Vite splash screen
```

---

## 4  (Alternative) Choosing the Next.js β + Supabase + Stripe stack

Tempo's project wizard currently supports the following check‑box integrations:

| Category | Options | Stable? |
|----------|---------|---------|
| Framework | **Vite** (recommended) · **Next.js** β | Vite ✔️ |
| Auth & DB | **None** · **Supabase** β · Clerk + Convex β | Supabase β |
| Payments | **None** · **Stripe** β · Polar β | Stripe β |

### When to stay on Vite

* Pure client‑side dashboard; SEO not critical.  
* You prefer FastAPI for all server code (auth, Stripe webhooks).

### When to pick Next.js β

* Need server‑side rendering for marketing or dynamic meta tags.  
* Want Supabase RLS sessions handled in React **Server** Components.  
* Prefer Stripe webhooks in a JavaScript API route instead of FastAPI.

> **Note:** You can **start on Vite** and later migrate; Tempo offers a framework‑switcher but you will update import paths manually.

---

## 5  Connecting Tempo

1. Sign in to **tempo.new** → "**New project → Import from GitHub**" → pick `webcraft‑ui`.
2. On the *Setup Integrations* screen: choose **Vite · None · None** for the MVP.
3. Tempo clones the repo, starts a live dev server, and pushes a branch: `tempo/initial-setup`.
4. Open the PR in GitHub, review generated code, then **merge**.
5. **(Post-Merge)** Use Tempo prompts leveraging the installed Shadcn/UI components:
    *   _"Create a React component using Shadcn/UI for a form with..."_
    *   _"Create a StatusDisplay component using Shadcn/UI Badges..."_
    *   _"Create a ResultsView component using Shadcn/UI Card and Button..."_

---

## 6  Component Implementation & State Management

1.  **Install State Management Libraries:**
    ```bash
    pnpm add @tanstack/react-query # Or zustand swr
    pnpm add zustand # Optional, for simple global client state
    pnpm add zod react-hook-form @hookform/resolvers # For form validation
    ```
2.  **Layout & Component Wiring:**
    *   Use Tempo to generate the basic structure for the form, status display, and results area using Shadcn/UI components.
    *   Manually assemble these components in `App.tsx` or dedicated page components.
3.  **State Management Setup:**
    *   Wrap the application with `<QueryClientProvider>` for React Query.
    *   Define React Query hooks (or SWR hooks) for fetching job status and potentially results.
    *   Use `useMutation` for submitting the form via `POST /jobs`.
    *   Use `react-hook-form` with the `zodResolver` for managing form state and validation.
    *   Use Zustand stores if needed for simple global state (e.g., current job ID being tracked).

---

## 7  Stubbing & Implementing API Calls

1.  **API Layer (`/src/lib/api.ts`):**
    *   Define strongly-typed functions for each backend endpoint (`createJob`, `fetchJobStatus`, `fetchJobResult`).
    *   Use `VITE_API_URL` from environment variables.
    *   Implement initial **stub versions** returning promises (as shown previously) for early UI development.
    *   Later, replace stubs with actual `fetch` calls, incorporating React Query's `queryFn` and `mutationFn`.
    *   Centralize base API call logic and error handling if possible.

2.  **Frontend Validation:**
    *   Define `zod` schemas for the form inputs (URL, fields string).
    *   Integrate these schemas with `react-hook-form` to provide instant user feedback.

3.  **Binding UI to State & API:**
    *   Connect form submission (`onSubmit`) to the React Query mutation that calls `api.createJob`.
    *   Use the `jobId` returned from `createJob` to trigger React Query's polling for `api.fetchJobStatus`.
    *   Display status and potential errors using data from React Query hooks.
    *   Enable the download button based on job status and wire its `onClick` to call `api.fetchJobResult` (or construct the download URL directly).

---

## 8  Integrating with `webcraft‑core`

| UI Action | HTTP method & route | Backend Statuses (Examples) | Description |
|-----------|--------------------|-------------------------------|-------------|
| Submit form | `POST /jobs` | `PENDING`                     | Accepts `{url, fields[], format}`, returns `{job_id}` |
| Status poll | `GET /jobs/{id}` | `PENDING`, `FETCHING`, `GENERATING_SCHEMA`, `VALIDATING_SCHEMA`, `SCRAPING`, `COMPLETE`, `FAILED_FETCH`, `FAILED_GENERATION`, `FAILED_VALIDATION`, `FAILED_SCRAPING` | Returns `{status, error_message?}` |
| Download | `GET /jobs/{id}/result?fmt=csv|json` | (Requires `COMPLETE` status) | Sends CSV or JSON payload |

* **Backend:** Needs to return detailed statuses and informative `error_message` on failure.
* **Frontend:** StatusDisplay component should map these detailed statuses to user-friendly text and styles (e.g., badges, icons). Error messages should be displayed clearly.

### FastAPI CORS middleware

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://webcraft-ui.vercel.app"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 9  Local Dev Loop

```bash
# Terminal 1 – back‑end
cd webcraft-core
uvicorn main:app --reload

# Terminal 2 – front‑end
cd webcraft-ui
pnpm dev -- --port 5173
```

Configure **Vite proxy** in `vite.config.ts`:

```ts
export default defineConfig({
  server: {
    proxy: {
      "/jobs": "http://localhost:8000",
    },
  },
});
```

---

## 10  Continuous Integration

### UI (`webcraft-ui/.github/workflows/ci.yml`)

```yaml
name: UI CI
on: [pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 8 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint
      - run: pnpm run build --if-present
```

### Back‑End (`webcraft-core/.github/workflows/ci.yml`)

```yaml
name: Back‑End CI
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with: { python-version: "3.11" }
      - run: pip install -r requirements.txt
      - run: pytest
```

---

## 11  Deployment Pipeline

| Layer | Provider | Trigger |
|-------|----------|---------|
| **Front‑end** | Vercel (`webcraft-ui`) | Push to `main` |
| **Back‑end** | Railway or Fly.io (`webcraft-core`) | Push to `main` |
| **Database** | SQLite (file) + Redis addon | Provisioned in Railway/Fly |
| **Stripe Webhooks** | FastAPI route `/stripe/webhook` | Vercel secret `STRIPE_WEBHOOK_URL` |

---

## 12  Refined Next Steps Checklist

- [ ] Setup `webcraft-core` & `webcraft-ui` repos.
- [ ] Scaffold `webcraft-ui` (Vite + React + TS + Tailwind).
- [ ] **Integrate Shadcn/UI.**
- [ ] Connect Tempo, choose Vite stack, merge PR.
- [ ] **Install React Query/SWR, Zustand (optional), Zod, React Hook Form.**
- [ ] Prompt Tempo to generate Shadcn/UI-based components (Form, StatusDisplay, ResultsView).
- [ ] Create `/src/lib/api.ts` with **typed stubs**.
- [ ] **Setup React Query Provider & React Hook Form.**
- [ ] Assemble UI layout, manage form state with RHF, wire UI events to stubs.
- [ ] Configure Vite Proxy.
- [ ] (Backend) Implement CORS and basic `/jobs` endpoints with **detailed statuses & error messages**.
- [ ] Replace API stubs with **real calls using React Query/SWR** in `api.ts`. Implement status polling.
- [ ] Add frontend validation (`zod` + RHF).
- [ ] Refine UI status and error display based on backend responses.
- [ ] Setup CI/CD.
- [ ] Write e2e Playwright tests for UI.


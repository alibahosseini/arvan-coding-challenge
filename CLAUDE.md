# CLAUDE.md — code-dashboard

Instructions for Claude Code when working anywhere in this repository. This file applies repo-wide. Frontend-specific and backend-specific rules live in `frontend/CLAUDE.md` and `backend/CLAUDE.md` — read the relevant nested file too when working inside that directory.

## Project Overview

Code Dashboard is a submission for the ArvanCloud Frontend Developer Challenge: a browser-based coding dashboard with a Monaco-powered multi-file/multi-tab editor, a file explorer, a simulated terminal-style output console, and a lightweight Go "mock" API that drives the run/loading/error cycle.

Architecture is a classic two-process client/server split:

```
Vue 3 + Vite frontend (frontend/)  ── POST /api/run ──▶  Go backend (backend/)
                                    ◀── {status, output|message} ──
```

- The frontend never hardcodes a backend host — it calls relative paths like `/api/run`. In dev, Vite's dev-server proxy forwards `/api/*` to the backend (`frontend/vite.config.ts`, backend address from `API_PROXY_TARGET`, defaulting to `http://localhost:8080`).
- The backend does not execute submitted code. It validates the payload, sleeps 2–3s to simulate processing, and returns a randomized (~80/20) success/error response. This is intentional — the challenge exercises the frontend's request lifecycle (loading, disabled controls, success/error UI), not a real sandboxed code runner.
- The two sides are independent: the frontend depends only on the backend's HTTP contract, and the backend has no knowledge of the frontend.

## Repository Structure

```
code-dashboard/
├── frontend/     — Vue 3 + Vite single-page app (the dashboard UI)
├── backend/      — Go mock API (stdlib net/http only, no framework)
├── docker-compose.yml — runs both services together
└── README.md     — human-facing project documentation
```

Only `frontend/` and `backend/` exist as top-level project directories — do not assume any other service, package, or nested `code-dashboard/` directory exists.

## Technology Stack

| Layer    | Technology |
| -------- | ---------- |
| Frontend | Vue 3, TypeScript, Vite, Pinia, Tailwind CSS v4, Monaco Editor, reka-ui (headless UI primitives) |
| Backend  | Go (standard library only — `net/http`, no router/framework, no dependencies) |
| Runtime  | Docker (`docker-compose.yml` at repo root builds and runs both services) |

See `frontend/CLAUDE.md` and `backend/CLAUDE.md` for exact versions and per-layer conventions.

## General Development Rules

- Inspect existing code before modifying it — read the relevant component/store/handler in full before changing it.
- Prefer the existing architecture and patterns over introducing new ones (e.g. reuse the existing Pinia store style, the existing `components/ui/*` primitives, the existing stdlib-only backend style).
- Avoid unnecessary dependencies. The backend intentionally has zero external dependencies; the frontend's dependency list is deliberately small — don't add a package when an existing one already covers the need.
- Avoid unnecessary rewrites. A bug fix or small feature doesn't need surrounding refactors.
- Keep changes focused and minimal — don't touch unrelated files or functionality while addressing a specific request.
- Preserve existing behavior unless the user explicitly asks for a behavior change.
- Keep frontend and backend responsibilities separated — the frontend should not embed backend logic, and the backend should stay a generic JSON API with no knowledge of frontend internals.

## Git Rules

- Do not create commits unless explicitly requested.
- Do not push unless explicitly requested.
- Do not rewrite Git history (no amend/rebase/force-push) unless explicitly requested.
- Do not modify unrelated files as part of a commit or change set.

## Verification

After making changes:

- **Frontend**: run `npm run build` in `frontend/` (runs `vue-tsc -b` type-checking plus the Vite build) when changes could affect types or build output. Use `npm run dev` to manually verify UI behavior.
- **Backend**: run `go build ./...` (or `go vet ./...`) in `backend/` to confirm the code compiles; there is no test suite currently (no `*_test.go` files) and no linter configured.
- Verify the specific changed functionality actually works (manually exercise the UI flow, or call the affected endpoint) rather than relying solely on a successful build.
- Report what was changed and what was verified.

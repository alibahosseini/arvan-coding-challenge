# Code Dashboard

A submission for the ArvanCloud FrontEnd Developer Challenge — a unified
dashboard for writing and managing code snippets: a Monaco-based code
editor with multi-file/multi-tab state, a simulated terminal-style output
console, and a lightweight Go mock API that drives the run/loading/error
cycle end to end.

## Challenge Goals

The challenge asked for:

- A code editor UI with real syntax highlighting.
- Advanced client-side state management: multiple open files/tabs that can
  be switched between without losing work, and without requiring a
  database.
- A simulated console/output panel showing execution results.
- A simple mock backend endpoint (no database, no dedicated execution
  sandbox required) that:
  - Validates the incoming payload structure and rejects empty code.
  - Simulates network/processing latency (2–3 seconds).
  - Randomly returns a success response (~80% of the time) or a server
    error (~20% of the time), so the frontend can demonstrate proper
    loading and error-handling states.
- Responsive design for desktop and tablet.

## Key Features

- Monaco-powered code editor with per-language syntax highlighting.
- File explorer with create/rename/move/delete and search-in-files.
- Multi-tab and multi-group (split editor) support, with tab state
  persisted in the browser (no database) so work isn't lost when switching
  tabs.
- Terminal-style output console showing success/error results.
- "Run Code" wired to a real backend request: loading state, disabled
  button while running, and success/error rendering driven entirely by the
  backend's response.
- Resizable, persisted panel widths; responsive layout down to tablet
  width.

## Architecture Overview

```text
┌────────────────────────┐        POST /api/run        ┌──────────────────────┐
│   Vue 3 + Vite frontend │ ───────────────────────────▶│   Go backend (mock)  │
│   (frontend/)           │◀─────────────────────────── │   (backend/)         │
└────────────────────────┘   { status, output/message } └──────────────────────┘
```

- The **frontend** is a Vue 3 + Vite single-page app. It never hardcodes a
  backend host — it calls the relative path `/api/run`.
- In development, the Vite dev server proxies any `/api/*` request to the
  backend server address (configured in `frontend/vite.config.ts`).
- The **backend** is a small, dependency-free Go HTTP server. It does not
  execute the submitted code — it validates the request, waits 2–3 seconds
  to simulate processing, and returns a randomized success/error response.
  This is intentional: the challenge's goal is to exercise the frontend's
  request lifecycle (loading state, disabled controls, success/error UI),
  not to build a real sandboxed code runner.

## Frontend / Backend Relationship

The two projects are independent and communicate purely over HTTP:

- The frontend has no build-time or runtime dependency on the backend's
  source code — it only depends on the backend's HTTP contract
  (`POST /api/run` request/response shape, documented below and in the
  [backend README](backend/README.md)).
- The backend has no knowledge of the frontend — it's a generic JSON API
  that could be called by any client.
- They are developed and run as two separate processes; the frontend's dev
  server proxy is what stitches them together locally without either side
  needing to know the other's actual address.

## Repository Structure

```text
code-dashboard/
├── frontend/                # Vue 3 + Vite application
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── README.md
│
├── backend/                 # Go mock API
│   ├── main.go
│   ├── go.mod
│   ├── Dockerfile
│   └── README.md
│
├── README.md                 # This file
└── .gitignore
```

See [frontend/README.md](frontend/README.md) and
[backend/README.md](backend/README.md) for details specific to each half of
the project.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Starts the frontend development server. See
[frontend/README.md](frontend/README.md) for the full feature breakdown and
how it talks to the API.

## Backend Setup

```bash
cd backend
go run .
```

Starts the backend API server on its configured port (see
[backend/README.md](backend/README.md) for the default and for a
`go build` alternative). No database or extra setup is required.

Both the frontend dev server and the backend API server need to be running
at the same time for "Run Code" to work — they are two separate processes.

## API Overview

| Method | Path             | Purpose                                              |
| ------ | ---------------- | ----------------------------------------------------- |
| GET    | `/health`         | Liveness check for the backend                        |
| POST   | `/api/run`        | Submits code, returns a simulated execution result    |

`POST /api/run` request:

```json
{ "code": "console.log('hello')" }
```

Success response (~80% of requests, after a 2–3s simulated delay):

```json
{ "status": "success", "output": "Hello World" }
```

Error response (~20% of requests, or on invalid payloads):

```json
{ "status": "error", "message": "Something went wrong" }
```

Full validation rules, status codes, and error-handling details are in the
[backend README](backend/README.md).

## Development Workflow

1. Start the backend (`cd backend && go run .`).
2. Start the frontend (`cd frontend && npm run dev`), which proxies `/api`
   requests to the backend.
3. Open the frontend development server's address in a browser, edit a
   file in the dashboard, and click **Run Code** to exercise the full
   request → loading → success/error cycle against the real backend.

## Build Instructions

**Frontend:**

```bash
cd frontend
npm run build
```

Type-checks with `vue-tsc` and produces a production build in
`frontend/dist/`.

**Backend:**

```bash
cd backend
go build -o challenge-api .
```

Produces a standalone binary. A `Dockerfile` is also provided in
`backend/` for an optional containerized build.

## Technology Stack

| Layer     | Technology                                                   |
| --------- | -------------------------------------------------------------- |
| Frontend  | Vue 3, TypeScript, Vite, Pinia, Tailwind CSS v4, Monaco Editor |
| Backend   | Go (standard library only — `net/http`, no framework)         |

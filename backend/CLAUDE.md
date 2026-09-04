# CLAUDE.md — backend

Backend-specific instructions. Read `/CLAUDE.md` first for repo-wide rules — this file only adds what's specific to `backend/`.

## Stack (verified from `go.mod` / `main.go`)

- **Go** `1.27.0` (module `challenge-api` in `go.mod`).
- **Zero external dependencies** — standard library only (`net/http`, `encoding/json`, `log`, `math/rand`, `time`, etc.). Do not add a router/framework or any third-party package unless explicitly requested — the whole point of this backend is a dependency-free mock API.
- **Single file**: all server code lives in `backend/main.go` (~150 lines). No subpackages, no `internal/`, no `cmd/` layout. Keep it that way unless the user asks for a restructure.
- **No test files** (`*_test.go`) currently exist, and no linter is configured.
- **No config/env-var handling** — the port (`8080`) is hardcoded in `main()`. There's no `.env` loading in the server itself (the repo `.gitignore` excludes `backend/.env*`, but nothing in `main.go` reads one).

## Server Architecture

- Built on stdlib `net/http` with `http.HandleFunc` route registration — no router library, no middleware framework.
- `withCORS(handler)` wraps every route: sets `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type`, and short-circuits `OPTIONS` requests with a bare `204`.
- `writeJSON(w, status, body)` is the shared response helper — sets `Content-Type: application/json`, writes the status code, and encodes `body`. Use this helper for any new endpoint rather than hand-rolling response writing.
- Logging is stdlib `log` (`log.Println` / `log.Fatal`) — no structured logging library.

## API Endpoints (verified against `main.go` — do not modify without explicit request)

| Method | Path | Handler | Purpose |
| ------ | ---- | ------- | ------- |
| GET | `/health` | `healthHandler` | Liveness check |
| POST | `/api/validate-code` | `validateCodeHandler` | Legacy/back-compat validation-only endpoint |
| POST | `/api/run` | `runCodeHandler` | The endpoint the frontend's `executeCode` (`frontend/src/services/execution.ts`) actually calls |

All routes are wrapped in `withCORS`.

### `GET /health`

Returns `200 { "message": "API is running" }`.

### `POST /api/validate-code`

- Requires `Content-Type: application/json`.
- Body: `{ "code": "..." }`.
- Validates the request is a POST with valid JSON and non-empty (post-trim) `code`.
- Responses: `405` if method isn't POST; `400` for a bad content-type, malformed JSON, or empty code; `200 { "valid": true, "message": "Code is valid" }` on success. Error shape is `{ "valid": false, "message": "..." }`.
- This endpoint is validation-only — it does not run the code and does not simulate the run lifecycle. It exists for backward compatibility; the frontend does not call it for the "Run Code" flow (that uses `/api/run`).

### `POST /api/run`

- Body: `{ "code": "..." }` (decoded into `RunCodeRequest{ Code string }`), same validation as `/api/validate-code` (non-empty trimmed code required, `400` on failure, `405` if not POST).
- On valid input: sleeps a random 2000–3000ms (`time.Sleep` + `rand.Intn`) to simulate processing latency, then randomly (via `rand.Float64()`, ~80% success / ~20% error) returns either:
  - `200 { "status": "success", "output": "Hello World" }`
  - `500 { "status": "error", "message": "Something went wrong" }`
- **This does not execute the submitted code.** The output is always the fixed string `"Hello World"` on the success path — this is intentionally a mock to exercise the frontend's loading/success/error UI, not a real sandboxed code runner. Do not "fix" it to actually execute code unless explicitly asked to change this behavior.

## Error Handling & Validation Conventions

- Validation failures and method mismatches return JSON error bodies with an explicit status code (`400`, `405`) rather than plain-text errors — follow the same shape (`{ "message": "..." }` or the endpoint-specific `valid`/`status` field) for any new endpoint.
- `/api/run`'s simulated server error (`500`) is a deliberate part of the mock's behavior (~20% of requests), not a bug — don't attempt to eliminate that randomness unless asked.

## Docker

- `backend/Dockerfile` — two-stage build: `golang:1.27-alpine AS builder` (copies `go.mod` and `main.go`, builds via `CGO_ENABLED=0 go build -o challenge-api .`) → runtime stage `alpine:3.20`, copies the built binary, `EXPOSE 8080`, `CMD ["./challenge-api"]`.
- `backend/.dockerignore` excludes `.git`, `.gitignore`, `README.md`, `Dockerfile`, `*.exe`, `server.log`.
- Root `docker-compose.yml` builds this service as `backend`, publishing `8080:8080`; the `frontend` service depends on it and is given `API_PROXY_TARGET=http://backend:8080` so its dev-server proxy can reach this container by service name.

## Build / Run Commands

```bash
cd backend
go run .                          # run directly
go build -o challenge-api .       # produce a standalone binary
go vet ./...                      # closest available check — no test suite exists
```

Via Docker (from repo root): `docker compose up --build` builds and runs both services; the backend alone is reachable at `http://localhost:8080`.

## Verification after changes

- `go build ./...` (or `go run .` and a manual `curl`/browser check against `/health`, `/api/validate-code`, `/api/run`) — there are no automated tests to run.
- Confirm CORS headers and response shapes are unchanged for existing endpoints unless the change was explicitly about them.

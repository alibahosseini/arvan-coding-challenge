# Code Dashboard — Backend API

A minimal Go HTTP API that stands in for a real code-execution backend. It exists
to satisfy the challenge's "Mock API" requirement: no database, no external
services — a single dependency-free server that validates a request, simulates
processing latency, and returns a randomized success/error response so the
frontend can demonstrate real request/response, loading, and error-handling
behavior.

## Overview

The server exposes two endpoints:

- `GET /health` — a simple liveness check.
- `POST /api/run` — accepts a code payload, validates it, waits 2–3 seconds to
  simulate processing, then returns a randomized success (~80%) or error
  (~20%) response.

There is intentionally no database, no code execution sandbox, and no
persistence layer. The `/api/run` endpoint does not actually execute the
submitted code — it is a controlled mock used to exercise the frontend's
loading and error-handling states.

A legacy `POST /api/validate-code` endpoint is also present (payload
validation only, always returns `valid: true` for well-formed input); it
predates `/api/run` and is kept for backward compatibility.

## Technology Stack

- **Go** (standard library only — `net/http`, `encoding/json`, `math/rand`,
  `time`) — no third-party dependencies, no framework.

## Project Structure

```text
backend/
├── main.go            # All HTTP handlers and the entry point
├── go.mod              # Go module definition
├── Dockerfile           # Optional container build (not required to run locally)
└── .dockerignore
```

Everything lives in a single `main.go` file — the service is intentionally
small, so no internal package layout was introduced.

## Setup Requirements

- Go 1.27 or later (see `go.mod`).
- No external services, databases, or environment variables are required.

## Running the Server

From the `backend/` directory:

```bash
go run .
```

Or build a binary first:

```bash
go build -o challenge-api .
./challenge-api
```

On startup the server logs `Server running on :8080` and listens on port
`8080` on the backend server address (see the root [README](../README.md)
for how this pairs with the frontend).

## API Endpoints

### `GET /health`

Liveness check.

**Response `200 OK`:**

```json
{ "message": "API is running" }
```

### `POST /api/run`

Simulates running the submitted code and returns a randomized result.

**Request**

- `Content-Type: application/json` header is required.
- Body:

```json
{ "code": "console.log('hello')" }
```

**Payload validation rules** (checked in order, all return `400 Bad Request`
on failure):

1. `Content-Type` must start with `application/json`.
2. The request body must be valid JSON.
3. The `code` field must be present and non-empty after trimming whitespace.

Validation error response shape:

```json
{ "status": "error", "message": "Code is required" }
```

**Simulated processing delay**

Once validation passes, the handler intentionally sleeps for a randomized
2,000–3,000 ms before responding, to simulate real network/processing
latency. This is what the frontend's loading state and disabled Run button
are designed around.

**Randomized response**

After the delay, the response is chosen randomly:

- **~80% of requests** — `200 OK`, success:

  ```json
  { "status": "success", "output": "Hello World" }
  ```

- **~20% of requests** — `500 Internal Server Error`:

  ```json
  { "status": "error", "message": "Something went wrong" }
  ```

The `output` is always the fixed string `"Hello World"` — this endpoint does
not parse, sandbox, or execute the submitted code; the random 80/20 split and
the fixed output exist purely to exercise the frontend's success/error UI
paths.

## Error Handling

Every error path returns a JSON body of the shape
`{ "status": "error", "message": "..." }` (or, for the legacy
`/api/validate-code` endpoint, `{ "valid": false, "message": "..." }`) with an
appropriate HTTP status code (`400` for validation failures, `405` for
disallowed methods, `500` for the simulated server error). The frontend reads
this shape directly to render its error state.

CORS is enabled on every route (`Access-Control-Allow-Origin: *`) so the
frontend dev server can call the API directly during development.

## How the Frontend Communicates with This API

The frontend never calls this API by absolute host/port. Instead:

1. The Vue/Vite frontend sends requests to a relative path, `/api/run`.
2. In development, Vite's dev server proxy (configured in
   `frontend/vite.config.ts`) forwards any request under `/api` to the
   backend server address.
3. In production, the same relative-path approach means the frontend only
   needs to be served from something that proxies `/api` to wherever this
   Go server is deployed — no hardcoded backend URL lives in the frontend
   source.

See the root [README](../README.md) for the full request flow and the
[frontend README](../frontend/README.md) for how the response is consumed.

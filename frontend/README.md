# Code Dashboard — Frontend

A browser-based code editor dashboard: a Monaco-powered editor with a file
explorer, multi-tab/multi-group editing, an execution console, and an
optional AI assistant panel, wired up to a Go backend that simulates code
execution.

## Project Overview

This is the frontend half of the Code Dashboard challenge submission. It
provides an IDE-like editing experience in the browser — create files and
folders, edit them with real syntax highlighting, keep several files open
across tabs and split panes without losing work, run the active file's code
against the backend, and see the result rendered in a terminal-style output
console.

## Main Features

- **Monaco-based code editor** with per-language syntax highlighting.
- **File explorer** — create, rename, move, and delete files/folders; search
  across files.
- **Multi-file / multi-tab editing** — open several files as tabs, split the
  editor into multiple groups, drag-and-drop tabs to reorder or move them
  between groups, pin tabs, and reopen recently closed tabs.
- **Execution output console** — a dedicated panel below the editor that
  shows the result of running the active file's code, styled like a
  terminal (success/error state, monospace output).
- **Run Code** — sends the active tab's content to the backend, shows a
  loading state and disables the Run button while the request is in
  flight, and renders the backend's success or error response.
- **AI Assistant panel** — a resizable side panel for an AI chat experience
  (UI scaffold; not part of the challenge's core grading criteria).
- **Resizable panels** — the file explorer and AI assistant panels can be
  resized by dragging their edges; widths persist across reloads.
- **Responsive layout** — adapts down to tablet and narrow viewports
  (collapsible explorer, stacked panels).
- **Light/dark theme** toggle.

## Technology Stack

- **Vue 3** (`<script setup>` SFCs) + **TypeScript**
- **Vite** — dev server and build tool
- **Pinia** — state management (editor tabs, settings, theme, AI assistant)
- **Tailwind CSS v4** — styling
- **Monaco Editor** — the code editor engine
- **reka-ui** — headless UI primitives (dialogs, context menus, etc.)
- **lucide-vue-next** — icons

## Project Structure

```text
frontend/
├── src/
│   ├── components/
│   │   ├── CodeEditor/        # Monaco wrapper, tabs, split-group panel
│   │   ├── FileExplorer/      # File/folder tree, inline create/rename
│   │   ├── Search/            # Search-in-files panel
│   │   ├── OutputConsole/     # Execution result / terminal-style output
│   │   ├── ai/                # AI Assistant panel
│   │   └── ui/                # Shared UI primitives (buttons, dialogs, header, sidebar)
│   ├── composables/           # useCodeEditor, useResizablePanel, useKeyboardShortcuts
│   ├── stores/                # Pinia stores: editorTabs, settings, theme, aiAssistant
│   ├── services/               # execution.ts — talks to the backend API
│   ├── types/                  # Shared TypeScript types
│   ├── views/                  # Dashboard.vue — top-level layout
│   └── styles/                 # Global CSS / design tokens
├── public/
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig*.json
```

## Installation

From the `frontend/` directory:

```bash
npm install
```

## Running the Development Server

```bash
npm run dev
```

This starts the Vite dev server (the frontend development server). The
terminal output will print the address it's listening on.

The dev server also proxies API calls — see the next section.

## How the Frontend Communicates with the Backend

The frontend never hardcodes a backend host or port. Instead:

1. `src/services/execution.ts` sends requests to the **relative path**
   `/api/run`.
2. `vite.config.ts` configures a dev server proxy: any request under `/api`
   is forwarded to the configured API base URL (the backend server address,
   currently `http://<backend-host>:<port>` — see the
   [backend README](../backend/README.md) for the default port it listens
   on). This means the frontend code never needs to know the backend's
   actual address during development.
3. In a production deployment, the same relative-path convention is
   expected to be preserved by whatever serves the built frontend (e.g. a
   reverse proxy routing `/api` to the backend).

### API Integration Overview

`executeCode(code: string)` in `src/services/execution.ts`:

1. POSTs `{ "code": "<active tab content>" }` to `/api/run` with a JSON
   content type.
2. Reads the backend's `{ status, output?, message? }` response.
3. Maps it onto the frontend's internal `ExecutionResult` type
   (`{ success, output?, error? }`), which the rest of the UI (the Run
   button, status line, and `OutputConsole`) already consumes.
4. If the network call itself fails (backend unreachable), it returns a
   generic connection-error result instead of throwing.

## The Code Editor

`src/components/CodeEditor/CodeEditor.vue` wraps the `monaco-editor` package
directly (not a third-party Vue wrapper), including per-language web workers
for JSON/CSS/HTML/TypeScript/JavaScript, so editing gets real syntax
highlighting and language services. `EditorGroupPanel.vue` hosts one Monaco
instance per open tab group; `EditorTabs.vue` renders the tab strip for a
group (drag-and-drop reorder, pin/unpin, close, "move to new editor group").

## Multi-File / Multi-Tab Functionality

State lives in the `editorTabs` Pinia store (`src/stores/editorTabs.ts`):

- Files are organized into **groups** (split panes) and **tabs** within each
  group.
- Switching tabs/groups does not touch a server or database — tab and file
  content state is persisted to the browser's `localStorage`, so open tabs,
  unsaved edits, and split-group layout all survive a page reload without
  any backend involvement.
- Dirty-state tracking prevents accidental data loss (closing a tab with
  unsaved changes prompts for confirmation).

## Output Console

`src/components/OutputConsole/OutputConsole.vue` renders directly under the
editor group panel. It has four states: idle ("No output yet"), running
(spinner + "Running your code…"), success (green check + the backend's
`output` text), and error (red X + the backend's `error` message) — styled
with a monospace font to read like a terminal.

## Loading and Error States

Handled in `src/views/Dashboard.vue`'s `runCode()`:

- While a request is in flight, `isRunning` is `true`: the Run button shows
  a spinner and is disabled (`isRunDisabled`), and the status line reads
  "Executing...".
- On success, the status line and output console switch to a success state
  showing the backend's `output`.
- On error (validation failure, simulated server error, or a network
  failure), both switch to an error state showing the backend's message.
- The button and status line always return to their idle/ready state after
  the request settles, whether it succeeded or failed.

## Responsive Design

The layout uses Tailwind breakpoints (`max-[640px]`, `max-[900px]`,
`max-[1100px]`) so it degrades gracefully from desktop down to tablet width:
the file explorer becomes a toggleable overlay, the output console and AI
panel stack instead of sitting side-by-side, and the top navigation
collapses to a horizontal bar.

## Build Instructions

```bash
npm run build
```

This runs a type-check (`vue-tsc -b`) followed by the Vite production build,
producing static assets in `dist/`.

To preview the production build locally:

```bash
npm run preview
```

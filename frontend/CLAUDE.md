# CLAUDE.md — frontend

Frontend-specific instructions. Read `/CLAUDE.md` first for repo-wide rules — this file only adds what's specific to `frontend/`.

## Stack (verified from `package.json` / config files)

- **Vue** `^3.5.41` — Composition API, every component uses `<script setup lang="ts">`.
- **Vite** `^8.2.2` — plugins: `@vitejs/plugin-vue`, `@tailwindcss/vite`. Alias `@` → `./src`. Dev server proxies `/api/*` to `process.env.API_PROXY_TARGET ?? http://localhost:8080` (see `vite.config.ts`).
- **TypeScript** `~6.0.2` — project-references setup (`tsconfig.json` → app + node configs); `tsconfig.app.json` extends `@vue/tsconfig/tsconfig.dom.json`; path alias `@/*` → `./src/*`; strict-ish flags enabled: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.
- **Tailwind CSS** `^4.3.3` — v4, CSS-first config (`@import 'tailwindcss'` in `src/styles/globals.css`), **no** `tailwind.config.js`. Custom design tokens are CSS variables under `:root` / `:root[data-theme='dark']` (`--text`, `--text-h`, `--bg`, `--surface`, `--border`, `--code-bg`, `--accent`, `--success`/`--error`/`--warning`, plus separate "dark developer surface" tokens shared by the editor/console/AI panel regardless of app theme). Fonts: `--sans` (Inter), `--mono` (JetBrains Mono).
- **UI primitives** — shadcn-vue-style local components in `src/components/ui/*`, built on `reka-ui` (headless), styled with `class-variance-authority` (`cva`) + the `cn()` helper (`src/lib/utils.ts`, clsx + tailwind-merge). Existing primitives: `button/`, `dialog/`, `alert-dialog/`, `context-menu/`, `input/`, `textarea/`, plus `AppHeader.vue`. `AppSidebar.vue` exists but is currently disabled/unused. Each primitive folder has an `index.ts` barrel export — **reuse these primitives instead of writing new ad hoc buttons/dialogs/menus.**
- **State management** — Pinia (`^4.0.3`), Composition-API store style (`defineStore('x', () => {...})`) throughout, with `acceptHMRUpdate` wired in every store. Stores: `stores/editorTabs.ts`, `stores/aiAssistant.ts`, `stores/settings.ts`, `stores/theme.ts`.
- **Editor** — raw `monaco-editor` (`^0.56.0`), no wrapper library. `CodeEditor.vue` instantiates and manages Monaco directly.
- **Icons** — `lucide-vue-next`. File-type icons in the explorer/tabs use a large bundled vscode-icons SVG set resolved via `components/FileExplorer/fileIcon.ts`.

## Conventions

- Components: PascalCase filenames (`FileExplorerNode.vue`), always `<script setup lang="ts">`.
- Composables: `useX.ts` in `src/composables/` (e.g. `useCodeEditor.ts`, `useKeyboardShortcuts.ts`, `useResizablePanel.ts`).
- Stores: `useXStore` Composition-API stores in `src/stores/`.
- Types centralized in `src/types/code.ts`.
- Responsive layout uses Tailwind v4 arbitrary max-width variants directly in class lists — no named breakpoints — e.g. `max-[1100px]:*`, `max-[900px]:*`, `max-[640px]:*` (see `views/Dashboard.vue`). When a static utility and a conditionally-applied utility from the same CSS bucket can both be present at once (e.g. a base `hidden` plus a conditional `flex`), Tailwind's generated stylesheet order — not class-attribute order — decides the winner. This codebase resolves that with the `!` important suffix (e.g. `max-[1100px]:flex!`) on the conditional class; follow that pattern for any new toggle-by-class UI rather than assuming class order wins.
- Accessibility is present but ad hoc, not systematic: `role="tablist"`/`aria-selected` on editor tabs, `role="menu"`/`menuitem` on the explorer create-menu, `aria-label` on icon-only controls, `aria-current="page"` on the active file node, `aria-live="polite"`/`role="alert"` on console states, `aria-hidden="true"` on decorative icons. Keep adding these attributes where relevant, but don't assume a full a11y audit has been done.

## Coding Dashboard / Editor Architecture

### File Explorer (`components/FileExplorer/`)

- `FileExplorer.vue` renders `<nav aria-label="Project files">` plus a create-menu (`role="menu"`/`menuitem`) using `InlineCreateInput.vue` for inline (no-popup) naming of new files/folders. Recursion into subfolders is handled by `FileExplorerNode.vue`.
- Supported operations (implemented, verified): create file, create folder, rename, move (drag and drop within the explorer), delete — for both files and folders. Emits: `select` (with a `preview` boolean), `openToSide`, `createFile`, `createFolder`, `renameFile`, `renameFolder`, `moveFile`, `moveFolder`, `deleteFile`, `deleteFolder`.
- Drag-and-drop state is shared via `dragState.ts` (`draggedItem`, `EXPLORER_DND_MIME`), used both for explorer-internal moves and for dragging a file from the explorer onto an editor pane (handled in `EditorGroupPanel.vue`'s capture-phase drop listener, which runs ahead of Monaco's own drop handling).
- File-type icons resolve via `fileIcon.ts`, keyed by lowercased extension, with a default fallback icon for unrecognized extensions. When adding support for a new file extension, add it to `FILE_ICON_MAP` there rather than inventing a separate icon-resolution path.

### Tabs & Editor Groups (`stores/editorTabs.ts`, `components/CodeEditor/EditorTabs.vue`, `EditorGroupPanel.vue`)

State model: `groups: EditorGroup[]` (`{ id, tabIds, activeTabId }`) plus `tabs: Record<string, EditorTab>`. Persisted to `localStorage` under `STORAGE_KEY = 'code-dashboard:editor-state-v2'` via a deep watcher — this is the "no database, don't lose work when switching tabs" requirement from the challenge brief. There is always at least one group.

- **Open file as tab / preview tabs**: `openFile(file, { preview, groupId })` reuses an existing tab for that file if one is already open in the group. When `preview: true` and a clean (non-dirty) preview tab already exists in the group, it is overwritten in place (single-slot preview tab, rendered italic) rather than opening a new tab — this is the "preview tab" behavior (VSCode-style single-click-to-preview, double-click/edit-to-pin). Editing a preview tab auto-promotes it to a permanent tab.
- **Active tab / tab switching**: each group tracks its own `activeTabId`; `setActiveTab(groupId, tabId)` switches it.
- **Dirty state / saving**: `updateTabContent` marks a tab dirty by diffing against `originalContent`. A 700ms-debounced auto-save runs when `settingsStore.autoSaveEnabled` is on. `save` / `saveAll` / `saveAs` / `retrySave` are available; a failed save sets `saveError`, surfaced via an `AlertDialog` in `Dashboard.vue`.
- **Closing tabs**: closing a dirty tab triggers a Promise-based confirmation flow (`requestConfirmation`, resolved by `UnsavedChangesDialog.vue`) before `closeTab` / `closeOthers` / `closeToRight` / `closeAllInGroup` proceed. Pinned tabs are excluded from bulk-close operations. `closeTabsForFile` force-closes tabs when the underlying file is deleted. The last 20 closed tabs are recorded for `reopenClosedTab`.
- **Pinning**: `pinTab` / `unpinTab`; pinned tabs are sorted to the front of the tab strip and lose preview status when pinned.
- **Reordering / moving**: `reorderTab` handles drag-reorder within a group (pinned tabs stay clamped before unpinned ones); `moveTabToGroup` handles cross-group drag, merging into an existing tab for the same file if one is already open in the target group.
- **Split Editor**: `splitGroup(sourceGroupId, tabId?)` — with a `tabId`, moves that tab into a new group. Without one (the "Split Editor" button), it reuses an already-empty group instead of creating a new one, and keeps focus/the shared tab bar on the source group so the open file's tabs don't appear to disappear. `pruneEmptyGroups()` auto-collapses empty split panes whenever a tab is removed or moved out (always keeps at least one group). `closeGroup` closes every tab in a group, then removes the group, unless it's the last remaining one.
- **Reconciliation**: `reconcileWithFiles(existingFileIds)` drops tabs whose backing file no longer exists.
- `EditorGroupPanel.vue` renders `EditorTabs` + `CodeEditor` for a group, or an empty-state ("No file open" + a "Close Editor" button when it isn't the only group). `EditorTabs.vue` renders the tab strip (`role="tablist"`), supports drag-reorder / cross-group drag-and-drop via a custom MIME type (`application/x-code-dashboard-tab`), a right-click context menu (Close / Close Others / Close to Right / Close All / Save / Save As / Pin-Unpin / Move to New Editor Group), and a `wheel` handler that converts vertical mouse-wheel scroll into horizontal tab-strip scroll when tabs overflow (VSCode-style), only when the strip actually has horizontal overflow.

### AI Panel (`stores/aiAssistant.ts`, `services/aiMockService.ts`, `components/ai/AIAssistant.vue`)

**This is a frontend-only mock, not a real AI integration** — do not describe or extend it as if it calls a real model unless explicitly asked to build that. `aiMockService.ts` is explicitly documented in-file as making no network calls and using no API keys; it always returns the fixed string `"This capability will be available soon from Arvan."`, streamed token-by-token with an artificial delay to simulate typing. The store (`useAIAssistantStore`) only manages open/close/message state around that mock.

### Console / Output Panel (`components/OutputConsole/OutputConsole.vue`, `services/execution.ts`)

- `OutputConsole.vue` renders running/idle/success/error states with `role="status"` / `role="alert"` and `aria-live="polite"`, showing output/error text in a `<pre>` block.
- `executeCode(code)` in `services/execution.ts` POSTs `{ code }` as JSON to **`/api/run`** — confirm against `backend/CLAUDE.md` before assuming any other endpoint name is what the frontend actually calls.

### Search Panel (`components/Search/SearchPanel.vue`)

Search-in-files functionality over the open `files` list; wired into the same mobile-collapsible left panel as the File Explorer (toggled via `leftPanel` state and `isExplorerOpen` in `Dashboard.vue`).

## Do not invent functionality

If a feature isn't backed by code found in `stores/`, `components/`, or `services/` (e.g. real AI responses, real code execution, a feature not listed above), do not describe it as implemented — it isn't.

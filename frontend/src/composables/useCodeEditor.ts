import { computed, ref, watch } from 'vue'
import type { CodeFile, FileTreeNode } from '../types/code'

// Maps a file extension to a Monaco-compatible language id. JSX/TSX syntax
// is handled natively by Monaco's javascript/typescript modes, so no
// separate "react" language id is needed. Monaco has no bundled Vue SFC
// grammar, so .vue best-effort falls back to HTML (closest structural match).
const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  html: 'html',
  css: 'css',
  scss: 'scss',
  json: 'json',
  md: 'markdown',
  vue: 'html',
}

export function getLanguageFromPath(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_LANGUAGE_MAP[extension] ?? 'plaintext'
}

function file(path: string, code: string): CodeFile {
  const name = path.split('/').pop() ?? path
  return {
    // A stable id independent of `path` lets a file keep its identity
    // (open tab, undo-relevant state) across renames, which only change
    // `path`/`name`/`language`.
    id: crypto.randomUUID(),
    name,
    path,
    language: getLanguageFromPath(path),
    code,
  }
}

function parentPathOf(path: string): string {
  const segments = path.split('/')
  return segments.slice(0, -1).join('/')
}

// The File Explorer starts empty — the user builds the project structure
// themselves via the "+" menu / folder context menu. Whatever they build
// is persisted to localStorage (this project has no backend/file-system
// API), so it survives a page refresh.
const STORAGE_KEY = 'code-dashboard:files'

interface PersistedFilesState {
  files: CodeFile[]
  folders: string[]
}

function isCodeFile(value: unknown): value is CodeFile {
  if (!value || typeof value !== 'object') return false
  const f = value as Record<string, unknown>
  return (
    typeof f.id === 'string' &&
    typeof f.name === 'string' &&
    typeof f.path === 'string' &&
    typeof f.language === 'string' &&
    typeof f.code === 'string'
  )
}

function loadPersistedFiles(): PersistedFilesState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { files: [], folders: [] }

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { files: [], folders: [] }

    const files = Array.isArray(parsed.files) ? parsed.files.filter(isCodeFile) : []
    const folders = Array.isArray(parsed.folders)
      ? parsed.folders.filter((f: unknown): f is string => typeof f === 'string')
      : []

    return { files, folders }
  } catch {
    // Malformed/inaccessible localStorage (quota, private mode, corrupt JSON) — start clean.
    return { files: [], folders: [] }
  }
}

// Explicit folder paths let empty folders (no files yet) still render in
// the tree; folders implied by a file's path don't need an entry here.
function buildFileTree(files: CodeFile[], folders: string[]): FileTreeNode[] {
  const root: FileTreeNode[] = []

  function ensureFolder(path: string): Extract<FileTreeNode, { type: 'folder' }> {
    const segments = path.split('/')
    let level = root
    let currentPath = ''
    let node: Extract<FileTreeNode, { type: 'folder' }> | undefined

    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment

      node = level.find(
        (n): n is Extract<FileTreeNode, { type: 'folder' }> =>
          n.type === 'folder' && n.path === currentPath
      )

      if (!node) {
        node = { type: 'folder', name: segment, path: currentPath, children: [] }
        level.push(node)
      }

      level = node.children
    }

    return node!
  }

  for (const folderPath of folders) {
    ensureFolder(folderPath)
  }

  for (const codeFile of files) {
    const segments = codeFile.path.split('/')
    const fileName = segments[segments.length - 1]
    const parentPath = segments.slice(0, -1).join('/')
    const level = parentPath ? ensureFolder(parentPath).children : root

    level.push({ type: 'file', id: codeFile.id, name: fileName, path: codeFile.path })
  }

  return root
}

// Module-scope state so every call to useCodeEditor() shares the same file
// system instance (needed once multiple editor groups/panels exist).
const persisted = loadPersistedFiles()

const files = ref<CodeFile[]>(persisted.files)
const folders = ref<string[]>(persisted.folders)
const activeFileId = ref<string>('')

// Snapshot of each file's content when it was first created/loaded, used
// purely to render a "Modified" indicator. Never mutated after creation.
// Files restored from localStorage start clean (their persisted content
// IS the baseline) rather than perpetually "dirty" against a lost original.
const originalCode = new Map<string, string>(persisted.files.map((f) => [f.id, f.code]))

const activeFile = computed(() =>
  files.value.find((file) => file.id === activeFileId.value) ?? null
)

const fileTree = computed(() => buildFileTree(files.value, folders.value))

watch(
  [files, folders],
  () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ files: files.value, folders: folders.value }))
    } catch {
      // Storage full or unavailable — the project still works for this session, just won't persist.
    }
  },
  { deep: true }
)

export function useCodeEditor() {

  // Generalized so any open tab (not just the composable's own internal
  // "current" pointer) can check its own dirty state independently.
  function isFileModified(id: string): boolean {
    const file = files.value.find((f) => f.id === id)
    if (!file) return false
    return originalCode.get(file.id) !== file.code
  }

  const isActiveFileModified = computed(() =>
    activeFile.value ? isFileModified(activeFile.value.id) : false
  )

  function createFile(path: string, initialContent = '') {
    const existing = files.value.find((f) => f.path === path)
    if (existing) {
      setActiveFile(existing.id)
      return existing
    }

    const newFile = file(path, initialContent)
    originalCode.set(newFile.id, initialContent)
    files.value.push(newFile)
    activeFileId.value = newFile.id
    return newFile
  }

  function createFolder(path: string) {
    if (!folders.value.includes(path)) {
      folders.value.push(path)
    }
  }

  // Shared by the File Explorer's create/rename dialogs to validate a
  // candidate path before ever calling a mutating function below.
  function isPathTaken(path: string, excludeFileId?: string): boolean {
    const fileConflict = files.value.some((f) => f.path === path && f.id !== excludeFileId)
    const folderConflict = folders.value.includes(path)
    return fileConflict || folderConflict
  }

  function selectFallbackActiveFile(removedIds: Set<string>) {
    if (removedIds.has(activeFileId.value)) {
      activeFileId.value = files.value[0]?.id ?? ''
    }
  }

  function deleteFile(id: string) {
    files.value = files.value.filter((file) => file.id !== id)
    originalCode.delete(id)
    selectFallbackActiveFile(new Set([id]))
  }

  function deleteFolder(path: string) {
    const prefix = `${path}/`
    const removedIds = new Set(
      files.value.filter((f) => f.path === path || f.path.startsWith(prefix)).map((f) => f.id)
    )

    files.value = files.value.filter((f) => !removedIds.has(f.id))
    removedIds.forEach((id) => originalCode.delete(id))
    folders.value = folders.value.filter((f) => f !== path && !f.startsWith(prefix))
    selectFallbackActiveFile(removedIds)
  }

  // Only `name`/`path`/`language` change; `id` and `code` stay untouched,
  // so the active file (if this is it) stays open with its content intact
  // and the editor picks up the new language automatically via its
  // existing `language` prop watcher. Shared by `renameFile` (new name,
  // same parent) and `moveFile` (same name, new parent).
  function relocateFile(id: string, newPath: string) {
    const target = files.value.find((f) => f.id === id)
    if (!target) return

    if (newPath === target.path) return
    if (isPathTaken(newPath, id)) return

    target.name = newPath.split('/').pop() ?? newPath
    target.path = newPath
    target.language = getLanguageFromPath(newPath)
  }

  function renameFile(id: string, newName: string) {
    const trimmed = newName.trim()
    if (!trimmed) return

    const target = files.value.find((f) => f.id === id)
    if (!target) return

    const parent = parentPathOf(target.path)
    relocateFile(id, parent ? `${parent}/${trimmed}` : trimmed)
  }

  // Moves a file into `targetFolderPath` (its new parent), keeping its
  // name. Dropping onto the file's current parent is a harmless no-op
  // since `relocateFile` already bails out when `newPath === target.path`.
  function moveFile(id: string, targetFolderPath: string) {
    const target = files.value.find((f) => f.id === id)
    if (!target) return

    relocateFile(id, targetFolderPath ? `${targetFolderPath}/${target.name}` : target.name)
  }

  // Shared by `renameFolder` (new name, same parent) and `moveFolder`
  // (same name, new parent): rewrites `oldPath` (and everything nested
  // under it, in both `folders` and `files`) to `newPath`.
  function movePathPrefix(oldPath: string, newPath: string) {
    if (newPath === oldPath) return
    if (isPathTaken(newPath)) return

    const oldPrefix = `${oldPath}/`
    const newPrefix = `${newPath}/`

    folders.value = folders.value.map((f) => {
      if (f === oldPath) return newPath
      if (f.startsWith(oldPrefix)) return newPrefix + f.slice(oldPrefix.length)
      return f
    })

    files.value.forEach((f) => {
      if (f.path.startsWith(oldPrefix)) {
        f.path = newPrefix + f.path.slice(oldPrefix.length)
      }
    })
  }

  function renameFolder(oldPath: string, newName: string) {
    const trimmed = newName.trim()
    if (!trimmed) return

    const parent = parentPathOf(oldPath)
    movePathPrefix(oldPath, parent ? `${parent}/${trimmed}` : trimmed)
  }

  // Moves a folder (and its whole subtree) into `targetParentPath`. Moving
  // into itself or one of its own descendants is rejected by the caller
  // (see `isValidDropTarget`) before this ever runs; dropping onto its
  // current parent is a harmless no-op via `movePathPrefix`'s own guard.
  function moveFolder(oldPath: string, targetParentPath: string) {
    if (targetParentPath === oldPath || targetParentPath.startsWith(`${oldPath}/`)) return

    const name = oldPath.split('/').pop() ?? oldPath
    movePathPrefix(oldPath, targetParentPath ? `${targetParentPath}/${name}` : name)
  }

  function updateCode(id: string, code: string) {
    const file = files.value.find((f) => f.id === id)
    if (file) file.code = code
  }

  function setActiveFile(id: string) {
    activeFileId.value = id
  }

  return {
    files,
    folders,
    activeFileId,
    activeFile,
    fileTree,
    isActiveFileModified,
    isFileModified,
    isPathTaken,
    createFile,
    createFolder,
    deleteFile,
    deleteFolder,
    renameFile,
    renameFolder,
    moveFile,
    moveFolder,
    updateCode,
    setActiveFile,
  }
}

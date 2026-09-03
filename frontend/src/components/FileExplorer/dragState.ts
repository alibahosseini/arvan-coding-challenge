import { ref } from 'vue'

// Custom MIME used to recognize explorer-originated drags (vs. e.g. an OS
// file drag) so a folder's dragover handler only reacts to draggable nodes
// from this tree.
export const EXPLORER_DND_MIME = 'application/x-code-dashboard-explorer-item'

export interface DraggedExplorerItem {
  kind: 'file' | 'folder'
  id?: string
  path: string
}

// Module-scope (not component state) because the dragged item is set by
// whichever node's dragstart fires and read by whichever folder node the
// pointer is currently over — two different component instances. Browsers
// don't expose dataTransfer's payload during dragover/dragenter (only
// during drop), so a shared ref is what actually lets folders compute a
// live valid/invalid drop-target state while the drag is in progress.
export const draggedItem = ref<DraggedExplorerItem | null>(null)

// The single folder path currently accepting the drop, kept as shared state
// (rather than a per-node local boolean) so that when the pointer moves from
// a folder row into one of its own nested descendant folders, the browser
// never fires `dragleave` on the ancestor (the pointer never actually left
// its bounding box) — with per-node state that left the ancestor's highlight
// stuck "on". A single shared "active path" is instead just overwritten by
// whichever folder's dragover fires last, so only the deepest hovered folder
// is ever highlighted.
export const dropTargetPath = ref<string | null>(null)

// Dropping a folder onto itself or into one of its own descendants would
// either no-op or corrupt the tree (a path can't be moved inside its own
// prefix), so both are rejected before ever reaching the move functions.
export function isValidDropTarget(item: DraggedExplorerItem, targetFolderPath: string): boolean {
  if (item.kind === 'folder') {
    if (targetFolderPath === item.path) return false
    if (targetFolderPath.startsWith(`${item.path}/`)) return false
  }
  return true
}

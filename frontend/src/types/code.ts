export interface CodeFile {
  id: string
  name: string
  path: string
  language: string
  code: string
}

export interface ExecutionResult {
  success: boolean
  output?: string
  error?: string
}

export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error'

export interface FileTreeFileNode {
  type: 'file'
  id: string
  name: string
  path: string
}

export interface FileTreeFolderNode {
  type: 'folder'
  name: string
  path: string
  children: FileTreeNode[]
}

export type FileTreeNode = FileTreeFileNode | FileTreeFolderNode

export type FileSystemTarget =
  | { type: 'file'; id: string; path: string; name: string }
  | { type: 'folder'; path: string; name: string }

export interface EditorTab {
  id: string
  fileId: string
  path: string
  name: string
  language: string
  content: string
  originalContent: string
  isDirty: boolean
  isPinned: boolean
  isPreview: boolean
  groupId: string
}

export interface EditorGroup {
  id: string
  tabIds: string[]
  activeTabId: string | null
}

export interface ClosedTabRecord {
  fileId: string
  path: string
  name: string
  language: string
  groupId: string
}

export type PendingConfirmationKind =
  | 'close'
  | 'close-others'
  | 'close-right'
  | 'close-all'
  | 'replace-preview'
  | 'move-group'

export interface PendingConfirmation {
  kind: PendingConfirmationKind
  tabIds: string[]
  groupId: string
  resolve: (choice: 'save' | 'discard' | 'cancel') => void
}

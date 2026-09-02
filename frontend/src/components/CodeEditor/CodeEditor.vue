<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import * as monaco from 'monaco-editor'

import editorWorker from 'monaco-editor/editor/editor.worker.js?worker'
import jsonWorker from 'monaco-editor/language/json/json.worker.js?worker'
import cssWorker from 'monaco-editor/language/css/css.worker.js?worker'
import htmlWorker from 'monaco-editor/language/html/html.worker.js?worker'
import tsWorker from 'monaco-editor/language/typescript/ts.worker.js?worker'

// Wires Monaco's web workers for Vite. Assignment only, no DOM access,
// so it is safe to run at module evaluation time.
self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    switch (label) {
      case 'json':
        return new jsonWorker()
      case 'css':
      case 'scss':
      case 'less':
        return new cssWorker()
      case 'html':
      case 'handlebars':
      case 'razor':
        return new htmlWorker()
      case 'typescript':
      case 'javascript':
        return new tsWorker()
      default:
        return new editorWorker()
    }
  },
}

const props = withDefaults(
  defineProps<{
    tabId: string | null
    content: string
    language?: string
    theme?: string
    openTabIds: string[]
  }>(),
  {
    language: 'javascript',
    theme: 'vs-dark',
  }
)

const emit = defineEmits<{
  'update:content': [tabId: string, value: string]
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const editorRef = shallowRef<monaco.editor.IStandaloneCodeEditor | null>(null)

// One Monaco text model per open tab so each tab keeps its own undo
// history, cursor position and scroll offset when switching between tabs.
const models = new Map<string, monaco.editor.ITextModel>()
const viewStates = new Map<string, monaco.editor.ICodeEditorViewState>()
let currentTabId: string | null = null

function getOrCreateModel(tabId: string, content: string, language: string): monaco.editor.ITextModel {
  let model = models.get(tabId)
  if (!model) {
    model = monaco.editor.createModel(content, language)
    // Attached per-model (not per-editor) so every keystroke is reported for
    // the exact tab it belongs to, with no dependency on editor-level
    // bookkeeping of "which tab is currently active" being perfectly in sync.
    model.onDidChangeContent(() => {
      emit('update:content', tabId, model!.getValue())
    })
    models.set(tabId, model)
  }
  return model
}

function disposeModel(tabId: string) {
  const model = models.get(tabId)
  if (model) {
    model.dispose()
    models.delete(tabId)
  }
  viewStates.delete(tabId)
}

function switchToTab(tabId: string | null, content: string, language: string) {
  const editor = editorRef.value
  if (!editor) return

  if (currentTabId) {
    const state = editor.saveViewState()
    if (state) viewStates.set(currentTabId, state)
  }

  if (!tabId) {
    editor.setModel(null)
    currentTabId = null
    return
  }

  const model = getOrCreateModel(tabId, content, language)
  editor.setModel(model)

  const savedState = viewStates.get(tabId)
  if (savedState) editor.restoreViewState(savedState)

  currentTabId = tabId
}

onMounted(() => {
  if (!containerRef.value) return

  const editor = monaco.editor.create(containerRef.value, {
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    wordWrap: 'off',
    scrollBeyondLastLine: false,
    tabSize: 2,
    padding: { top: 12 },
    readOnly: false,
    theme: props.theme,
    // Hover/suggest/parameter-hint widgets are positioned `fixed` against
    // the viewport instead of trying to stay inside our clipped, rounded
    // editor container (`overflow-hidden` on the parent panel). Without
    // this, tooltips can escape their intended bounds and overlap other
    // UI (e.g. the app header).
    fixedOverflowWidgets: true,
  })

  editorRef.value = editor

  switchToTab(props.tabId, props.content, props.language)
})

onBeforeUnmount(() => {
  editorRef.value?.dispose()
  editorRef.value = null
  models.forEach((model) => model.dispose())
  models.clear()
  viewStates.clear()
})

watch(
  () => props.tabId,
  (tabId) => {
    switchToTab(tabId, props.content, props.language)
  }
)

// Handles content replacement while staying on the same tab id — e.g. a
// preview tab getting swapped to a different file, or a reopened tab.
watch(
  () => props.content,
  (content) => {
    const editor = editorRef.value
    if (!editor || !props.tabId || props.tabId !== currentTabId) return
    if (editor.getValue() !== content) {
      editor.setValue(content)
    }
  }
)

watch(
  () => props.language,
  (language) => {
    const editor = editorRef.value
    const model = editor?.getModel()
    if (model) {
      monaco.editor.setModelLanguage(model, language)
    }
  }
)

// Garbage-collect models for tabs that are no longer open in this group.
watch(
  () => props.openTabIds,
  (openIds) => {
    const openSet = new Set(openIds)
    for (const id of Array.from(models.keys())) {
      if (!openSet.has(id)) disposeModel(id)
    }
  },
  { deep: true }
)

function revealLine(lineNumber: number) {
  const editor = editorRef.value
  if (!editor) return
  editor.revealLineInCenter(lineNumber)
  editor.setPosition({ lineNumber, column: 1 })
  editor.focus()
}

defineExpose({ revealLine })
</script>

<template>
  <div class="monaco-shell relative w-full flex-1 min-h-[200px] bg-surface-dark">
    <div ref="containerRef" class="h-full w-full" role="presentation" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Sparkles, SplitSquareHorizontal, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useEditorTabsStore } from '../../stores/editorTabs'
import { useAIAssistantStore } from '../../stores/aiAssistant'
import CodeEditor from './CodeEditor.vue'
import EditorTabs from './EditorTabs.vue'

const props = defineProps<{
  groupId: string
  isOnlyGroup: boolean
  isFirstGroup: boolean
}>()

const emit = defineEmits<{
  saveAs: [tabId: string]
}>()

const store = useEditorTabsStore()
const aiStore = useAIAssistantStore()

const group = computed(() => store.groups.find((g) => g.id === props.groupId) ?? null)
const activeTab = computed(() => (group.value?.activeTabId ? store.tabs[group.value.activeTabId] : null))
const openTabIds = computed(() => group.value?.tabIds ?? [])

function focusGroup() {
  store.setActiveGroup(props.groupId)
}

function onContentUpdate(tabId: string, value: string) {
  store.updateTabContent(tabId, value)
}

function splitThisGroup() {
  store.splitGroup(props.groupId)
}

function closeThisGroup() {
  void store.closeGroup(props.groupId)
}

const codeEditorRef = ref<InstanceType<typeof CodeEditor> | null>(null)

function revealLine(tabId: string, lineNumber: number) {
  if (activeTab.value?.id === tabId) {
    codeEditorRef.value?.revealLine(lineNumber)
  }
}

defineExpose({ revealLine, groupId: props.groupId })
</script>

<template>
  <section
    class="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-border last:border-r-0"
    @click="focusGroup"
    @focusin="focusGroup"
  >
    <div class="flex items-stretch justify-between border-b border-border">
      <EditorTabs :group-id="groupId" class="min-w-0 flex-1" @save-as="(id) => emit('saveAs', id)" />
      <div class="flex shrink-0 items-center gap-1 px-1">
        <template v-if="isFirstGroup">
          <Button variant="ghost" size="icon" class="h-6 w-6" title="Split Editor" aria-label="Split editor" @click.stop="splitThisGroup">
            <SplitSquareHorizontal :size="14" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6"
            title="AI Assistant"
            aria-label="Open AI Assistant"
            @click.stop="aiStore.toggle"
          >
            <Sparkles :size="14" />
          </Button>
        </template>
        <Button
          v-if="!isOnlyGroup"
          variant="ghost"
          size="icon"
          class="h-6 w-6"
          title="Close Editor Group"
          aria-label="Close editor group"
          @click.stop="closeThisGroup"
        >
          <X :size="14" />
        </Button>
      </div>
    </div>

    <CodeEditor
      v-if="activeTab"
      ref="codeEditorRef"
      :tab-id="activeTab.id"
      :content="activeTab.content"
      :language="activeTab.language"
      :open-tab-ids="openTabIds"
      @update:content="onContentUpdate"
    />
    <div v-else class="flex flex-1 flex-col items-center justify-center gap-1 bg-surface-dark text-center text-text-dark">
      <p>No file open</p>
      <p class="text-[12.5px] text-text-dark-muted">Select a file from the explorer to start editing.</p>
    </div>
  </section>
</template>

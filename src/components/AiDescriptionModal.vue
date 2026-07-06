<script setup lang="ts">
import type { JiraAdfDocument } from '@/types/jira'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import JiraDescriptionEditor from '@/components/JiraDescriptionEditor.vue'
import { useAiSettings } from '@/composables/useAiSettings'
import { useGenerateAiDescription } from '@/composables/useGenerateAiDescription'
import { getProviderLabel } from '~/shared/ai'
import { coerceDescriptionToAdf } from '~/shared/jiraAdf'

const props = defineProps<{
  open: boolean
  currentDescription: string
  currentDescriptionAdf?: JiraAdfDocument | null
  ticketKey: string
  ticketTitle: string
  isSaving: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [descriptionAdf: JiraAdfDocument | null]
}>()

const proposedDescription = ref<JiraAdfDocument | null>(null)
const proposedDescriptionEditorRef = ref<{ focusEditor: () => void } | null>(null)
const promptText = ref('')
const generationError = ref<string | null>(null)
const { settings: aiSettings } = useAiSettings()
const generateMutation = useGenerateAiDescription()

const isProcessing = computed(() => generateMutation.isPending.value)
const canGenerate = computed(() => promptText.value.trim().length > 0 && !isProcessing.value)

watch(() => props.open, (isOpen: boolean) => {
  if (isOpen) {
    document.addEventListener('keydown', handleModalKeydown, true)
    proposedDescription.value = coerceDescriptionToAdf(props.currentDescription, props.currentDescriptionAdf ?? undefined)
    promptText.value = ''
    generationError.value = null
    nextTick(() => {
      proposedDescriptionEditorRef.value?.focusEditor()
    })
    return
  }

  document.removeEventListener('keydown', handleModalKeydown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleModalKeydown, true)
})

function closeModal() {
  if (props.isSaving)
    return
  emit('close')
}

function handleModalKeydown(event: KeyboardEvent) {
  if (!props.open || event.key !== 'Escape')
    return
  event.preventDefault()
  closeModal()
}

function confirmChanges() {
  emit('confirm', proposedDescription.value)
}

async function generateDescription(): Promise<void> {
  if (!canGenerate.value) {
    return
  }

  generationError.value = null

  try {
    const response = await generateMutation.mutateAsync({
      key: props.ticketKey,
      input: {
        instruction: promptText.value.trim(),
        currentDescriptionAdf: proposedDescription.value,
        provider: aiSettings.value.provider,
        model: aiSettings.value.model,
      },
    })

    proposedDescription.value = response.descriptionAdf
  }
  catch (error: unknown) {
    generationError.value = error instanceof Error ? error.message : 'Failed to generate description.'
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
        @click.self="closeModal"
      >
        <div class="flex max-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-surface-0 shadow-xl shadow-black/40">
          <div class="flex min-h-12 items-center justify-between gap-4 border-b border-white/[0.06] px-4">
            <div class="flex min-w-0 items-center gap-2 text-xs text-slate-500">
              <span class="inline-flex h-5 w-5 items-center justify-center rounded-md border border-white/[0.08] text-[11px] text-slate-400">*</span>
              <span>Improve description</span>
              <span class="text-slate-700">/</span>
              <span class="font-medium text-slate-300">{{ ticketKey }}</span>
            </div>
            <button
              type="button"
              class="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isSaving"
              aria-label="Close"
              @click="closeModal"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                <path stroke-linecap="round" d="M4.25 4.25l7.5 7.5M11.75 4.25l-7.5 7.5" />
              </svg>
            </button>
          </div>

          <div class="grid min-h-[360px] min-w-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div class="flex min-w-0 flex-1 flex-col overflow-hidden border-b border-white/[0.06] px-4 py-3 lg:border-b-0 lg:border-r">
              <div class="mb-3 min-w-0">
                <h2 class="truncate text-[15px] font-medium text-slate-100">
                  {{ ticketTitle || ticketKey }}
                </h2>
                <p class="mt-0.5 text-[12px] text-slate-600">
                  Proposed description
                </p>
              </div>
              <div class="min-h-0 flex-1 overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.015]">
                <JiraDescriptionEditor
                  ref="proposedDescriptionEditorRef"
                  v-model="proposedDescription"
                  placeholder="The proposed description will appear here..."
                />
              </div>
            </div>

            <aside class="flex min-w-0 flex-col overflow-y-auto px-4 py-3">
              <div class="mb-4 overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.015]">
                <div class="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 border-b border-white/[0.05] px-3 py-2">
                  <span class="text-[12px] text-slate-600">Provider</span>
                  <span class="truncate text-[13px] text-slate-300">{{ getProviderLabel(aiSettings.provider) }}</span>
                </div>
                <div class="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 px-3 py-2">
                  <span class="text-[12px] text-slate-600">Model</span>
                  <span class="truncate text-[13px] text-slate-300">{{ aiSettings.model }}</span>
                </div>
              </div>

              <label for="ai-description-instruction" class="mb-2 text-[12px] font-medium text-slate-400">Instruction</label>
              <textarea
                id="ai-description-instruction"
                v-model="promptText"
                class="min-h-[112px] w-full resize-y rounded-md border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[13px] leading-5 text-slate-300 outline-none transition placeholder:text-slate-600 focus:border-white/[0.16] focus:bg-white/[0.04]"
                placeholder="Describe how the description should change..."
              />

              <p v-if="generationError" class="mt-3 rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-200">
                {{ generationError }}
              </p>

              <button
                type="button"
                class="mt-3 inline-flex h-8 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.04] px-3 text-[13px] font-medium text-slate-200 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!canGenerate"
                @click="generateDescription"
              >
                {{ isProcessing ? 'Generating...' : 'Generate' }}
              </button>
            </aside>
          </div>

          <div class="flex min-h-12 items-center justify-between gap-3 border-t border-white/[0.06] px-4">
            <div class="text-[11px] text-slate-600">
              Edit the proposed description before applying it.
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="inline-flex h-7 items-center rounded-md border border-white/[0.08] px-2.5 text-xs text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="isSaving"
                @click="closeModal"
              >
                Cancel
              </button>
              <button
                type="button"
                class="inline-flex h-7 items-center rounded-md bg-accent-indigo px-2.5 text-xs font-medium text-white transition hover:bg-accent-indigo/90 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isSaving"
                @click="confirmChanges"
              >
                {{ isSaving ? 'Saving...' : 'Apply' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

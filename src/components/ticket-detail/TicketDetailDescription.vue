<script setup lang="ts">
import type { JiraAdfDocument, JiraAdfNode, JiraAttachment, JiraTicket } from '@/types/jira'
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import JiraDescriptionEditor from '@/components/JiraDescriptionEditor.vue'
import { useUpdateTicketDescription } from '@/composables/useUpdateTicketDescription'
import { useUploadTicketAttachment } from '@/composables/useUploadTicketAttachment'
import { coerceDescriptionToAdf, isSupportedEditorAdf } from '~/shared/jiraAdf'
import { isLocalTicketKey } from '~/shared/localTickets'

const props = defineProps<{
  detailLoaded: boolean
  isLocalTicket: boolean
  ticket: JiraTicket
}>()

const emit = defineEmits<{
  previewImage: [payload: { src: string, alt: string }]
}>()

type DescriptionSaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

const DESCRIPTION_SAVE_DEBOUNCE_MS = 3000
const DESCRIPTION_SAVED_MESSAGE_MS = 3000
const descriptionEditorRef = ref<{ focusEditor: () => void, blurEditor: () => void } | null>(null)
const descriptionEditorShellRef = ref<HTMLDivElement | null>(null)
const descriptionEditorActive = ref(false)
const descriptionDraft = ref<JiraAdfDocument | null>(null)
const descriptionDraftTicketKey = ref<string | null>(null)
const descriptionPersistedSignature = ref(adfSignature(null))
const descriptionSaveStatus = ref<DescriptionSaveStatus>('idle')
const descriptionSaveError = ref<string | null>(null)
const descriptionSaveTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const descriptionSavedMessageTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const descriptionSaveInFlight = ref(false)
const isSyncingDescriptionDraft = ref(false)

const updateDescriptionMutation = useUpdateTicketDescription()
const uploadTicketAttachmentMutation = useUploadTicketAttachment()

const descriptionHasUnsupportedContent = computed(() => {
  const descriptionAdf = props.ticket.descriptionAdf
  return !!descriptionAdf && !isSupportedEditorAdf(descriptionAdf)
})

function getEditableDescriptionAdf(nextTicket: JiraTicket | null): JiraAdfDocument | null {
  if (!nextTicket)
    return null

  return coerceDescriptionToAdf(nextTicket.description, nextTicket.descriptionAdf)
}

function adfSignature(doc: JiraAdfDocument | null): string {
  return JSON.stringify(doc)
}

function nodeHasUploadState(node: JiraAdfNode, state: 'pending' | 'error'): boolean {
  if (node.type === 'media' && node.attrs?.uploadState === state)
    return true
  return node.content?.some(child => nodeHasUploadState(child, state)) ?? false
}

function descriptionHasUploadState(doc: JiraAdfDocument | null, state: 'pending' | 'error'): boolean {
  return doc?.content.some(node => nodeHasUploadState(node, state)) ?? false
}

function clearDescriptionSaveTimer(): void {
  if (!descriptionSaveTimer.value)
    return
  clearTimeout(descriptionSaveTimer.value)
  descriptionSaveTimer.value = null
}

function clearDescriptionSavedMessageTimer(): void {
  if (!descriptionSavedMessageTimer.value)
    return
  clearTimeout(descriptionSavedMessageTimer.value)
  descriptionSavedMessageTimer.value = null
}

function hideDescriptionSavedMessageSoon(): void {
  clearDescriptionSavedMessageTimer()
  descriptionSavedMessageTimer.value = setTimeout(() => {
    if (descriptionSaveStatus.value === 'saved' && !isDescriptionDraftDirty()) {
      descriptionSaveStatus.value = 'idle'
    }
    descriptionSavedMessageTimer.value = null
  }, DESCRIPTION_SAVED_MESSAGE_MS)
}

function isDescriptionDraftDirty(): boolean {
  return adfSignature(descriptionDraft.value) !== descriptionPersistedSignature.value
}

const descriptionHasPendingImageUpload = computed(() => descriptionHasUploadState(descriptionDraft.value, 'pending'))
const descriptionHasFailedImageUpload = computed(() => descriptionHasUploadState(descriptionDraft.value, 'error'))

function syncDescriptionDraftFromTicket(nextTicket: JiraTicket | null): void {
  clearDescriptionSaveTimer()
  clearDescriptionSavedMessageTimer()
  isSyncingDescriptionDraft.value = true
  const nextDraft = getEditableDescriptionAdf(nextTicket)
  descriptionDraft.value = nextDraft
  descriptionDraftTicketKey.value = nextTicket?.key ?? null
  descriptionPersistedSignature.value = adfSignature(nextDraft)
  descriptionSaveError.value = null
  descriptionSaveStatus.value = 'idle'
  nextTick(() => {
    isSyncingDescriptionDraft.value = false
  })
}

function scheduleDescriptionAutosave(): void {
  clearDescriptionSaveTimer()
  clearDescriptionSavedMessageTimer()
  descriptionSaveTimer.value = setTimeout(() => {
    void flushDescriptionAutosave()
  }, DESCRIPTION_SAVE_DEBOUNCE_MS)
}

function focusDescriptionEditor(): void {
  // Never activate the editor against a partial ticket — its empty draft
  // would block the resync of the real description and get autosaved over it.
  if (!props.detailLoaded)
    return
  descriptionEditorActive.value = true
  nextTick(() => {
    descriptionEditorRef.value?.focusEditor()
  })
}

function blurDescriptionEditor(): void {
  descriptionEditorRef.value?.blurEditor()
  descriptionEditorActive.value = false
  void flushDescriptionAutosave()
}

function handleDescriptionFocusIn(): void {
  descriptionEditorActive.value = true
}

function handleDescriptionFocusOut(): void {
  setTimeout(() => {
    const shell = descriptionEditorShellRef.value
    if (shell && document.activeElement && shell.contains(document.activeElement))
      return
    descriptionEditorActive.value = false
    void flushDescriptionAutosave()
  }, 0)
}

async function uploadDescriptionImage(file: File): Promise<JiraAttachment> {
  const key = descriptionDraftTicketKey.value
  if (!key || isLocalTicketKey(key)) {
    throw new Error('Images can only be pasted into Jira ticket descriptions.')
  }
  return uploadTicketAttachmentMutation.mutateAsync({ key, file })
}

async function persistDescriptionDraft(key: string, descriptionAdf: JiraAdfDocument | null): Promise<void> {
  await updateDescriptionMutation.mutateAsync({ key, descriptionAdf })
}

async function flushDescriptionAutosave(): Promise<void> {
  const key = descriptionDraftTicketKey.value
  if (!key || descriptionSaveInFlight.value)
    return

  // Never persist a draft seeded from a partial ticket — it would replace the
  // real description with an empty one.
  if (!props.detailLoaded) {
    clearDescriptionSaveTimer()
    return
  }

  const descriptionAdf = descriptionDraft.value
  if (descriptionHasPendingImageUpload.value || descriptionHasFailedImageUpload.value) {
    clearDescriptionSaveTimer()
    return
  }

  const signature = adfSignature(descriptionAdf)
  if (signature === descriptionPersistedSignature.value) {
    clearDescriptionSaveTimer()
    if (descriptionSaveStatus.value !== 'saving') {
      descriptionSaveStatus.value = 'idle'
      descriptionSaveError.value = null
    }
    return
  }

  clearDescriptionSaveTimer()
  clearDescriptionSavedMessageTimer()
  descriptionSaveInFlight.value = true
  descriptionSaveStatus.value = 'saving'
  descriptionSaveError.value = null

  try {
    await persistDescriptionDraft(key, descriptionAdf)
    if (descriptionDraftTicketKey.value !== key)
      return

    descriptionPersistedSignature.value = signature
    if (adfSignature(descriptionDraft.value) === signature) {
      descriptionSaveStatus.value = 'saved'
      descriptionSaveError.value = null
      hideDescriptionSavedMessageSoon()
    }
    else {
      descriptionSaveStatus.value = 'dirty'
      scheduleDescriptionAutosave()
    }
  }
  catch (err) {
    if (descriptionDraftTicketKey.value !== key)
      return
    descriptionSaveStatus.value = 'error'
    descriptionSaveError.value = err instanceof Error ? err.message : 'Failed to update description.'
  }
  finally {
    descriptionSaveInFlight.value = false
  }
}

watch(() => props.ticket, (nextTicket) => {
  const ticketChanged = nextTicket.key !== descriptionDraftTicketKey.value
  if (ticketChanged) {
    descriptionEditorRef.value?.blurEditor()
    descriptionEditorActive.value = false
    void flushDescriptionAutosave()
    syncDescriptionDraftFromTicket(nextTicket)
  }
  else if (!isDescriptionDraftDirty()) {
    // Resync even while the editor is active: an empty draft seeded from the
    // partial list-cache ticket must be replaced by the real description, or
    // the next keystroke autosaves the near-empty draft over it. Genuine
    // edits are protected by the dirty check above.
    syncDescriptionDraftFromTicket(nextTicket)
  }
}, { immediate: true })

watch(descriptionDraft, (nextDraft) => {
  if (isSyncingDescriptionDraft.value)
    return
  if (!descriptionDraftTicketKey.value)
    return

  if (descriptionHasPendingImageUpload.value || descriptionHasFailedImageUpload.value) {
    clearDescriptionSaveTimer()
    clearDescriptionSavedMessageTimer()
    descriptionSaveStatus.value = 'dirty'
    descriptionSaveError.value = null
    return
  }

  const signature = adfSignature(nextDraft)
  if (signature === descriptionPersistedSignature.value) {
    clearDescriptionSaveTimer()
    if (!descriptionSaveInFlight.value) {
      descriptionSaveStatus.value = 'idle'
      descriptionSaveError.value = null
    }
    return
  }

  clearDescriptionSavedMessageTimer()
  descriptionSaveStatus.value = 'dirty'
  descriptionSaveError.value = null
  scheduleDescriptionAutosave()
})

const descriptionSaveMessage = computed(() => {
  if (descriptionHasPendingImageUpload.value)
    return 'Uploading image...'
  if (descriptionHasFailedImageUpload.value)
    return 'Image upload failed. Delete it before saving.'
  if (descriptionSaveStatus.value === 'dirty')
    return 'Unsaved changes'
  if (descriptionSaveStatus.value === 'saving')
    return 'Saving...'
  if (descriptionSaveStatus.value === 'saved')
    return 'Saved'
  if (descriptionSaveStatus.value === 'error')
    return descriptionSaveError.value ?? 'Failed to update description.'
  return ''
})

const descriptionSaveMessageClass = computed(() => (
  descriptionSaveStatus.value === 'error' || descriptionHasFailedImageUpload.value ? 'text-rose-300' : 'text-slate-500'
))

onUnmounted(() => {
  clearDescriptionSaveTimer()
  clearDescriptionSavedMessageTimer()
  void flushDescriptionAutosave()
})

defineExpose({
  focusDescriptionEditor,
})
</script>

<template>
  <section class="mb-8 pt-2">
    <div class="space-y-3">
      <div
        ref="descriptionEditorShellRef"
        class="relative"
        @focusin="handleDescriptionFocusIn"
        @focusout="handleDescriptionFocusOut"
        @keydown.esc.prevent="blurDescriptionEditor"
      >
        <span
          v-if="descriptionSaveMessage"
          class="pointer-events-none absolute right-3 z-10 rounded-md border border-white/[0.06] bg-surface-1/90 px-2 py-1 text-[11px] shadow-lg backdrop-blur top-[3.75rem]"
          :class="[descriptionSaveMessageClass]"
        >
          {{ descriptionSaveMessage }}
        </span>
        <JiraDescriptionEditor
          ref="descriptionEditorRef"
          v-model="descriptionDraft"
          :attachments="ticket.attachments"
          :disabled="!detailLoaded"
          :ticket-key="ticket.key"
          :upload-image="isLocalTicket ? undefined : uploadDescriptionImage"
          :show-toolbar="descriptionEditorActive"
          placeholder="Add a description..."
          @preview-image="emit('previewImage', $event)"
        />
      </div>
      <div
        v-if="descriptionHasUnsupportedContent && descriptionEditorActive"
        class="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
      >
        This description uses Jira formatting the editor cannot edit yet. Unsupported items are preserved unless you delete their placeholder.
      </div>
    </div>
  </section>
</template>

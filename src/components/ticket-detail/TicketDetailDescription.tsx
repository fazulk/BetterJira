import type { PropType } from 'vue'
import type { JiraAdfDocument, JiraAdfNode, JiraAttachment, JiraTicket } from '@/types/jira'
import { computed, defineComponent, nextTick, onUnmounted, ref, watch } from 'vue'
import JiraDescriptionEditor from '@/components/JiraDescriptionEditor'
import { useUpdateTicketDescription } from '@/composables/useUpdateTicketDescription'
import { useUploadTicketAttachment } from '@/composables/useUploadTicketAttachment'
import { adfToPlainText, coerceDescriptionToAdf, isSupportedEditorAdf } from '~/shared/jiraAdf'
import { isLocalTicketKey } from '~/shared/localTickets'

type DescriptionSaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

interface DescriptionEditorExpose {
  focusEditor: () => void
  blurEditor: () => void
}

const DESCRIPTION_SAVE_DEBOUNCE_MS = 3000
const DESCRIPTION_SAVED_MESSAGE_MS = 3000

function adfSignature(doc: JiraAdfDocument | null): string {
  return JSON.stringify(doc)
}

function isEmptyDescription(doc: JiraAdfDocument | null | undefined): boolean {
  return !adfToPlainText(doc).trim()
}

function nodeHasUploadState(node: JiraAdfNode, state: 'pending' | 'error'): boolean {
  if (node.type === 'media' && node.attrs?.uploadState === state)
    return true
  return node.content?.some(child => nodeHasUploadState(child, state)) ?? false
}

function descriptionHasUploadState(doc: JiraAdfDocument | null, state: 'pending' | 'error'): boolean {
  return doc?.content.some(node => nodeHasUploadState(node, state)) ?? false
}

export default defineComponent({
  name: 'TicketDetailDescription',
  props: {
    detailLoaded: {
      type: Boolean,
      required: true,
    },
    isLocalTicket: {
      type: Boolean,
      required: true,
    },
    ticket: {
      type: Object as PropType<JiraTicket>,
      required: true,
    },
  },
  emits: {
    previewImage: (payload: { src: string, alt: string }) => typeof payload.src === 'string' && typeof payload.alt === 'string',
  },
  setup(props, { emit, expose }) {
    const descriptionEditorRef = ref<DescriptionEditorExpose | null>(null)
    const descriptionEditorShellRef = ref<HTMLDivElement | null>(null)
    const descriptionEditorActive = ref(false)
    const descriptionTouchedByUser = ref(false)
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

    function isPlaceholderEditorNoise(doc: JiraAdfDocument | null | undefined): boolean {
      return isEmptyDescription(doc)
        && !descriptionEditorActive.value
        && !descriptionTouchedByUser.value
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
        if (descriptionSaveStatus.value === 'saved' && !isDescriptionDraftDirty())
          descriptionSaveStatus.value = 'idle'
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
      if (!props.detailLoaded)
        return
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

    function handleDescriptionKeydown(event: KeyboardEvent): void {
      if (event.key !== 'Escape')
        return
      event.preventDefault()
      blurDescriptionEditor()
    }

    async function uploadDescriptionImage(file: File): Promise<JiraAttachment> {
      const key = descriptionDraftTicketKey.value
      if (!key || isLocalTicketKey(key))
        throw new Error('Images can only be pasted into Jira ticket descriptions.')
      return uploadTicketAttachmentMutation.mutateAsync({ key, file })
    }

    async function persistDescriptionDraft(key: string, descriptionAdf: JiraAdfDocument | null): Promise<void> {
      await updateDescriptionMutation.mutateAsync({ key, descriptionAdf })
    }

    async function flushDescriptionAutosave(): Promise<void> {
      const key = descriptionDraftTicketKey.value
      if (!key || descriptionSaveInFlight.value)
        return

      if (!props.detailLoaded) {
        clearDescriptionSaveTimer()
        return
      }

      const descriptionAdf = descriptionDraft.value
      if (descriptionHasPendingImageUpload.value || descriptionHasFailedImageUpload.value) {
        clearDescriptionSaveTimer()
        return
      }

      if (isPlaceholderEditorNoise(descriptionAdf) && !isEmptyDescription(getEditableDescriptionAdf(props.ticket))) {
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
        descriptionTouchedByUser.value = false
        void flushDescriptionAutosave()
        syncDescriptionDraftFromTicket(nextTicket)
        return
      }

      if (!descriptionTouchedByUser.value || !isDescriptionDraftDirty() || isPlaceholderEditorNoise(descriptionDraft.value))
        syncDescriptionDraftFromTicket(nextTicket)
    }, { immediate: true })

    watch(descriptionDraft, (nextDraft) => {
      if (isSyncingDescriptionDraft.value)
        return
      if (!descriptionDraftTicketKey.value)
        return

      if (isPlaceholderEditorNoise(nextDraft)) {
        if (!isEmptyDescription(getEditableDescriptionAdf(props.ticket))) {
          syncDescriptionDraftFromTicket(props.ticket)
          return
        }

        clearDescriptionSaveTimer()
        return
      }

      if (!props.detailLoaded) {
        clearDescriptionSaveTimer()
        return
      }

      if (descriptionHasPendingImageUpload.value || descriptionHasFailedImageUpload.value) {
        descriptionTouchedByUser.value = true
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

      descriptionTouchedByUser.value = true
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

    expose({
      focusDescriptionEditor,
    })

    return () => (
      <section class="mb-8 pt-2">
        <div class="space-y-3">
          <div
            ref={descriptionEditorShellRef}
            class="relative"
            onFocusin={handleDescriptionFocusIn}
            onFocusout={handleDescriptionFocusOut}
            onKeydown={handleDescriptionKeydown}
          >
            {descriptionSaveMessage.value && (
              <span
                class={[
                  'pointer-events-none absolute right-3 z-10 rounded-md border border-white/[0.06] bg-surface-1/90 px-2 py-1 text-[11px] shadow-lg backdrop-blur top-[3.75rem]',
                  descriptionSaveMessageClass.value,
                ]}
              >
                {descriptionSaveMessage.value}
              </span>
            )}
            <div class={{ invisible: !props.detailLoaded }}>
              <JiraDescriptionEditor
                ref={descriptionEditorRef}
                modelValue={descriptionDraft.value}
                attachments={props.ticket.attachments}
                disabled={!props.detailLoaded}
                ticketKey={props.ticket.key}
                uploadImage={props.isLocalTicket ? undefined : uploadDescriptionImage}
                showToolbar={descriptionEditorActive.value}
                placeholder="Add a description..."
                onPreviewImage={payload => emit('previewImage', payload)}
                {...{ 'onUpdate:modelValue': (value: JiraAdfDocument | null) => (descriptionDraft.value = value) }}
              />
            </div>
            {!props.detailLoaded && (
              <div
                class="absolute inset-0 z-10 flex min-h-[240px] flex-col space-y-2"
                role="status"
                aria-live="polite"
                aria-label="Loading description"
              >
                <div class="h-11 shrink-0" aria-hidden="true" />
                <div class="animate-pulse space-y-3.5" aria-hidden="true">
                  <div class="space-y-2.5">
                    <div class="h-3 rounded-sm bg-white/[0.06]" />
                    <div class="h-3 w-[94%] rounded-sm bg-white/[0.06]" />
                    <div class="h-3 w-[88%] rounded-sm bg-white/[0.05]" />
                    <div class="h-3 w-[42%] rounded-sm bg-white/[0.045]" />
                  </div>
                  <div class="space-y-2.5">
                    <div class="h-3 w-[96%] rounded-sm bg-white/[0.05]" />
                    <div class="h-3 w-[81%] rounded-sm bg-white/[0.045]" />
                    <div class="h-3 w-[57%] rounded-sm bg-white/[0.04]" />
                  </div>
                </div>
              </div>
            )}
          </div>
          {descriptionHasUnsupportedContent.value && descriptionEditorActive.value && (
            <div class="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              This description uses Jira formatting the editor cannot edit yet. Unsupported items are preserved unless you delete their placeholder.
            </div>
          )}
        </div>
      </section>
    )
  },
})

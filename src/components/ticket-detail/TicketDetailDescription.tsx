import type { PropType } from 'vue'
import type { JiraAdfDocument, JiraAdfNode, JiraAttachment, JiraTicket } from '@/types/jira'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, nextTick, onUnmounted, ref, watch } from 'vue'
import JiraDescriptionEditor from '@/components/JiraDescriptionEditor'
import { useUpdateTicketDescription } from '@/composables/useUpdateTicketDescription'
import { useUploadTicketAttachment } from '@/composables/useUploadTicketAttachment'
import { colors } from '@/styles/tokens.stylex'
import { adfToPlainText, coerceDescriptionToAdf, isSupportedEditorAdf } from '~/shared/jiraAdf'
import { isLocalTicketKey } from '~/shared/localTickets'

type DescriptionSaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

interface DescriptionEditorExpose {
  focusEditor: () => void
  blurEditor: () => void
}

const DESCRIPTION_SAVE_DEBOUNCE_MS = 3000
const DESCRIPTION_SAVED_MESSAGE_MS = 3000
const pulse = stylex.keyframes({ '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } })

const styles = stylex.create({
  section: { marginBottom: '2rem', paddingTop: '0.5rem' },
  stack: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  shell: { position: 'relative' },
  saveMessage: { pointerEvents: 'none', position: 'absolute', right: '0.75rem', top: '3.75rem', zIndex: 10, borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(13, 14, 16, 0.9)', paddingInline: '0.5rem', paddingBlock: '0.25rem', fontSize: 11, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(8px)' },
  saveMessageNeutral: { color: colors['--color-slate-500'] },
  saveMessageError: { color: colors['--color-rose-300'] },
  hiddenUntilLoaded: { visibility: 'hidden' },
  loadingOverlay: { position: 'absolute', inset: 0, zIndex: 10, display: 'flex', minHeight: '240px', flexDirection: 'column', gap: '0.5rem' },
  toolbarSkeletonSpace: { height: '2.75rem', flexShrink: 0 },
  skeleton: { display: 'flex', flexDirection: 'column', gap: '0.875rem', animationName: pulse, animationDuration: '2s', animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)', animationIterationCount: 'infinite' },
  skeletonGroup: { display: 'flex', flexDirection: 'column', gap: '0.625rem' },
  skeletonLine: { height: '0.75rem', borderRadius: '0.125rem', backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  skeletonLine94: { width: '94%' },
  skeletonLine88: { width: '88%', backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  skeletonLine42: { width: '42%', backgroundColor: 'rgba(255, 255, 255, 0.045)' },
  skeletonLine96: { width: '96%', backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  skeletonLine81: { width: '81%', backgroundColor: 'rgba(255, 255, 255, 0.045)' },
  skeletonLine57: { width: '57%', backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  unsupportedNotice: { borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(245, 158, 11, 0.2)', backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-amber-200'] },
})

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

    const descriptionSaveMessageIsError = computed(() => (
      descriptionSaveStatus.value === 'error' || descriptionHasFailedImageUpload.value
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
      <section {...stylex.attrs(styles.section)}>
        <div {...stylex.attrs(styles.stack)}>
          <div
            ref={descriptionEditorShellRef}
            data-description-editor-shell
            {...stylex.attrs(styles.shell)}
            onFocusin={handleDescriptionFocusIn}
            onFocusout={handleDescriptionFocusOut}
            onKeydown={handleDescriptionKeydown}
          >
            {descriptionSaveMessage.value && (
              <span
                {...stylex.attrs(styles.saveMessage, descriptionSaveMessageIsError.value ? styles.saveMessageError : styles.saveMessageNeutral)}
              >
                {descriptionSaveMessage.value}
              </span>
            )}
            <div {...stylex.attrs(props.detailLoaded ? null : styles.hiddenUntilLoaded)}>
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
                {...stylex.attrs(styles.loadingOverlay)}
                role="status"
                aria-live="polite"
                aria-label="Loading description"
              >
                <div {...stylex.attrs(styles.toolbarSkeletonSpace)} aria-hidden="true" />
                <div {...stylex.attrs(styles.skeleton)} aria-hidden="true">
                  <div {...stylex.attrs(styles.skeletonGroup)}>
                    <div {...stylex.attrs(styles.skeletonLine)} />
                    <div {...stylex.attrs(styles.skeletonLine, styles.skeletonLine94)} />
                    <div {...stylex.attrs(styles.skeletonLine, styles.skeletonLine88)} />
                    <div {...stylex.attrs(styles.skeletonLine, styles.skeletonLine42)} />
                  </div>
                  <div {...stylex.attrs(styles.skeletonGroup)}>
                    <div {...stylex.attrs(styles.skeletonLine, styles.skeletonLine96)} />
                    <div {...stylex.attrs(styles.skeletonLine, styles.skeletonLine81)} />
                    <div {...stylex.attrs(styles.skeletonLine, styles.skeletonLine57)} />
                  </div>
                </div>
              </div>
            )}
          </div>
          {descriptionHasUnsupportedContent.value && descriptionEditorActive.value && (
            <div {...stylex.attrs(styles.unsupportedNotice)}>
              This description uses Jira formatting the editor cannot edit yet. Unsupported items are preserved unless you delete their placeholder.
            </div>
          )}
        </div>
      </section>
    )
  },
})

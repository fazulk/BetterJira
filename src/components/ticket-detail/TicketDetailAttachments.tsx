import type { PropType } from 'vue'
import type { JiraAttachment } from '@/types/jira'
import * as stylex from '@stylexjs/stylex'
import { defineComponent, ref } from 'vue'
import { useDeleteTicketAttachment } from '@/composables/useDeleteTicketAttachment'
import { useToast } from '@/composables/useToast'
import { attachmentContentUrl, isImageAttachment } from '@/features/jira-description-editor/mediaExtensions'
import { colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  section: { marginBottom: '2rem' },
  title: { marginBottom: '0.5rem', marginTop: 0, fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: colors['--color-slate-400'] },
  list: { overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.015)' },
  row: { display: 'flex', width: '100%', alignItems: 'center', boxSizing: 'border-box', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.035)' }, paddingInlineEnd: '0.5rem' },
  lastRow: { borderBottomWidth: 0 },
  main: { display: 'flex', minWidth: 0, flex: '1', alignItems: 'center', gap: '0.75rem', borderWidth: 0, backgroundColor: 'transparent', color: { 'default': colors['--color-slate-300'], ':hover': colors['--color-slate-100'] }, paddingInline: '0.75rem', paddingBlock: '0.5rem', textAlign: 'left', textDecoration: 'none', cursor: 'pointer', font: 'inherit' },
  remove: { flexShrink: 0, borderRadius: '0.375rem', borderWidth: 0, backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.06)' }, paddingInline: '0.5rem', paddingBlock: '0.25rem', fontSize: '0.75rem', lineHeight: '1rem', color: { 'default': colors['--color-slate-500'], ':hover': colors['--color-slate-200'] }, cursor: 'pointer', opacity: { 'default': 0.7, ':hover': 1, ':disabled': 0.4 } },
  thumb: { width: '2rem', height: '2rem', flexShrink: 0, borderRadius: '0.25rem', objectFit: 'cover', backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  filename: { minWidth: 0, flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem', lineHeight: '1.25rem', color: 'currentColor' },
  removeConfirm: { color: '#f87171', opacity: 1 },
  size: { flexShrink: 0, fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
})

function formatSize(bytes: number | undefined): string {
  if (bytes === undefined)
    return ''
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default defineComponent({
  name: 'TicketDetailAttachments',
  props: {
    attachments: {
      type: Array as PropType<JiraAttachment[]>,
      required: true,
    },
    ticketKey: {
      type: String,
      required: true,
    },
  },
  emits: {
    previewImage: (payload: { src: string, alt: string }) => typeof payload.src === 'string',
  },
  setup(props, { emit }) {
    const deleteAttachment = useDeleteTicketAttachment()
    const { showError, showSuccess } = useToast()

    const confirmingId = ref<string | null>(null)

    function removeAttachment(attachment: JiraAttachment): void {
      if (confirmingId.value !== attachment.id) {
        confirmingId.value = attachment.id
        return
      }

      confirmingId.value = null
      deleteAttachment.mutate({ key: props.ticketKey, attachmentId: attachment.id }, {
        onSuccess: () => showSuccess(`Removed ${attachment.filename}.`),
        onError: error => showError(error instanceof Error ? error.message : 'Failed to remove attachment.'),
      })
    }

    function renderRow(attachment: JiraAttachment, index: number) {
      const src = attachmentContentUrl(attachment.id)
      const size = <span {...stylex.attrs(styles.size)}>{formatSize(attachment.size)}</span>
      const name = <span {...stylex.attrs(styles.filename)}>{attachment.filename}</span>

      return (
        <div key={attachment.id} {...stylex.attrs(styles.row, index === props.attachments.length - 1 ? styles.lastRow : null)}>
          {isImageAttachment(attachment)
            ? (
                <button
                  type="button"
                  {...stylex.attrs(styles.main)}
                  onClick={() => emit('previewImage', { src, alt: attachment.filename })}
                >
                  <img src={src} alt="" loading="lazy" {...stylex.attrs(styles.thumb)} />
                  {name}
                  {size}
                </button>
              )
            : (
                <a href={src} download={attachment.filename} {...stylex.attrs(styles.main)}>
                  {name}
                  {size}
                </a>
              )}
          <button
            type="button"
            aria-label={`${confirmingId.value === attachment.id ? 'Confirm removing' : 'Remove'} ${attachment.filename}`}
            disabled={deleteAttachment.isPending.value}
            {...stylex.attrs(styles.remove, confirmingId.value === attachment.id ? styles.removeConfirm : null)}
            onClick={() => removeAttachment(attachment)}
            onBlur={() => {
              if (confirmingId.value === attachment.id)
                confirmingId.value = null
            }}
          >
            {confirmingId.value === attachment.id ? 'Confirm' : 'Remove'}
          </button>
        </div>
      )
    }

    return () => (
      <section {...stylex.attrs(styles.section)}>
        <h2 {...stylex.attrs(styles.title)}>Attachments</h2>
        <div {...stylex.attrs(styles.list)}>
          {props.attachments.map(renderRow)}
        </div>
      </section>
    )
  },
})

import type { PropType } from 'vue'
import type { JiraActivityComment, JiraActivityItem, JiraTicket } from '@/types/jira'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, nextTick, ref } from 'vue'
import { useAddTicketMessage } from '@/composables/useAddTicketMessage'
import { useJiraActivity } from '@/composables/useJiraMessages'
import { useUpdateTicketWatching } from '@/composables/useUpdateTicketWatching'
import { colors } from '@/styles/tokens.stylex'

type AvatarTone = 'fallback' | 'neutral' | 'amber' | 'emerald' | 'rose' | 'sky'
type HistoryTone = 'default' | 'created' | 'status' | 'assignee' | 'priority'

function addActivityParticipantName(names: string[], name: string | undefined): void {
  const nextName = name?.trim()
  if (!nextName || nextName === 'Unassigned' || names.includes(nextName))
    return
  names.push(nextName)
}

function getAssigneeAvatarTone(name: string | undefined): AvatarTone {
  if (!name || name === 'Unassigned')
    return 'fallback'
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const avatarTones: AvatarTone[] = [
    'neutral',
    'amber',
    'emerald',
    'rose',
    'sky',
  ]
  return avatarTones[hash % avatarTones.length] ?? 'neutral'
}

function getAssigneeInitials(name: string | undefined): string {
  if (!name || name === 'Unassigned')
    return '?'
  const parts = name.split(/\s+/)
  const firstPart = parts[0]
  const secondPart = parts[1]
  if (firstPart && secondPart)
    return `${firstPart[0] ?? ''}${secondPart[0] ?? ''}`
  return name.slice(0, 2)
}

function getActivityCreatedAtMs(item: JiraActivityItem): number {
  const createdAtMs = Date.parse(item.createdAt)
  return Number.isNaN(createdAtMs) ? Number.MIN_SAFE_INTEGER : createdAtMs
}

function getActivityHistoryTone(item: JiraActivityItem): HistoryTone {
  if (item.kind !== 'history')
    return 'default'

  const field = item.field.trim().toLowerCase()
  if (field === 'created')
    return 'created'
  if (field === 'status')
    return 'status'
  if (field === 'assignee')
    return 'assignee'
  if (field === 'priority')
    return 'priority'
  return 'default'
}

function formatActivityTime(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime()))
    return value

  const diffMs = Date.now() - parsed.getTime()
  const absDiffMs = Math.abs(diffMs)
  const isFuture = diffMs < 0
  const minutes = Math.floor(absDiffMs / 60000)
  const hours = Math.floor(absDiffMs / 3600000)
  const days = Math.floor(absDiffMs / 86400000)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  let label: string
  if (minutes < 1)
    label = 'just now'
  else if (minutes < 60)
    label = `${minutes}m`
  else if (hours < 24)
    label = `${hours}h`
  else if (days < 7)
    label = `${days}d`
  else if (weeks < 5)
    label = `${weeks}w`
  else label = `${months}mo`

  if (label === 'just now')
    return label
  return isFuture ? `in ${label}` : `${label} ago`
}

const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

const styles = stylex.create({
  section: { marginBottom: '2rem' },
  header: { marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' },
  titleGroup: { display: 'flex', minWidth: 0, alignItems: 'center', gap: '0.5rem' },
  title: { margin: 0, fontSize: 15, fontWeight: 600, color: colors['--color-slate-100'] },
  loadingTiny: { fontSize: 11, color: colors['--color-slate-600'] },
  headerActions: { display: 'flex', flexShrink: 0, alignItems: 'center', gap: '0.75rem' },
  watchButton: { borderWidth: 0, backgroundColor: 'transparent', padding: 0, fontSize: 12, color: { 'default': colors['--color-slate-600'], ':hover': colors['--color-slate-300'] }, transitionProperty: 'color, opacity', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', cursor: { 'default': 'pointer', ':disabled': 'not-allowed' }, opacity: { 'default': 1, ':disabled': 0.6 } },
  count: { fontSize: 12, color: colors['--color-slate-700'] },
  avatars: { display: 'flex' },
  stackedAvatar: { marginLeft: '-0.375rem' },
  avatar: { display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', fontWeight: 600 },
  avatarSmall: { width: '1.25rem', height: '1.25rem', borderColor: colors['--color-surface-0'], fontSize: 9 },
  avatarComment: { width: '1.5rem', height: '1.5rem', marginLeft: '-0.25rem', marginTop: '0.125rem', fontSize: 9 },
  avatarFallback: { borderColor: 'rgba(100, 116, 139, 0.15)', backgroundColor: 'rgba(100, 116, 139, 0.15)', color: colors['--color-slate-400'] },
  avatarNeutral: { borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.045)', color: colors['--color-slate-300'] },
  avatarAmber: { borderColor: 'rgba(245, 158, 11, 0.2)', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: colors['--color-amber-300'] },
  avatarEmerald: { borderColor: 'rgba(16, 185, 129, 0.2)', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: colors['--color-emerald-300'] },
  avatarRose: { borderColor: 'rgba(244, 63, 94, 0.2)', backgroundColor: 'rgba(244, 63, 94, 0.2)', color: colors['--color-rose-300'] },
  avatarSky: { borderColor: 'rgba(14, 165, 233, 0.2)', backgroundColor: 'rgba(14, 165, 233, 0.2)', color: colors['--color-sky-300'] },
  errorBox: { borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(244, 63, 94, 0.2)', backgroundColor: 'rgba(244, 63, 94, 0.05)', paddingInline: '1rem', paddingBlock: '0.75rem', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-rose-300'] },
  watchError: { marginBottom: '0.75rem' },
  skeleton: { display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1rem' },
  skeletonRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBlock: '0.125rem', animationName: stylex.keyframes({ '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } }), animationDuration: '2s', animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)', animationIterationCount: 'infinite' },
  skeletonDot: { width: '1rem', height: '1rem', flexShrink: 0, borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  skeletonLine: { height: '0.75rem', borderRadius: '0.25rem', backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  skeletonWide: { width: '66.666667%' },
  skeletonNarrow: { width: '50%' },
  timeline: { display: 'flex', flexDirection: 'column', gap: '0.375rem', paddingLeft: '1rem' },
  historyItem: { position: 'relative', display: 'flex', gap: '0.75rem', paddingBlock: '0.125rem' },
  historyLine: { position: 'absolute', left: '7px', top: '18px', bottom: '-8px', borderLeftWidth: 1, borderLeftStyle: 'solid', borderLeftColor: 'rgba(255, 255, 255, 0.08)' },
  marker: { position: 'relative', zIndex: 10, marginTop: '0.25rem', display: 'flex', width: '1rem', height: '1rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', backgroundColor: colors['--color-surface-0'] },
  markerDefault: { borderColor: 'rgba(255, 255, 255, 0.14)', color: colors['--color-slate-500'] },
  markerCreated: { borderColor: 'rgba(56, 189, 248, 0.35)', color: colors['--color-sky-300'] },
  markerStatus: { borderColor: 'rgba(251, 191, 36, 0.4)', color: colors['--color-amber-300'] },
  markerAssignee: { borderColor: 'rgba(52, 211, 153, 0.35)', color: colors['--color-emerald-300'] },
  markerPriority: { borderColor: 'rgba(251, 113, 133, 0.35)', color: colors['--color-rose-300'] },
  markerDot: { width: '0.375rem', height: '0.375rem', borderRadius: '9999px', backgroundColor: 'currentColor' },
  historyText: { minWidth: 0, flex: '1', fontSize: 13, lineHeight: '1.25rem', color: colors['--color-slate-500'], margin: 0 },
  time: { color: colors['--color-slate-600'] },
  comment: { marginLeft: '-1rem', display: 'flex', gap: '0.75rem', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.025)', padding: '1rem' },
  commentBody: { minWidth: 0, flex: '1' },
  commentHeader: { marginBottom: '0.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0.5rem' },
  author: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-slate-200'] },
  commentTime: { fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-600'] },
  replyPill: { marginBottom: '0.5rem', display: 'inline-flex', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.025)', paddingInline: '0.5rem', paddingBlock: '0.25rem', fontSize: 11, color: colors['--color-slate-500'] },
  bodyText: { whiteSpace: 'pre-wrap', fontSize: '0.875rem', lineHeight: '1.5rem', color: colors['--color-slate-300'] },
  empty: { borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.08)', paddingInline: '1rem', paddingBlock: '0.75rem', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-600'] },
  composer: { marginTop: '1.25rem', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.025)', paddingInline: '1rem', paddingBlock: '1rem' },
  textarea: { 'minHeight': '92px', 'width': '100%', 'resize': 'none', 'borderWidth': 1, 'borderStyle': 'solid', 'borderColor': 'transparent', 'backgroundColor': 'transparent', 'padding': 0, 'fontSize': 15, 'lineHeight': '1.5rem', 'color': colors['--color-slate-300'], 'outlineStyle': 'none', '::placeholder': { color: colors['--color-slate-600'] } },
  composerFooter: { marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' },
  composerError: { minWidth: 0, flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-rose-300'] },
  composerSpacer: { minWidth: 0, flex: '1' },
  composerActions: { display: 'flex', flexShrink: 0, alignItems: 'center', gap: '0.75rem', color: colors['--color-slate-600'] },
  disabledIconButton: { display: 'inline-flex', width: '1.75rem', height: '1.75rem', cursor: 'not-allowed', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', borderWidth: 0, opacity: 0.7 },
  icon: { width: '1rem', height: '1rem' },
  postButton: { display: 'inline-flex', width: '1.75rem', height: '1.75rem', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', borderWidth: 0, backgroundColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':hover': 'rgba(255, 255, 255, 0.12)' }, color: { 'default': colors['--color-slate-400'], ':hover': colors['--color-slate-200'] }, transitionProperty: 'color, background-color, opacity', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', cursor: { 'default': 'pointer', ':disabled': 'not-allowed' }, opacity: { 'default': 1, ':disabled': 0.45 } },
  postIcon: { width: '0.875rem', height: '0.875rem' },
  smallSpinner: { width: '0.875rem', height: '0.875rem', borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', borderColor: 'currentColor', borderTopColor: 'transparent', animationName: spin, animationDuration: '1s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' },
  closedComposer: { marginTop: '1.25rem', display: 'flex', minHeight: '92px', width: '100%', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: { 'default': 'rgba(255, 255, 255, 0.06)', ':hover': 'rgba(255, 255, 255, 0.1)' }, backgroundColor: { 'default': 'rgba(255, 255, 255, 0.025)', ':hover': 'rgba(255, 255, 255, 0.035)' }, paddingInline: '1rem', paddingBlock: '1rem', textAlign: 'left', transitionProperty: 'border-color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  placeholder: { fontSize: 15, color: colors['--color-slate-600'] },
  closedActions: { marginTop: 'auto', display: 'flex', flexShrink: 0, alignItems: 'center', gap: '0.75rem', color: colors['--color-slate-600'] },
})

function avatarStyle(tone: AvatarTone) {
  if (tone === 'fallback')
    return styles.avatarFallback
  if (tone === 'amber')
    return styles.avatarAmber
  if (tone === 'emerald')
    return styles.avatarEmerald
  if (tone === 'rose')
    return styles.avatarRose
  if (tone === 'sky')
    return styles.avatarSky
  return styles.avatarNeutral
}

function historyMarkerStyle(tone: HistoryTone) {
  if (tone === 'created')
    return styles.markerCreated
  if (tone === 'status')
    return styles.markerStatus
  if (tone === 'assignee')
    return styles.markerAssignee
  if (tone === 'priority')
    return styles.markerPriority
  return styles.markerDefault
}

export default defineComponent({
  name: 'TicketDetailActivity',
  props: {
    queryEnabled: {
      type: Boolean,
      required: true,
    },
    ticket: {
      type: Object as PropType<JiraTicket>,
      required: true,
    },
    ticketKey: {
      type: String,
      required: true,
    },
  },
  setup(props, { expose }) {
    const activityQuery = useJiraActivity(
      computed(() => props.ticketKey),
      { queryEnabled: computed(() => props.queryEnabled) },
    )
    const updateWatchingMutation = useUpdateTicketWatching()
    const addMessageMutation = useAddTicketMessage()

    const messageDraft = ref('')
    const messageError = ref<string | null>(null)
    const watchError = ref<string | null>(null)
    const messageTextareaRef = ref<HTMLTextAreaElement | null>(null)
    const activityComposerOpen = ref(false)

    const activityItems = computed(() => activityQuery.data.value ?? [])
    const messageCanSubmit = computed(() => messageDraft.value.trim().length > 0)
    const detailWatchActionLabel = computed(() => (props.ticket.isWatching ? 'Unsubscribe' : 'Subscribe'))
    const detailWatchButtonLabel = computed(() => (
      updateWatchingMutation.isPending.value ? 'Saving...' : detailWatchActionLabel.value
    ))
    const detailWatchCountLabel = computed(() => {
      const watchCount = props.ticket.watchCount
      if (typeof watchCount !== 'number')
        return null
      return `${watchCount} ${watchCount === 1 ? 'subscriber' : 'subscribers'}`
    })

    const detailActivityParticipantNames = computed(() => {
      const names: string[] = []

      for (const name of [props.ticket.reporter, props.ticket.assignee])
        addActivityParticipantName(names, name)

      for (const item of activityItems.value)
        addActivityParticipantName(names, item.author)

      return names.slice(0, 4)
    })

    const activityTimelineItems = computed(() => (
      [...activityItems.value].sort((left, right) => (
        getActivityCreatedAtMs(left) - getActivityCreatedAtMs(right)
        || left.id.localeCompare(right.id, undefined, { numeric: true, sensitivity: 'base' })
      ))
    ))

    const activityCommentById = computed(() => {
      const comments = new Map<string, JiraActivityComment>()
      for (const item of activityItems.value) {
        if (item.kind === 'comment')
          comments.set(item.id, item)
      }
      return comments
    })

    function getActivityCommentParent(comment: JiraActivityComment): JiraActivityComment | null {
      const parentMessageId = comment.parentMessageId
      return parentMessageId ? activityCommentById.value.get(parentMessageId) ?? null : null
    }

    function getActivityCommentParentAuthor(item: JiraActivityItem): string | null {
      if (item.kind !== 'comment')
        return null
      return getActivityCommentParent(item)?.author ?? null
    }

    async function toggleTicketWatching(): Promise<void> {
      if (updateWatchingMutation.isPending.value)
        return

      try {
        await updateWatchingMutation.mutateAsync({
          key: props.ticket.key,
          watching: props.ticket.isWatching !== true,
        })
        watchError.value = null
      }
      catch (err) {
        watchError.value = err instanceof Error ? err.message : 'Failed to update subscription.'
      }
    }

    function focusMessageComposer(): void {
      activityComposerOpen.value = true
      nextTick(() => {
        messageTextareaRef.value?.focus()
      })
    }

    async function submitMessage(): Promise<void> {
      if (addMessageMutation.isPending.value)
        return

      const nextMessage = messageDraft.value.trim()
      if (!nextMessage)
        return

      try {
        await addMessageMutation.mutateAsync({
          key: props.ticket.key,
          body: nextMessage,
        })
        messageDraft.value = ''
        messageError.value = null
        activityComposerOpen.value = false
      }
      catch (err) {
        messageError.value = err instanceof Error ? err.message : 'Failed to add message.'
      }
    }

    function handleMessageKeydown(event: KeyboardEvent): void {
      if (event.key !== 'Enter' || (!event.metaKey && !event.ctrlKey))
        return
      event.preventDefault()
      void submitMessage()
    }

    function handleClosedComposerKeydown(event: KeyboardEvent): void {
      if (event.key !== 'Enter' && event.key !== ' ')
        return
      event.preventDefault()
      focusMessageComposer()
    }

    expose({
      focusMessageComposer,
    })

    return () => (
      <section {...stylex.attrs(styles.section)}>
        <div {...stylex.attrs(styles.header)}>
          <div {...stylex.attrs(styles.titleGroup)}>
            <h2 {...stylex.attrs(styles.title)}>Activity</h2>
            {activityQuery.isFetching.value && <span {...stylex.attrs(styles.loadingTiny)}>Loading...</span>}
          </div>
          <div {...stylex.attrs(styles.headerActions)}>
            <button
              type="button"
              {...stylex.attrs(styles.watchButton)}
              disabled={updateWatchingMutation.isPending.value}
              onClick={() => void toggleTicketWatching()}
            >
              {detailWatchButtonLabel.value}
            </button>
            {detailWatchCountLabel.value && <span {...stylex.attrs(styles.count)}>{detailWatchCountLabel.value}</span>}
            {detailActivityParticipantNames.value.length > 0 && (
              <div {...stylex.attrs(styles.avatars)}>
                {detailActivityParticipantNames.value.map((name, index) => (
                  <span
                    key={name}
                    {...stylex.attrs(styles.avatar, styles.avatarSmall, index > 0 ? styles.stackedAvatar : null, avatarStyle(getAssigneeAvatarTone(name)))}
                    title={name}
                  >
                    {getAssigneeInitials(name)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {watchError.value && (
          <div {...stylex.attrs(styles.errorBox, styles.watchError)}>
            {watchError.value}
          </div>
        )}
        {activityQuery.isError.value
          ? (
              <div {...stylex.attrs(styles.errorBox)}>
                Failed to load activity.
              </div>
            )
          : activityQuery.isLoading.value
            ? (
                <div {...stylex.attrs(styles.skeleton)} aria-hidden="true">
                  {[1, 2, 3, 4].map(skeletonIndex => (
                    <div key={skeletonIndex} {...stylex.attrs(styles.skeletonRow)}>
                      <span {...stylex.attrs(styles.skeletonDot)} />
                      <span {...stylex.attrs(styles.skeletonLine, skeletonIndex % 2 ? styles.skeletonWide : styles.skeletonNarrow)} />
                    </div>
                  ))}
                </div>
              )
            : activityTimelineItems.value.length
              ? (
                  <div {...stylex.attrs(styles.timeline)}>
                    {activityTimelineItems.value.map((activityItem, activityIndex) => (
                      activityItem.kind === 'history'
                        ? (
                            <article key={`${activityItem.kind}:${activityItem.id}`} {...stylex.attrs(styles.historyItem)}>
                              {activityTimelineItems.value[activityIndex + 1]?.kind === 'history' && (
                                <span {...stylex.attrs(styles.historyLine)} aria-hidden="true" />
                              )}
                              <div {...stylex.attrs(styles.marker, historyMarkerStyle(getActivityHistoryTone(activityItem)))}>
                                <span {...stylex.attrs(styles.markerDot)} />
                              </div>
                              <p {...stylex.attrs(styles.historyText)}>
                                {activityItem.body}
                                {formatActivityTime(activityItem.createdAt) && (
                                  <span {...stylex.attrs(styles.time)}>
                                    {' '}
                                    ·
                                    {formatActivityTime(activityItem.createdAt)}
                                  </span>
                                )}
                              </p>
                            </article>
                          )
                        : (
                            <article key={`${activityItem.kind}:${activityItem.id}`} {...stylex.attrs(styles.comment)}>
                              <div {...stylex.attrs(styles.avatar, styles.avatarComment, avatarStyle(getAssigneeAvatarTone(activityItem.author)))}>
                                {getAssigneeInitials(activityItem.author)}
                              </div>
                              <div {...stylex.attrs(styles.commentBody)}>
                                <div {...stylex.attrs(styles.commentHeader)}>
                                  <span {...stylex.attrs(styles.author)}>{activityItem.author}</span>
                                  <span {...stylex.attrs(styles.commentTime)}>{formatActivityTime(activityItem.createdAt)}</span>
                                </div>
                                {getActivityCommentParentAuthor(activityItem) && (
                                  <div {...stylex.attrs(styles.replyPill)}>
                                    Reply to
                                    {' '}
                                    {getActivityCommentParentAuthor(activityItem)}
                                  </div>
                                )}
                                <div {...stylex.attrs(styles.bodyText)}>
                                  {activityItem.body || 'No comment body'}
                                </div>
                              </div>
                            </article>
                          )
                    ))}
                  </div>
                )
              : (
                  <div {...stylex.attrs(styles.empty)}>
                    No activity yet.
                  </div>
                )}

        {activityComposerOpen.value
          ? (
              <div {...stylex.attrs(styles.composer)}>
                <textarea
                  id="detail-message"
                  ref={messageTextareaRef}
                  v-model={messageDraft.value}
                  {...stylex.attrs(styles.textarea)}
                  rows={4}
                  placeholder="Leave a comment..."
                  onKeydown={handleMessageKeydown}
                />
                <div {...stylex.attrs(styles.composerFooter)}>
                  {messageError.value
                    ? <span {...stylex.attrs(styles.composerError)}>{messageError.value}</span>
                    : <span {...stylex.attrs(styles.composerSpacer)} />}
                  <span {...stylex.attrs(styles.composerActions)}>
                    <button
                      type="button"
                      {...stylex.attrs(styles.disabledIconButton)}
                      disabled
                      aria-label="Attachments are not available yet"
                      title="Attachments are not available yet"
                    >
                      <svg {...stylex.attrs(styles.icon)} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m20 11.5-8.8 8.8a5 5 0 0 1-7.1-7.1l9.5-9.5a3.4 3.4 0 0 1 4.8 4.8l-9.6 9.6a1.8 1.8 0 0 1-2.5-2.5l8.7-8.7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      {...stylex.attrs(styles.postButton)}
                      disabled={addMessageMutation.isPending.value || !messageCanSubmit.value}
                      aria-label={addMessageMutation.isPending.value ? 'Posting comment' : 'Post comment'}
                      onClick={() => void submitMessage()}
                    >
                      {!addMessageMutation.isPending.value
                        ? (
                            <svg {...stylex.attrs(styles.postIcon)} viewBox="0 0 16 16" fill="currentColor">
                              <path d="M8 3.2 3.9 7.3l.9.9 2.6-2.6v7.2h1.2V5.6l2.6 2.6.9-.9L8 3.2Z" />
                            </svg>
                          )
                        : <span {...stylex.attrs(styles.smallSpinner)} />}
                    </button>
                  </span>
                </div>
              </div>
            )
          : (
              <div
                role="button"
                tabindex={0}
                {...stylex.attrs(styles.closedComposer)}
                onClick={focusMessageComposer}
                onKeydown={handleClosedComposerKeydown}
              >
                <span {...stylex.attrs(styles.placeholder)}>Leave a comment...</span>
                <span {...stylex.attrs(styles.closedActions)}>
                  <button
                    type="button"
                    {...stylex.attrs(styles.disabledIconButton)}
                    disabled
                    aria-label="Attachments are not available yet"
                    title="Attachments are not available yet"
                    onClick={event => event.stopPropagation()}
                  >
                    <svg {...stylex.attrs(styles.icon)} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m20 11.5-8.8 8.8a5 5 0 0 1-7.1-7.1l9.5-9.5a3.4 3.4 0 0 1 4.8 4.8l-9.6 9.6a1.8 1.8 0 0 1-2.5-2.5l8.7-8.7" />
                    </svg>
                  </button>
                  <span {...stylex.attrs(styles.postButton)} aria-hidden="true">
                    <svg {...stylex.attrs(styles.postIcon)} viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 3.2 3.9 7.3l.9.9 2.6-2.6v7.2h1.2V5.6l2.6 2.6.9-.9L8 3.2Z" />
                    </svg>
                  </span>
                </span>
              </div>
            )}
      </section>
    )
  },
})

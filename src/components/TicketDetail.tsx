import type { PropType } from 'vue'
import type { JiraTicket } from '@/types/jira'
import * as stylex from '@stylexjs/stylex'
import { useQueryClient } from '@tanstack/vue-query'
import { computed, defineComponent, onMounted, onUnmounted, ref } from 'vue'
import { fetchTicket } from '@/api/jira'
import { fetchLocalTicket } from '@/api/localTickets'
import TicketDetailActivity from '@/components/ticket-detail/TicketDetailActivity'
import TicketDetailChildren from '@/components/ticket-detail/TicketDetailChildren'
import TicketDetailDescription from '@/components/ticket-detail/TicketDetailDescription'
import TicketDetailHeader from '@/components/ticket-detail/TicketDetailHeader'
import TicketDetailLinkedItems from '@/components/ticket-detail/TicketDetailLinkedItems'
import TicketDetailSidebar from '@/components/ticket-detail/TicketDetailSidebar'
import ViewHeaderBreadcrumb from '@/components/ViewHeaderBreadcrumb'
import { localTicketQueryKey, ticketQueryKey } from '@/composables/queryKeys'
import { useJiraTicket } from '@/composables/useJiraTicket'
import { useLocalTicket } from '@/composables/useLocalTicket'
import { usePinnedTickets } from '@/composables/usePinnedTickets'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { useTicketsQuery } from '@/composables/useTicketsQuery'
import { useToast } from '@/composables/useToast'
import { getTeamViewId } from '@/features/ticket-list/helpers'
import { uiStyles } from '@/styles/shared'
import { breakpoints, colors } from '@/styles/tokens.stylex'
import { buildJiraIssueUrl } from '@/utils/jiraIssueUrl'
import { resolveSpaceAppearance } from '@/utils/spaceAppearance'
import { isLocalTicketKey } from '~/shared/localTickets'

type TicketDetailMode = 'inline' | 'panel'

interface TicketDetailActivityExpose {
  focusMessageComposer: () => void
}

interface TicketDetailDescriptionExpose {
  focusDescriptionEditor: () => void
}

interface TicketDetailHeaderExpose {
  focusTitleInput: () => void
}

interface TicketDetailSidebarExpose {
  startEditingAssignee: () => void
  startEditingPriority: () => void
  startEditingStatus: () => void
}

const styles = stylex.create({
  shell: { minHeight: { default: '100%', [breakpoints.lg]: 0 }, backgroundColor: colors['--color-issue-detail-bg'], display: { [breakpoints.lg]: 'flex' }, height: { [breakpoints.lg]: '100%' }, flexDirection: { [breakpoints.lg]: 'column' } },
  loadedShell: { minHeight: { default: '100%', [breakpoints.lg]: 0 }, backgroundColor: colors['--color-issue-detail-bg'], display: { [breakpoints.lg]: 'flex' }, height: { [breakpoints.lg]: '100%' }, flexDirection: { [breakpoints.lg]: 'column' } },
  topBar: { position: { default: 'sticky', [breakpoints.lg]: 'static' }, top: 0, zIndex: 20, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: colors['--color-issue-detail-bg'], backdropFilter: 'blur(8px)', flexShrink: { [breakpoints.lg]: 0 } },
  topBarInner: { display: 'flex', minHeight: '3rem', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', paddingInline: '1.5rem', paddingBlock: '0.5rem' },
  crumbText: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  crumbSeparator: { flexShrink: 0, color: '#6f727b' },
  crumbButton: { flexShrink: 0, borderRadius: '0.25rem', borderWidth: 0, backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.04)' }, paddingInline: '0.25rem', paddingBlock: '0.125rem', color: '#f0f1f4', transitionProperty: 'background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  crumbSummaryButton: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' },
  pinButton: { display: 'flex', width: '1.5rem', height: '1.5rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', borderWidth: 0, backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.04)' }, color: { 'default': '#8f9198', ':hover': '#f0f1f4' }, transitionProperty: 'color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  pinButtonPinned: { color: { 'default': colors['--color-accent-amber'], ':hover': colors['--color-accent-amber'] } },
  pinIcon: { fontSize: 14, lineHeight: 1 },
  layout: { display: 'grid', minHeight: { default: 'calc(100vh - 3rem)', [breakpoints.lg]: 0 }, gridTemplateColumns: { default: '1fr', [breakpoints.lg]: 'minmax(0,1fr) 19rem' }, backgroundColor: colors['--color-issue-detail-bg'], flex: { [breakpoints.lg]: '1' }, overflow: { [breakpoints.lg]: 'hidden' } },
  main: { minWidth: 0, paddingInline: { default: '1.5rem', [breakpoints.lg]: '2.5rem' }, paddingBlock: '2rem', overflowY: { [breakpoints.lg]: 'auto' } },
  content: { marginInline: 'auto', maxWidth: '48rem' },
  centeredMessage: { display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBlock: '5rem' },
  errorMessage: { fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-rose-300'] },
  loadingStack: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' },
  spinner: { width: '1.25rem', height: '1.25rem', borderRadius: '9999px', borderWidth: 2, borderStyle: 'solid', borderColor: colors['--color-slate-700'], borderTopColor: colors['--color-accent-indigo'], animationName: stylex.keyframes({ to: { transform: 'rotate(360deg)' } }), animationDuration: '1s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' },
  loadingText: { fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-600'] },
  previewBackdrop: { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.9)', padding: '2rem', backdropFilter: 'blur(4px)' },
  previewClose: { position: 'absolute', right: '1.25rem', top: '1.25rem', borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.12)', backgroundColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':hover': 'rgba(255, 255, 255, 0.14)' }, paddingInline: '0.75rem', paddingBlock: '0.375rem', fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, color: { 'default': colors['--color-slate-200'], ':hover': colors['--color-white'] }, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(8px)', transitionProperty: 'color, background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  previewImage: { width: 'auto', height: 'auto', maxWidth: 'calc(100vw - 4rem)', maxHeight: 'calc(100vh - 5rem)', borderRadius: '0.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)' },
})

export default defineComponent({
  name: 'TicketDetail',
  props: {
    ticketKey: {
      type: String as PropType<string | null>,
      default: null,
    },
    mode: {
      type: String as PropType<TicketDetailMode>,
      default: 'inline',
    },
  },
  emits: {
    close: () => true,
    select: (key: string) => typeof key === 'string',
    navigateView: (viewId: string) => typeof viewId === 'string',
    createChild: (parentKey: string) => typeof parentKey === 'string',
  },
  setup(props, { emit }) {
    const { isPinned, togglePinnedTicket } = usePinnedTickets()
    const { enabledSpaces, hasJiraCredentialsConfigured, jiraConnection } = useSpaceSettings()
    const { showError, showSuccess } = useToast()
    const ticketKey = computed(() => props.ticketKey)
    const isLocalTicket = computed(() => isLocalTicketKey(ticketKey.value))
    const jiraDataEnabled = computed(() => (
      Boolean(ticketKey.value && !isLocalTicketKey(ticketKey.value) && hasJiraCredentialsConfigured.value)
    ))

    const ticketQuery = useJiraTicket(ticketKey, { queryEnabled: jiraDataEnabled })
    const localTicketQuery = useLocalTicket(ticketKey)
    const queryClient = useQueryClient()
    const ticketsQuery = useTicketsQuery()

    const cachedTicket = computed<JiraTicket | null>(() => {
      const key = ticketKey.value
      if (!key)
        return null

      const tickets = ticketsQuery.data.value
      return tickets?.find(ticket => ticket.key === key) ?? null
    })

    const ticket = computed(() => {
      if (isLocalTicket.value)
        return localTicketQuery.data.value ?? cachedTicket.value

      return ticketQuery.data.value ?? cachedTicket.value
    })
    const jiraIssueUrl = computed(() => {
      const currentTicket = ticket.value
      if (!currentTicket || isLocalTicket.value)
        return null

      return buildJiraIssueUrl(jiraConnection.value.baseUrl, currentTicket.key)
    })
    const detailSpaceAppearance = computed(() => {
      const currentTicket = ticket.value
      if (!currentTicket)
        return null

      const space = enabledSpaces.value.find(entry => entry.key === currentTicket.spaceKey)
      return resolveSpaceAppearance(space ?? {
        key: currentTicket.spaceKey,
        name: currentTicket.spaceName || currentTicket.spaceKey,
      })
    })
    const ticketIsPinned = computed(() => (
      ticket.value ? isPinned(ticket.value.key) : false
    ))

    const detailLoaded = computed(() => {
      if (isLocalTicket.value)
        return true
      return ticketQuery.data.value !== undefined && !ticketQuery.isPlaceholderData.value
    })

    const detailQueryError = computed(() => (
      isLocalTicket.value ? localTicketQuery.isError.value : ticketQuery.isError.value
    ))

    const issueType = computed(() => ticket.value?.issueType?.toLowerCase() || 'task')

    const childTickets = computed<JiraTicket[]>(() => {
      const key = ticketKey.value
      if (!key)
        return []
      const allTickets = ticketsQuery.data.value
      if (!allTickets)
        return []
      return allTickets.filter(t => t.parent?.key === key)
    })

    const isProjectDetail = computed(() => issueType.value.includes('epic'))
    const isInitiativeDetail = computed(() => issueType.value.includes('initiative'))
    const detailBreadcrumbRoot = computed(() => {
      if (isInitiativeDetail.value)
        return 'Initiatives'
      return isProjectDetail.value ? 'Projects' : 'Issues'
    })
    const detailBreadcrumbSpace = computed(() => (
      ticket.value?.spaceName || ticket.value?.spaceKey || 'Workspace'
    ))
    const detailBreadcrumbViewId = computed(() => {
      if (isInitiativeDetail.value)
        return 'initiatives'

      const spaceKey = ticket.value?.spaceKey
      if (!spaceKey)
        return isProjectDetail.value ? 'projects' : 'my-issues'
      return isProjectDetail.value ? getTeamViewId(spaceKey, 'projects') : getTeamViewId(spaceKey, 'all')
    })
    const detailChildActionLabel = computed(() => {
      if (isInitiativeDetail.value)
        return 'Add epic'
      return isProjectDetail.value ? 'Add issue' : 'Add sub-issue'
    })
    const detailChildSectionLabel = computed(() => {
      if (isInitiativeDetail.value)
        return 'Epics'
      return isProjectDetail.value ? 'Issues' : 'Sub-issues'
    })
    const detailEmptyChildLabel = computed(() => {
      if (isInitiativeDetail.value)
        return 'No epics linked'
      return isProjectDetail.value ? 'No issues linked' : 'No sub-issues'
    })

    const imagePreview = ref<{ src: string, alt: string } | null>(null)

    function openImagePreview(payload: { src: string, alt: string }): void {
      imagePreview.value = payload
    }

    function closeImagePreview(): void {
      imagePreview.value = null
    }

    onUnmounted(() => {
      document.removeEventListener('keydown', handleDetailShortcut)
    })

    const ticketActivityRef = ref<TicketDetailActivityExpose | null>(null)
    const ticketDescriptionRef = ref<TicketDetailDescriptionExpose | null>(null)
    const ticketHeaderRef = ref<TicketDetailHeaderExpose | null>(null)
    const ticketSidebarRef = ref<TicketDetailSidebarExpose | null>(null)

    function prefetchTicket(key: string): void {
      if (isLocalTicketKey(key)) {
        queryClient.prefetchQuery({
          queryKey: localTicketQueryKey(key),
          queryFn: () => fetchLocalTicket(key),
        })
        return
      }

      queryClient.prefetchQuery({
        queryKey: ticketQueryKey(key),
        queryFn: () => fetchTicket(key),
      })
    }

    function isEditableShortcutTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement))
        return false

      const tagName = target.tagName.toLowerCase()
      return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select'
    }

    function isCopyJiraIssueUrlShortcut(event: KeyboardEvent): boolean {
      return (event.metaKey || event.ctrlKey)
        && event.shiftKey
        && !event.altKey
        && event.key.toLowerCase() === 'c'
    }

    async function copyActiveJiraIssueUrl(): Promise<void> {
      const currentTicket = ticket.value
      const currentJiraIssueUrl = jiraIssueUrl.value

      if (!currentTicket || !currentJiraIssueUrl || isLocalTicket.value)
        return

      try {
        await navigator.clipboard.writeText(currentJiraIssueUrl)
        showSuccess(`Copied ${currentTicket.key} Jira link to clipboard.`)
      }
      catch (error) {
        console.error('Failed to copy Jira link', error)
        showError('Failed to copy Jira link.')
      }
    }

    function handleDetailShortcut(event: KeyboardEvent): void {
      if (imagePreview.value && event.key === 'Escape') {
        event.preventDefault()
        closeImagePreview()
        return
      }

      if (isCopyJiraIssueUrlShortcut(event)) {
        if (
          !ticket.value
          || props.mode !== 'inline'
          || !jiraIssueUrl.value
          || isLocalTicket.value
          || isEditableShortcutTarget(event.target)
        ) {
          return
        }

        event.preventDefault()
        void copyActiveJiraIssueUrl()
        return
      }

      if (!ticket.value || props.mode !== 'inline' || isEditableShortcutTarget(event.target))
        return

      if (event.metaKey || event.ctrlKey || event.altKey)
        return

      if (event.key === 'Escape') {
        emit('close')
        return
      }

      const key = event.key.toLowerCase()
      if (key === 'a') {
        event.preventDefault()
        void ticketSidebarRef.value?.startEditingAssignee()
      }
      else if (key === 'p') {
        event.preventDefault()
        void ticketSidebarRef.value?.startEditingPriority()
      }
      else if (key === 'm') {
        event.preventDefault()
        void ticketSidebarRef.value?.startEditingStatus()
      }
      else if (key === 'c') {
        event.preventDefault()
        ticketActivityRef.value?.focusMessageComposer()
      }
      else if (key === 'd') {
        event.preventDefault()
        ticketDescriptionRef.value?.focusDescriptionEditor()
      }
      else if (key === 't') {
        event.preventDefault()
        ticketHeaderRef.value?.focusTitleInput()
      }
    }

    onMounted(() => {
      document.addEventListener('keydown', handleDetailShortcut)
    })

    return () => {
      const currentTicket = ticket.value

      return (
        props.ticketKey && props.mode === 'inline' && (
          <div {...stylex.attrs(styles.shell)}>
            {currentTicket
              ? (
                  <div {...stylex.attrs(styles.loadedShell, uiStyles.fadeIn)}>
                    <div {...stylex.attrs(styles.topBar)}>
                      <div {...stylex.attrs(styles.topBarInner)}>
                        {detailSpaceAppearance.value && (
                          <ViewHeaderBreadcrumb
                            icon={detailSpaceAppearance.value.icon}
                            iconColor={detailSpaceAppearance.value.color}
                            fallback={detailSpaceAppearance.value.initial}
                          >
                            {{
                              default: () => (
                                <>
                                  <span {...stylex.attrs(styles.crumbText)}>{detailBreadcrumbSpace.value}</span>
                                  <span {...stylex.attrs(styles.crumbSeparator)}>›</span>
                                  <button
                                    type="button"
                                    {...stylex.attrs(styles.crumbButton)}
                                    onClick={() => emit('navigateView', detailBreadcrumbViewId.value)}
                                  >
                                    {detailBreadcrumbRoot.value}
                                  </button>
                                  {currentTicket.parent && (
                                    <>
                                      <span {...stylex.attrs(styles.crumbSeparator)}>›</span>
                                      <button
                                        type="button"
                                        {...stylex.attrs(styles.crumbButton)}
                                        onClick={() => emit('select', currentTicket.parent!.key)}
                                        onMouseenter={() => prefetchTicket(currentTicket.parent!.key)}
                                      >
                                        {currentTicket.parent.key}
                                      </button>
                                    </>
                                  )}
                                  <span {...stylex.attrs(styles.crumbSeparator)}>›</span>
                                  <button
                                    type="button"
                                    {...stylex.attrs(styles.crumbButton, styles.crumbSummaryButton)}
                                    onClick={() => emit('select', currentTicket.key)}
                                  >
                                    {currentTicket.summary}
                                  </button>
                                  <button
                                    type="button"
                                    {...stylex.attrs(styles.pinButton, ticketIsPinned.value ? styles.pinButtonPinned : null)}
                                    aria-label={ticketIsPinned.value ? `Unpin ${currentTicket.key}` : `Pin ${currentTicket.key}`}
                                    onClick={() => togglePinnedTicket(currentTicket.key)}
                                  >
                                    <span {...stylex.attrs(styles.pinIcon)}>★</span>
                                  </button>
                                </>
                              ),
                            }}
                          </ViewHeaderBreadcrumb>
                        )}
                      </div>
                    </div>

                    <div {...stylex.attrs(styles.layout)}>
                      <main {...stylex.attrs(styles.main, uiStyles.stableScrollbar)}>
                        <div {...stylex.attrs(styles.content)}>
                          <TicketDetailHeader
                            ref={ticketHeaderRef}
                            childTickets={childTickets.value}
                            isProjectDetail={isProjectDetail.value}
                            ticket={currentTicket}
                            onPrefetch={prefetchTicket}
                            onSelect={key => emit('select', key)}
                          />

                          <TicketDetailDescription
                            ref={ticketDescriptionRef}
                            detailLoaded={detailLoaded.value}
                            isLocalTicket={isLocalTicket.value}
                            ticket={currentTicket}
                            onPreviewImage={openImagePreview}
                          />

                          <TicketDetailChildren
                            actionLabel={detailChildActionLabel.value}
                            childTickets={childTickets.value}
                            emptyLabel={detailEmptyChildLabel.value}
                            sectionLabel={detailChildSectionLabel.value}
                            ticketKey={currentTicket.key}
                            onCreate={key => emit('createChild', key)}
                            onPrefetch={prefetchTicket}
                            onSelect={key => emit('select', key)}
                          />

                          {!isLocalTicket.value && (
                            <TicketDetailLinkedItems
                              linkedIssues={currentTicket.linkedIssues}
                              onPrefetch={prefetchTicket}
                              onSelect={key => emit('select', key)}
                            />
                          )}

                          {!isLocalTicket.value && (
                            <TicketDetailActivity
                              ref={ticketActivityRef}
                              queryEnabled={jiraDataEnabled.value}
                              ticket={currentTicket}
                              ticketKey={currentTicket.key}
                            />
                          )}
                        </div>
                      </main>

                      <TicketDetailSidebar
                        ref={ticketSidebarRef}
                        isLocalTicket={isLocalTicket.value}
                        isProjectDetail={isProjectDetail.value}
                        jiraDataEnabled={jiraDataEnabled.value}
                        ticket={currentTicket}
                        onPrefetch={prefetchTicket}
                        onSelect={key => emit('select', key)}
                      />
                    </div>

                  </div>
                )
              : detailQueryError.value
                ? (
                    <div {...stylex.attrs(styles.centeredMessage, styles.errorMessage)}>
                      Failed to load ticket details.
                    </div>
                  )
                : (
                    <div {...stylex.attrs(styles.centeredMessage)}>
                      <div {...stylex.attrs(styles.loadingStack)}>
                        <div {...stylex.attrs(styles.spinner)} />
                        <span {...stylex.attrs(styles.loadingText)}>Loading ticket</span>
                      </div>
                    </div>
                  )}

            {imagePreview.value && (
              <div
                {...stylex.attrs(styles.previewBackdrop)}
                role="dialog"
                aria-modal="true"
                aria-label="Image preview"
                onClick={closeImagePreview}
              >
                <button
                  type="button"
                  {...stylex.attrs(styles.previewClose)}
                  onClick={(event) => {
                    event.stopPropagation()
                    closeImagePreview()
                  }}
                >
                  Close
                </button>
                <img
                  src={imagePreview.value.src}
                  alt={imagePreview.value.alt}
                  {...stylex.attrs(styles.previewImage)}
                  onClick={event => event.stopPropagation()}
                />
              </div>
            )}
          </div>
        )
      )
    }
  },
})

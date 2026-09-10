import * as stylex from '@stylexjs/stylex'
import { defineComponent, onUnmounted, reactive, watchEffect } from 'vue'
import { useAssistantContextRefresh } from '@/composables/useAssistantContextRefresh'
import { useAssistantSessions, workspaceContext } from '@/composables/useAssistantSessions'
import { captureAssistantContext } from '@/features/ticket-list/assistantContext'
import { createAssistantViewReader } from '@/features/ticket-list/assistantViewContext'
import { useTicketListContext } from '@/features/ticket-list/ticketListContext'
import { uiStyles } from '@/styles/shared'
import { colors } from '@/styles/tokens.stylex'
import AddSpaceModal from '../AddSpaceModal'
import CreateTicketModal from '../CreateTicketModal'
import Sidebar from '../Sidebar'
import TicketDetail from '../TicketDetail'
import CyclePlanningHeader from './CyclePlanningHeader'
import TeamSettingsView from './TeamSettingsView'
import TicketListAssistantHome from './TicketListAssistantHome'
import TicketListCommandMenu from './TicketListCommandMenu'
import TicketListCyclesDirectory from './TicketListCyclesDirectory'
import TicketListInitiativesView from './TicketListInitiativesView'
import TicketListIssueSections from './TicketListIssueSections'
import TicketListProjectView from './TicketListProjectView'
import TicketListSavedViewsView from './TicketListSavedViewsView'
import TicketListSearchView from './TicketListSearchView'
import TicketListSelectionBar from './TicketListSelectionBar'
import TicketListToolbarArea from './TicketListToolbarArea'

const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

const styles = stylex.create({
  shell: { display: 'flex', height: 'calc(100dvh - 44px)', overflow: 'hidden' },
  sidebarColumn: (width: string) => ({ position: 'relative', flexShrink: 0, width, transitionProperty: 'width', transitionDuration: '200ms' }),
  resizeHandle: { position: 'absolute', top: 0, right: '-1rem', zIndex: 10, height: '100%', width: '1rem', cursor: 'col-resize', touchAction: 'none', backgroundColor: 'transparent', outlineStyle: { ':focus': 'none' } },
  main: { minWidth: 0, flex: '1', overflow: 'hidden', padding: '0.5rem' },
  contentPanel: { display: 'flex', height: '100%', minWidth: 0, flexDirection: 'column', overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.055)', backgroundColor: colors['--color-issue-detail-bg'] },
  detailScroll: { minHeight: 0, flex: '1', overflowY: { 'default': 'auto', '@media (min-width: 64rem)': 'hidden' } },
  cycleBody: { display: 'flex', minHeight: 0, flex: '1', flexDirection: 'column', overflow: 'hidden' },
  issueSections: { minHeight: 0, flex: '1', overflowY: 'auto' },
  loadingOverlay: { position: 'fixed', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)', paddingInline: '1rem', paddingBlock: '2rem' },
  loadingPanel: { display: 'flex', width: '100%', maxWidth: '24rem', alignItems: 'center', gap: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#121316', paddingInline: '1rem', paddingBlock: '0.75rem', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.35), 0 8px 10px -6px rgb(0 0 0 / 0.35)' },
  spinner: { height: '1.25rem', width: '1.25rem', flexShrink: 0, borderRadius: '9999px', borderWidth: 2, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.12)', borderTopColor: '#d7d8dc', animationName: spin, animationDuration: '1s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' },
  loadingText: { minWidth: 0, textAlign: 'left' },
  loadingTitle: { fontSize: 13, fontWeight: 500, color: '#f0f1f4' },
  loadingDescription: { marginTop: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: '#8f9198' },
})

export default defineComponent({
  name: 'TicketListShell',
  setup() {
    const context = reactive(useTicketListContext())
    const sessions = useAssistantSessions()
    const { capture } = useAssistantContextRefresh()
    const captureContextRefresher = () => capture(createAssistantViewReader(captureAssistantContext(context), context.assistantViewState))
    sessions.captureContextRefresher.value = captureContextRefresher
    watchEffect(() => {
      sessions.currentContext.value = captureAssistantContext(context)
    })
    onUnmounted(() => {
      if (sessions.captureContextRefresher.value === captureContextRefresher) {
        sessions.currentContext.value = workspaceContext
        sessions.captureContextRefresher.value = undefined
      }
    })

    return () => (
      <div {...stylex.attrs(styles.shell, uiStyles.shell)} aria-busy={context.showInitialWorkspaceOverlay}>
        {(context.currentView !== 'assistant' || context.selectedKey) && (
          <div {...stylex.attrs(styles.sidebarColumn(`${context.effectiveSidebarWidth}px`))}>
            <Sidebar
              tickets={context.tickets}
              selectedKey={context.selectedKey}
              collapsed={context.sidebarCollapsed}
              refreshing={context.refreshing}
              currentView={context.currentView}
              favoriteViews={context.favoriteViewNavItems}
              canGoBack={context.canGoBack}
              canGoForward={context.canGoForward}
              onBack={context.goBack}
              onForward={context.goForward}
              onSelect={context.openTicket}
              onPrefetch={context.prefetchTicket}
              onToggleCollapse={() => { context.sidebarCollapsed = !context.sidebarCollapsed }}
              onRefresh={context.handleRefresh}
              onHome={() => context.handleViewChange('assistant')}
              onSettings={context.openSettings}
              onCommand={context.openCommandMenu}
              onView={context.handleViewChange}
              onFavoriteView={context.handleFavoriteViewChange}
              onFavorite-count-visibility={context.setFavoriteViewIssueCountVisible}
              onAddSpace={context.openAddSpaceModal}
              onLeave-space={context.handleLeaveSpace}
            />
            {!context.sidebarCollapsed && (
              <div
                role="separator"
                aria-orientation="vertical"
                tabindex="0"
                {...stylex.attrs(styles.resizeHandle)}
                aria-label="Resize sidebar"
                onPointerdown={context.startSidebarResize}
              />
            )}
          </div>
        )}
        <main {...stylex.attrs(styles.main)}>
          <div {...stylex.attrs(styles.contentPanel)}>
            {!context.selectedKey && !context.isTeamSettingsView && context.currentView !== 'assistant' && <TicketListToolbarArea />}
            {context.selectedKey
              ? (
                  <div {...stylex.attrs(styles.detailScroll, uiStyles.stableScrollbar)}>
                    <TicketDetail
                      ticketKey={context.selectedKey}
                      mode="inline"
                      onClose={context.closeTicket}
                      onSelect={context.openTicket}
                      onNavigateView={context.handleViewChange}
                      onCreateChild={context.openChildCreate}
                    />
                  </div>
                )
              : context.isTeamSettingsView && context.currentTeamKey
                ? <TeamSettingsView spaceKey={context.currentTeamKey} />
                : context.currentView === 'assistant'
                  ? <TicketListAssistantHome />
                  : context.currentView === 'search'
                    ? <TicketListSearchView />
                    : context.currentView === 'initiatives'
                      ? (
                          <TicketListInitiativesView
                            rows={context.initiativeRows}
                            gridTemplate={context.initiativeGridTemplate}
                            isFieldVisible={context.isInitiativeRowFieldVisible}
                            getHealthTone={context.getProjectHealthTone}
                            getRelativeTimeLabel={context.getRelativeTimeLabel}
                            onOpen={context.openTicket}
                          />
                        )
                      : context.isProjectDisplayView
                        ? (
                            <TicketListProjectView
                              sections={context.projectSections}
                              visibleCount={context.visibleProjectCount}
                              grouping={context.projectGrouping}
                              gridTemplate={context.projectGridTemplate}
                              isFieldVisible={context.isProjectRowFieldVisible}
                              isSectionCollapsed={context.isProjectSectionCollapsed}
                              getHealthTone={context.getProjectHealthTone}
                              onToggleSection={context.toggleProjectSection}
                              onPrefetch={context.prefetchTicket}
                              onOpen={context.openTicket}
                            />
                          )
                        : context.isViewsDirectory
                          ? (
                              <TicketListSavedViewsView
                                rows={context.displayedSavedViewRows}
                                gridTemplate={context.savedViewGridTemplate}
                                isFieldVisible={context.isSavedViewRowFieldVisible}
                                getRelativeTimeLabel={context.getRelativeTimeLabel}
                                onOpen={context.handleViewChange}
                              />
                            )
                          : context.isCyclesDirectory && context.currentTeamKey
                            ? (
                                <TicketListCyclesDirectory
                                  payload={context.cyclePayload}
                                  tickets={context.currentTeamTickets}
                                  teamKey={context.currentTeamKey}
                                  errorMessage={context.spaceCycles.errorMessage}
                                  onOpen={context.handleViewChange}
                                  onSelectBoard={boardId => context.spaceCycles.setBoard(boardId)}
                                />
                              )
                            : (
                                <div {...stylex.attrs(styles.cycleBody)}>
                                  {context.isCycleWorkingView && context.activeCycle && (
                                    <CyclePlanningHeader
                                      cycle={context.activeCycle}
                                      kind={context.cycleViewKind === 'directory' || !context.cycleViewKind ? 'current' : context.cycleViewKind}
                                      tickets={context.activeCycleTickets}
                                      addableTickets={context.addableCycleTickets}
                                      isMutating={context.spaceCycles.isMutating}
                                      onAdd={context.addTicketToActiveCycle}
                                    />
                                  )}
                                  <TicketListIssueSections
                                    xstyle={styles.issueSections}
                                    sections={context.issueSections}
                                    visibleCount={context.visibleIssueCount}
                                    hiddenCompletedCount={context.hiddenCompletedCount}
                                    completedRange={context.completedRange}
                                    focusedIssueKey={context.focusedIssueKey}
                                    checkedIssueKeySet={context.checkedIssueKeySet}
                                    rowDisplayProps={context.issueRowDisplayProps}
                                    showHeaders={context.shouldShowIssueSectionHeader()}
                                    getRowKey={context.getDisplayedIssueRowKey}
                                    isCollapsed={context.isIssueSectionCollapsed}
                                    isStatusGrouping={context.listGrouping === 'status'}
                                    getStatusCategoryForGroupLabel={context.getStatusCategoryForGroupLabel}
                                    emptyTitle={context.isCycleWorkingView ? 'No issues in this cycle' : 'No issues match this view'}
                                    emptyDescription={context.isCycleWorkingView ? 'Assign a cycle on the issue, or pick a different cycle view.' : 'Adjust filters or create a new issue.'}
                                    onShowCompleted={() => { context.completedRange = 'all' }}
                                    onToggleSection={context.toggleIssueSection}
                                    onSelect={context.openTicket}
                                    onPrefetch={context.prefetchTicket}
                                    onToggleCheck={context.toggleCheckedIssue}
                                  />
                                </div>
                              )}
          </div>
        </main>
        <TicketListCommandMenu
          query={context.commandQuery}
          open={context.commandMenuOpen}
          items={context.commandItems}
          activeIndex={context.commandActiveIndex}
          onUpdate:query={(value) => { context.commandQuery = value }}
          onClose={context.closeCommandMenu}
          onKeydown={context.handleCommandMenuKeydown}
          onActivate={(index) => { context.commandActiveIndex = index }}
          onRun={context.runCommandItem}
        />
        <TicketListSelectionBar
          count={context.checkedIssueCount}
          canCreateChild={context.checkedIssueCount === 1 && Boolean(context.checkedIssues[0])}
          onOpen={context.openFirstCheckedIssue}
          onCopy={context.copyCheckedIssueKeys}
          onCreateChild={() => {
            if (context.checkedIssues[0]) {
              context.openChildCreate(context.checkedIssues[0].key)
            }
          }}
          onClear={context.clearCheckedIssues}
        />
        <CreateTicketModal
          open={context.isCreateModalOpen}
          tickets={context.tickets}
          initialIssueType={context.createIssueType}
          initialParentKey={context.createParentKey}
          issueTypeLocked={context.issueTypeLocked}
          parentLocked={context.parentLocked}
          onClose={context.closeCreateModal}
          onCreated={context.handleTicketCreated}
        />
        <AddSpaceModal open={context.isAddSpaceModalOpen} onClose={context.closeAddSpaceModal} />
        {context.showInitialWorkspaceOverlay && (
          <div {...stylex.attrs(styles.loadingOverlay)} aria-live="polite">
            <div {...stylex.attrs(styles.loadingPanel, uiStyles.panel)}>
              <div {...stylex.attrs(styles.spinner)} />
              <div {...stylex.attrs(styles.loadingText)}>
                <h2 {...stylex.attrs(styles.loadingTitle)}>Connecting to Jira</h2>
                <p {...stylex.attrs(styles.loadingDescription)}>Pulling latest issues and workspace settings.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  },
})

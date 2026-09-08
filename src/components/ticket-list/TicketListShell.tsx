import { defineComponent, reactive } from 'vue'
import { useTicketListContext } from '@/features/ticket-list/ticketListContext'
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

export default defineComponent({
  name: 'TicketListShell',
  setup() {
    const context = reactive(useTicketListContext())

    return () => (
      <div class="linear-shell flex h-screen overflow-hidden" aria-busy={context.showInitialWorkspaceOverlay}>
        <div class="relative shrink-0 transition-[width] duration-200" style={{ width: `${context.effectiveSidebarWidth}px` }}>
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
              class="absolute top-0 -right-4 z-10 h-full w-4 cursor-col-resize touch-none bg-transparent focus:outline-none [cursor:col-resize]"
              aria-label="Resize sidebar"
              onPointerdown={context.startSidebarResize}
            />
          )}
        </div>
        <main class="min-w-0 flex-1 overflow-hidden p-2">
          <div class="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-white/[0.055] bg-issue-detail-bg">
            {!context.selectedKey && !context.isTeamSettingsView && context.currentView !== 'assistant' && <TicketListToolbarArea />}
            {context.selectedKey
              ? (
                  <div class="scrollbar-gutter-stable min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
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
                            getHealthClass={context.getProjectHealthClass}
                            getProgressBarClass={context.getProgressBarClass}
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
                              getHealthClass={context.getProjectHealthClass}
                              getProgressBarClass={context.getProgressBarClass}
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
                                <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
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
                                    class="min-h-0 flex-1 overflow-y-auto"
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
          <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 py-8" aria-live="polite">
            <div class="linear-panel flex w-full max-w-sm items-center gap-3 rounded-lg bg-[#121316] px-4 py-3 shadow-xl shadow-black/35">
              <div class="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/[0.12] border-t-[#d7d8dc]" />
              <div class="min-w-0 text-left">
                <h2 class="text-[13px] font-medium text-[#f0f1f4]">Connecting to Jira</h2>
                <p class="mt-0.5 truncate text-[12px] text-[#8f9198]">Pulling latest issues and workspace settings.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  },
})

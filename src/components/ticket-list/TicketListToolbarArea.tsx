import * as stylex from '@stylexjs/stylex'
import { defineComponent, reactive, ref } from 'vue'
import { Icon } from '#components'
import { useTicketListContext } from '@/features/ticket-list/ticketListContext'
import ViewEditorCard from '../ViewEditorCard'
import ViewHeaderBreadcrumb from '../ViewHeaderBreadcrumb'
import TicketListDisplayOptionsMenu from './TicketListDisplayOptionsMenu'
import TicketListFilterMenu from './TicketListFilterMenu'

const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

const styles = stylex.create({
  header: { display: 'flex', minHeight: '3rem', flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '1.5rem', paddingBlock: '0.5rem' },
  titleWrap: { minWidth: 0 },
  titleRow: { display: 'flex', minWidth: 0, alignItems: 'center', gap: '0.5rem' },
  title: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  breadcrumbText: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  breadcrumbSep: { flexShrink: 0, color: '#6f727b' },
  breadcrumbSection: { flexShrink: 0, paddingInline: '0.25rem', paddingBlock: '0.125rem' },
  plainTitle: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 20, fontWeight: 600, color: '#f0f1f4' },
  count: { flexShrink: 0, fontSize: 12, color: '#777a83' },
  favoriteButton: { marginLeft: '0.25rem', display: 'flex', height: '1.5rem', width: '1.5rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', borderRadius: '0.375rem', color: { 'default': '#8f9198', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.04)' }, transitionProperty: 'background-color, color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  favoriteActive: { color: { 'default': '#d7a543', ':hover': '#d7a543' } },
  star: { fontSize: 14, lineHeight: 1 },
  headerActions: { position: 'relative', zIndex: 20, display: 'flex', flexShrink: 0, alignItems: 'center', gap: '0.375rem' },
  inlineActions: { display: 'flex', alignItems: 'center', gap: '0.375rem' },
  iconButton: { display: 'flex', height: '2rem', width: '2rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', color: { 'default': '#8f9198', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.04)' }, opacity: { ':disabled': 0.5 }, transitionProperty: 'background-color, color, opacity', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  icon: { height: '1rem', width: '1rem' },
  smallIcon: { height: '0.875rem', width: '0.875rem' },
  tinyIcon: { height: '0.75rem', width: '0.75rem' },
  spinning: { animationName: spin, animationDuration: '1s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' },
  floatingActions: { position: 'absolute', top: '3rem', right: 0, display: 'flex', alignItems: 'center', gap: '0.375rem' },
  roundMenuButton: { position: 'relative', display: 'flex', height: '2rem', width: '2rem', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', color: { 'default': '#8f9198', ':hover': '#f0f1f4' }, backgroundColor: { 'default': 'rgba(255, 255, 255, 0.035)', ':hover': 'rgba(255, 255, 255, 0.06)' }, borderColor: 'rgba(255, 255, 255, 0.08)' },
  roundMenuActive: { borderColor: 'rgba(255, 255, 255, 0.14)', backgroundColor: 'rgba(255, 255, 255, 0.075)', color: '#f0f1f4' },
  modifiedDot: { position: 'absolute', top: '0.125rem', right: '0.125rem', height: '0.375rem', width: '0.375rem', borderRadius: '9999px', backgroundColor: '#4dbb83', boxShadow: '0 0 0 2px #0d0e10' },
  tabsBar: { display: 'flex', height: '2.5rem', flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', paddingInline: '0.75rem' },
  tabs: { display: 'flex', minWidth: 0, alignItems: 'center', gap: '0.25rem' },
  tab: { display: 'inline-flex', alignItems: 'center', gap: '0.375rem', borderRadius: '9999px', paddingInline: '0.75rem', paddingBlock: '0.375rem', fontSize: 12, transitionProperty: 'background-color, border-color, color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  tabActive: { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#f0f1f4' },
  tabInactive: { color: { 'default': '#8f9198', ':hover': '#d7d8dc' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.045)' } },
  draftTab: { borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.16)' },
  tabIcon: (color: string) => ({ height: '0.875rem', width: '0.875rem', color }),
  draftIcon: { height: '0.75rem', width: '0.75rem', color: '#777a83' },
  createViewButton: { marginLeft: '0.25rem', display: 'flex', height: '1.75rem', width: '1.75rem', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', color: { 'default': '#6f727b', ':hover': '#d7d8dc' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.045)' }, cursor: { ':disabled': 'not-allowed' }, opacity: { ':disabled': 0.4 }, transitionProperty: 'background-color, color, opacity', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  createIconWrap: { position: 'relative', height: '0.875rem', width: '0.875rem' },
  createPlus: { position: 'absolute', right: '-0.25rem', bottom: '-0.25rem', display: 'flex', height: '0.625rem', width: '0.625rem', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', backgroundColor: '#0d0e10', fontSize: 9, fontWeight: 500, lineHeight: 1, color: 'currentColor' },
  contextMenu: (left: string, top: string) => ({ position: 'fixed', left, top, zIndex: 50, width: '9rem', overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: '#15161a', paddingBlock: '0.25rem', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4)' }),
  contextItem: { display: 'flex', height: '2rem', width: '100%', alignItems: 'center', gap: '0.5rem', paddingInline: '0.75rem', textAlign: 'left', fontSize: 13, color: { 'default': '#d7d8dc', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.06)' } },
  contextDanger: { color: { 'default': '#e06c75', ':hover': '#ff8a93' }, backgroundColor: { 'default': null, ':hover': 'rgba(224, 108, 117, 0.1)' } },
  contextIcon: { height: '0.875rem', width: '0.875rem', color: '#8f9198' },
  filterBar: { display: 'flex', minHeight: '3rem', flexShrink: 0, alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.015)', paddingInline: '1rem', paddingBlock: '0.5rem' },
  filterChips: { display: 'flex', minWidth: 0, flex: '1', flexWrap: 'wrap', alignItems: 'center', gap: '0.375rem' },
  chip: { display: 'inline-flex', height: '1.75rem', maxWidth: '18rem', alignItems: 'center', gap: '0.375rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.045)', paddingInline: '0.5rem', fontSize: 12, color: '#d7d8dc' },
  truncate: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  chipOperator: { color: '#777a83' },
  chipValue: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#f0f1f4' },
  removeChipButton: { marginLeft: '0.125rem', display: 'flex', height: '1rem', width: '1rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.25rem', color: { 'default': '#777a83', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.08)' } },
  addFilterButton: { display: 'flex', height: '1.75rem', width: '1.75rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', color: { 'default': '#8f9198', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' } },
  saveArea: { position: 'relative', display: 'flex', flexShrink: 0, alignItems: 'center', gap: '0.5rem' },
  textButton: { borderRadius: '0.375rem', paddingInline: '0.5rem', paddingBlock: '0.25rem', fontSize: 12, color: { 'default': '#aeb0b7', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' } },
  saveButton: { borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: { 'default': 'rgba(255, 255, 255, 0.045)', ':hover': 'rgba(255, 255, 255, 0.07)' }, paddingInline: '0.625rem', paddingBlock: '0.25rem', fontSize: 12, color: { 'default': '#d7d8dc', ':hover': '#f0f1f4' } },
  saveMenuButton: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem' },
  saveMenu: { position: 'absolute', top: '2rem', right: 0, zIndex: 30, width: '12rem', overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: '#18191d', paddingBlock: '0.25rem', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.4)' },
  saveMenuItem: { display: 'flex', height: '2.25rem', width: '100%', alignItems: 'center', gap: '0.5rem', paddingInline: '0.75rem', textAlign: 'left', fontSize: 12, color: { 'default': '#d7d8dc', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.06)' } },
})

export default defineComponent({
  name: 'TicketListToolbarArea',
  setup() {
    const context = reactive(useTicketListContext())
    const saveMenuOpen = ref(false)

    function toggleSaveMenu(): void {
      saveMenuOpen.value = !saveMenuOpen.value
    }

    function saveChangesToThisView(): void {
      context.saveCurrentViewChangesToThisView()
      saveMenuOpen.value = false
    }

    function createNewViewFromChanges(): void {
      context.saveCurrentViewFilters()
      saveMenuOpen.value = false
    }

    function clearCurrentViewChanges(): void {
      context.clearCurrentViewFilters()
      saveMenuOpen.value = false
    }

    return () => (
      <>
        {!context.selectedTicket && (
          <header {...stylex.attrs(styles.header)}>
            <div {...stylex.attrs(styles.titleWrap)}>
              <div {...stylex.attrs(styles.titleRow)}>
                <h1 {...stylex.attrs(styles.title)}>
                  {context.currentTeamAppearance
                    ? (
                        <ViewHeaderBreadcrumb
                          icon={context.currentTeamAppearance.icon}
                          iconColor={context.currentTeamAppearance.color}
                          fallback={context.currentTeamAppearance.initial}
                        >
                          {{
                            default: () => (
                              <>
                                <span {...stylex.attrs(styles.breadcrumbText)}>{context.currentTeamName}</span>
                                {context.currentTeamSectionLabel && <span {...stylex.attrs(styles.breadcrumbSep)}>›</span>}
                                {context.currentTeamSectionLabel && <span {...stylex.attrs(styles.breadcrumbSection)}>{context.currentTeamSectionLabel}</span>}
                              </>
                            ),
                          }}
                        </ViewHeaderBreadcrumb>
                      )
                    : <span {...stylex.attrs(styles.plainTitle)}>{context.viewTitle}</span>}
                </h1>
                {context.currentView === 'initiatives'
                  ? (
                      <span {...stylex.attrs(styles.count)}>
                        {context.initiativeRows.length}
                        {' '}
                        {context.initiativeRows.length === 1 ? 'initiative' : 'initiatives'}
                      </span>
                    )
                  : context.isViewsDirectory
                    ? (
                        <span {...stylex.attrs(styles.count)}>
                          {context.displayedSavedViewRows.length}
                          {' '}
                          {context.displayedSavedViewRows.length === 1 ? 'view' : 'views'}
                        </span>
                      )
                    : context.currentView !== 'search' && !context.currentTeamKey
                      ? (
                          <span {...stylex.attrs(styles.count)}>
                            {context.visibleIssueCount}
                            {' '}
                            {context.visibleIssueCount === 1 ? 'issue' : 'issues'}
                          </span>
                        )
                      : null}
                {context.currentViewIsFavoritable && (
                  <button
                    type="button"
                    {...stylex.attrs(styles.favoriteButton, context.isFavoriteView(context.currentView) ? styles.favoriteActive : null)}
                    aria-pressed={context.isFavoriteView(context.currentView)}
                    title={context.isFavoriteView(context.currentView) ? 'Remove view from favorites' : 'Add view to favorites'}
                    onClick={context.toggleCurrentViewFavorite}
                  >
                    <span {...stylex.attrs(styles.star)}>★</span>
                  </button>
                )}
              </div>
            </div>

            <div {...stylex.attrs(styles.headerActions)}>
              <div {...stylex.attrs(styles.inlineActions)}>
                <button
                  type="button"
                  {...stylex.attrs(styles.iconButton)}
                  disabled={context.refreshing}
                  title="Refresh"
                  onClick={context.handleRefresh}
                >
                  <Icon name="lucide:refresh-cw" {...stylex.attrs(styles.icon, context.refreshing ? styles.spinning : null)} aria-hidden="true" />
                </button>
              </div>

              <div {...stylex.attrs(styles.floatingActions)}>
                {false && !context.selectedTicket && (
                  <button
                    type="button"
                    {...stylex.attrs(styles.roundMenuButton, context.hasModifiedFilterOptions || context.filterMenuOpen ? styles.roundMenuActive : null)}
                    title="Filter"
                    onClick={context.toggleFilterMenu}
                  >
                    <Icon name="lucide:list-filter" {...stylex.attrs(styles.icon)} aria-hidden="true" />
                  </button>
                )}

                {context.filterMenuOpen && !context.selectedTicket && <TicketListFilterMenu />}

                {false && !context.selectedTicket && (
                  <button type="button" {...stylex.attrs(styles.roundMenuButton)} title="Display options" onClick={context.toggleDisplayOptions}>
                    <Icon name="lucide:sliders-horizontal" {...stylex.attrs(styles.icon)} aria-hidden="true" />
                  </button>
                )}

                {context.displayOptionsOpen && !context.selectedTicket && <TicketListDisplayOptionsMenu />}
              </div>
            </div>
          </header>
        )}

        {!context.selectedTicket && (context.viewTabs.length || context.supportsCustomViews || context.isCycleWorkingView) && (
          <div {...stylex.attrs(styles.tabsBar)}>
            <div {...stylex.attrs(styles.tabs)}>
              {context.viewTabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  {...stylex.attrs(styles.tab, context.currentView === tab.id ? styles.tabActive : styles.tabInactive, tab.draft ? styles.draftTab : null)}
                  onClick={() => context.handleViewTabClick(tab)}
                  onContextmenu={(event) => {
                    event.preventDefault()
                    context.handleViewTabContextMenu(tab, event)
                  }}
                >
                  {tab.custom && (
                    <Icon
                      name={`lucide:${tab.icon || 'layers'}`}
                      {...stylex.attrs(styles.tabIcon(tab.color ?? 'currentColor'))}
                      aria-hidden="true"
                    />
                  )}
                  <span>{tab.label}</span>
                  {tab.draft && <Icon name="lucide:square-pen" {...stylex.attrs(styles.draftIcon)} aria-hidden="true" />}
                </button>
              ))}

              {context.supportsCustomViews && (
                <button
                  type="button"
                  {...stylex.attrs(styles.createViewButton)}
                  disabled={context.viewEditorMode !== null}
                  title="Create view"
                  onClick={context.startCreateView}
                >
                  <span {...stylex.attrs(styles.createIconWrap)} aria-hidden="true">
                    <Icon name="lucide:layers" {...stylex.attrs(styles.smallIcon)} />
                    <span {...stylex.attrs(styles.createPlus)}>+</span>
                  </span>
                </button>
              )}
            </div>

            <div {...stylex.attrs(styles.inlineActions)}>
              <button
                data-ticket-list-menu="filters"
                type="button"
                {...stylex.attrs(styles.roundMenuButton, context.hasModifiedFilterOptions || context.filterMenuOpen ? styles.roundMenuActive : null)}
                title="Filter"
                onClick={context.toggleFilterMenu}
              >
                <Icon name="lucide:list-filter" {...stylex.attrs(styles.icon)} aria-hidden="true" />
                {context.hasModifiedFilterOptions && <span {...stylex.attrs(styles.modifiedDot)} aria-hidden="true" />}
              </button>

              <button
                data-ticket-list-menu="display-options"
                type="button"
                {...stylex.attrs(styles.roundMenuButton, context.hasModifiedDisplayOptions || context.displayOptionsOpen ? styles.roundMenuActive : null)}
                title="Display options"
                onClick={context.toggleDisplayOptions}
              >
                <Icon name="lucide:sliders-horizontal" {...stylex.attrs(styles.icon)} aria-hidden="true" />
                {context.hasModifiedDisplayOptions && <span {...stylex.attrs(styles.modifiedDot)} aria-hidden="true" />}
              </button>
            </div>
          </div>
        )}

        {context.customViewContextMenu.open && (
          <div
            data-ticket-list-menu="custom-view-context"
            {...stylex.attrs(styles.contextMenu(`${context.customViewContextMenu.x}px`, `${context.customViewContextMenu.y}px`))}
          >
            <button type="button" {...stylex.attrs(styles.contextItem)} onClick={context.editContextCustomView}>
              <Icon name="lucide:square-pen" {...stylex.attrs(styles.contextIcon)} aria-hidden="true" />
              <span>Edit</span>
            </button>
            <button type="button" {...stylex.attrs(styles.contextItem, styles.contextDanger)} onClick={context.deleteContextCustomView}>
              <Icon name="lucide:trash-2" {...stylex.attrs(styles.smallIcon)} aria-hidden="true" />
              <span>Delete</span>
            </button>
          </div>
        )}

        {!context.selectedTicket && context.viewEditorDraft && (
          <ViewEditorCard
            name={context.viewEditorDraft.name}
            description={context.viewEditorDraft.description}
            icon={context.viewEditorDraft.icon}
            color={context.viewEditorDraft.color}
            saveDisabled={context.viewEditorDraft.name.trim().length === 0}
            activeFilterChips={context.activeFilterChips}
            onUpdate:name={context.updateViewEditorName}
            onUpdate:description={context.updateViewEditorDescription}
            onUpdate:icon={context.updateViewEditorIcon}
            onUpdate:color={context.updateViewEditorColor}
            onOpenFilters={context.openViewEditorFilters}
            onOpenSettings={context.openViewEditorSettings}
            onRemoveFilter={context.removeActiveFilterChip}
            onSave={context.saveViewEditor}
            onCancel={context.cancelViewEditor}
          />
        )}

        {!context.selectedTicket && context.hasModifiedFilterOptions && (
          <div {...stylex.attrs(styles.filterBar)}>
            <div {...stylex.attrs(styles.filterChips)}>
              {context.activeFilterChips.map(filter => (
                <span key={filter.id} {...stylex.attrs(styles.chip)}>
                  <span {...stylex.attrs(styles.truncate)}>{filter.fieldLabel}</span>
                  <span {...stylex.attrs(styles.chipOperator)}>is</span>
                  <span {...stylex.attrs(styles.chipValue)}>{filter.valueLabel}</span>
                  <button type="button" {...stylex.attrs(styles.removeChipButton)} aria-label={`Remove ${filter.fieldLabel} filter`} onClick={() => context.removeActiveFilterChip(filter)}>
                    ×
                  </button>
                </span>
              ))}

              <button type="button" {...stylex.attrs(styles.addFilterButton)} title="Add filter" onClick={context.openFilterMenu}>
                +
              </button>
            </div>

            {!context.viewEditorMode && (
              <div {...stylex.attrs(styles.saveArea)}>
                <button type="button" {...stylex.attrs(styles.textButton)} onClick={clearCurrentViewChanges}>
                  Clear
                </button>
                {!context.activeViewIsCustomView
                  ? (
                      <button type="button" {...stylex.attrs(styles.saveButton)} onClick={createNewViewFromChanges}>
                        Save
                      </button>
                    )
                  : (
                      <button
                        type="button"
                        {...stylex.attrs(styles.saveButton, styles.saveMenuButton)}
                        aria-expanded={saveMenuOpen.value}
                        onClick={toggleSaveMenu}
                      >
                        <span>Save</span>
                        <Icon name="lucide:chevron-down" {...stylex.attrs(styles.tinyIcon)} aria-hidden="true" />
                      </button>
                    )}
                {saveMenuOpen.value && (
                  <div {...stylex.attrs(styles.saveMenu)}>
                    <button type="button" {...stylex.attrs(styles.saveMenuItem)} onClick={saveChangesToThisView}>
                      <Icon name="lucide:layers" {...stylex.attrs(styles.contextIcon)} aria-hidden="true" />
                      <span>Save to this view</span>
                    </button>
                    <button type="button" {...stylex.attrs(styles.saveMenuItem)} onClick={createNewViewFromChanges}>
                      <Icon name="lucide:copy-plus" {...stylex.attrs(styles.contextIcon)} aria-hidden="true" />
                      <span>Create new view…</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </>
    )
  },
})

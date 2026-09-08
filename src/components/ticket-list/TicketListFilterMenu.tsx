import * as stylex from '@stylexjs/stylex'
import { defineComponent, reactive } from 'vue'
import { useTicketListContext } from '@/features/ticket-list/ticketListContext'

const styles = stylex.create({
  panel: { position: 'absolute', right: '2.5rem', top: '2.5rem', zIndex: 30, display: 'flex', maxHeight: '35rem', width: '34rem', overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: '#15161a', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4)' },
  leftPane: { display: 'flex', width: '15rem', flexShrink: 0, flexDirection: 'column', borderRightWidth: 1, borderRightStyle: 'solid', borderRightColor: 'rgba(255, 255, 255, 0.06)', paddingBlock: '0.375rem' },
  inputWrap: { paddingInline: '0.5rem', paddingBottom: '0.25rem' },
  input: { 'height': '2rem', 'width': '100%', 'borderRadius': '0.375rem', 'borderWidth': 1, 'borderStyle': 'solid', 'borderColor': { 'default': 'rgba(255, 255, 255, 0.06)', ':focus': 'rgba(255, 255, 255, 0.14)' }, 'backgroundColor': 'rgba(0, 0, 0, 0.2)', 'paddingInline': '0.5rem', 'fontSize': 12, 'color': '#d7d8dc', 'outlineStyle': 'none', '::placeholder': { color: '#6f727b' } },
  scroll: { minHeight: 0, flex: '1', overflowY: 'auto' },
  row: { display: 'flex', height: '2rem', width: '100%', alignItems: 'center', gap: '0.5rem', paddingInline: '0.75rem', textAlign: 'left', fontSize: 13, transitionProperty: 'background-color, color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  optionRow: { borderRadius: '0.375rem', paddingInline: '0.5rem' },
  rowActive: { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#f0f1f4' },
  rowInactive: { color: { 'default': '#b9bbc3', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.045)' } },
  checkbox: { display: 'flex', height: '0.875rem', width: '0.875rem', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '0.25rem', borderWidth: 1, borderStyle: 'solid', fontSize: 10, lineHeight: 1, transitionProperty: 'background-color, border-color, color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  checkboxOn: { borderColor: '#4dbb83', backgroundColor: '#4dbb83', color: '#0d0e10' },
  checkboxOff: { borderColor: 'rgba(255, 255, 255, 0.18)', color: 'transparent' },
  switchTrack: { display: 'flex', height: '1rem', width: '1.75rem', alignItems: 'center', borderRadius: '9999px', borderWidth: 1, borderStyle: 'solid', padding: '0.125rem', transitionProperty: 'background-color, border-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  switchOn: { borderColor: 'rgba(255, 255, 255, 0.14)', backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  switchOff: { borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.03)' },
  switchThumb: { height: '0.625rem', width: '0.625rem', borderRadius: '9999px', backgroundColor: '#f0f1f4', transitionProperty: 'transform', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  switchThumbOn: { transform: 'translateX(0.75rem)' },
  switchThumbOff: { transform: 'translateX(0)' },
  iconCell: { width: '1rem', flexShrink: 0, textAlign: 'center', color: '#8f9198' },
  label: { minWidth: 0, flex: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  chevron: { fontSize: 11, color: '#777a83' },
  empty: { paddingInline: '0.75rem', paddingBlock: '2rem', textAlign: 'center', fontSize: 12, color: '#777a83' },
  inclusion: { borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '0.75rem', paddingBlock: '0.5rem' },
  title: { marginBottom: '0.5rem', fontSize: 12, fontWeight: 500, color: '#d7d8dc' },
  inclusionLabel: { display: 'grid', gridTemplateColumns: '8rem minmax(0, 1fr)', alignItems: 'center', gap: '0.75rem', borderRadius: '0.375rem', paddingBlock: '0.375rem' },
  mutedText: { fontSize: 12, color: '#aeb0b7' },
  select: { width: '100%', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':focus': 'rgba(255, 255, 255, 0.16)' }, backgroundColor: 'rgba(255, 255, 255, 0.045)', paddingInline: '0.5rem', paddingBlock: '0.375rem', fontSize: 12, color: '#d7d8dc', outlineStyle: 'none' },
  switchRow: { display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', borderRadius: '0.375rem', paddingBlock: '0.375rem', textAlign: 'left', transitionProperty: 'background-color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.025)' } },
  rightPane: { minWidth: 0, flex: '1', paddingBlock: '0.375rem' },
  rightHeader: { marginBottom: '0.25rem', display: 'flex', height: '2rem', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '0.75rem', paddingBottom: '0.25rem' },
  resetButton: { borderRadius: '0.25rem', paddingInline: '0.375rem', paddingBlock: '0.25rem', fontSize: 12, color: { 'default': '#aeb0b7', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' }, cursor: { ':disabled': 'not-allowed' }, opacity: { ':disabled': 0.4 } },
  submenu: { borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '0.5rem', paddingBottom: '0.25rem' },
  options: { paddingInline: '0.5rem', paddingTop: '0.25rem' },
  valueOptions: { maxHeight: '30rem', overflowY: 'auto', paddingInline: '0.5rem' },
  count: { fontSize: 11, color: '#6f727b' },
})

export default defineComponent({
  name: 'TicketListFilterMenu',
  setup() {
    const context = reactive(useTicketListContext())

    function renderCheckbox(selected: boolean) {
      return (
        <span {...stylex.attrs(styles.checkbox, selected ? styles.checkboxOn : styles.checkboxOff)}>
          ✓
        </span>
      )
    }

    function renderSwitch(checked: boolean) {
      return (
        <span {...stylex.attrs(styles.switchTrack, checked ? styles.switchOn : styles.switchOff)}>
          <span {...stylex.attrs(styles.switchThumb, checked ? styles.switchThumbOn : styles.switchThumbOff)} />
        </span>
      )
    }

    return () => context.filterMenuOpen && !context.selectedTicket && (
      <div
        data-ticket-list-menu="filters"
        {...stylex.attrs(styles.panel)}
      >
        <div {...stylex.attrs(styles.leftPane)}>
          <div {...stylex.attrs(styles.inputWrap)}>
            <input
              v-model={context.filterFieldSearchQuery}
              type="text"
              name="linear-filter-field-search"
              {...stylex.attrs(styles.input)}
              placeholder="Add Filter..."
            />
          </div>

          <div {...stylex.attrs(styles.scroll)}>
            {context.visibleFilterMenuEntries.map(entry => (
              <button
                key={entry.id}
                type="button"
                {...stylex.attrs(styles.row, context.activeFilterEntryId === entry.id ? styles.rowActive : styles.rowInactive)}
                onMouseenter={() => { context.activeFilterEntryId = entry.id }}
                onFocus={() => { context.activeFilterEntryId = entry.id }}
                onClick={() => {
                  if (entry.id === 'shared') {
                    context.toggleFilterClause('shared', 'shared', 'Shared')
                  }
                  else {
                    context.activeFilterEntryId = entry.id
                  }
                }}
              >
                {entry.id === 'shared'
                  ? renderCheckbox(context.isFilterClauseSelected('shared', 'shared'))
                  : <span {...stylex.attrs(styles.iconCell)}>{entry.icon}</span>}
                <span {...stylex.attrs(styles.label)}>{entry.label}</span>
                {entry.hasSubmenu && <span {...stylex.attrs(styles.chevron)}>›</span>}
              </button>
            ))}
            {context.visibleFilterMenuEntries.length === 0 && (
              <div {...stylex.attrs(styles.empty)}>No matching filters</div>
            )}
          </div>

          {context.isIssueDisplayView
            ? (
                <div {...stylex.attrs(styles.inclusion)}>
                  <p {...stylex.attrs(styles.title)}>Issue inclusion</p>
                  <label {...stylex.attrs(styles.inclusionLabel)}>
                    <span {...stylex.attrs(styles.mutedText)}>Completed issues</span>
                    <select
                      v-model={context.completedRange}
                      name="filter-completed-issues-range"
                      {...stylex.attrs(styles.select)}
                    >
                      {context.issueVisibilityRangeOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                  </label>

                  <button
                    type="button"
                    {...stylex.attrs(styles.switchRow)}
                    role="switch"
                    aria-checked={context.showSubIssues}
                    onClick={() => { context.showSubIssues = !context.showSubIssues }}
                  >
                    <span {...stylex.attrs(styles.mutedText)}>Show sub-issues</span>
                    {renderSwitch(context.showSubIssues)}
                  </button>

                  <button
                    type="button"
                    {...stylex.attrs(styles.switchRow)}
                    role="switch"
                    aria-checked={context.showBacklogIssues}
                    onClick={() => { context.showBacklogIssues = !context.showBacklogIssues }}
                  >
                    <span {...stylex.attrs(styles.mutedText)}>Show backlog</span>
                    {renderSwitch(context.showBacklogIssues)}
                  </button>
                </div>
              )
            : context.isProjectDisplayView
              ? (
                  <div {...stylex.attrs(styles.inclusion)}>
                    <p {...stylex.attrs(styles.title)}>Project inclusion</p>
                    <label {...stylex.attrs(styles.inclusionLabel)}>
                      <span {...stylex.attrs(styles.mutedText)}>Completed projects</span>
                      <select
                        v-model={context.projectClosedRange}
                        name="filter-completed-projects-range"
                        {...stylex.attrs(styles.select)}
                      >
                        {context.projectClosedRangeOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </select>
                    </label>
                  </div>
                )
              : null}
        </div>

        <div {...stylex.attrs(styles.rightPane)}>
          <div {...stylex.attrs(styles.rightHeader)}>
            <span {...stylex.attrs(styles.title)}>Filters</span>
            <button
              type="button"
              {...stylex.attrs(styles.resetButton)}
              disabled={!context.hasModifiedFilterOptions}
              onClick={context.clearCurrentViewFilters}
            >
              Reset
            </button>
          </div>

          {context.activeFilterEntryId === 'dates'
            ? (
                <>
                  <div {...stylex.attrs(styles.submenu)}>
                    {context.dateFilterFields.map(field => (
                      <button
                        key={field.id}
                        type="button"
                        {...stylex.attrs(styles.row, styles.optionRow, context.activeDateFilterId === field.id ? styles.rowActive : styles.rowInactive)}
                        onMouseenter={() => { context.activeDateFilterId = field.id }}
                        onClick={() => { context.activeDateFilterId = field.id }}
                      >
                        <span {...stylex.attrs(styles.iconCell)}>{field.icon}</span>
                        <span {...stylex.attrs(styles.label)}>{field.label}</span>
                        <span {...stylex.attrs(styles.chevron)}>›</span>
                      </button>
                    ))}
                  </div>
                  <div {...stylex.attrs(styles.options)}>
                    {context.activeDateFilterOptions.map((option) => {
                      const selected = context.isFilterClauseSelected(context.activeDateFilterId, option.value)
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="checkbox"
                          aria-checked={selected}
                          {...stylex.attrs(styles.row, styles.optionRow, selected ? styles.rowActive : styles.rowInactive)}
                          onClick={() => context.toggleFilterClause(context.activeDateFilterId, option.value, option.label)}
                        >
                          {renderCheckbox(selected)}
                          <span {...stylex.attrs(styles.iconCell)}>◷</span>
                          <span {...stylex.attrs(styles.label)}>{option.label}</span>
                          <span {...stylex.attrs(styles.count)}>{option.count}</span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )
            : context.activeFilterEntryId === 'projectProperties'
              ? (
                  <>
                    <div {...stylex.attrs(styles.submenu)}>
                      {context.projectPropertyFilterFields.map(field => (
                        <button
                          key={field.id}
                          type="button"
                          {...stylex.attrs(styles.row, styles.optionRow, context.activeProjectPropertyFilterId === field.id ? styles.rowActive : styles.rowInactive)}
                          onMouseenter={() => { context.activeProjectPropertyFilterId = field.id }}
                          onClick={() => { context.activeProjectPropertyFilterId = field.id }}
                        >
                          <span {...stylex.attrs(styles.iconCell)}>{field.icon}</span>
                          <span {...stylex.attrs(styles.label)}>{field.label}</span>
                          <span {...stylex.attrs(styles.chevron)}>›</span>
                        </button>
                      ))}
                    </div>
                    <div {...stylex.attrs(styles.options)}>
                      {context.activeFilterOptions.map((option) => {
                        const selected = context.isFilterClauseSelected(context.activeProjectPropertyFilterId, option.value)
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="checkbox"
                            aria-checked={selected}
                            {...stylex.attrs(styles.row, styles.optionRow, selected ? styles.rowActive : styles.rowInactive)}
                            onClick={() => context.toggleFilterClause(context.activeProjectPropertyFilterId, option.value, option.label)}
                          >
                            {renderCheckbox(selected)}
                            <span {...stylex.attrs(styles.iconCell)}>{option.icon}</span>
                            <span {...stylex.attrs(styles.label)}>{option.label}</span>
                            <span {...stylex.attrs(styles.count)}>{option.count}</span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )
              : (
                  <>
                    <div {...stylex.attrs(styles.inputWrap)}>
                      <input
                        v-model={context.filterSearchQuery}
                        type="text"
                        name="linear-filter-search"
                        {...stylex.attrs(styles.input)}
                        placeholder={`Filter ${context.activeFilterEntry.label.toLowerCase()}...`}
                      />
                    </div>
                    <div {...stylex.attrs(styles.valueOptions)}>
                      {context.activeFilterOptions.map((option) => {
                        const selected = context.isFilterClauseSelected(context.activeValueFilterFieldId, option.value)
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="checkbox"
                            aria-checked={selected}
                            {...stylex.attrs(styles.row, styles.optionRow, selected ? styles.rowActive : styles.rowInactive)}
                            onClick={() => context.toggleFilterClause(context.activeValueFilterFieldId, option.value, option.label)}
                          >
                            {renderCheckbox(selected)}
                            <span {...stylex.attrs(styles.iconCell)}>{option.icon}</span>
                            <span {...stylex.attrs(styles.label)}>{option.label}</span>
                            <span {...stylex.attrs(styles.count)}>
                              {context.activeValueFilterFieldId === 'sprint' ? `${option.count} issues · ${option.storyPoints ?? 0} pts` : option.count}
                            </span>
                          </button>
                        )
                      })}
                      {context.activeFilterOptions.length === 0 && (
                        <div {...stylex.attrs(styles.empty)}>No matching options</div>
                      )}
                    </div>
                  </>
                )}
        </div>
      </div>
    )
  },
})

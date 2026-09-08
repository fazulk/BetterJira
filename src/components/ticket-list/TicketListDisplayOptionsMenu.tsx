import * as stylex from '@stylexjs/stylex'
import { defineComponent, reactive } from 'vue'
import { useTicketListContext } from '@/features/ticket-list/ticketListContext'
import { colors } from '@/styles/tokens.stylex'
import TicketListGroupOrderingMenu from './TicketListGroupOrderingMenu'

const styles = stylex.create({
  panel: { position: 'absolute', right: 0, top: '2.5rem', zIndex: 20, width: '22rem', overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: colors['--color-surface-2'], boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.35), 0 8px 10px -6px rgb(0 0 0 / 0.35)' },
  body: { display: 'flex', flexDirection: 'column', gap: '0.125rem', padding: '0.5rem' },
  paddedRow: { borderRadius: '0.375rem', paddingInline: '0.5rem', paddingBlock: '0.375rem' },
  viewToggle: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.25rem', borderRadius: '0.375rem', backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '0.125rem' },
  viewButton: { borderRadius: '0.25rem', paddingInline: '0.5rem', paddingBlock: '0.25rem', fontSize: 12 },
  viewButtonActive: { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#f0f1f4' },
  viewButtonDisabled: { color: '#777a83' },
  issueSetting: { display: 'grid', gridTemplateColumns: '7.5rem 1.75rem minmax(0, 1fr)', alignItems: 'center', gap: '0.5rem', borderRadius: '0.375rem', paddingInline: '0.5rem', paddingBlock: '0.375rem', backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.025)' } },
  projectSetting: { display: 'grid', gridTemplateColumns: '7.5rem minmax(0, 1fr)', alignItems: 'center', gap: '0.75rem', borderRadius: '0.375rem', paddingBlock: '0.25rem' },
  label: { fontSize: 12, color: '#8f9198' },
  iconButton: { display: 'flex', height: '1.75rem', width: '1.75rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.375rem', color: { 'default': '#aeb0b7', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.06)' } },
  icon: { height: '0.875rem', width: '0.875rem' },
  select: { width: '100%', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':focus': 'rgba(255, 255, 255, 0.16)' }, backgroundColor: 'rgba(255, 255, 255, 0.045)', paddingInline: '0.5rem', paddingBlock: '0.375rem', fontSize: 12, color: '#d7d8dc', outlineStyle: 'none' },
  section: { borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'rgba(255, 255, 255, 0.06)', padding: '0.75rem' },
  projectControls: { display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '0.75rem' },
  title: { marginBottom: '0.5rem', fontSize: 12, fontWeight: 500, color: '#d7d8dc' },
  summaryRow: { marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' },
  shownCount: { fontSize: 11, color: '#6f727b' },
  pillList: { display: 'flex', flexWrap: 'wrap', gap: '0.375rem' },
  propertyButton: { display: 'inline-flex', height: '1.75rem', alignItems: 'center', gap: '0.375rem', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', paddingInline: '0.5rem', fontSize: 12, transitionProperty: 'background-color, border-color, color', transitionDuration: '150ms', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  propertyOn: { borderColor: 'rgba(255, 255, 255, 0.12)', backgroundColor: 'rgba(255, 255, 255, 0.06)', color: '#f0f1f4' },
  propertyOff: { borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: { 'default': 'rgba(255, 255, 255, 0.025)', ':hover': 'rgba(255, 255, 255, 0.04)' }, color: { 'default': '#8f9198', ':hover': '#d7d8dc' } },
  check: { display: 'flex', height: '0.875rem', width: '0.875rem', alignItems: 'center', justifyContent: 'center', borderRadius: '0.25rem', borderWidth: 1, borderStyle: 'solid', fontSize: 9 },
  checkOn: { borderColor: 'rgba(255, 255, 255, 0.18)', color: colors['--color-slate-200'] },
  checkOff: { borderColor: 'rgba(255, 255, 255, 0.1)', color: 'transparent' },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem', borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'rgba(255, 255, 255, 0.06)', paddingInline: '0.75rem', paddingBlock: '0.5rem' },
  resetButton: { borderRadius: '0.25rem', paddingInline: '0.375rem', paddingBlock: '0.25rem', fontSize: 12, color: { 'default': '#d7d8dc', ':hover': '#f0f1f4' }, backgroundColor: { 'default': null, ':hover': 'rgba(255, 255, 255, 0.05)' } },
  nestedFooter: { marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'rgba(255, 255, 255, 0.06)', paddingTop: '0.5rem' },
})

export default defineComponent({
  name: 'TicketListDisplayOptionsMenu',
  setup() {
    const context = reactive(useTicketListContext())

    function renderCheck(visible: boolean) {
      return (
        <span {...stylex.attrs(styles.check, visible ? styles.checkOn : styles.checkOff)}>
          ✓
        </span>
      )
    }

    return () => context.displayOptionsOpen && !context.selectedTicket && (
      <div
        data-ticket-list-menu="display-options"
        {...stylex.attrs(styles.panel)}
      >
        {context.groupOrderingOpen && <TicketListGroupOrderingMenu />}

        {!context.groupOrderingOpen && (
          <div {...stylex.attrs(styles.body)}>
            <div {...stylex.attrs(styles.paddedRow)}>
              <div {...stylex.attrs(styles.viewToggle)}>
                <button type="button" {...stylex.attrs(styles.viewButton, styles.viewButtonActive)}>List</button>
                <button type="button" {...stylex.attrs(styles.viewButton, styles.viewButtonDisabled)} disabled>Board</button>
              </div>
            </div>

            {context.isIssueDisplayView && (
              <>
                <label {...stylex.attrs(styles.issueSetting)}>
                  <span {...stylex.attrs(styles.label)}>Grouping</span>
                  <button
                    type="button"
                    {...stylex.attrs(styles.iconButton)}
                    aria-label="Group ordering"
                    title="Group ordering"
                    onClick={(event) => {
                      event.preventDefault()
                      context.openGroupOrdering()
                    }}
                  >
                    <svg {...stylex.attrs(styles.icon)} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 12V4m0 0L2.75 6.25M5 4l2.25 2.25M11 4v8m0 0 2.25-2.25M11 12 8.75 9.75" />
                    </svg>
                  </button>
                  <select
                    v-model={context.listGrouping}
                    name="issue-grouping"
                    {...stylex.attrs(styles.select)}
                  >
                    {context.issueGroupingOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>

                <label {...stylex.attrs(styles.issueSetting)}>
                  <span {...stylex.attrs(styles.label)}>Ordering</span>
                  <button
                    type="button"
                    {...stylex.attrs(styles.iconButton)}
                    aria-label={context.listOrderingDirection === 'asc' ? 'Order ascending' : 'Order descending'}
                    title={context.listOrderingDirection === 'asc' ? 'Order ascending' : 'Order descending'}
                    onClick={(event) => {
                      event.preventDefault()
                      context.toggleOrderingDirection()
                    }}
                  >
                    <svg {...stylex.attrs(styles.icon)} viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                      {context.listOrderingDirection === 'asc'
                        ? <path stroke-linecap="round" stroke-linejoin="round" d="M4.75 12V4m0 0L2.5 6.25M4.75 4 7 6.25M9 5h4.5M9 8h3.5M9 11h2" />
                        : <path stroke-linecap="round" stroke-linejoin="round" d="M4.75 4v8m0 0L7 9.75M4.75 12 2.5 9.75M9 5h2M9 8h3.5M9 11h4.5" />}
                    </svg>
                  </button>
                  <select
                    v-model={context.listOrdering}
                    name="issue-ordering"
                    {...stylex.attrs(styles.select)}
                  >
                    {context.issueOrderingOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>
              </>
            )}
          </div>
        )}

        {!context.groupOrderingOpen && context.isIssueDisplayView && (
          <div {...stylex.attrs(styles.section)}>
            <p {...stylex.attrs(styles.title)}>List options</p>
            <div {...stylex.attrs(styles.summaryRow)}>
              <span {...stylex.attrs(styles.label)}>Display properties</span>
            </div>
            <div {...stylex.attrs(styles.pillList)}>
              {context.issueRowFieldOptions.map(field => (
                <button
                  key={field.id}
                  type="button"
                  {...stylex.attrs(styles.propertyButton, context.isIssueRowFieldVisible(field.id) ? styles.propertyOn : styles.propertyOff)}
                  disabled={context.visibleIssueRowFields.length === 1 && context.isIssueRowFieldVisible(field.id)}
                  aria-pressed={context.isIssueRowFieldVisible(field.id)}
                  onClick={() => context.toggleIssueRowField(field.id)}
                >
                  <span>{field.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!context.groupOrderingOpen && context.isIssueDisplayView
          ? (
              <div {...stylex.attrs(styles.footer)}>
                <button type="button" {...stylex.attrs(styles.resetButton)} onClick={context.resetIssueDisplayOptions}>
                  Reset
                </button>
              </div>
            )
          : !context.groupOrderingOpen && context.isProjectDisplayView
              ? (
                  <div {...stylex.attrs(styles.section)}>
                    <div {...stylex.attrs(styles.projectControls)}>
                      <label {...stylex.attrs(styles.projectSetting)}>
                        <span {...stylex.attrs(styles.label)}>Grouping</span>
                        <select
                          v-model={context.projectGrouping}
                          name="project-grouping"
                          {...stylex.attrs(styles.select)}
                        >
                          {context.projectGroupingOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                        </select>
                      </label>
                      <label {...stylex.attrs(styles.projectSetting)}>
                        <span {...stylex.attrs(styles.label)}>Ordering</span>
                        <select
                          v-model={context.projectOrdering}
                          name="project-ordering"
                          {...stylex.attrs(styles.select)}
                        >
                          {context.projectOrderingOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                        </select>
                      </label>
                    </div>
                    <div {...stylex.attrs(styles.summaryRow)}>
                      <span {...stylex.attrs(styles.label)}>Visible properties</span>
                      <span {...stylex.attrs(styles.shownCount)}>
                        {context.visibleProjectRowFields.length}
                        {' '}
                        shown
                      </span>
                    </div>
                    <div {...stylex.attrs(styles.pillList)}>
                      {context.projectRowFieldOptions.map((field) => {
                        const visible = context.isProjectRowFieldVisible(field.id)
                        return (
                          <button
                            key={field.id}
                            type="button"
                            {...stylex.attrs(styles.propertyButton, visible ? styles.propertyOn : styles.propertyOff)}
                            disabled={context.visibleProjectRowFields.length === 1 && visible}
                            onClick={() => context.toggleProjectRowField(field.id)}
                          >
                            {renderCheck(visible)}
                            <span>{field.label}</span>
                          </button>
                        )
                      })}
                    </div>
                    <div {...stylex.attrs(styles.nestedFooter)}>
                      <button type="button" {...stylex.attrs(styles.resetButton)} onClick={context.resetProjectDisplayOptions}>Reset</button>
                    </div>
                  </div>
                )
              : !context.groupOrderingOpen && context.isInitiativeDisplayView
                  ? (
                      <div {...stylex.attrs(styles.section)}>
                        <div {...stylex.attrs(styles.summaryRow)}>
                          <span {...stylex.attrs(styles.label)}>Visible properties</span>
                          <span {...stylex.attrs(styles.shownCount)}>
                            {context.visibleInitiativeRowFields.length}
                            {' '}
                            shown
                          </span>
                        </div>
                        <div {...stylex.attrs(styles.pillList)}>
                          {context.initiativeRowFieldOptions.map((field) => {
                            const visible = context.isInitiativeRowFieldVisible(field.id)
                            return (
                              <button
                                key={field.id}
                                type="button"
                                {...stylex.attrs(styles.propertyButton, visible ? styles.propertyOn : styles.propertyOff)}
                                disabled={context.visibleInitiativeRowFields.length === 1 && visible}
                                onClick={() => context.toggleInitiativeRowField(field.id)}
                              >
                                {renderCheck(visible)}
                                <span>{field.label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  : !context.groupOrderingOpen && context.isViewsDirectory
                      ? (
                          <div {...stylex.attrs(styles.section)}>
                            <div {...stylex.attrs(styles.summaryRow)}>
                              <span {...stylex.attrs(styles.label)}>Visible properties</span>
                              <span {...stylex.attrs(styles.shownCount)}>
                                {context.visibleSavedViewRowFields.length}
                                {' '}
                                shown
                              </span>
                            </div>
                            <div {...stylex.attrs(styles.pillList)}>
                              {context.savedViewRowFieldOptions.map((field) => {
                                const visible = context.isSavedViewRowFieldVisible(field.id)
                                return (
                                  <button
                                    key={field.id}
                                    type="button"
                                    {...stylex.attrs(styles.propertyButton, visible ? styles.propertyOn : styles.propertyOff)}
                                    disabled={context.visibleSavedViewRowFields.length === 1 && visible}
                                    onClick={() => context.toggleSavedViewRowField(field.id)}
                                  >
                                    {renderCheck(visible)}
                                    <span>{field.label}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      : null}
      </div>
    )
  },
})

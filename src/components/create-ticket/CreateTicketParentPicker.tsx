import type { PropType } from 'vue'
import type { JiraTicket } from '@/types/jira'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent } from 'vue'
import { useParentPicker } from '@/features/create-ticket/useParentPicker'
import { colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  root: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: colors['--color-slate-500'] },
  panel: {
    position: 'relative',
    borderRadius: '0.5rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: { 'default': 'rgba(255, 255, 255, 0.08)', ':hover': 'rgba(255, 255, 255, 0.12)' },
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    paddingInline: '0.75rem',
    paddingBlock: '0.5rem',
    transitionProperty: 'border-color, background-color, opacity',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  panelEditing: { borderColor: 'rgba(255, 255, 255, 0.14)', backgroundColor: 'rgba(255, 255, 255, 0.035)' },
  panelLocked: { cursor: 'not-allowed', borderColor: 'rgba(255, 255, 255, 0.04)', backgroundColor: 'rgba(255, 255, 255, 0.015)', color: colors['--color-slate-500'], opacity: 0.6 },
  panelPending: { opacity: 0.7 },
  editStack: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  inputWrap: { position: 'relative' },
  searchIcon: {
    pointerEvents: 'none',
    position: 'absolute',
    left: '0.75rem',
    top: '50%',
    width: '0.875rem',
    height: '0.875rem',
    transform: 'translateY(-50%)',
    color: colors['--color-slate-500'],
  },
  searchInput: {
    'width': '100%',
    'borderRadius': '0.375rem',
    'borderWidth': 1,
    'borderStyle': 'solid',
    'borderColor': { 'default': 'rgba(255, 255, 255, 0.08)', ':focus': 'rgba(255, 255, 255, 0.16)' },
    'backgroundColor': colors['--color-surface-0'],
    'paddingBlock': '0.5rem',
    'paddingLeft': '2.25rem',
    'paddingRight': '0.75rem',
    'fontSize': '0.875rem',
    'lineHeight': '1.25rem',
    'color': colors['--color-slate-200'],
    'outlineStyle': 'none',
    'transitionProperty': 'border-color',
    'transitionDuration': '150ms',
    'transitionTimingFunction': 'cubic-bezier(0.4, 0, 0.2, 1)',
    '::placeholder': { color: colors['--color-slate-600'] },
  },
  menu: {
    maxHeight: '14rem',
    overflowY: 'auto',
    borderRadius: '0.5rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: colors['--color-surface-0'],
    paddingBlock: '0.25rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
  },
  option: {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    gap: '0.5rem',
    paddingInline: '0.75rem',
    paddingBlock: '0.5rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.04)' },
    transitionProperty: 'background-color, color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  optionTopAligned: { alignItems: 'flex-start' },
  optionActive: { backgroundColor: 'rgba(255, 255, 255, 0.06)', color: colors['--color-white'] },
  optionInactive: { color: colors['--color-slate-300'] },
  keyPill: {
    marginTop: '0.125rem',
    flexShrink: 0,
    borderRadius: '9999px',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingInline: '0.375rem',
    paddingBlock: '0.125rem',
    fontSize: 10,
    color: colors['--color-slate-500'],
  },
  optionSummary: { minWidth: 0, fontSize: '0.75rem', lineHeight: '1.25rem' },
  empty: { paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem', fontStyle: 'italic', color: colors['--color-slate-600'] },
  trigger: {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    textAlign: 'left',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  triggerText: { minWidth: 0 },
  selectedLabel: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem', lineHeight: '1.25rem', color: colors['--color-slate-200'] },
  selectedHelp: { fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  chevron: { width: '1rem', height: '1rem', flexShrink: 0, color: colors['--color-slate-500'] },
  lockedHelp: { fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
})

export default defineComponent({
  name: 'CreateTicketParentPicker',
  props: {
    effectiveParentKey: {
      type: String as PropType<string | null>,
      default: null,
    },
    filteredLabel: {
      type: String as PropType<string | null>,
      default: null,
    },
    isCreatePending: {
      type: Boolean,
      required: true,
    },
    parentLocked: {
      type: Boolean,
      required: true,
    },
    selectedParentIsProject: {
      type: Boolean,
      required: true,
    },
    supportedParentDisplayLabel: {
      type: String as PropType<string | null>,
      default: null,
    },
    supportedParentTickets: {
      type: Array as PropType<JiraTicket[]>,
      required: true,
    },
    supportedParentType: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  emits: {
    'update:parentKey': (key: string | null) => typeof key === 'string' || key === null,
  },
  setup(props, { emit, expose }) {
    const parentKey = computed({
      get: () => props.effectiveParentKey,
      set: (key: string | null) => emit('update:parentKey', key),
    })
    const effectiveParentKey = computed(() => props.effectiveParentKey)
    const isCreatePending = computed(() => props.isCreatePending)
    const parentLocked = computed(() => props.parentLocked)
    const selectedParentIsProject = computed(() => props.selectedParentIsProject)
    const supportedParentDisplayLabel = computed(() => props.supportedParentDisplayLabel)
    const supportedParentTickets = computed(() => props.supportedParentTickets)
    const supportedParentType = computed(() => props.supportedParentType)

    const {
      filteredParentOptions,
      getSelectedParentLabel,
      getSupportedParentArticleLabel,
      getSupportedParentTypeLabel,
      handleParentKeydown,
      isEditingParent,
      parentComboRef,
      parentHighlightIndex,
      parentInputRef,
      parentSearch,
      selectParentOption,
      startEditingParent,
      stopEditingParent,
    } = useParentPicker({
      effectiveParentKey,
      isCreatePending,
      parentKey,
      parentLocked,
      selectedParentIsProject,
      supportedParentDisplayLabel,
      supportedParentTickets,
      supportedParentType,
    })

    expose({
      startEditingParent,
      stopEditingParent,
    })

    return () => (
      props.supportedParentType && (
        <div {...stylex.attrs(styles.root)}>
          <label {...stylex.attrs(styles.label)}>{props.filteredLabel}</label>
          <div
            ref={parentComboRef}
            {...stylex.attrs(
              styles.panel,
              isEditingParent.value ? styles.panelEditing : null,
              props.parentLocked ? styles.panelLocked : null,
              props.isCreatePending ? styles.panelPending : null,
            )}
          >
            {isEditingParent.value
              ? (
                  <div {...stylex.attrs(styles.editStack)}>
                    <div {...stylex.attrs(styles.inputWrap)}>
                      <svg {...stylex.attrs(styles.searchIcon)} fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" />
                        <path stroke-linecap="round" d="m21 21-4.35-4.35" />
                      </svg>
                      <input
                        ref={parentInputRef}
                        v-model={parentSearch.value}
                        name="create-parent-search"
                        aria-label={`Search ${getSupportedParentTypeLabel()}s`}
                        {...stylex.attrs(styles.searchInput)}
                        placeholder={`Search ${getSupportedParentTypeLabel()}s...`}
                        onKeydown={handleParentKeydown}
                      />
                    </div>
                    <div {...stylex.attrs(styles.menu)}>
                      <button
                        type="button"
                        data-parent-idx="0"
                        {...stylex.attrs(styles.option, parentHighlightIndex.value === 0 ? styles.optionActive : styles.optionInactive)}
                        onClick={() => selectParentOption(null)}
                        onMouseenter={() => (parentHighlightIndex.value = 0)}
                      >
                        No parent
                      </button>
                      {filteredParentOptions.value.map((ticket, index) => (
                        <button
                          key={ticket.key}
                          type="button"
                          data-parent-idx={index + 1}
                          {...stylex.attrs(styles.option, styles.optionTopAligned, parentHighlightIndex.value === index + 1 ? styles.optionActive : styles.optionInactive)}
                          onClick={() => selectParentOption(ticket.key)}
                          onMouseenter={() => (parentHighlightIndex.value = index + 1)}
                        >
                          <span {...stylex.attrs(styles.keyPill)}>{ticket.key}</span>
                          <span {...stylex.attrs(styles.optionSummary)}>{ticket.summary}</span>
                        </button>
                      ))}
                      {filteredParentOptions.value.length === 0 && (
                        <div {...stylex.attrs(styles.empty)}>
                          No matching
                          {' '}
                          {getSupportedParentTypeLabel()}
                          s
                        </div>
                      )}
                    </div>
                  </div>
                )
              : (
                  <button
                    type="button"
                    {...stylex.attrs(styles.trigger)}
                    disabled={props.parentLocked || props.isCreatePending}
                    onClick={startEditingParent}
                  >
                    <div {...stylex.attrs(styles.triggerText)}>
                      <div {...stylex.attrs(styles.selectedLabel)}>{getSelectedParentLabel()}</div>
                      <div {...stylex.attrs(styles.selectedHelp)}>
                        {props.effectiveParentKey ? `Change ${getSupportedParentTypeLabel()}` : `Choose ${getSupportedParentArticleLabel()} or leave empty`}
                      </div>
                    </div>
                    <svg {...stylex.attrs(styles.chevron)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
          </div>
          {props.parentLocked && props.effectiveParentKey && (
            <p {...stylex.attrs(styles.lockedHelp)}>Parent is fixed for this create flow.</p>
          )}
        </div>
      )
    )
  },
})

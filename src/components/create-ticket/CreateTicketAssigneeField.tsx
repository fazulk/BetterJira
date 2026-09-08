import type { PropType } from 'vue'
import type { CreateAvatarTone } from '@/features/create-ticket/constants'
import type { JiraAssignableUser } from '@/types/jira'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent } from 'vue'
import { useAssigneePicker } from '@/features/create-ticket/useAssigneePicker'
import { colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  root: { minWidth: 0, flex: '1', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, color: colors['--color-slate-200'] },
  localPanel: {
    borderRadius: '0.5rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingInline: '0.75rem',
    paddingBlock: '0.625rem',
  },
  localRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', fontSize: 11, color: colors['--color-slate-300'] },
  youPill: {
    borderRadius: '0.375rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    paddingInline: '0.5rem',
    paddingBlock: '0.125rem',
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
    color: colors['--color-slate-300'],
  },
  mutedText: { color: colors['--color-slate-500'] },
  errorText: { color: colors['--color-rose-300'] },
  localDescription: { marginTop: '0.375rem', fontSize: 10, lineHeight: 1.625, color: colors['--color-slate-600'] },
  retryButton: { marginTop: '0.5rem', fontSize: 11, color: { 'default': colors['--color-slate-400'], ':hover': colors['--color-slate-200'] }, backgroundColor: 'transparent', borderWidth: 0, padding: 0 },
  picker: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    borderRadius: '0.375rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: { 'default': 'rgba(255, 255, 255, 0.06)', ':hover': 'rgba(255, 255, 255, 0.1)' },
    backgroundColor: { 'default': 'rgba(255, 255, 255, 0.02)', ':hover': 'rgba(255, 255, 255, 0.04)' },
    paddingBlock: '0.375rem',
    paddingLeft: '0.375rem',
    paddingRight: '0.625rem',
    transitionProperty: 'border-color, background-color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  combo: { position: 'relative' },
  editRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  inputWrap: { position: 'relative' },
  searchIcon: {
    pointerEvents: 'none',
    position: 'absolute',
    left: '0.625rem',
    top: '50%',
    width: '0.75rem',
    height: '0.75rem',
    transform: 'translateY(-50%)',
    color: colors['--color-slate-500'],
  },
  searchInput: {
    'width': '12rem',
    'borderRadius': '0.375rem',
    'borderWidth': 1,
    'borderStyle': 'solid',
    'borderColor': { 'default': 'rgba(255, 255, 255, 0.08)', ':focus': 'rgba(255, 255, 255, 0.16)' },
    'backgroundColor': colors['--color-surface-0'],
    'paddingBlock': '0.375rem',
    'paddingLeft': '2rem',
    'paddingRight': '0.75rem',
    'fontSize': '0.75rem',
    'lineHeight': '1rem',
    'color': colors['--color-slate-200'],
    'outlineStyle': 'none',
    'transitionProperty': 'border-color',
    'transitionDuration': '150ms',
    'transitionTimingFunction': 'cubic-bezier(0.4, 0, 0.2, 1)',
    '::placeholder': { color: colors['--color-slate-600'] },
  },
  closeButton: {
    borderRadius: '9999px',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingInline: '0.5rem',
    paddingBlock: '0.25rem',
    fontSize: 11,
    fontWeight: 500,
    color: colors['--color-slate-400'],
    backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.04)' },
    transitionProperty: 'background-color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  statusText: { fontSize: 11, color: colors['--color-slate-500'] },
  statusError: { fontSize: 11, color: colors['--color-rose-300'] },
  menu: {
    position: 'absolute',
    left: 0,
    bottom: '100%',
    zIndex: 50,
    marginBottom: '0.25rem',
    maxHeight: '16rem',
    width: '14rem',
    overflowY: 'auto',
    borderRadius: '0.5rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: colors['--color-surface-0'],
    paddingBlock: '0.25rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
  },
  menuHeader: { paddingInline: '0.75rem', paddingBlock: '0.375rem', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors['--color-slate-600'] },
  option: {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    gap: '0.5rem',
    paddingInline: '0.75rem',
    paddingBlock: '0.375rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    backgroundColor: { 'default': 'transparent', ':hover': 'rgba(255, 255, 255, 0.04)' },
    transitionProperty: 'background-color, color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  optionActive: { backgroundColor: 'rgba(255, 255, 255, 0.06)', color: colors['--color-white'] },
  optionInactive: { color: colors['--color-slate-300'] },
  divider: { marginInline: '0.5rem', marginBlock: '0.25rem', borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'rgba(255, 255, 255, 0.06)' },
  empty: { paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem', fontStyle: 'italic', color: colors['--color-slate-600'] },
  trigger: { display: 'flex', cursor: 'pointer', alignItems: 'center', gap: '0.375rem', backgroundColor: 'transparent', borderWidth: 0, padding: 0 },
  avatar: {
    display: 'flex',
    width: '1rem',
    height: '1rem',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '9999px',
    borderWidth: 1,
    borderStyle: 'solid',
    fontSize: 8,
    fontWeight: 700,
  },
  avatarNeutralStrong: { borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.045)', color: colors['--color-slate-300'] },
  avatarNeutralMuted: { borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.035)', color: colors['--color-slate-400'] },
  avatarSurface: { borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: colors['--color-surface-3'], color: colors['--color-slate-300'] },
  avatarFallback: { borderColor: 'rgba(100, 116, 139, 0.15)', backgroundColor: 'rgba(100, 116, 139, 0.15)', color: colors['--color-slate-400'] },
  selectedName: { fontSize: 11, fontWeight: 500, color: colors['--color-slate-300'] },
})

function avatarStyle(tone: CreateAvatarTone) {
  if (tone === 'neutralStrong')
    return styles.avatarNeutralStrong
  if (tone === 'neutralMuted')
    return styles.avatarNeutralMuted
  if (tone === 'surface')
    return styles.avatarSurface
  return styles.avatarFallback
}

export default defineComponent({
  name: 'CreateTicketAssigneeField',
  props: {
    assigneeValue: {
      type: String,
      required: true,
    },
    createAssignableOptions: {
      type: Array as PropType<JiraAssignableUser[]>,
      required: true,
    },
    isCreatePending: {
      type: Boolean,
      required: true,
    },
    isFieldLoading: {
      type: Boolean,
      required: true,
    },
    isLocalSpace: {
      type: Boolean,
      required: true,
    },
    localAssigneeError: {
      type: Boolean,
      required: true,
    },
    localAssigneeLoading: {
      type: Boolean,
      required: true,
    },
    localAssigneeName: {
      type: String as PropType<string | null>,
      default: null,
    },
    fieldError: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  emits: {
    retryLocalAssignee: () => true,
    updateAssignee: (value: string) => typeof value === 'string',
  },
  setup(props, { emit, expose }) {
    const createAssignableOptions = computed(() => props.createAssignableOptions)
    const isCreatePending = computed(() => props.isCreatePending)
    const isLocalSpace = computed(() => props.isLocalSpace)

    const {
      assigneeComboRef,
      assigneeHighlightIndex,
      assigneeInputRef,
      assigneeSearch,
      flatComboOptions,
      getAssigneeAvatarTone,
      getAssigneeInitials,
      handleAssigneeKeydown,
      isEditingAssignee,
      nonRecentComboOptions,
      recentComboOptions,
      selectAssigneeOption,
      startEditingAssignee,
      stopEditingAssignee,
    } = useAssigneePicker({
      createAssignableOptions,
      isCreatePending,
      isLocalSpace,
      updateFieldValue: (_key, value) => emit('updateAssignee', value),
    })

    const selectedAssigneeName = computed(() => {
      if (!props.assigneeValue)
        return 'Unassigned'
      const selectedAssignee = props.createAssignableOptions.find(assignee => assignee.accountId === props.assigneeValue)
      return selectedAssignee?.displayName ?? 'Unassigned'
    })

    expose({
      startEditingAssignee,
      stopEditingAssignee,
    })

    return () => (
      <div {...stylex.attrs(styles.root)}>
        <label {...stylex.attrs(styles.label)}>
          <span>Assignee</span>
        </label>
        {props.isLocalSpace
          ? (
              <div {...stylex.attrs(styles.localPanel)}>
                <div {...stylex.attrs(styles.localRow)}>
                  <span {...stylex.attrs(styles.youPill)}>You</span>
                  {props.localAssigneeLoading && <span {...stylex.attrs(styles.mutedText)}>Loading your Jira name...</span>}
                  {!props.localAssigneeLoading && props.localAssigneeName && <span>{props.localAssigneeName}</span>}
                  {!props.localAssigneeLoading && !props.localAssigneeName && props.localAssigneeError && (
                    <span {...stylex.attrs(styles.errorText)}>Could not load Jira profile</span>
                  )}
                </div>
                <p {...stylex.attrs(styles.localDescription)}>
                  Local tickets are always assigned to you, using your Jira display name.
                </p>
                {props.localAssigneeError && (
                  <button
                    type="button"
                    {...stylex.attrs(styles.retryButton)}
                    onClick={() => emit('retryLocalAssignee')}
                  >
                    Retry
                  </button>
                )}
              </div>
            )
          : (
              <div {...stylex.attrs(styles.picker)}>
                {isEditingAssignee.value
                  ? (
                      <div ref={assigneeComboRef} {...stylex.attrs(styles.combo)}>
                        <div {...stylex.attrs(styles.editRow)}>
                          <div {...stylex.attrs(styles.inputWrap)}>
                            <svg {...stylex.attrs(styles.searchIcon)} fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <circle cx="11" cy="11" r="8" />
                              <path stroke-linecap="round" d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                              id="create-field-assignee"
                              ref={assigneeInputRef}
                              v-model={assigneeSearch.value}
                              name="create-assignee-search"
                              aria-label="Search assignees"
                              {...stylex.attrs(styles.searchInput)}
                              placeholder="Search assignees..."
                              onKeydown={handleAssigneeKeydown}
                            />
                          </div>
                          <button
                            type="button"
                            {...stylex.attrs(styles.closeButton)}
                            onClick={stopEditingAssignee}
                          >
                            x
                          </button>
                          {props.isFieldLoading && <span {...stylex.attrs(styles.statusText)}>Loading...</span>}
                          {props.fieldError && <span {...stylex.attrs(styles.statusError)}>{props.fieldError}</span>}
                        </div>
                        <div {...stylex.attrs(styles.menu)}>
                          {recentComboOptions.value.length > 0 && (
                            <>
                              <div {...stylex.attrs(styles.menuHeader)}>
                                Recent
                              </div>
                              {recentComboOptions.value.map((option, i) => (
                                <button
                                  key={option.accountId}
                                  type="button"
                                  data-idx={i}
                                  {...stylex.attrs(styles.option, assigneeHighlightIndex.value === i ? styles.optionActive : styles.optionInactive)}
                                  onClick={() => selectAssigneeOption(option.accountId)}
                                  onMouseenter={() => (assigneeHighlightIndex.value = i)}
                                >
                                  {option.displayName}
                                </button>
                              ))}
                              <div {...stylex.attrs(styles.divider)} />
                            </>
                          )}
                          {nonRecentComboOptions.value.length > 0 && nonRecentComboOptions.value.map((option, j) => (
                            <button
                              key={option.accountId}
                              type="button"
                              data-idx={recentComboOptions.value.length + j}
                              {...stylex.attrs(styles.option, assigneeHighlightIndex.value === recentComboOptions.value.length + j ? styles.optionActive : styles.optionInactive)}
                              onClick={() => selectAssigneeOption(option.accountId)}
                              onMouseenter={() => (assigneeHighlightIndex.value = recentComboOptions.value.length + j)}
                            >
                              {option.displayName}
                            </button>
                          ))}
                          {!flatComboOptions.value.length && (
                            <div {...stylex.attrs(styles.empty)}>No matching users</div>
                          )}
                        </div>
                      </div>
                    )
                  : (
                      <button type="button" {...stylex.attrs(styles.trigger)} onClick={startEditingAssignee}>
                        <div {...stylex.attrs(styles.avatar, avatarStyle(getAssigneeAvatarTone(selectedAssigneeName.value)))}>
                          {getAssigneeInitials(selectedAssigneeName.value)}
                        </div>
                        <span {...stylex.attrs(styles.selectedName)}>{selectedAssigneeName.value}</span>
                      </button>
                    )}
              </div>
            )}
      </div>
    )
  },
})

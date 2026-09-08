import type { PropType } from 'vue'
import type { JiraCreateIssueType } from '@/types/jira'
import * as stylex from '@stylexjs/stylex'
import { defineComponent } from 'vue'
import { colors } from '@/styles/tokens.stylex'

const styles = stylex.create({
  root: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', color: colors['--color-slate-500'] },
  localPill: {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    borderRadius: '0.375rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    paddingInline: '0.625rem',
    paddingBlock: '0.375rem',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    fontWeight: 500,
    color: colors['--color-slate-300'],
  },
  message: { fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
  error: { fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-rose-300'] },
  options: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' },
  optionButton: {
    borderRadius: '0.375rem',
    borderWidth: 1,
    borderStyle: 'solid',
    paddingInline: '0.625rem',
    paddingBlock: '0.375rem',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    fontWeight: 500,
    transitionProperty: 'opacity',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  neutralBadge: {
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
    color: colors['--color-slate-300'],
  },
  inactiveOption: { opacity: { 'default': 0.6, ':hover': 1 } },
})

export default defineComponent({
  name: 'CreateTicketSubtypeSelector',
  props: {
    createIssueTypesError: {
      type: String as PropType<string | null>,
      default: null,
    },
    effectiveParentKey: {
      type: String as PropType<string | null>,
      default: null,
    },
    isCreatePending: {
      type: Boolean,
      required: true,
    },
    isIssueTypeLocked: {
      type: Boolean,
      required: true,
    },
    isLoadingIssueTypes: {
      type: Boolean,
      required: true,
    },
    isLocalSpace: {
      type: Boolean,
      required: true,
    },
    issueTypeOptions: {
      type: Array as PropType<JiraCreateIssueType[]>,
      required: true,
    },
    getCreateIssueTypeLabel: {
      type: Function as PropType<(issueType: JiraCreateIssueType) => string>,
      required: true,
    },
    selectedIssueType: {
      type: String as PropType<JiraCreateIssueType>,
      required: true,
    },
  },
  emits: {
    'update:selectedIssueType': (issueType: JiraCreateIssueType) => typeof issueType === 'string',
  },
  setup(props, { emit }) {
    return () => (
      props.isLocalSpace
        ? (
            <div {...stylex.attrs(styles.root)}>
              <p {...stylex.attrs(styles.label)}>Subtype</p>
              <div {...stylex.attrs(styles.localPill)}>
                Task
              </div>
            </div>
          )
        : (
            <div {...stylex.attrs(styles.root)}>
              <p {...stylex.attrs(styles.label)}>Subtype</p>
              {props.effectiveParentKey && props.isLoadingIssueTypes && (
                <p {...stylex.attrs(styles.message)}>Loading issue types available for this parent...</p>
              )}
              {!(props.effectiveParentKey && props.isLoadingIssueTypes) && props.createIssueTypesError && (
                <p {...stylex.attrs(styles.error)}>{props.createIssueTypesError}</p>
              )}
              {!(props.effectiveParentKey && props.isLoadingIssueTypes) && !props.createIssueTypesError && props.issueTypeOptions.length === 0 && (
                <p {...stylex.attrs(styles.message)}>No issue types are available for this parent.</p>
              )}
              <div {...stylex.attrs(styles.options)}>
                {props.issueTypeOptions.map(issueType => (
                  <button
                    key={issueType}
                    type="button"
                    {...stylex.attrs(
                      styles.optionButton,
                      styles.neutralBadge,
                      props.selectedIssueType === issueType ? null : styles.inactiveOption,
                    )}
                    disabled={props.isIssueTypeLocked || props.isCreatePending}
                    onClick={() => emit('update:selectedIssueType', issueType)}
                  >
                    {props.getCreateIssueTypeLabel(issueType)}
                  </button>
                ))}
              </div>
            </div>
          )
    )
  },
})

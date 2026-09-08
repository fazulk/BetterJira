import type { PropType } from 'vue'
import type { JiraCreateIssueType } from '@/types/jira'
import { defineComponent } from 'vue'

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
    getIssueTypeBadgeClass: {
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
            <div class="space-y-1.5">
              <p class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Subtype</p>
              <div class="inline-flex rounded-md border border-white/[0.08] bg-white/[0.035] px-2.5 py-1.5 text-xs font-medium text-slate-300">
                Task
              </div>
            </div>
          )
        : (
            <div class="space-y-1.5">
              <p class="text-[11px] uppercase tracking-[0.14em] text-slate-500">Subtype</p>
              {props.effectiveParentKey && props.isLoadingIssueTypes && (
                <p class="text-xs text-slate-500">Loading issue types available for this parent...</p>
              )}
              {!(props.effectiveParentKey && props.isLoadingIssueTypes) && props.createIssueTypesError && (
                <p class="text-xs text-rose-300">{props.createIssueTypesError}</p>
              )}
              {!(props.effectiveParentKey && props.isLoadingIssueTypes) && !props.createIssueTypesError && props.issueTypeOptions.length === 0 && (
                <p class="text-xs text-slate-500">No issue types are available for this parent.</p>
              )}
              <div class="flex flex-wrap gap-2">
                {props.issueTypeOptions.map(issueType => (
                  <button
                    key={issueType}
                    type="button"
                    class={[
                      'rounded-md border px-2.5 py-1.5 text-xs font-medium transition',
                      props.selectedIssueType === issueType
                        ? props.getIssueTypeBadgeClass(issueType)
                        : `${props.getIssueTypeBadgeClass(issueType)} opacity-60 hover:opacity-100`,
                    ]}
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

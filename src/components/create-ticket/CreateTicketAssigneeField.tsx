import type { PropType } from 'vue'
import type { JiraAssignableUser } from '@/types/jira'
import { computed, defineComponent } from 'vue'
import { useAssigneePicker } from '@/features/create-ticket/useAssigneePicker'

function getInputValue(event: Event): string {
  const target = event.target
  return target instanceof HTMLInputElement ? target.value : ''
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
      getAssigneeAvatarClass,
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
      <div class="min-w-0 flex-1 space-y-2">
        <label class="flex items-center gap-2 text-sm font-medium text-slate-200">
          <span>Assignee</span>
        </label>
        {props.isLocalSpace
          ? (
              <div class="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
                <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                  <span class="rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">You</span>
                  {props.localAssigneeLoading && <span class="text-slate-500">Loading your Jira name...</span>}
                  {!props.localAssigneeLoading && props.localAssigneeName && <span>{props.localAssigneeName}</span>}
                  {!props.localAssigneeLoading && !props.localAssigneeName && props.localAssigneeError && (
                    <span class="text-rose-300">Could not load Jira profile</span>
                  )}
                </div>
                <p class="mt-1.5 text-[10px] leading-relaxed text-slate-600">
                  Local tickets are always assigned to you, using your Jira display name.
                </p>
                {props.localAssigneeError && (
                  <button
                    type="button"
                    class="mt-2 text-[11px] text-slate-400 hover:text-slate-200"
                    onClick={() => emit('retryLocalAssignee')}
                  >
                    Retry
                  </button>
                )}
              </div>
            )
          : (
              <div class="group relative flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] py-1.5 pl-1.5 pr-2.5 transition hover:border-white/[0.1] hover:bg-white/[0.04]">
                {isEditingAssignee.value
                  ? (
                      <div ref={assigneeComboRef} class="relative">
                        <div class="flex items-center gap-2">
                          <div class="relative">
                            <svg class="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <circle cx="11" cy="11" r="8" />
                              <path stroke-linecap="round" d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                              id="create-field-assignee"
                              ref={assigneeInputRef}
                              value={assigneeSearch.value}
                              name="create-assignee-search"
                              aria-label="Search assignees"
                              class="w-48 rounded-md border border-white/[0.08] bg-surface-0 py-1.5 pl-8 pr-3 text-xs text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-white/[0.16]"
                              placeholder="Search assignees..."
                              onInput={event => (assigneeSearch.value = getInputValue(event))}
                              onKeydown={handleAssigneeKeydown}
                            />
                          </div>
                          <button
                            type="button"
                            class="rounded-full border border-white/[0.08] px-2 py-1 text-[11px] font-medium text-slate-400 transition hover:bg-white/[0.04]"
                            onClick={stopEditingAssignee}
                          >
                            x
                          </button>
                          {props.isFieldLoading && <span class="text-[11px] text-slate-500">Loading...</span>}
                          {props.fieldError && <span class="text-[11px] text-rose-300">{props.fieldError}</span>}
                        </div>
                        <div class="absolute left-0 bottom-full z-50 mb-1 max-h-64 w-56 overflow-y-auto rounded-lg border border-white/[0.08] bg-surface-0 py-1 shadow-xl shadow-black/40">
                          {recentComboOptions.value.length > 0 && (
                            <>
                              <div class="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-600">
                                Recent
                              </div>
                              {recentComboOptions.value.map((option, i) => (
                                <button
                                  key={option.accountId}
                                  type="button"
                                  data-idx={i}
                                  class={[
                                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors',
                                    assigneeHighlightIndex.value === i ? 'bg-white/[0.06] text-white' : 'text-slate-300 hover:bg-white/[0.04]',
                                  ]}
                                  onClick={() => selectAssigneeOption(option.accountId)}
                                  onMouseenter={() => (assigneeHighlightIndex.value = i)}
                                >
                                  {option.displayName}
                                </button>
                              ))}
                              <div class="mx-2 my-1 border-t border-white/[0.06]" />
                            </>
                          )}
                          {nonRecentComboOptions.value.length > 0 && nonRecentComboOptions.value.map((option, j) => (
                            <button
                              key={option.accountId}
                              type="button"
                              data-idx={recentComboOptions.value.length + j}
                              class={[
                                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors',
                                assigneeHighlightIndex.value === recentComboOptions.value.length + j ? 'bg-white/[0.06] text-white' : 'text-slate-300 hover:bg-white/[0.04]',
                              ]}
                              onClick={() => selectAssigneeOption(option.accountId)}
                              onMouseenter={() => (assigneeHighlightIndex.value = recentComboOptions.value.length + j)}
                            >
                              {option.displayName}
                            </button>
                          ))}
                          {!flatComboOptions.value.length && (
                            <div class="px-3 py-2 text-xs italic text-slate-600">No matching users</div>
                          )}
                        </div>
                      </div>
                    )
                  : (
                      <button type="button" class="flex cursor-pointer items-center gap-1.5" onClick={startEditingAssignee}>
                        <div class={['flex h-4 w-4 items-center justify-center rounded-full border text-[8px] font-bold', getAssigneeAvatarClass(selectedAssigneeName.value)]}>
                          {getAssigneeInitials(selectedAssigneeName.value)}
                        </div>
                        <span class="text-[11px] font-medium text-slate-300">{selectedAssigneeName.value}</span>
                      </button>
                    )}
              </div>
            )}
      </div>
    )
  },
})

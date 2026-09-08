import type { PropType } from 'vue'
import type { JiraAssignableUser, JiraCreateIssueType, JiraTicket } from '@/types/jira'
import * as stylex from '@stylexjs/stylex'
import { computed, defineComponent, onUnmounted, ref, Teleport, Transition, watch } from 'vue'
import CreateTicketAssigneeField from '@/components/create-ticket/CreateTicketAssigneeField'
import CreateTicketDueDateField from '@/components/create-ticket/CreateTicketDueDateField'
import CreateTicketModalFooter from '@/components/create-ticket/CreateTicketModalFooter'
import CreateTicketModalHeader from '@/components/create-ticket/CreateTicketModalHeader'
import CreateTicketNotices from '@/components/create-ticket/CreateTicketNotices'
import CreateTicketParentPicker from '@/components/create-ticket/CreateTicketParentPicker'
import CreateTicketPrimaryFields from '@/components/create-ticket/CreateTicketPrimaryFields'
import CreateTicketPriorityField from '@/components/create-ticket/CreateTicketPriorityField'
import CreateTicketSubtypeSelector from '@/components/create-ticket/CreateTicketSubtypeSelector'
import CreateTicketTeamSelector from '@/components/create-ticket/CreateTicketTeamSelector'
import { useCreateAssignableUsers } from '@/composables/useCreateAssignableUsers'
import { useCreateIssueTypes } from '@/composables/useCreateIssueTypes'
import { useCreateLocalTicket } from '@/composables/useCreateLocalTicket'
import { useCreateTicket } from '@/composables/useCreateTicket'
import { useJiraCurrentUser } from '@/composables/useJiraCurrentUser'
import { usePriorities } from '@/composables/usePriorities'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { HARDCODED_CREATE_FIELDS } from '@/features/create-ticket/constants'
import { getAllowedIssueTypesForParent, getCreateIssueTypeLabel } from '@/features/create-ticket/issueTypePolicy'
import { useCreateFieldOptions } from '@/features/create-ticket/useCreateFieldOptions'
import { useCreateTicketDerivedState } from '@/features/create-ticket/useCreateTicketDerivedState'
import { useCreateTicketFieldValues } from '@/features/create-ticket/useCreateTicketFieldValues'
import { useCreateTicketFormSync } from '@/features/create-ticket/useCreateTicketFormSync'
import { focusElementById, useCreateTicketShortcuts } from '@/features/create-ticket/useCreateTicketShortcuts'
import { useCreateTicketSubmit } from '@/features/create-ticket/useCreateTicketSubmit'
import { breakpoints, colors } from '@/styles/tokens.stylex'
import { readLocalStorageString } from '@/utils/browserStorage'
import { LOCAL_ISSUE_TYPE } from '~/shared/localTickets'

interface AssigneeFieldExpose {
  startEditingAssignee: () => void
  stopEditingAssignee: () => void
}

interface ParentPickerExpose {
  stopEditingParent: () => void
}

interface FocusableFieldExpose {
  focus: () => void
}

const styles = stylex.create({
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingInline: '0.75rem',
    paddingBlock: '9vh',
    backdropFilter: 'blur(4px)',
  },
  dialog: {
    width: '100%',
    maxWidth: '42rem',
    overflow: 'hidden',
    borderRadius: '0.5rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: colors['--color-surface-1'],
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
  },
  body: {
    maxHeight: '68vh',
    overflowY: 'auto',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  responsiveControls: { display: 'grid', gap: '0.75rem', borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'rgba(255, 255, 255, 0.06)', paddingTop: '1rem', gridTemplateColumns: { [breakpoints.md]: 'minmax(0,1fr) auto' } },
  secondaryFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  secondaryFieldsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: '0.75rem',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: '1rem',
  },
})

export default defineComponent({
  name: 'CreateTicketModal',
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    tickets: {
      type: Array as PropType<JiraTicket[]>,
      required: true,
    },
    initialIssueType: {
      type: String as PropType<JiraCreateIssueType>,
      default: 'Task',
    },
    initialParentKey: {
      type: String as PropType<string | null>,
      default: null,
    },
    issueTypeLocked: {
      type: Boolean,
      default: false,
    },
    parentLocked: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    close: () => true,
    created: (key: string, keepOpen: boolean) => typeof key === 'string' && typeof keepOpen === 'boolean',
  },
  setup(props, { emit }) {
    const selectedIssueType = ref<JiraCreateIssueType>(props.initialIssueType)
    const selectedSpaceKey = ref<string | null>(null)
    const parentKey = ref<string | null>(props.initialParentKey)
    const { fieldValues, getInputValue, getTextValue, updateFieldValue } = useCreateTicketFieldValues()
    const submitError = ref<string | null>(null)
    const createMore = ref(false)
    const attachmentNotice = ref<string | null>(null)

    const createMutation = useCreateTicket()
    const createLocalMutation = useCreateLocalTicket()
    const { enabledSpaces, hasJiraCredentialsConfigured } = useSpaceSettings()

    const open = computed(() => props.open)
    const tickets = computed(() => props.tickets)
    const initialIssueType = computed(() => props.initialIssueType)
    const initialParentKey = computed(() => props.initialParentKey)
    const parentLocked = computed(() => props.parentLocked)
    const isCreatePending = computed(() => createMutation.isPending.value || createLocalMutation.isPending.value)
    const issueTypeLocked = computed(() => props.issueTypeLocked)
    const assigneeFieldRef = ref<AssigneeFieldExpose | null>(null)
    const parentPickerRef = ref<ParentPickerExpose | null>(null)
    const priorityFieldRef = ref<FocusableFieldExpose | null>(null)
    const teamSelectorRef = ref<FocusableFieldExpose | null>(null)
    const LAST_CREATED_SPACE_KEY = 'jira2.last-created-space-key'
    const lastCreatedSpaceKey = ref<string | null>(readLocalStorageString(LAST_CREATED_SPACE_KEY))

    const {
      activeIssueType,
      createSpaceOptions,
      effectiveParentKey,
      effectiveSpaceKey,
      getSelectedSpaceName,
      isLocalSpace,
      isSpaceLocked,
      jiraFieldQueriesEnabled,
      selectedParentIsProject,
      selectedParentTicket,
      supportedParentDisplayLabel,
      supportedParentTickets,
      supportedParentType,
    } = useCreateTicketDerivedState({
      enabledSpaces,
      hasJiraCredentialsConfigured,
      initialParentKey,
      open,
      parentKey,
      parentLocked,
      selectedIssueType,
      selectedSpaceKey,
      tickets,
    })

    const createAssignableUsersQuery = useCreateAssignableUsers(activeIssueType, effectiveParentKey, effectiveSpaceKey, jiraFieldQueriesEnabled)
    const createIssueTypesQuery = useCreateIssueTypes(effectiveParentKey, jiraFieldQueriesEnabled)
    const createPrioritiesQuery = usePriorities(computed(() => Boolean(activeIssueType.value) && jiraFieldQueriesEnabled.value))

    const jiraMeQueryEnabled = computed(() => props.open && isLocalSpace.value && hasJiraCredentialsConfigured.value)
    const jiraMeQuery = useJiraCurrentUser(jiraMeQueryEnabled)

    const issueTypeOptions = computed<JiraCreateIssueType[]>(() => {
      if (isLocalSpace.value)
        return [LOCAL_ISSUE_TYPE]

      if (effectiveParentKey.value)
        return createIssueTypesQuery.data.value?.map(issueType => issueType.name) ?? []

      return getAllowedIssueTypesForParent(selectedParentTicket.value?.issueType ?? null)
    })

    const createIssueTypesError = computed(() => {
      if (!effectiveParentKey.value)
        return null

      const error = createIssueTypesQuery.error.value
      return error instanceof Error ? error.message : null
    })

    const hasSelectedIssueTypeOption = computed(() => (
      Boolean(selectedIssueType.value)
      && (isLocalSpace.value || issueTypeOptions.value.includes(selectedIssueType.value))
    ))
    const canSubmit = computed(() => (
      !isCreatePending.value
      && hasSelectedIssueTypeOption.value
      && Boolean(effectiveSpaceKey.value)
      && !(isLocalSpace.value && (jiraMeQuery.isLoading.value || jiraMeQuery.isFetching.value))
    ))

    const fields = computed(() => HARDCODED_CREATE_FIELDS)
    const primaryFields = computed(() => fields.value.filter(field => field.key === 'summary' || field.key === 'description'))

    function closeModal(): void {
      if (isCreatePending.value)
        return
      emit('close')
    }

    function finishSuccessfulCreate(key: string): void {
      emit('created', key, createMore.value)
      if (createMore.value) {
        // eslint-disable-next-line ts/no-use-before-define
        resetAfterSuccessfulCreate()
      }
    }

    const { submit } = useCreateTicketSubmit({
      createLocalTicket: createLocalMutation.mutateAsync,
      createRemoteTicket: createMutation.mutateAsync,
      effectiveParentKey,
      effectiveSpaceKey,
      fieldValues,
      finishSuccessfulCreate,
      getTextValue,
      hasSelectedIssueTypeOption,
      isCreatePending,
      isLocalSpace,
      jiraMeQuery,
      lastCreatedSpaceKey,
      selectedIssueType,
      submitError,
    })

    function showAttachmentNotice(): void {
      attachmentNotice.value = 'Attachments are not available in this first pass.'
    }

    const createAssignableOptions = computed<JiraAssignableUser[]>(() => createAssignableUsersQuery.data.value ?? [])
    const createPriorityOptions = computed(() => createPrioritiesQuery.data.value ?? [])
    const {
      getCreateFieldError,
      getCreateFieldOptions,
      getSelectedPriorityName,
      isCreateFieldLoading,
    } = useCreateFieldOptions({
      assigneesQuery: createAssignableUsersQuery,
      createAssignableOptions,
      createPriorityOptions,
      getTextValue,
      isLocalSpace,
      prioritiesQuery: createPrioritiesQuery,
    })

    function stopEditingParent(): void {
      parentPickerRef.value?.stopEditingParent()
    }

    function startEditingAssignee(): void {
      assigneeFieldRef.value?.startEditingAssignee()
    }

    function stopEditingAssignee(): void {
      assigneeFieldRef.value?.stopEditingAssignee()
    }

    const { resetAfterSuccessfulCreate, resetForm } = useCreateTicketFormSync({
      attachmentNotice,
      createAssignableOptions,
      createPriorityOptions,
      createSpaceOptions,
      effectiveSpaceKey,
      fields,
      fieldValues,
      getTextValue,
      initialIssueType,
      initialParentKey,
      isLocalSpace,
      issueTypeOptions,
      lastCreatedSpaceKey,
      open,
      parentKey,
      parentLocked,
      selectedIssueType,
      selectedParentTicket,
      selectedSpaceKey,
      stopEditingAssignee,
      stopEditingParent,
      submitError,
      supportedParentTickets,
      supportedParentType,
      tickets,
      updateFieldValue,
    })

    const { handleComposerKeydown } = useCreateTicketShortcuts({
      canSubmit,
      closeModal,
      isCreatePending,
      isIssueTypeLocked: issueTypeLocked,
      isLocalSpace,
      issueTypeOptions,
      priorityField: priorityFieldRef,
      selectedIssueType,
      startEditingAssignee,
      submit,
      teamSelector: teamSelectorRef,
    })

    watch(() => props.open, (isOpen) => {
      if (!isOpen) {
        document.removeEventListener('keydown', handleComposerKeydown)
        return
      }

      document.addEventListener('keydown', handleComposerKeydown)
      resetForm()
      focusElementById('create-field-summary')
    })

    onUnmounted(() => {
      document.removeEventListener('keydown', handleComposerKeydown)
      stopEditingParent()
      stopEditingAssignee()
    })

    function handleBackdropClick(event: MouseEvent): void {
      if (event.target === event.currentTarget)
        closeModal()
    }

    return () => (
      <Teleport to="body">
        <Transition name="fade">
          {open.value && (
            <div
              {...stylex.attrs(styles.backdrop)}
              onClick={handleBackdropClick}
            >
              <div
                {...stylex.attrs(styles.dialog)}
                role="dialog"
                aria-modal="true"
                aria-label="Create issue"
                onKeydown={handleComposerKeydown}
              >
                <CreateTicketModalHeader
                  isCreatePending={isCreatePending.value}
                  selectedSpaceName={getSelectedSpaceName()}
                  onClose={closeModal}
                />

                <div {...stylex.attrs(styles.body)}>
                  <CreateTicketPrimaryFields
                    fields={primaryFields.value}
                    getCreateFieldError={getCreateFieldError}
                    getCreateFieldOptions={getCreateFieldOptions}
                    getInputValue={getInputValue}
                    getTextValue={getTextValue}
                    isCreateFieldLoading={isCreateFieldLoading}
                    isCreatePending={isCreatePending.value}
                    updateFieldValue={updateFieldValue}
                  />

                  <div {...stylex.attrs(styles.responsiveControls)}>
                    <CreateTicketTeamSelector
                      ref={teamSelectorRef}
                      effectiveSpaceKey={effectiveSpaceKey.value}
                      isCreatePending={isCreatePending.value}
                      isSpaceLocked={isSpaceLocked.value}
                      selectedSpaceName={getSelectedSpaceName()}
                      spaces={createSpaceOptions.value}
                      {...{ 'onUpdate:spaceKey': (value: string | null) => (selectedSpaceKey.value = value) }}
                    />

                    <CreateTicketSubtypeSelector
                      selectedIssueType={selectedIssueType.value}
                      createIssueTypesError={createIssueTypesError.value}
                      effectiveParentKey={effectiveParentKey.value}
                      getCreateIssueTypeLabel={getCreateIssueTypeLabel}
                      isCreatePending={isCreatePending.value}
                      isIssueTypeLocked={issueTypeLocked.value}
                      isLoadingIssueTypes={createIssueTypesQuery.isLoading.value}
                      isLocalSpace={isLocalSpace.value}
                      issueTypeOptions={issueTypeOptions.value}
                      {...{ 'onUpdate:selectedIssueType': (value: JiraCreateIssueType) => (selectedIssueType.value = value) }}
                    />
                  </div>

                  <CreateTicketParentPicker
                    ref={parentPickerRef}
                    effectiveParentKey={effectiveParentKey.value}
                    filteredLabel={supportedParentDisplayLabel.value}
                    isCreatePending={isCreatePending.value}
                    parentLocked={parentLocked.value}
                    selectedParentIsProject={selectedParentIsProject.value}
                    supportedParentDisplayLabel={supportedParentDisplayLabel.value}
                    supportedParentTickets={supportedParentTickets.value}
                    supportedParentType={supportedParentType.value}
                    {...{ 'onUpdate:parentKey': (value: string | null) => (parentKey.value = value) }}
                  />

                  <div {...stylex.attrs(styles.secondaryFields)}>
                    <div {...stylex.attrs(styles.secondaryFieldsRow)}>
                      <CreateTicketPriorityField
                        ref={priorityFieldRef}
                        fieldError={getCreateFieldError('priority')}
                        isCreatePending={isCreatePending.value}
                        isFieldLoading={isCreateFieldLoading('priority')}
                        options={getCreateFieldOptions('priority')}
                        priorityName={getSelectedPriorityName()}
                        priorityValue={getTextValue('priority')}
                        {...{ 'onUpdate:priority': (value: string) => updateFieldValue('priority', value) }}
                      />

                      <CreateTicketAssigneeField
                        ref={assigneeFieldRef}
                        assigneeValue={getTextValue('assignee')}
                        createAssignableOptions={createAssignableOptions.value}
                        fieldError={getCreateFieldError('assignee')}
                        isCreatePending={isCreatePending.value}
                        isFieldLoading={isCreateFieldLoading('assignee')}
                        isLocalSpace={isLocalSpace.value}
                        localAssigneeError={jiraMeQuery.isError.value}
                        localAssigneeLoading={jiraMeQuery.isLoading.value || jiraMeQuery.isFetching.value}
                        localAssigneeName={jiraMeQuery.data.value?.displayName ?? null}
                        onRetryLocalAssignee={() => jiraMeQuery.refetch()}
                        onUpdateAssignee={(value: string) => updateFieldValue('assignee', value)}
                      />

                      <CreateTicketDueDateField
                        dueDateValue={getTextValue('duedate')}
                        isCreatePending={isCreatePending.value}
                        {...{ 'onUpdate:dueDate': (value: string) => updateFieldValue('duedate', value) }}
                      />
                    </div>
                  </div>

                  <CreateTicketNotices
                    attachmentNotice={attachmentNotice.value}
                    submitError={submitError.value}
                  />
                </div>

                <CreateTicketModalFooter
                  createMore={createMore.value}
                  canSubmit={canSubmit.value}
                  isCreatePending={isCreatePending.value}
                  isLocalSpace={isLocalSpace.value}
                  onAttachment={showAttachmentNotice}
                  onClose={closeModal}
                  onSubmit={submit}
                  {...{ 'onUpdate:createMore': (value: boolean) => (createMore.value = value) }}
                />
              </div>
            </div>
          )}
        </Transition>
      </Teleport>
    )
  },
})

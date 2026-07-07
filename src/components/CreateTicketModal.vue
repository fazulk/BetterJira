<script setup lang="ts">
import type { JiraAssignableUser, JiraCreateIssueType, JiraTicket } from '@/types/jira'
import { computed, onUnmounted, ref, watch } from 'vue'
import CreateTicketAssigneeField from '@/components/create-ticket/CreateTicketAssigneeField.vue'
import CreateTicketDueDateField from '@/components/create-ticket/CreateTicketDueDateField.vue'
import CreateTicketModalFooter from '@/components/create-ticket/CreateTicketModalFooter.vue'
import CreateTicketModalHeader from '@/components/create-ticket/CreateTicketModalHeader.vue'
import CreateTicketNotices from '@/components/create-ticket/CreateTicketNotices.vue'
import CreateTicketParentPicker from '@/components/create-ticket/CreateTicketParentPicker.vue'
import CreateTicketPrimaryFields from '@/components/create-ticket/CreateTicketPrimaryFields.vue'
import CreateTicketPriorityField from '@/components/create-ticket/CreateTicketPriorityField.vue'
import CreateTicketSubtypeSelector from '@/components/create-ticket/CreateTicketSubtypeSelector.vue'
import CreateTicketTeamSelector from '@/components/create-ticket/CreateTicketTeamSelector.vue'
import { useCreateAssignableUsers } from '@/composables/useCreateAssignableUsers'
import { useCreateIssueTypes } from '@/composables/useCreateIssueTypes'
import { useCreateLocalTicket } from '@/composables/useCreateLocalTicket'
import { useCreateTicket } from '@/composables/useCreateTicket'
import { useJiraCurrentUser } from '@/composables/useJiraCurrentUser'
import { usePriorities } from '@/composables/usePriorities'
import { useSpaceSettings } from '@/composables/useSpaceSettings'
import { HARDCODED_CREATE_FIELDS } from '@/features/create-ticket/constants'
import { getAllowedIssueTypesForParent, getCreateIssueTypeLabel, getIssueTypeBadgeClass } from '@/features/create-ticket/issueTypePolicy'
import { useCreateFieldOptions } from '@/features/create-ticket/useCreateFieldOptions'
import { useCreateTicketDerivedState } from '@/features/create-ticket/useCreateTicketDerivedState'
import { useCreateTicketFieldValues } from '@/features/create-ticket/useCreateTicketFieldValues'
import { useCreateTicketFormSync } from '@/features/create-ticket/useCreateTicketFormSync'
import { focusElementById, useCreateTicketShortcuts } from '@/features/create-ticket/useCreateTicketShortcuts'
import { useCreateTicketSubmit } from '@/features/create-ticket/useCreateTicketSubmit'
import { readLocalStorageString } from '@/utils/browserStorage'
import { LOCAL_ISSUE_TYPE } from '~/shared/localTickets'

const props = withDefaults(defineProps<{
  open: boolean
  tickets: JiraTicket[]
  initialIssueType?: JiraCreateIssueType
  initialParentKey?: string | null
  issueTypeLocked?: boolean
  parentLocked?: boolean
}>(), {
  initialIssueType: 'Task',
  initialParentKey: null,
  issueTypeLocked: false,
  parentLocked: false,
})

const emit = defineEmits<{
  close: []
  created: [key: string, keepOpen: boolean]
}>()

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
const assigneeFieldRef = ref<InstanceType<typeof CreateTicketAssigneeField> | null>(null)
const parentPickerRef = ref<InstanceType<typeof CreateTicketParentPicker> | null>(null)
const priorityFieldRef = ref<InstanceType<typeof CreateTicketPriorityField> | null>(null)
const teamSelectorRef = ref<InstanceType<typeof CreateTicketTeamSelector> | null>(null)
const LAST_CREATED_SPACE_KEY = 'jira2.last-created-space-key'
const lastCreatedSpaceKey = ref<string | null>(readLocalStorageString(LAST_CREATED_SPACE_KEY))

const {
  activeIssueType,
  createObjectTypeLabel,
  createSpaceOptions,
  createSubtypeLabel,
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
  if (isLocalSpace.value) {
    return [LOCAL_ISSUE_TYPE]
  }

  if (effectiveParentKey.value) {
    return createIssueTypesQuery.data.value?.map(issueType => issueType.name) ?? []
  }

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

function closeModal() {
  if (isCreatePending.value)
    return
  emit('close')
}

function finishSuccessfulCreate(key: string) {
  emit('created', key, createMore.value)
  if (createMore.value) {
    // resetAfterSuccessfulCreate is provided by form sync below; submit callbacks are wired before that composable.
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

function showAttachmentNotice() {
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
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-3 py-[9vh] backdrop-blur-sm"
        @click.self="closeModal"
      >
        <div
          class="w-full max-w-[42rem] overflow-hidden rounded-lg border border-white/[0.08] bg-surface-1 shadow-xl shadow-black/40"
          role="dialog"
          aria-modal="true"
          aria-label="Create issue"
          @keydown="handleComposerKeydown"
        >
          <CreateTicketModalHeader
            :create-object-type-label="createObjectTypeLabel"
            :create-subtype-label="createSubtypeLabel"
            :is-create-pending="isCreatePending"
            :selected-space-name="getSelectedSpaceName()"
            @close="closeModal"
          />

          <div class="max-h-[68vh] space-y-4 overflow-y-auto px-4 py-4">
            <CreateTicketPrimaryFields
              :fields="primaryFields"
              :get-create-field-error="getCreateFieldError"
              :get-create-field-options="getCreateFieldOptions"
              :get-input-value="getInputValue"
              :get-text-value="getTextValue"
              :is-create-field-loading="isCreateFieldLoading"
              :is-create-pending="isCreatePending"
              :update-field-value="updateFieldValue"
            />

            <div class="grid gap-3 border-t border-white/[0.06] pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <CreateTicketTeamSelector
                ref="teamSelectorRef"
                :effective-space-key="effectiveSpaceKey"
                :is-create-pending="isCreatePending"
                :is-space-locked="isSpaceLocked"
                :selected-space-name="getSelectedSpaceName()"
                :spaces="createSpaceOptions"
                @update:space-key="selectedSpaceKey = $event"
              />

              <CreateTicketSubtypeSelector
                v-model:selected-issue-type="selectedIssueType"
                :create-issue-types-error="createIssueTypesError"
                :effective-parent-key="effectiveParentKey"
                :get-create-issue-type-label="getCreateIssueTypeLabel"
                :get-issue-type-badge-class="getIssueTypeBadgeClass"
                :is-create-pending="isCreatePending"
                :is-issue-type-locked="issueTypeLocked"
                :is-loading-issue-types="createIssueTypesQuery.isLoading.value"
                :is-local-space="isLocalSpace"
                :issue-type-options="issueTypeOptions"
              />
            </div>

            <CreateTicketParentPicker
              ref="parentPickerRef"
              :effective-parent-key="effectiveParentKey"
              :filtered-label="supportedParentDisplayLabel"
              :is-create-pending="isCreatePending"
              :parent-locked="parentLocked"
              :selected-parent-is-project="selectedParentIsProject"
              :supported-parent-display-label="supportedParentDisplayLabel"
              :supported-parent-tickets="supportedParentTickets"
              :supported-parent-type="supportedParentType"
              @update:parent-key="parentKey = $event"
            />

            <div class="space-y-4">
              <div class="flex flex-wrap items-start gap-3 border-t border-white/[0.06] pt-4">
                <CreateTicketPriorityField
                  ref="priorityFieldRef"
                  :field-error="getCreateFieldError('priority')"
                  :is-create-pending="isCreatePending"
                  :is-field-loading="isCreateFieldLoading('priority')"
                  :options="getCreateFieldOptions('priority')"
                  :priority-name="getSelectedPriorityName()"
                  :priority-value="getTextValue('priority')"
                  @update:priority="updateFieldValue('priority', $event)"
                />

                <CreateTicketAssigneeField
                  ref="assigneeFieldRef"
                  :assignee-value="getTextValue('assignee')"
                  :create-assignable-options="createAssignableOptions"
                  :field-error="getCreateFieldError('assignee')"
                  :is-create-pending="isCreatePending"
                  :is-field-loading="isCreateFieldLoading('assignee')"
                  :is-local-space="isLocalSpace"
                  :local-assignee-error="jiraMeQuery.isError.value"
                  :local-assignee-loading="jiraMeQuery.isLoading.value || jiraMeQuery.isFetching.value"
                  :local-assignee-name="jiraMeQuery.data.value?.displayName ?? null"
                  @retry-local-assignee="jiraMeQuery.refetch()"
                  @update-assignee="updateFieldValue('assignee', $event)"
                />

                <CreateTicketDueDateField
                  :due-date-value="getTextValue('duedate')"
                  :is-create-pending="isCreatePending"
                  @update:due-date="updateFieldValue('duedate', $event)"
                />
              </div>
            </div>

            <CreateTicketNotices
              :attachment-notice="attachmentNotice"
              :submit-error="submitError"
            />
          </div>

          <CreateTicketModalFooter
            v-model:create-more="createMore"
            :can-submit="canSubmit"
            :is-create-pending="isCreatePending"
            :is-local-space="isLocalSpace"
            @attachment="showAttachmentNotice"
            @close="closeModal"
            @submit="submit"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

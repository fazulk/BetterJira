import { updateTicketAssignee } from '@/api/jira'
import { updateLocalTicketAssignee } from '@/api/localTickets'
import { useTicketFieldMutation } from '@/composables/useTicketFieldMutation'
import { isLocalTicketKey } from '~/shared/localTickets'

export function useUpdateTicketAssignee() {
  return useTicketFieldMutation({
    // accountId identifies the Jira user (null unassigns); local tickets are keyed by name.
    mutationFn: ({ key, accountId, assigneeName }: { key: string, assigneeName: string | null, accountId?: string | null }) =>
      isLocalTicketKey(key)
        ? updateLocalTicketAssignee(key, assigneeName)
        : updateTicketAssignee(key, accountId ?? null),
    optimistic: (base, { accountId, assigneeName }) => ({
      ...base,
      assignee: assigneeName ?? 'Unassigned',
      assigneeAccountId: accountId ?? undefined,
    }),
  })
}

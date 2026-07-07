import { updateTicketLabels } from '@/api/jira'
import { updateLocalTicketLabels } from '@/api/localTickets'
import { useTicketFieldMutation } from '@/composables/useTicketFieldMutation'
import { isLocalTicketKey } from '~/shared/localTickets'

export function useUpdateTicketLabels() {
  return useTicketFieldMutation({
    mutationFn: ({ key, labels }: { key: string, labels: string[] }) =>
      isLocalTicketKey(key) ? updateLocalTicketLabels(key, labels) : updateTicketLabels(key, labels),
  })
}

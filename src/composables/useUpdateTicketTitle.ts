import { updateTicketTitle } from '@/api/jira'
import { updateLocalTicketTitle } from '@/api/localTickets'
import { useTicketFieldMutation } from '@/composables/useTicketFieldMutation'
import { isLocalTicketKey } from '~/shared/localTickets'

export function useUpdateTicketTitle() {
  return useTicketFieldMutation({
    mutationFn: ({ key, title }: { key: string, title: string }) =>
      isLocalTicketKey(key) ? updateLocalTicketTitle(key, title) : updateTicketTitle(key, title),
    optimistic: (base, { title }) => ({ ...base, summary: title.trim() }),
  })
}

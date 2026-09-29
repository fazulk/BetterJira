import type { JiraTicket } from '@/types/jira'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { deleteTicketAttachment } from '@/api/jira'
import { ticketQueryKey } from '@/composables/queryKeys'

export function useDeleteTicketAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ key, attachmentId }: { key: string, attachmentId: string }) => deleteTicketAttachment(key, attachmentId),
    onSuccess: (_result, { key, attachmentId }) => {
      const previousTicket = queryClient.getQueryData<JiraTicket>(ticketQueryKey(key))
      if (!previousTicket)
        return

      queryClient.setQueryData<JiraTicket>(ticketQueryKey(key), {
        ...previousTicket,
        attachments: previousTicket.attachments?.filter(attachment => attachment.id !== attachmentId),
      })
    },
  })
}

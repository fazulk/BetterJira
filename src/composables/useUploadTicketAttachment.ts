import type { JiraAttachment, JiraTicket } from '@/types/jira'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { uploadTicketAttachment } from '@/api/jira'
import { ticketQueryKey } from '@/composables/queryKeys'

function mergeAttachment(attachments: JiraAttachment[] | undefined, attachment: JiraAttachment): JiraAttachment[] {
  const existingAttachments = attachments ?? []
  if (existingAttachments.some(candidate => candidate.id === attachment.id)) {
    return existingAttachments.map(candidate => candidate.id === attachment.id ? attachment : candidate)
  }

  return [...existingAttachments, attachment]
}

export function useUploadTicketAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ key, file }: { key: string, file: File }) => uploadTicketAttachment(key, file),
    onSuccess: (attachment, { key }) => {
      const previousTicket = queryClient.getQueryData<JiraTicket>(ticketQueryKey(key))
      if (!previousTicket)
        return

      queryClient.setQueryData<JiraTicket>(ticketQueryKey(key), {
        ...previousTicket,
        attachments: mergeAttachment(previousTicket.attachments, attachment),
      })
    },
  })
}

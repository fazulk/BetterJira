import type { JiraAdfDocument } from '@/types/jira'
import { updateTicketDescription } from '@/api/jira'
import { updateLocalTicketDescription } from '@/api/localTickets'
import { useTicketFieldMutation } from '@/composables/useTicketFieldMutation'
import { adfToPlainText } from '~/shared/jiraAdf'
import { isLocalTicketKey } from '~/shared/localTickets'

export function useUpdateTicketDescription() {
  return useTicketFieldMutation({
    mutationFn: ({ key, descriptionAdf }: { key: string, descriptionAdf: JiraAdfDocument | null }) =>
      isLocalTicketKey(key)
        ? updateLocalTicketDescription(key, descriptionAdf)
        : updateTicketDescription(key, descriptionAdf),
    optimistic: (base, { descriptionAdf }) => ({
      ...base,
      descriptionAdf: descriptionAdf ?? undefined,
      description: adfToPlainText(descriptionAdf),
    }),
    optimisticUpdatesList: false,
  })
}

import type { JiraAdfDocument } from '@/types/jira'
import { updateTicketAdditionalBugDetails, updateTicketDescription } from '@/api/jira'
import { updateLocalTicketDescription } from '@/api/localTickets'
import { useTicketFieldMutation } from '@/composables/useTicketFieldMutation'
import { adfToPlainText } from '~/shared/jiraAdf'
import { isLocalTicketKey } from '~/shared/localTickets'

export function useUpdateTicketDescription(field: 'description' | 'additionalBugDetails' = 'description') {
  return useTicketFieldMutation({
    mutationFn: ({ key, descriptionAdf }: { key: string, descriptionAdf: JiraAdfDocument | null }) =>
      field === 'additionalBugDetails'
        ? updateTicketAdditionalBugDetails(key, descriptionAdf)
        : isLocalTicketKey(key)
          ? updateLocalTicketDescription(key, descriptionAdf)
          : updateTicketDescription(key, descriptionAdf),
    optimistic: (base, { descriptionAdf }) => field === 'additionalBugDetails'
      ? ({
          ...base,
          additionalBugDetailsAdf: descriptionAdf ?? undefined,
          additionalBugDetails: adfToPlainText(descriptionAdf),
        })
      : ({
          ...base,
          descriptionAdf: descriptionAdf ?? undefined,
          description: adfToPlainText(descriptionAdf),
        }),
    optimisticUpdatesList: false,
  })
}

import { updateTicketStoryPoints } from '@/api/jira'
import { useTicketFieldMutation } from '@/composables/useTicketFieldMutation'

export function useUpdateTicketStoryPoints() {
  return useTicketFieldMutation({
    mutationFn: ({ key, storyPoints }: { key: string, storyPoints: number | null }) =>
      updateTicketStoryPoints(key, storyPoints),
    optimistic: (base, { storyPoints }) => ({
      ...base,
      storyPoints: storyPoints ?? undefined,
    }),
  })
}

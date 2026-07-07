import type { JiraTeamRef } from '@/types/jira'
import { updateTicketTeam } from '@/api/jira'
import { useTicketFieldMutation } from '@/composables/useTicketFieldMutation'

export function useUpdateTicketTeam() {
  return useTicketFieldMutation({
    mutationFn: ({ key, team }: { key: string, team: JiraTeamRef | null }) =>
      updateTicketTeam(key, team?.id ?? null),
    optimistic: (base, { team }) => ({ ...base, team: team ?? undefined }),
  })
}

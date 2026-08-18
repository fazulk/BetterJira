import type { Cycle } from '~/shared/cycles'
import { updateTicketSprint } from '@/api/cycles'
import { useTicketFieldMutation } from '@/composables/useTicketFieldMutation'

export function useUpdateTicketSprint() {
  return useTicketFieldMutation({
    mutationFn: ({ key, sprintId }: { key: string, sprint: Cycle | null, sprintId: string | null }) =>
      updateTicketSprint(key, sprintId),
    optimistic: (base, { sprint }) => ({
      ...base,
      inCurrentSprint: sprint?.state === 'active',
      sprints: sprint
        ? [
            ...(base.sprints ?? []).filter(existing => existing.id !== sprint.id),
            { id: sprint.id, name: sprint.name },
          ]
        : base.sprints,
    }),
  })
}

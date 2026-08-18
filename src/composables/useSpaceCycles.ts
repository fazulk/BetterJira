import type { ComputedRef } from 'vue'
import type { Cycle, SpaceCyclesPayload } from '~/shared/cycles'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import {
  completeSpaceCycle,
  createSpaceCycle,
  fetchSpaceCycles,
  setSpaceCycleBoard,
  startSpaceCycle,
} from '@/api/cycles'
import { TICKETS_QUERY_KEY } from '@/composables/queryKeys'
import { APP_SETTINGS_QUERY_KEY } from '@/composables/useSpaceSettings'
import { emptySpaceCycles } from '~/shared/cycles'
import { LOCAL_SPACE_KEY } from '~/shared/localTickets'

export function spaceCyclesQueryKey(spaceKey: string | null) {
  return ['space-cycles', spaceKey] as const
}

export function useSpaceCycles(spaceKey: ComputedRef<string | null>) {
  const queryClient = useQueryClient()
  const enabled = computed(() => Boolean(spaceKey.value) && spaceKey.value !== LOCAL_SPACE_KEY)

  const query = useQuery({
    queryKey: computed(() => spaceCyclesQueryKey(spaceKey.value)),
    queryFn: () => fetchSpaceCycles(spaceKey.value as string),
    enabled,
    staleTime: 30_000,
  })

  const payload = computed<SpaceCyclesPayload>(() => (
    query.data.value ?? emptySpaceCycles(spaceKey.value ?? '')
  ))

  async function applyPayload(nextPayload: SpaceCyclesPayload): Promise<SpaceCyclesPayload> {
    queryClient.setQueryData(spaceCyclesQueryKey(nextPayload.spaceKey), nextPayload)
    await queryClient.invalidateQueries({ queryKey: TICKETS_QUERY_KEY })
    await queryClient.invalidateQueries({ queryKey: APP_SETTINGS_QUERY_KEY })
    return nextPayload
  }

  const createMutation = useMutation({
    mutationFn: (name?: string) => createSpaceCycle(spaceKey.value as string, name),
    onSuccess: applyPayload,
  })
  const startMutation = useMutation({
    mutationFn: (sprintId: string) => startSpaceCycle(spaceKey.value as string, sprintId),
    onSuccess: applyPayload,
  })
  const completeMutation = useMutation({
    mutationFn: (sprintId: string) => completeSpaceCycle(spaceKey.value as string, sprintId),
    onSuccess: applyPayload,
  })
  const setBoardMutation = useMutation({
    mutationFn: (boardId: number) => setSpaceCycleBoard(spaceKey.value as string, boardId),
    onSuccess: applyPayload,
  })

  function cycleById(cycleId: string | null | undefined): Cycle | null {
    if (!cycleId) {
      return null
    }
    return payload.value.cycles.find(cycle => cycle.id === cycleId) ?? null
  }

  return {
    query,
    payload,
    current: computed(() => payload.value.current),
    upcoming: computed(() => payload.value.upcoming),
    previous: computed(() => payload.value.previous),
    boards: computed(() => payload.value.boards),
    board: computed(() => payload.value.board),
    needsBoardPicker: computed(() => payload.value.needsBoardPicker),
    isLoading: computed(() => query.isLoading.value),
    errorMessage: computed(() => query.error.value instanceof Error ? query.error.value.message : null),
    isMutating: computed(() => (
      createMutation.isPending.value
      || startMutation.isPending.value
      || completeMutation.isPending.value
      || setBoardMutation.isPending.value
    )),
    cycleById,
    createCycle: (name?: string) => createMutation.mutateAsync(name),
    startCycle: (sprintId: string) => startMutation.mutateAsync(sprintId),
    completeCycle: (sprintId: string) => completeMutation.mutateAsync(sprintId),
    setBoard: (boardId: number) => setBoardMutation.mutateAsync(boardId),
  }
}

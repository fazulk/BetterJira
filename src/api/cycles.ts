import type { SpaceCyclesPayload } from '~/shared/cycles'
import type { JiraTicket } from '@/types/jira'
import { apiFetch } from '@/api/http'

export function fetchSpaceCycles(spaceKey: string): Promise<SpaceCyclesPayload> {
  return apiFetch(['spaces', spaceKey, 'cycles'], 'Failed to fetch cycles')
}

export function setSpaceCycleBoard(spaceKey: string, boardId: number): Promise<SpaceCyclesPayload> {
  return apiFetch(['spaces', spaceKey, 'board'], 'Failed to set cycle board', {
    method: 'PUT',
    json: { boardId },
  })
}

export function createSpaceCycle(spaceKey: string, name?: string): Promise<SpaceCyclesPayload> {
  return apiFetch(['spaces', spaceKey, 'cycles'], 'Failed to create cycle', {
    method: 'POST',
    json: name ? { name } : {},
  })
}

export function startSpaceCycle(spaceKey: string, sprintId: string): Promise<SpaceCyclesPayload> {
  return apiFetch(['spaces', spaceKey, 'cycles', sprintId, 'start'], 'Failed to start cycle', {
    method: 'POST',
  })
}

export function completeSpaceCycle(spaceKey: string, sprintId: string): Promise<SpaceCyclesPayload> {
  return apiFetch(['spaces', spaceKey, 'cycles', sprintId, 'complete'], 'Failed to complete cycle', {
    method: 'POST',
  })
}

export function updateTicketSprint(key: string, sprintId: string | null): Promise<JiraTicket> {
  return apiFetch(['tickets', key, 'sprint'], 'Failed to update cycle', {
    method: 'PUT',
    json: { sprintId },
  })
}

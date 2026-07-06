import type { JiraAdfDocument } from '../shared/jiraAdf'
import type { JiraTicketLike, LocalStatusId, LocalTicketsFile, StoredLocalTicket } from '../shared/localTickets'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {

  normalizeDescriptionAdf,
  normalizeLabels,
  normalizeLocalStatusId,
  normalizeLocalTicketKey,
  normalizePriorityInput,

  storedLocalToJiraShape,
} from '../shared/localTickets'
import { isRecord } from '../shared/typeGuards'
import { getAppDataDir } from './runtimePaths'

const localTicketsFilePath = resolve(getAppDataDir(), 'local-tickets.json')

function ensureDataDirectoryExists(): void {
  mkdirSync(dirname(localTicketsFilePath), { recursive: true })
}

function defaultFileState(): LocalTicketsFile {
  return { nextId: 1, tickets: [] }
}

function normalizeStoredTicket(value: unknown): StoredLocalTicket | null {
  if (!isRecord(value))
    return null
  const record = value
  const numericId = typeof record.numericId === 'number' && Number.isInteger(record.numericId) && record.numericId > 0
    ? record.numericId
    : null
  if (!numericId)
    return null

  const rawSummary = typeof record.summary === 'string' ? record.summary.trim() : ''
  const summary = rawSummary || '(Untitled)'
  const statusId = normalizeLocalStatusId(record.statusId) ?? 'todo'
  const priority = normalizePriorityInput(record.priority)
  const assigneeName = typeof record.assigneeName === 'string' && record.assigneeName.trim()
    ? record.assigneeName.trim()
    : null
  const parentKey = typeof record.parentKey === 'string' ? normalizeLocalTicketKey(record.parentKey) : null
  const createdAt = typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString()
  const updatedAt = typeof record.updatedAt === 'string' ? record.updatedAt : createdAt
  const dueDate = typeof record.dueDate === 'string' && record.dueDate ? record.dueDate : null
  const completedAt = typeof record.completedAt === 'string' && record.completedAt ? record.completedAt : null
  const descriptionAdf = normalizeDescriptionAdf(record.descriptionAdf)
  const labels = normalizeLabels(record.labels)

  return {
    numericId,
    summary: summary.slice(0, 255),
    descriptionAdf,
    statusId,
    priority,
    assigneeName,
    labels,
    parentKey,
    createdAt,
    updatedAt,
    dueDate,
    completedAt,
  }
}

function readFileState(): LocalTicketsFile {
  if (!existsSync(localTicketsFilePath)) {
    return defaultFileState()
  }

  try {
    const raw = readFileSync(localTicketsFilePath, 'utf8')
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) {
      return defaultFileState()
    }

    const record = parsed
    const nextId = typeof record.nextId === 'number' && Number.isInteger(record.nextId) && record.nextId >= 1
      ? record.nextId
      : 1

    const ticketsRaw = Array.isArray(record.tickets) ? record.tickets : []
    const tickets: StoredLocalTicket[] = []
    for (const entry of ticketsRaw) {
      const normalized = normalizeStoredTicket(entry)
      if (normalized) {
        tickets.push(normalized)
      }
    }

    tickets.sort((left, right) => left.numericId - right.numericId)

    const maxId = tickets.length > 0 ? Math.max(...tickets.map(t => t.numericId)) : 0
    return { nextId: Math.max(nextId, maxId + 1), tickets }
  }
  catch (error) {
    console.error('Failed to read local tickets file:', error)
    return defaultFileState()
  }
}

function writeFileState(state: LocalTicketsFile): void {
  ensureDataDirectoryExists()
  writeFileSync(localTicketsFilePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

function ticketByNumericId(tickets: StoredLocalTicket[], numericId: number): StoredLocalTicket | undefined {
  return tickets.find(t => t.numericId === numericId)
}

function ticketByKey(tickets: StoredLocalTicket[], key: string): StoredLocalTicket | undefined {
  const normalized = normalizeLocalTicketKey(key)
  if (!normalized)
    return undefined
  const match = /^LOCAL-(\d+)$/.exec(normalized)
  if (!match?.[1])
    return undefined
  const id = Number.parseInt(match[1], 10)
  return ticketByNumericId(tickets, id)
}

function parentSummaryFor(tickets: StoredLocalTicket[], parentKey: string | null): string | null {
  if (!parentKey)
    return null
  const parent = ticketByKey(tickets, parentKey)
  return parent?.summary ?? null
}

export function listLocalTicketsAsJiraShape(): JiraTicketLike[] {
  const state = readFileState()
  return state.tickets.map(stored =>
    storedLocalToJiraShape(stored, parentSummaryFor(state.tickets, stored.parentKey)),
  )
}

export function getLocalTicketAsJiraShape(key: string): JiraTicketLike | null {
  const state = readFileState()
  const stored = ticketByKey(state.tickets, key)
  if (!stored)
    return null
  return storedLocalToJiraShape(stored, parentSummaryFor(state.tickets, stored.parentKey))
}

export interface CreateLocalTicketInput {
  summary: string
  descriptionAdf?: JiraAdfDocument | null
  priority?: string
  assigneeName?: string | null
  statusId?: LocalStatusId
  parentKey?: string | null
  dueDate?: string | null
}

export function createLocalTicket(input: CreateLocalTicketInput): JiraTicketLike {
  const state = readFileState()
  const summary = typeof input.summary === 'string' ? input.summary.trim() : ''
  if (!summary) {
    throw new Error('Summary is required.')
  }

  const parentKey = input.parentKey ? normalizeLocalTicketKey(input.parentKey) : null
  if (input.parentKey && !parentKey) {
    throw new Error('parentKey must be a valid LOCAL-* key.')
  }

  if (parentKey && !ticketByKey(state.tickets, parentKey)) {
    throw new Error('Parent ticket not found.')
  }

  const statusId = input.statusId ? normalizeLocalStatusId(input.statusId) ?? 'todo' : 'todo'
  const now = new Date().toISOString()
  const completedAt = statusId === 'done' ? now : null

  const numericId = state.nextId
  const stored: StoredLocalTicket = {
    numericId,
    summary: summary.slice(0, 255),
    descriptionAdf: normalizeDescriptionAdf(input.descriptionAdf),
    statusId,
    priority: normalizePriorityInput(input.priority),
    assigneeName: typeof input.assigneeName === 'string' && input.assigneeName.trim()
      ? input.assigneeName.trim()
      : null,
    labels: [],
    parentKey,
    createdAt: now,
    updatedAt: now,
    dueDate: typeof input.dueDate === 'string' && input.dueDate ? input.dueDate : null,
    completedAt,
  }

  state.tickets.push(stored)
  state.nextId = numericId + 1
  writeFileState(state)

  return storedLocalToJiraShape(stored, parentSummaryFor(state.tickets, stored.parentKey))
}

function updateStored(
  key: string,
  updater: (stored: StoredLocalTicket, tickets: StoredLocalTicket[]) => StoredLocalTicket,
): JiraTicketLike {
  const state = readFileState()
  const index = state.tickets.findIndex(t => normalizeLocalTicketKey(key) === `LOCAL-${t.numericId}`)
  if (index === -1) {
    throw new Error('Ticket not found.')
  }

  const current = state.tickets[index]
  if (!current) {
    throw new Error('Ticket not found.')
  }

  const next = updater(current, state.tickets)
  state.tickets[index] = next
  writeFileState(state)

  return storedLocalToJiraShape(next, parentSummaryFor(state.tickets, next.parentKey))
}

export function updateLocalTicketTitle(key: string, title: string): JiraTicketLike {
  const trimmed = typeof title === 'string' ? title.trim() : ''
  if (!trimmed) {
    throw new Error('Title cannot be empty.')
  }

  return updateStored(key, stored => ({
    ...stored,
    summary: trimmed.slice(0, 255),
    updatedAt: new Date().toISOString(),
  }))
}

export function updateLocalTicketDescription(key: string, descriptionAdf: unknown): JiraTicketLike {
  return updateStored(key, stored => ({
    ...stored,
    descriptionAdf: normalizeDescriptionAdf(descriptionAdf),
    updatedAt: new Date().toISOString(),
  }))
}

export function updateLocalTicketStatus(key: string, transitionId: string): JiraTicketLike {
  const nextStatus = normalizeLocalStatusId(transitionId)
  if (!nextStatus) {
    throw new Error('Invalid status transition.')
  }

  return updateStored(key, (stored) => {
    const now = new Date().toISOString()
    const completedAt = nextStatus === 'done' ? (stored.completedAt ?? now) : null
    return {
      ...stored,
      statusId: nextStatus,
      completedAt,
      updatedAt: now,
    }
  })
}

export function updateLocalTicketPriority(key: string, priority: string): JiraTicketLike {
  return updateStored(key, stored => ({
    ...stored,
    priority: normalizePriorityInput(priority),
    updatedAt: new Date().toISOString(),
  }))
}

export function updateLocalTicketAssignee(key: string, assigneeName: string | null): JiraTicketLike {
  const normalized = typeof assigneeName === 'string' && assigneeName.trim()
    ? assigneeName.trim()
    : null

  return updateStored(key, stored => ({
    ...stored,
    assigneeName: normalized,
    updatedAt: new Date().toISOString(),
  }))
}

export function updateLocalTicketLabels(key: string, labels: string[]): JiraTicketLike {
  return updateStored(key, stored => ({
    ...stored,
    labels: normalizeLabels(labels),
    updatedAt: new Date().toISOString(),
  }))
}

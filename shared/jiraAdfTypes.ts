import { isRecord } from './typeGuards'

export interface JiraAdfMark {
  type?: string
  attrs?: Record<string, unknown>
}

export interface JiraAdfNode {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: JiraAdfMark[]
  content?: JiraAdfNode[]
}

export interface JiraAdfDocument extends JiraAdfNode {
  type: 'doc'
  version: number
  content: JiraAdfNode[]
}

function isJiraAdfMark(value: unknown): value is JiraAdfMark {
  if (!isRecord(value))
    return false
  if (value.type !== undefined && typeof value.type !== 'string')
    return false
  if (value.attrs !== undefined && !isRecord(value.attrs))
    return false
  return true
}

export function isJiraAdfNode(value: unknown): value is JiraAdfNode {
  if (!isRecord(value))
    return false
  if (value.type !== undefined && typeof value.type !== 'string')
    return false
  if (value.text !== undefined && typeof value.text !== 'string')
    return false
  if (value.attrs !== undefined && !isRecord(value.attrs))
    return false
  if (value.marks !== undefined && (!Array.isArray(value.marks) || !value.marks.every(isJiraAdfMark)))
    return false
  if (value.content !== undefined && (!Array.isArray(value.content) || !value.content.every(isJiraAdfNode)))
    return false
  return true
}

export function isJiraAdfDocument(value: unknown): value is JiraAdfDocument {
  if (!isRecord(value))
    return false
  return isJiraAdfNode(value) && value.type === 'doc' && typeof value.version === 'number' && Array.isArray(value.content)
}

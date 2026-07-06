import type { JiraAdfDocument, JiraAdfMark, JiraAdfNode } from './jiraAdfTypes'
import { plainTextToAdf } from './jiraAdfBuild'
import { isJiraAdfDocument } from './jiraAdfTypes'
import { isRecord } from './typeGuards'

const NODE_TYPES_WITH_NORMALIZED_ATTRS = new Set([
  'paragraph',
  'heading',
  'orderedList',
  'bulletList',
  'listItem',
  'blockquote',
  'codeBlock',
  'media',
  'mediaSingle',
  'mediaGroup',
  'mention',
  'hardBreak',
  'text',
])

const MARK_TYPES_WITH_NORMALIZED_ATTRS = new Set([
  'strong',
  'em',
  'underline',
  'strike',
  'code',
  'link',
])

function normalizeMark(mark: JiraAdfMark): JiraAdfMark | null {
  if (typeof mark.type !== 'string' || !mark.type)
    return null

  if (mark.type === 'link') {
    const href = mark.attrs?.href
    if (typeof href === 'string' && href) {
      return {
        type: 'link',
        attrs: {
          href,
        },
      }
    }
  }

  if (MARK_TYPES_WITH_NORMALIZED_ATTRS.has(mark.type))
    return { type: mark.type }

  const normalizedAttrs = normalizeUnsupportedNodeAttrs(mark.attrs)
  if (normalizedAttrs) {
    return {
      type: mark.type,
      attrs: normalizedAttrs,
    }
  }

  return { type: mark.type }
}

function normalizeMarks(marks: JiraAdfMark[] | undefined): JiraAdfMark[] | undefined {
  if (!marks?.length)
    return undefined

  const normalizedMarks = marks
    .map(normalizeMark)
    .filter((mark): mark is JiraAdfMark => mark !== null)

  return normalizedMarks.length ? normalizedMarks : undefined
}

function normalizePrimitiveAttrs(attrs: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!attrs)
    return undefined

  const normalizedAttrs: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'src')
      continue
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      normalizedAttrs[key] = value
    }
  }

  return Object.keys(normalizedAttrs).length ? normalizedAttrs : undefined
}

function copySerializableAttrValue(value: unknown): unknown {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null)
    return value

  if (Array.isArray(value))
    return value.map(copySerializableAttrValue).filter(item => item !== undefined)

  if (isRecord(value)) {
    const copiedValue: Record<string, unknown> = {}
    for (const [key, childValue] of Object.entries(value)) {
      const copiedChildValue = copySerializableAttrValue(childValue)
      if (copiedChildValue !== undefined)
        copiedValue[key] = copiedChildValue
    }
    return copiedValue
  }

  return undefined
}

function normalizeUnsupportedNodeAttrs(attrs: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!attrs)
    return undefined

  const normalizedAttrs: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'src')
      continue
    const copiedValue = copySerializableAttrValue(value)
    if (copiedValue !== undefined)
      normalizedAttrs[key] = copiedValue
  }

  return Object.keys(normalizedAttrs).length ? normalizedAttrs : undefined
}

function normalizeMentionAttrs(attrs: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!attrs)
    return undefined

  const normalizedAttrs: Record<string, unknown> = {}
  for (const key of ['accessLevel', 'id', 'text', 'userType']) {
    const value = attrs[key]
    if (typeof value === 'string' && value.length > 0) {
      normalizedAttrs[key] = value
    }
  }

  return Object.keys(normalizedAttrs).length ? normalizedAttrs : undefined
}

function normalizeNodeAttrs(node: JiraAdfNode): Record<string, unknown> | undefined {
  if (node.type === 'heading') {
    const level = node.attrs?.level
    if (typeof level === 'number' && Number.isInteger(level) && level >= 1 && level <= 6) {
      return { level }
    }
    return { level: 1 }
  }

  if (node.type === 'orderedList') {
    const order = node.attrs?.order
    if (typeof order === 'number' && Number.isFinite(order) && order > 0) {
      return { order }
    }
    return undefined
  }

  if (node.type === 'media' || node.type === 'mediaSingle' || node.type === 'mediaGroup') {
    return normalizePrimitiveAttrs(node.attrs)
  }

  if (node.type === 'mention') {
    return normalizeMentionAttrs(node.attrs)
  }

  if (typeof node.type === 'string' && !NODE_TYPES_WITH_NORMALIZED_ATTRS.has(node.type)) {
    return normalizeUnsupportedNodeAttrs(node.attrs)
  }

  return undefined
}

function normalizeNode(node: JiraAdfNode): JiraAdfNode | null {
  const type = typeof node.type === 'string' ? node.type : ''
  if (!type)
    return null

  if (type === 'hardBreak') {
    return { type: 'hardBreak' }
  }

  if (type === 'mention') {
    const normalizedAttrs = normalizeNodeAttrs(node)
    const id = normalizedAttrs?.id
    if (typeof id !== 'string' || !id)
      return null

    return {
      type: 'mention',
      attrs: normalizedAttrs,
    }
  }

  if (type === 'text') {
    const text = typeof node.text === 'string' ? node.text : ''
    if (!text.length)
      return null

    const normalizedTextNode: JiraAdfNode = {
      type: 'text',
      text,
    }

    const normalizedMarks = normalizeMarks(node.marks)
    if (normalizedMarks) {
      normalizedTextNode.marks = normalizedMarks
    }

    return normalizedTextNode
  }

  const normalizedContent = normalizeNodes(node.content ?? [])
  const normalizedNode: JiraAdfNode = { type }

  const normalizedAttrs = normalizeNodeAttrs(node)
  if (normalizedAttrs) {
    normalizedNode.attrs = normalizedAttrs
  }

  if (normalizedContent.length) {
    normalizedNode.content = normalizedContent
  }

  if (
    type === 'paragraph'
    || type === 'heading'
    || type === 'listItem'
    || type === 'blockquote'
    || type === 'codeBlock'
  ) {
    if (!normalizedNode.content?.length) {
      if (type === 'paragraph') {
        normalizedNode.content = []
        return normalizedNode
      }

      return null
    }
  }

  if ((type === 'bulletList' || type === 'orderedList' || type === 'mediaSingle' || type === 'mediaGroup') && !normalizedNode.content?.length) {
    return null
  }

  if (type === 'media') {
    const mediaType = normalizedNode.attrs?.type
    if (mediaType === 'external') {
      const mediaUrl = normalizedNode.attrs?.url
      if (typeof mediaUrl !== 'string' || !mediaUrl) {
        return null
      }
    }
    else {
      const mediaId = normalizedNode.attrs?.id
      if (typeof mediaId !== 'string' || !mediaId || typeof mediaType !== 'string' || !mediaType) {
        return null
      }
    }
  }

  return normalizedNode
}

function normalizeNodes(nodes: JiraAdfNode[]): JiraAdfNode[] {
  return nodes
    .map(normalizeNode)
    .filter((node): node is JiraAdfNode => node !== null)
}

function extractSingleParagraphTextBlob(doc: JiraAdfDocument): string | null {
  if (doc.content.length !== 1)
    return null

  const [firstNode] = doc.content
  if (firstNode?.type !== 'paragraph')
    return null

  const paragraphContent = firstNode.content ?? []
  if (!paragraphContent.every(node => node.type === 'text' && !node.marks?.length && typeof node.text === 'string')) {
    return null
  }

  return paragraphContent.map(node => node.text ?? '').join('')
}

export function normalizeAdf(doc: JiraAdfDocument | null): JiraAdfDocument | null {
  if (!doc || !isJiraAdfDocument(doc))
    return null

  const normalizedDoc: JiraAdfDocument = {
    type: 'doc',
    version: 1,
    content: normalizeNodes(doc.content),
  }

  if (!normalizedDoc.content.length) {
    return null
  }

  const textBlob = extractSingleParagraphTextBlob(normalizedDoc)
  if (textBlob && textBlob.includes('\n')) {
    return plainTextToAdf(textBlob.trimEnd())
  }

  return normalizedDoc
}

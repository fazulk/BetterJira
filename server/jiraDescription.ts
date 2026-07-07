import type { JiraAdfDocument, JiraAdfNode } from '../shared/jiraAdf'
import {
  adfToPlainText,
  isJiraAdfDocument,

  normalizeAdf,
  parseStringifiedAdf,
} from '../shared/jiraAdf'
import { isRecord } from '../shared/typeGuards'
import { ValidationError } from './errors'

export function extractDescription(desc: unknown, descriptionAdf?: JiraAdfDocument): string {
  if (descriptionAdf) {
    return adfToPlainText(descriptionAdf)
  }

  if (!desc)
    return ''
  if (typeof desc === 'string') {
    const parsedDescriptionAdf = parseStringifiedAdf(desc)
    if (parsedDescriptionAdf) {
      return extractRawAdfText(parsedDescriptionAdf)
    }

    return desc
  }
  if (isJiraAdfDocument(desc)) {
    return extractRawAdfText(desc)
  }
  return JSON.stringify(desc)
}

export function extractDescriptionAdf(desc: unknown): JiraAdfDocument | undefined {
  if (isJiraAdfDocument(desc)) {
    return normalizeAdf(desc) ?? undefined
  }

  if (typeof desc === 'string') {
    const parsedDescriptionAdf = parseStringifiedAdf(desc)
    return parsedDescriptionAdf ? normalizeAdf(parsedDescriptionAdf) ?? undefined : undefined
  }

  return undefined
}

function getRawAdfText(node: unknown): string {
  if (!isRecord(node))
    return ''

  const type = typeof node.type === 'string' ? node.type : ''
  const text = typeof node.text === 'string' ? node.text : ''
  const attrs = isRecord(node.attrs) ? node.attrs : null
  const content = Array.isArray(node.content) ? node.content : []

  if (type === 'text') {
    return text
  }

  if (type === 'mention') {
    const mentionText = typeof attrs?.text === 'string' ? attrs.text : text
    return mentionText
  }

  if (type === 'emoji') {
    const emojiText = typeof attrs?.text === 'string'
      ? attrs.text
      : typeof attrs?.shortName === 'string'
        ? attrs.shortName
        : text
    return emojiText
  }

  if (type === 'hardBreak') {
    return '\n'
  }

  if (type === 'paragraph' || type === 'heading' || type === 'blockquote') {
    return `${content.map(getRawAdfText).join('')}\n`
  }

  if (type === 'bulletList') {
    return content
      .map(listItem => `• ${getRawAdfText(listItem).trim()}\n`)
      .join('')
  }

  if (type === 'orderedList') {
    const start = typeof attrs?.order === 'number' && Number.isFinite(attrs.order) ? attrs.order : 1
    return content
      .map((listItem, index) => `${start + index}. ${getRawAdfText(listItem).trim()}\n`)
      .join('')
  }

  if (type === 'codeBlock') {
    return content.map(getRawAdfText).join('')
  }

  if (type === 'doc' || type === 'listItem' || content.length > 0) {
    return content.map(getRawAdfText).join('')
  }

  return ''
}

function extractRawAdfText(doc: JiraAdfDocument): string {
  return getRawAdfText(doc).trimEnd()
}

function jiraSafeMediaAttrs(node: JiraAdfNode): Record<string, unknown> | undefined {
  if (!node.attrs)
    return undefined

  if (node.type === 'media') {
    const attrs: Record<string, unknown> = {}
    const mediaType = node.attrs.type
    const allowedKeys = mediaType === 'external'
      ? ['type', 'url']
      : ['id', 'type', 'collection', 'occurrenceKey', 'alt', 'width', 'height']

    for (const key of allowedKeys) {
      const value = node.attrs[key]
      if (value === undefined || value === null)
        continue
      if (value === '' && !(node.type === 'media' && key === 'collection'))
        continue
      attrs[key] = value
    }

    if (mediaType !== 'external' && attrs.collection === undefined) {
      attrs.collection = ''
    }

    if (typeof attrs.id === 'string' && attrs.id.startsWith('pending:')) {
      throw new ValidationError('Image upload is still pending. Wait for it to finish before saving.')
    }

    return Object.keys(attrs).length ? attrs : undefined
  }

  if (node.type === 'mediaSingle') {
    const attrs: Record<string, unknown> = {}
    for (const key of ['layout', 'width', 'widthType']) {
      const value = node.attrs[key]
      if (value !== undefined && value !== null && value !== '') {
        attrs[key] = value
      }
    }

    return Object.keys(attrs).length ? attrs : undefined
  }

  if (node.type === 'mediaGroup') {
    return undefined
  }

  const attrs: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node.attrs)) {
    if (key === 'src' || key === 'uploadState' || key === 'uploadError' || key === 'clientId')
      continue
    attrs[key] = value
  }

  return Object.keys(attrs).length ? attrs : undefined
}

function stripEditorOnlyMediaAttrs(node: JiraAdfNode): JiraAdfNode {
  const nextNode: JiraAdfNode = {
    type: node.type,
  }

  if (node.text !== undefined) {
    nextNode.text = node.text
  }

  const attrs = jiraSafeMediaAttrs(node)
  if (attrs) {
    nextNode.attrs = attrs
  }

  if (node.marks?.length) {
    nextNode.marks = node.marks.map(mark => ({ ...mark }))
  }

  if (node.content?.length) {
    nextNode.content = node.content.map(stripEditorOnlyMediaAttrs)
  }

  return nextNode
}

export function prepareDescriptionForJira(descriptionAdf: JiraAdfDocument | null): JiraAdfDocument | null {
  const normalizedDescription = normalizeAdf(descriptionAdf)
  if (!normalizedDescription)
    return null

  return {
    type: 'doc',
    version: 1,
    content: normalizedDescription.content.map(stripEditorOnlyMediaAttrs),
  }
}

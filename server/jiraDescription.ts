import type { JiraAdfDocument } from '../shared/jiraAdf'
import {
  adfToPlainText,
  isJiraAdfDocument,

  normalizeAdf,
  parseStringifiedAdf,
} from '../shared/jiraAdf'
import { isRecord } from '../shared/typeGuards'

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

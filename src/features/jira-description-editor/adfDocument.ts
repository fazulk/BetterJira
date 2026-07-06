import type { JSONContent } from '@tiptap/core'
import type { JiraAdfDocument, JiraAdfMark, JiraAdfNode } from '@/types/jira'
import { isJiraAdfNode, isSupportedEditorAdfNodeShallow, normalizeAdf } from '~/shared/jiraAdf'
import { isRecord } from '~/shared/typeGuards'

const UNSUPPORTED_INLINE_NODE_TYPE = 'jiraUnsupportedInline'
const UNSUPPORTED_BLOCK_NODE_TYPE = 'jiraUnsupportedBlock'
const INLINE_PARENT_NODE_TYPES = new Set(['paragraph', 'heading'])

function toEditorMark(mark: JiraAdfMark): { type: string, attrs?: Record<string, unknown> } | null {
  if (typeof mark.type !== 'string' || !mark.type)
    return null

  if (mark.type === 'strong')
    return { type: 'bold' }
  if (mark.type === 'em')
    return { type: 'italic' }
  if (mark.type === 'link') {
    const href = mark.attrs?.href
    if (typeof href !== 'string' || !href)
      return null
    return { type: 'link', attrs: { href, title: href } }
  }

  return { type: mark.type }
}

function toAdfMark(mark: { type?: string, attrs?: Record<string, unknown> }): JiraAdfMark | null {
  if (typeof mark.type !== 'string' || !mark.type)
    return null

  if (mark.type === 'bold')
    return { type: 'strong' }
  if (mark.type === 'italic')
    return { type: 'em' }
  if (mark.type === 'link') {
    const href = mark.attrs?.href
    if (typeof href !== 'string' || !href)
      return null
    return { type: 'link', attrs: { href } }
  }
  if (mark.type === 'underline' || mark.type === 'strike' || mark.type === 'code') {
    return { type: mark.type }
  }

  return null
}

function copyAttrs(attrs: JSONContent['attrs']): Record<string, unknown> | undefined {
  if (!isRecord(attrs))
    return undefined
  return { ...attrs }
}

function copyAdfAttrs(nodeType: string, attrs: JSONContent['attrs']): Record<string, unknown> | undefined {
  const copiedAttrs = copyAttrs(attrs)
  if (!copiedAttrs)
    return undefined

  if (nodeType === 'media') {
    delete copiedAttrs.src
  }

  return Object.keys(copiedAttrs).length ? copiedAttrs : undefined
}

function copyAdfNode(node: JiraAdfNode): JiraAdfNode {
  const copiedNode: JiraAdfNode = {}

  if (typeof node.type === 'string')
    copiedNode.type = node.type
  if (typeof node.text === 'string')
    copiedNode.text = node.text
  if (node.attrs)
    copiedNode.attrs = { ...node.attrs }
  if (node.marks?.length) {
    copiedNode.marks = node.marks.map((mark) => {
      const copiedMark: JiraAdfMark = {}
      if (typeof mark.type === 'string')
        copiedMark.type = mark.type
      if (mark.attrs)
        copiedMark.attrs = { ...mark.attrs }
      return copiedMark
    })
  }
  if (node.content?.length)
    copiedNode.content = node.content.map(copyAdfNode)

  return copiedNode
}

function unsupportedNodeLabel(node: JiraAdfNode): string {
  const url = node.attrs?.url
  if (typeof url === 'string' && url.length > 0)
    return url

  const text = node.attrs?.text
  if (typeof text === 'string' && text.length > 0)
    return text

  if (typeof node.text === 'string' && node.text.length > 0)
    return node.text

  return typeof node.type === 'string' && node.type.length > 0
    ? `Unsupported Jira ${node.type}`
    : 'Unsupported Jira content'
}

function unsupportedEditorNodeType(node: JiraAdfNode, parentType: string | undefined): string {
  if (node.type === 'text' || (parentType && INLINE_PARENT_NODE_TYPES.has(parentType)))
    return UNSUPPORTED_INLINE_NODE_TYPE
  return UNSUPPORTED_BLOCK_NODE_TYPE
}

function toUnsupportedEditorNode(node: JiraAdfNode, parentType: string | undefined): JSONContent {
  return {
    type: unsupportedEditorNodeType(node, parentType),
    attrs: {
      adfNode: copyAdfNode(node),
      label: unsupportedNodeLabel(node),
    },
  }
}

function readUnsupportedAdfNode(attrs: JSONContent['attrs']): JiraAdfNode | null {
  if (!isRecord(attrs))
    return null

  const rawNode = attrs.adfNode
  if (!isJiraAdfNode(rawNode))
    return null

  return copyAdfNode(rawNode)
}

function toEditorNode(
  node: JiraAdfNode,
  resolveMediaSrc: (attrs: Record<string, unknown> | undefined) => string | null,
  parentType?: string,
): JSONContent | null {
  if (!isSupportedEditorAdfNodeShallow(node))
    return toUnsupportedEditorNode(node, parentType)

  if (typeof node.type !== 'string' || !node.type)
    return null

  const editorNode: JSONContent = { type: node.type }
  if (typeof node.text === 'string')
    editorNode.text = node.text

  if (node.attrs) {
    editorNode.attrs = { ...node.attrs }
    if (node.type === 'media') {
      const src = resolveMediaSrc(editorNode.attrs)
      if (src)
        editorNode.attrs.src = src
    }
  }

  if (node.marks?.length) {
    const marks = node.marks
      .map(toEditorMark)
      .filter((mark): mark is NonNullable<typeof mark> => mark !== null)
    if (marks.length)
      editorNode.marks = marks
  }

  if (node.content?.length) {
    const content = node.content
      .map(child => toEditorNode(child, resolveMediaSrc, node.type))
      .filter((child): child is JSONContent => child !== null)
    if (content.length)
      editorNode.content = content
  }

  return editorNode
}

function toAdfNode(node: JSONContent): JiraAdfNode | null {
  if (node.type === UNSUPPORTED_INLINE_NODE_TYPE || node.type === UNSUPPORTED_BLOCK_NODE_TYPE)
    return readUnsupportedAdfNode(node.attrs)

  if (typeof node.type !== 'string' || !node.type)
    return null

  const adfNode: JiraAdfNode = { type: node.type }
  if (typeof node.text === 'string')
    adfNode.text = node.text

  const attrs = copyAdfAttrs(node.type, node.attrs)
  if (attrs)
    adfNode.attrs = attrs

  if (node.marks?.length) {
    const marks = node.marks
      .map(toAdfMark)
      .filter((mark): mark is JiraAdfMark => mark !== null)
    if (marks.length)
      adfNode.marks = marks
  }

  if (node.content?.length) {
    const content = node.content
      .map(toAdfNode)
      .filter((child): child is JiraAdfNode => child !== null)
    if (content.length)
      adfNode.content = content
  }

  return adfNode
}

export function toEditorDocument(
  doc: JiraAdfDocument | null,
  resolveMediaSrc: (attrs: Record<string, unknown> | undefined) => string | null,
): JSONContent {
  if (!doc) {
    return {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    }
  }

  const content = doc.content
    .map(node => toEditorNode(node, resolveMediaSrc))
    .filter((node): node is JSONContent => node !== null)

  return {
    type: 'doc',
    content: content.length ? content : [{ type: 'paragraph' }],
  }
}

export function readAdfDocument(json: JSONContent): JiraAdfDocument | null {
  const adfNode = toAdfNode(json)
  if (!adfNode || adfNode.type !== 'doc')
    return null

  return normalizeAdf({
    type: 'doc',
    version: 1,
    content: adfNode.content ?? [],
  })
}

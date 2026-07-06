import type { JiraAttachment } from '@/types/jira'
import { Node } from '@tiptap/core'

interface JiraMediaContext {
  attachments: () => JiraAttachment[]
  ticketKey: () => string | null | undefined
}

function attrString(attrs: Record<string, unknown> | undefined, key: string): string | null {
  const value = attrs?.[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function attrNumber(attrs: Record<string, unknown> | undefined, key: string): number | null {
  const value = attrs?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function isImageFilename(filename: string): boolean {
  return /\.(?:apng|avif|gif|jpe?g|png|svg|webp)$/i.test(filename)
}

function isImageAttachment(attachment: JiraAttachment): boolean {
  const mimeType = attachment.mimeType?.toLowerCase()
  return mimeType?.startsWith('image/') === true || isImageFilename(attachment.filename)
}

function findMediaAttachment(
  attrs: Record<string, unknown> | undefined,
  context: JiraMediaContext,
): JiraAttachment | null {
  const imageAttachments = context.attachments().filter(isImageAttachment)
  if (!imageAttachments.length)
    return null

  const mediaId = attrString(attrs, 'id')
  const mediaAlt = attrString(attrs, 'alt')
  const mediaName = attrString(attrs, 'name')
  const idMatch = mediaId
    ? imageAttachments.find(attachment => attachment.id === mediaId)
    : undefined
  if (idMatch)
    return idMatch

  const filenameMatch = [mediaAlt, mediaName]
    .filter((value): value is string => value !== null)
    .map(value => imageAttachments.find(attachment => attachment.filename === value))
    .find(attachment => attachment !== undefined)
  if (filenameMatch)
    return filenameMatch

  return imageAttachments.length === 1 ? imageAttachments[0] ?? null : null
}

export function attachmentContentUrl(attachmentId: string): string {
  return `/api/jira-attachments/${encodeURIComponent(attachmentId)}/content`
}

function proxiedJiraAttachmentUrl(url: string): string {
  const attachmentId = url.match(/\/attachment\/content\/([^/?#]+)/)?.[1]
  return attachmentId ? attachmentContentUrl(decodeURIComponent(attachmentId)) : url
}

function ticketAttachmentContentUrl(filename: string, context: JiraMediaContext): string | null {
  const ticketKey = context.ticketKey()
  return ticketKey
    ? `/api/tickets/${encodeURIComponent(ticketKey)}/attachments/${encodeURIComponent(filename)}/content`
    : null
}

export function mediaImageSrc(
  attrs: Record<string, unknown> | undefined,
  context: JiraMediaContext,
): string | null {
  const directSrc = attrString(attrs, 'src') ?? attrString(attrs, 'url')
  if (directSrc)
    return proxiedJiraAttachmentUrl(directSrc)

  const attachment = findMediaAttachment(attrs, context)
  if (attachment)
    return attachmentContentUrl(attachment.id)

  const mediaFilename = attrString(attrs, 'alt') ?? attrString(attrs, 'name')
  const filenameUrl = mediaFilename ? ticketAttachmentContentUrl(mediaFilename, context) : null
  if (filenameUrl)
    return filenameUrl

  const mediaId = attrString(attrs, 'id')
  return mediaId ? attachmentContentUrl(mediaId) : null
}

function mediaAltText(attrs: Record<string, unknown> | undefined, context: JiraMediaContext): string {
  return attrString(attrs, 'alt') ?? attrString(attrs, 'name') ?? findMediaAttachment(attrs, context)?.filename ?? 'Attached image'
}

function mediaUploadState(attrs: Record<string, unknown> | undefined): 'pending' | 'error' | null {
  const value = attrs?.uploadState
  return value === 'pending' || value === 'error' ? value : null
}

function mediaUploadError(attrs: Record<string, unknown> | undefined): string | null {
  return attrString(attrs, 'uploadError')
}

function mediaImageAttrs(
  attrs: Record<string, unknown> | undefined,
  context: JiraMediaContext,
): Record<string, string | number> | null {
  const src = mediaImageSrc(attrs, context)
  if (!src)
    return null

  const imageAttrs: Record<string, string | number> = {
    src,
    alt: mediaAltText(attrs, context),
    loading: 'lazy',
    contenteditable: 'false',
  }
  const width = attrNumber(attrs, 'width')
  if (width !== null)
    imageAttrs.width = width
  const height = attrNumber(attrs, 'height')
  if (height !== null)
    imageAttrs.height = height

  return imageAttrs
}

export function createJiraMediaExtensions(context: JiraMediaContext) {
  const JiraMedia = Node.create({
    name: 'media',
    group: 'block',
    atom: true,
    selectable: true,
    draggable: false,

    addAttributes() {
      return {
        id: { default: null },
        type: { default: null },
        collection: { default: null },
        occurrenceKey: { default: null },
        alt: { default: null },
        name: { default: null },
        width: { default: null },
        height: { default: null },
        url: { default: null },
        src: { default: null },
        uploadState: { default: null },
        uploadError: { default: null },
        clientId: { default: null },
      }
    },

    parseHTML() {
      return [{ tag: 'figure[data-jira-media]' }]
    },

    renderHTML({ HTMLAttributes }) {
      const imageAttrs = mediaImageAttrs(HTMLAttributes, context)
      const alt = mediaAltText(HTMLAttributes, context)
      const uploadState = mediaUploadState(HTMLAttributes)
      const uploadError = mediaUploadError(HTMLAttributes)
      const caption = uploadState === 'pending'
        ? 'Uploading image...'
        : uploadState === 'error'
          ? uploadError ?? 'Image upload failed. Delete this image and paste it again.'
          : alt

      return [
        'figure',
        {
          'data-jira-media': 'true',
          'data-upload-state': uploadState ?? undefined,
          'class': 'jira-description-media',
        },
        imageAttrs
          ? ['img', imageAttrs]
          : ['figcaption', { contenteditable: 'false' }, alt],
        uploadState ? ['figcaption', { contenteditable: 'false' }, caption] : '',
      ]
    },
  })

  const JiraMediaSingle = Node.create({
    name: 'mediaSingle',
    group: 'block',
    content: 'media',
    isolating: true,

    addAttributes() {
      return {
        layout: { default: null },
        width: { default: null },
        widthType: { default: null },
      }
    },

    parseHTML() {
      return [{ tag: 'div[data-jira-media-single]' }]
    },

    renderHTML() {
      return ['div', { 'data-jira-media-single': 'true', 'class': 'jira-description-media-single' }, 0]
    },
  })

  const JiraMediaGroup = Node.create({
    name: 'mediaGroup',
    group: 'block',
    content: 'media+',
    isolating: true,

    parseHTML() {
      return [{ tag: 'div[data-jira-media-group]' }]
    },

    renderHTML() {
      return ['div', { 'data-jira-media-group': 'true', 'class': 'jira-description-media-group' }, 0]
    },
  })

  return [JiraMedia, JiraMediaSingle, JiraMediaGroup] as const
}

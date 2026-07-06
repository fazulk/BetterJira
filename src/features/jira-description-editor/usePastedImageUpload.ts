import type { Editor, JSONContent } from '@tiptap/core'
import type { JiraAttachment } from '@/types/jira'
import { isRecord } from '~/shared/typeGuards'
import { attachmentContentUrl } from './mediaExtensions'

interface PastedImageUploadOptions {
  disabled: () => boolean
  editor: () => Editor | null | undefined
  ticketKey: () => string | null | undefined
  unsupported: () => boolean
  uploadImage: () => ((file: File) => Promise<JiraAttachment>) | undefined
}

function createClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function fileExtensionForMimeType(mimeType: string): string {
  if (mimeType === 'image/jpeg')
    return 'jpg'
  if (mimeType === 'image/gif')
    return 'gif'
  if (mimeType === 'image/webp')
    return 'webp'
  return 'png'
}

function pastedImageFilename(file: File): string {
  const filename = file.name.trim()
  if (filename)
    return filename

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `pasted-image-${timestamp}.${fileExtensionForMimeType(file.type)}`
}

function mediaSingleNode(attrs: Record<string, unknown>, nodeAttrs?: Record<string, unknown>): JSONContent {
  const node: JSONContent = {
    type: 'mediaSingle',
    content: [{ type: 'media', attrs }],
  }

  if (nodeAttrs) {
    node.attrs = nodeAttrs
  }

  return node
}

function replaceMediaAttrs(
  editor: Editor,
  clientId: string,
  attrs: Record<string, unknown>,
): void {
  const { state, view } = editor
  let transaction = state.tr
  state.doc.descendants((node, position) => {
    if (node.type.name !== 'media' || !isRecord(node.attrs) || node.attrs.clientId !== clientId) {
      return true
    }

    transaction = transaction.setNodeMarkup(position, undefined, attrs)
    return false
  })

  if (transaction.docChanged) {
    view.dispatch(transaction)
  }
}

async function uploadPastedImage(
  editor: Editor,
  uploadImage: (file: File) => Promise<JiraAttachment>,
  file: File,
  clientId: string,
  objectUrl: string,
  filename: string,
): Promise<void> {
  const uploadFile = file.name.trim() === filename
    ? file
    : new File([file], filename, { type: file.type, lastModified: file.lastModified })

  try {
    const attachment = await uploadImage(uploadFile)
    replaceMediaAttrs(editor, clientId, {
      type: 'external',
      url: attachment.content ?? attachmentContentUrl(attachment.id),
      src: attachmentContentUrl(attachment.id),
    })
    URL.revokeObjectURL(objectUrl)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Image upload failed. Delete this image and paste it again.'
    replaceMediaAttrs(editor, clientId, {
      id: `pending:${clientId}`,
      type: 'file',
      alt: filename,
      name: filename,
      src: objectUrl,
      uploadState: 'error',
      uploadError: message,
      clientId,
    })
  }
}

function imageFilesFromClipboard(event: ClipboardEvent): File[] {
  const items = event.clipboardData?.items
  if (!items?.length)
    return []

  const files: File[] = []
  for (const item of items) {
    if (item.kind !== 'file' || !item.type.startsWith('image/'))
      continue
    const file = item.getAsFile()
    if (file)
      files.push(file)
  }

  return files
}

export function usePastedImageUpload(options: PastedImageUploadOptions) {
  function insertPastedImage(file: File): void {
    const editor = options.editor()
    const uploadImage = options.uploadImage()
    if (!editor || !uploadImage)
      return

    const clientId = createClientId()
    const filename = pastedImageFilename(file)
    const objectUrl = URL.createObjectURL(file)

    editor.chain().focus().insertContent(mediaSingleNode({
      id: `pending:${clientId}`,
      type: 'file',
      alt: filename,
      name: filename,
      src: objectUrl,
      uploadState: 'pending',
      clientId,
    })).run()

    void uploadPastedImage(editor, uploadImage, file, clientId, objectUrl, filename)
  }

  function handlePaste(_: unknown, event: ClipboardEvent): boolean {
    if (options.disabled() || options.unsupported() || !options.uploadImage() || !options.ticketKey()) {
      return false
    }

    const imageFiles = imageFilesFromClipboard(event)
    if (!imageFiles.length)
      return false

    event.preventDefault()
    for (const file of imageFiles) {
      insertPastedImage(file)
    }

    return true
  }

  return { handlePaste }
}

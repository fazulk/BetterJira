import type { PropType, VNodeChild } from 'vue'
import type { JiraAdfMark, JiraAdfNode, JiraAttachment } from '@/types/jira'
import { defineComponent, h } from 'vue'

const JiraAdfRenderer = defineComponent({
  name: 'JiraAdfRenderer',
  props: {
    nodes: {
      type: Array as PropType<JiraAdfNode[]>,
      required: true,
    },
    nested: {
      type: Boolean,
      default: false,
    },
    attachments: {
      type: Array as PropType<JiraAttachment[]>,
      default: () => [],
    },
    ticketKey: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  emits: {
    previewImage: (payload: { src: string, alt: string }) => typeof payload.src === 'string' && typeof payload.alt === 'string',
  },
  setup(props, { emit }) {
    function nodeKey(node: JiraAdfNode, index: number): string {
      const localId = typeof node.attrs?.localId === 'string' ? node.attrs.localId : null
      return localId ?? `${node.type ?? 'node'}-${index}`
    }

    function getNodeOrder(node: JiraAdfNode): number {
      const order = node.attrs?.order
      return typeof order === 'number' && Number.isFinite(order) ? order : 1
    }

    function linkMark(node: JiraAdfNode): JiraAdfMark | undefined {
      return node.marks?.find(mark => mark.type === 'link')
    }

    function linkHref(node: JiraAdfNode): string | null {
      const href = linkMark(node)?.attrs?.href
      return typeof href === 'string' ? href : null
    }

    function childNodes(node: JiraAdfNode): JiraAdfNode[] {
      return node.content ?? []
    }

    function nodeAttrString(node: JiraAdfNode, key: string): string | null {
      const value = node.attrs?.[key]
      return typeof value === 'string' && value.length > 0 ? value : null
    }

    function isImageFilename(filename: string): boolean {
      return /\.(?:apng|avif|gif|jpe?g|png|svg|webp)$/i.test(filename)
    }

    function isImageAttachment(attachment: JiraAttachment): boolean {
      const mimeType = attachment.mimeType?.toLowerCase()
      return mimeType?.startsWith('image/') === true || isImageFilename(attachment.filename)
    }

    function findMediaAttachment(node: JiraAdfNode): JiraAttachment | null {
      const imageAttachments = props.attachments.filter(isImageAttachment)
      if (!imageAttachments.length)
        return null

      const mediaId = nodeAttrString(node, 'id')
      const mediaAlt = nodeAttrString(node, 'alt')
      const mediaName = nodeAttrString(node, 'name')

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

    function ticketAttachmentContentUrl(filename: string): string | null {
      return props.ticketKey
        ? `/api/tickets/${encodeURIComponent(props.ticketKey)}/attachments/${encodeURIComponent(filename)}/content`
        : null
    }

    function proxiedJiraAttachmentUrl(url: string): string {
      const attachmentId = url.match(/\/attachment\/content\/([^/?#]+)/)?.[1]
      return attachmentId ? `/api/jira-attachments/${encodeURIComponent(decodeURIComponent(attachmentId))}/content` : url
    }

    function mediaImageUrl(node: JiraAdfNode): string | null {
      const directUrl = nodeAttrString(node, 'url')
      if (directUrl)
        return proxiedJiraAttachmentUrl(directUrl)

      const attachment = findMediaAttachment(node)
      if (attachment)
        return `/api/jira-attachments/${encodeURIComponent(attachment.id)}/content`

      const mediaFilename = nodeAttrString(node, 'alt') ?? nodeAttrString(node, 'name')
      const filenameUrl = mediaFilename ? ticketAttachmentContentUrl(mediaFilename) : null
      if (filenameUrl)
        return filenameUrl

      const mediaId = nodeAttrString(node, 'id')
      return mediaId ? `/api/jira-attachments/${encodeURIComponent(mediaId)}/content` : null
    }

    function mediaAltText(node: JiraAdfNode): string {
      return nodeAttrString(node, 'alt') ?? findMediaAttachment(node)?.filename ?? 'Attached image'
    }

    function previewMediaImage(node: JiraAdfNode): void {
      const src = mediaImageUrl(node)
      if (!src)
        return

      emit('previewImage', {
        src,
        alt: mediaAltText(node),
      })
    }

    function textParts(text: string | undefined): string[] {
      if (!text)
        return []
      return text.split('\n')
    }

    function mentionText(node: JiraAdfNode): string {
      const text = nodeAttrString(node, 'text')
      if (text)
        return text

      const id = nodeAttrString(node, 'id')
      return id ? `@${id}` : ''
    }

    function mentionNodeClass(): string {
      return 'rounded-md bg-accent-indigo/10 px-1 py-0.5 text-[#cbd5ff]'
    }

    function hasMark(node: JiraAdfNode, type: string): boolean {
      return node.marks?.some(mark => mark.type === type) ?? false
    }

    function textNodeClass(node: JiraAdfNode): string {
      const classes = ['break-words']

      if (hasMark(node, 'strong'))
        classes.push('font-semibold', 'text-slate-200')
      if (hasMark(node, 'em'))
        classes.push('italic')
      if (hasMark(node, 'underline'))
        classes.push('underline', 'underline-offset-2')
      if (hasMark(node, 'strike'))
        classes.push('line-through')
      if (hasMark(node, 'code'))
        classes.push('rounded-md', 'border', 'border-white/[0.08]', 'bg-white/[0.04]', 'px-1.5', 'py-0.5', 'font-mono', 'text-[13px]', 'text-slate-200')

      if (linkHref(node))
        classes.push('text-slate-200', 'underline', 'underline-offset-[3px]', 'decoration-[#4cb782]', 'decoration-2', 'transition', 'hover:text-white')

      return classes.join(' ')
    }

    function headingClass(node: JiraAdfNode): string {
      const level = node.attrs?.level
      if (level === 1)
        return 'text-xl font-semibold leading-snug text-slate-100'
      if (level === 2)
        return 'text-lg font-semibold leading-snug text-slate-100'
      if (level === 3)
        return 'text-base font-semibold leading-snug text-slate-200'
      return 'text-sm font-medium leading-relaxed text-slate-300'
    }

    function renderTextChild(child: JiraAdfNode, childIndex: number): VNodeChild {
      const href = linkHref(child)
      return h(
        href ? 'a' : 'span',
        {
          href: href ?? undefined,
          target: href ? '_blank' : undefined,
          rel: href ? 'noreferrer' : undefined,
          class: textNodeClass(child),
          title: href ?? undefined,
          key: nodeKey(child, childIndex),
          onClick: href ? undefined : (event: MouseEvent) => event.stopPropagation(),
        },
        () => textParts(child.text).map((part, partIndex) => (
          <span key={`${nodeKey(child, childIndex)}-${partIndex}`}>
            {partIndex > 0 && <br />}
            {part}
          </span>
        )),
      )
    }

    function renderInlineChildren(node: JiraAdfNode): VNodeChild[] {
      return childNodes(node).map((child, childIndex) => {
        if (child.type === 'hardBreak')
          return <br key={nodeKey(child, childIndex)} />

        if (child.type === 'text')
          return renderTextChild(child, childIndex)

        if (child.type === 'mention')
          return <span key={nodeKey(child, childIndex)} class={mentionNodeClass()}>{mentionText(child)}</span>

        return (
          <JiraAdfRenderer
            key={nodeKey(child, childIndex)}
            nodes={[child]}
            attachments={props.attachments}
            ticketKey={props.ticketKey}
            nested
            onPreviewImage={payload => emit('previewImage', payload)}
          />
        )
      })
    }

    function renderNested(nodes: JiraAdfNode[], key?: string): VNodeChild {
      return (
        <JiraAdfRenderer
          key={key}
          nodes={nodes}
          attachments={props.attachments}
          ticketKey={props.ticketKey}
          nested
          onPreviewImage={payload => emit('previewImage', payload)}
        />
      )
    }

    function renderNode(node: JiraAdfNode, index: number): VNodeChild {
      if (node.type === 'paragraph') {
        return (
          <p key={nodeKey(node, index)} class="text-sm leading-relaxed text-slate-400">
            {renderInlineChildren(node)}
          </p>
        )
      }

      if (node.type === 'heading') {
        return (
          <div key={nodeKey(node, index)} class={headingClass(node)}>
            {renderInlineChildren(node)}
          </div>
        )
      }

      if (node.type === 'bulletList') {
        return (
          <ul key={nodeKey(node, index)} class="list-disc space-y-2 pl-6 text-sm leading-relaxed text-slate-400 marker:text-slate-500">
            {childNodes(node).map((child, childIndex) => (
              <li key={nodeKey(child, childIndex)}>
                {renderNested(childNodes(child))}
              </li>
            ))}
          </ul>
        )
      }

      if (node.type === 'orderedList') {
        return (
          <ol
            key={nodeKey(node, index)}
            class="list-decimal space-y-2 pl-6 text-sm leading-relaxed text-slate-400 marker:text-slate-500"
            start={getNodeOrder(node)}
          >
            {childNodes(node).map((child, childIndex) => (
              <li key={nodeKey(child, childIndex)}>
                {renderNested(childNodes(child))}
              </li>
            ))}
          </ol>
        )
      }

      if (node.type === 'codeBlock') {
        return (
          <pre key={nodeKey(node, index)} class="overflow-x-auto rounded-md border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-sm leading-relaxed text-slate-300">
            <code>{childNodes(node).map(child => child.text ?? '').join('')}</code>
          </pre>
        )
      }

      if (node.type === 'blockquote') {
        return (
          <blockquote key={nodeKey(node, index)} class="border-l border-white/[0.14] pl-4 text-sm leading-relaxed text-slate-300">
            {renderNested(childNodes(node))}
          </blockquote>
        )
      }

      if (node.type === 'mediaSingle' || node.type === 'mediaGroup') {
        return (
          <div key={nodeKey(node, index)} class="space-y-2">
            {renderNested(childNodes(node))}
          </div>
        )
      }

      if (node.type === 'media') {
        const imageUrl = mediaImageUrl(node)
        return (
          <figure key={nodeKey(node, index)} class="overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.025]">
            {imageUrl
              ? (
                  <img
                    src={imageUrl}
                    alt={mediaAltText(node)}
                    class="block max-h-[520px] max-w-full object-contain"
                    loading="lazy"
                    onDblclick={(event) => {
                      event.stopPropagation()
                      previewMediaImage(node)
                    }}
                  />
                )
              : (
                  <figcaption class="px-3 py-2 text-xs text-slate-500">
                    {mediaAltText(node)}
                  </figcaption>
                )}
          </figure>
        )
      }

      if (childNodes(node).length) {
        return (
          <div key={nodeKey(node, index)}>
            {renderNested(childNodes(node))}
          </div>
        )
      }

      return null
    }

    return () => (
      <div class={props.nested ? 'space-y-2' : 'space-y-3'}>
        {props.nodes.map(renderNode)}
      </div>
    )
  },
})

export default JiraAdfRenderer

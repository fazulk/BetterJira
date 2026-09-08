import type { StyleXStyles } from '@stylexjs/stylex'
import type { PropType, VNodeChild } from 'vue'
import type { JiraAdfMark, JiraAdfNode, JiraAttachment } from '@/types/jira'
import * as stylex from '@stylexjs/stylex'
import { defineComponent, h } from 'vue'
import { colors, typography } from '@/styles/tokens.stylex'

const styles = stylex.create({
  root: { display: 'flex', flexDirection: 'column' },
  rootNested: { gap: '0.5rem' },
  rootDefault: { gap: '0.75rem' },
  paragraph: { fontSize: '0.875rem', lineHeight: 1.625, color: colors['--color-slate-400'], margin: 0 },
  mention: { borderRadius: '0.375rem', backgroundColor: 'rgba(111, 115, 255, 0.1)', paddingInline: '0.25rem', paddingBlock: '0.125rem', color: '#cbd5ff' },
  text: { overflowWrap: 'break-word' },
  strong: { fontWeight: 600, color: colors['--color-slate-200'] },
  emphasis: { fontStyle: 'italic' },
  underline: { textDecorationLine: 'underline', textUnderlineOffset: '2px' },
  strike: { textDecorationLine: 'line-through' },
  inlineCode: {
    borderRadius: '0.375rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingInline: '0.375rem',
    paddingBlock: '0.125rem',
    fontFamily: typography['--font-mono'],
    fontSize: 13,
    color: colors['--color-slate-200'],
  },
  link: {
    color: { 'default': colors['--color-slate-200'], ':hover': colors['--color-white'] },
    textDecorationLine: 'underline',
    textUnderlineOffset: '3px',
    textDecorationColor: colors['--color-accent-sage'],
    textDecorationThickness: '2px',
    transitionProperty: 'color',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  heading1: { fontSize: '1.25rem', lineHeight: 1.375, fontWeight: 600, color: colors['--color-slate-100'] },
  heading2: { fontSize: '1.125rem', lineHeight: 1.375, fontWeight: 600, color: colors['--color-slate-100'] },
  heading3: { fontSize: '1rem', lineHeight: 1.375, fontWeight: 600, color: colors['--color-slate-200'] },
  headingFallback: { fontSize: '0.875rem', lineHeight: 1.625, fontWeight: 500, color: colors['--color-slate-300'] },
  list: { paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', lineHeight: 1.625, color: colors['--color-slate-400'] },
  bulletList: { listStyleType: 'disc' },
  orderedList: { listStyleType: 'decimal' },
  codeBlock: { overflowX: 'auto', borderRadius: '0.375rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.025)', paddingInline: '0.75rem', paddingBlock: '0.625rem', fontSize: '0.875rem', lineHeight: 1.625, color: colors['--color-slate-300'] },
  blockquote: { borderLeftWidth: 1, borderLeftStyle: 'solid', borderLeftColor: 'rgba(255, 255, 255, 0.14)', paddingLeft: '1rem', fontSize: '0.875rem', lineHeight: 1.625, color: colors['--color-slate-300'] },
  mediaStack: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  figure: { overflow: 'hidden', borderRadius: '0.5rem', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.025)', margin: 0 },
  image: { display: 'block', maxHeight: '520px', maxWidth: '100%', objectFit: 'contain' },
  figcaption: { paddingInline: '0.75rem', paddingBlock: '0.5rem', fontSize: '0.75rem', lineHeight: '1rem', color: colors['--color-slate-500'] },
})

const JiraAdfRenderer = defineComponent({
  name: 'JiraAdfRenderer',
  props: {
    nodes: {
      type: Array as PropType<JiraAdfNode[]>,
      required: true,
    },
    nested: {
      type: Boolean,
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

    function hasMark(node: JiraAdfNode, type: string): boolean {
      return node.marks?.some(mark => mark.type === type) ?? false
    }

    function textNodeStyles(node: JiraAdfNode): StyleXStyles[] {
      return [
        styles.text,
        hasMark(node, 'strong') ? styles.strong : null,
        hasMark(node, 'em') ? styles.emphasis : null,
        hasMark(node, 'underline') ? styles.underline : null,
        hasMark(node, 'strike') ? styles.strike : null,
        hasMark(node, 'code') ? styles.inlineCode : null,
        linkHref(node) ? styles.link : null,
      ]
    }

    function headingStyle(node: JiraAdfNode): StyleXStyles {
      const level = node.attrs?.level
      if (level === 1)
        return styles.heading1
      if (level === 2)
        return styles.heading2
      if (level === 3)
        return styles.heading3
      return styles.headingFallback
    }

    function renderTextChild(child: JiraAdfNode, childIndex: number): VNodeChild {
      const href = linkHref(child)
      return h(
        href ? 'a' : 'span',
        {
          ...stylex.attrs(...textNodeStyles(child)),
          href: href ?? undefined,
          target: href ? '_blank' : undefined,
          rel: href ? 'noreferrer' : undefined,
          title: href ?? undefined,
          key: nodeKey(child, childIndex),
          onClick: href ? undefined : (event: MouseEvent) => event.stopPropagation(),
        },
        textParts(child.text).map((part, partIndex) => (
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
          return <span key={nodeKey(child, childIndex)} {...stylex.attrs(styles.mention)}>{mentionText(child)}</span>

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
          <p key={nodeKey(node, index)} {...stylex.attrs(styles.paragraph)}>
            {renderInlineChildren(node)}
          </p>
        )
      }

      if (node.type === 'heading') {
        return (
          <div key={nodeKey(node, index)} {...stylex.attrs(headingStyle(node))}>
            {renderInlineChildren(node)}
          </div>
        )
      }

      if (node.type === 'bulletList') {
        return (
          <ul key={nodeKey(node, index)} {...stylex.attrs(styles.list, styles.bulletList)}>
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
            {...stylex.attrs(styles.list, styles.orderedList)}
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
          <pre key={nodeKey(node, index)} {...stylex.attrs(styles.codeBlock)}>
            <code>{childNodes(node).map(child => child.text ?? '').join('')}</code>
          </pre>
        )
      }

      if (node.type === 'blockquote') {
        return (
          <blockquote key={nodeKey(node, index)} {...stylex.attrs(styles.blockquote)}>
            {renderNested(childNodes(node))}
          </blockquote>
        )
      }

      if (node.type === 'mediaSingle' || node.type === 'mediaGroup') {
        return (
          <div key={nodeKey(node, index)} {...stylex.attrs(styles.mediaStack)}>
            {renderNested(childNodes(node))}
          </div>
        )
      }

      if (node.type === 'media') {
        const imageUrl = mediaImageUrl(node)
        return (
          <figure key={nodeKey(node, index)} {...stylex.attrs(styles.figure)}>
            {imageUrl
              ? (
                  <img
                    src={imageUrl}
                    alt={mediaAltText(node)}
                    {...stylex.attrs(styles.image)}
                    loading="lazy"
                    onDblclick={(event) => {
                      event.stopPropagation()
                      previewMediaImage(node)
                    }}
                  />
                )
              : (
                  <figcaption {...stylex.attrs(styles.figcaption)}>
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
      <div {...stylex.attrs(styles.root, props.nested ? styles.rootNested : styles.rootDefault)}>
        {props.nodes.map(renderNode)}
      </div>
    )
  },
})

export default JiraAdfRenderer

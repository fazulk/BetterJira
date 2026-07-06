<script setup lang="ts">
import type { JiraAdfMark, JiraAdfNode, JiraAttachment } from '@/types/jira'

defineOptions({
  name: 'JiraAdfRenderer',
})

const props = defineProps<{
  nodes: JiraAdfNode[]
  nested?: boolean
  attachments?: JiraAttachment[]
  ticketKey?: string | null
}>()

const emit = defineEmits<{
  previewImage: [payload: { src: string, alt: string }]
}>()

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
  const imageAttachments = (props.attachments ?? []).filter(isImageAttachment)
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

  if (linkHref(node)) {
    classes.push('text-slate-200', 'underline', 'underline-offset-[3px]', 'decoration-[#4cb782]', 'decoration-2', 'transition', 'hover:text-white')
  }

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
</script>

<template>
  <div :class="nested ? 'space-y-2' : 'space-y-3'">
    <template v-for="(node, index) in props.nodes" :key="nodeKey(node, index)">
      <p v-if="node.type === 'paragraph'" class="text-sm leading-relaxed text-slate-400">
        <template v-for="(child, childIndex) in childNodes(node)" :key="nodeKey(child, childIndex)">
          <br v-if="child.type === 'hardBreak'">
          <component
            :is="linkHref(child) ? 'a' : 'span'"
            v-else-if="child.type === 'text'"
            :href="linkHref(child) ?? undefined"
            :target="linkHref(child) ? '_blank' : undefined"
            :rel="linkHref(child) ? 'noreferrer' : undefined"
            :class="textNodeClass(child)"
            :title="linkHref(child) ?? undefined"
            @click.stop="linkHref(child) ? undefined : undefined"
          >
            <template v-for="(part, partIndex) in textParts(child.text)" :key="`${nodeKey(child, childIndex)}-${partIndex}`">
              <br v-if="partIndex > 0">
              <span>{{ part }}</span>
            </template>
          </component>
          <span v-else-if="child.type === 'mention'" :class="mentionNodeClass()">{{ mentionText(child) }}</span>
          <JiraAdfRenderer
            v-else
            :nodes="[child]"
            :attachments="props.attachments"
            :ticket-key="props.ticketKey"
            nested
            @preview-image="emit('previewImage', $event)"
          />
        </template>
      </p>

      <div v-else-if="node.type === 'heading'" :class="headingClass(node)">
        <template v-for="(child, childIndex) in childNodes(node)" :key="nodeKey(child, childIndex)">
          <component
            :is="linkHref(child) ? 'a' : 'span'"
            v-if="child.type === 'text'"
            :href="linkHref(child) ?? undefined"
            :target="linkHref(child) ? '_blank' : undefined"
            :rel="linkHref(child) ? 'noreferrer' : undefined"
            :class="textNodeClass(child)"
            :title="linkHref(child) ?? undefined"
          >
            <template v-for="(part, partIndex) in textParts(child.text)" :key="`${nodeKey(child, childIndex)}-${partIndex}`">
              <br v-if="partIndex > 0">
              <span>{{ part }}</span>
            </template>
          </component>
          <span v-else-if="child.type === 'mention'" :class="mentionNodeClass()">{{ mentionText(child) }}</span>
          <JiraAdfRenderer
            v-else
            :nodes="[child]"
            :attachments="props.attachments"
            :ticket-key="props.ticketKey"
            nested
            @preview-image="emit('previewImage', $event)"
          />
        </template>
      </div>

      <ul v-else-if="node.type === 'bulletList'" class="list-disc space-y-2 pl-6 text-sm leading-relaxed text-slate-400 marker:text-slate-500">
        <li v-for="(child, childIndex) in childNodes(node)" :key="nodeKey(child, childIndex)">
          <JiraAdfRenderer
            :nodes="childNodes(child)"
            :attachments="props.attachments"
            :ticket-key="props.ticketKey"
            nested
            @preview-image="emit('previewImage', $event)"
          />
        </li>
      </ul>

      <ol
        v-else-if="node.type === 'orderedList'"
        class="list-decimal space-y-2 pl-6 text-sm leading-relaxed text-slate-400 marker:text-slate-500"
        :start="getNodeOrder(node)"
      >
        <li v-for="(child, childIndex) in childNodes(node)" :key="nodeKey(child, childIndex)">
          <JiraAdfRenderer
            :nodes="childNodes(child)"
            :attachments="props.attachments"
            :ticket-key="props.ticketKey"
            nested
            @preview-image="emit('previewImage', $event)"
          />
        </li>
      </ol>

      <pre
        v-else-if="node.type === 'codeBlock'"
        class="overflow-x-auto rounded-md border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-sm leading-relaxed text-slate-300"
      ><code>{{ childNodes(node).map((child) => child.text ?? '').join('') }}</code></pre>

      <blockquote
        v-else-if="node.type === 'blockquote'"
        class="border-l border-white/[0.14] pl-4 text-sm leading-relaxed text-slate-300"
      >
        <JiraAdfRenderer
          :nodes="childNodes(node)"
          :attachments="props.attachments"
          :ticket-key="props.ticketKey"
          nested
          @preview-image="emit('previewImage', $event)"
        />
      </blockquote>

      <div v-else-if="node.type === 'mediaSingle' || node.type === 'mediaGroup'" class="space-y-2">
        <JiraAdfRenderer
          :nodes="childNodes(node)"
          :attachments="props.attachments"
          :ticket-key="props.ticketKey"
          nested
          @preview-image="emit('previewImage', $event)"
        />
      </div>

      <figure v-else-if="node.type === 'media'" class="overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.025]">
        <img
          v-if="mediaImageUrl(node)"
          :src="mediaImageUrl(node) ?? undefined"
          :alt="mediaAltText(node)"
          class="block max-h-[520px] max-w-full object-contain"
          loading="lazy"
          @dblclick.stop="previewMediaImage(node)"
        >
        <figcaption v-else class="px-3 py-2 text-xs text-slate-500">
          {{ mediaAltText(node) }}
        </figcaption>
      </figure>

      <div v-else-if="childNodes(node).length">
        <JiraAdfRenderer
          :nodes="childNodes(node)"
          :attachments="props.attachments"
          :ticket-key="props.ticketKey"
          nested
          @preview-image="emit('previewImage', $event)"
        />
      </div>
    </template>
  </div>
</template>

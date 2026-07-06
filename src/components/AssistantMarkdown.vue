<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { computed } from 'vue'

const props = defineProps<{ content: string }>()

// html: false makes markdown-it escape any raw HTML in the LLM output,
// so rendering via v-html is safe without an extra sanitizer.
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

// Open links in a new tab (chat lives in a floating panel; don't navigate away).
const defaultLinkRenderer = md.renderer.rules.link_open
  ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  if (token) {
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
  }
  return defaultLinkRenderer(tokens, idx, options, env, self)
}

const html = computed(() => md.render(props.content))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- markdown-it escapes raw HTML (html: false) -->
  <div class="assistant-markdown" v-html="html" />
</template>

<style scoped>
.assistant-markdown :deep(p),
.assistant-markdown :deep(ul),
.assistant-markdown :deep(ol),
.assistant-markdown :deep(pre),
.assistant-markdown :deep(blockquote),
.assistant-markdown :deep(table) {
  margin: 0;
}

.assistant-markdown :deep(> * + *) {
  margin-top: 0.5rem;
}

.assistant-markdown :deep(h1),
.assistant-markdown :deep(h2),
.assistant-markdown :deep(h3),
.assistant-markdown :deep(h4),
.assistant-markdown :deep(h5),
.assistant-markdown :deep(h6) {
  margin: 0.75rem 0 0.25rem;
  font-weight: 600;
  color: var(--color-slate-100, #f1f5f9);
  line-height: 1.3;
}

.assistant-markdown :deep(h1) { font-size: 1.05em; }
.assistant-markdown :deep(h2) { font-size: 1em; }
.assistant-markdown :deep(h3),
.assistant-markdown :deep(h4),
.assistant-markdown :deep(h5),
.assistant-markdown :deep(h6) { font-size: 0.95em; }

.assistant-markdown :deep(h1:first-child),
.assistant-markdown :deep(h2:first-child),
.assistant-markdown :deep(h3:first-child) {
  margin-top: 0;
}

.assistant-markdown :deep(ul),
.assistant-markdown :deep(ol) {
  padding-left: 1.25rem;
}

.assistant-markdown :deep(ul) { list-style: disc; }
.assistant-markdown :deep(ol) { list-style: decimal; }

.assistant-markdown :deep(li + li) {
  margin-top: 0.125rem;
}

.assistant-markdown :deep(a) {
  color: var(--color-accent-indigo, #6f73ff);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.assistant-markdown :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.92em;
  background: rgb(255 255 255 / 0.08);
  border-radius: 0.25rem;
  padding: 0.1em 0.35em;
}

.assistant-markdown :deep(pre) {
  background: rgb(0 0 0 / 0.35);
  border: 1px solid rgb(255 255 255 / 0.06);
  border-radius: 0.5rem;
  padding: 0.6rem 0.75rem;
  overflow-x: auto;
}

.assistant-markdown :deep(pre code) {
  background: transparent;
  padding: 0;
  font-size: 0.9em;
}

.assistant-markdown :deep(blockquote) {
  border-left: 2px solid rgb(255 255 255 / 0.15);
  padding-left: 0.75rem;
  color: var(--color-slate-400, #94a3b8);
}

.assistant-markdown :deep(hr) {
  border: none;
  border-top: 1px solid rgb(255 255 255 / 0.1);
  margin: 0.75rem 0;
}

.assistant-markdown :deep(table) {
  border-collapse: collapse;
  font-size: 0.95em;
}

.assistant-markdown :deep(th),
.assistant-markdown :deep(td) {
  border: 1px solid rgb(255 255 255 / 0.1);
  padding: 0.25rem 0.5rem;
  text-align: left;
}

.assistant-markdown :deep(th) {
  background: rgb(255 255 255 / 0.04);
  font-weight: 600;
}

.assistant-markdown :deep(strong) {
  color: var(--color-slate-100, #f1f5f9);
}
</style>

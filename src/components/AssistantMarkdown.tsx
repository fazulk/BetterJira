import * as stylex from '@stylexjs/stylex'
import MarkdownIt from 'markdown-it'
import { computed, defineComponent } from 'vue'
import './AssistantMarkdown.css'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

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

const styles = stylex.create({
  root: {},
})

export default defineComponent({
  name: 'AssistantMarkdown',
  props: {
    content: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const html = computed(() => md.render(props.content))

    return () => <div {...stylex.attrs(styles.root)} class="assistant-markdown" innerHTML={html.value} />
  },
})

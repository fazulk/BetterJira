// @vitest-environment happy-dom
/**
 * The description editor is created in onMounted with a snapshot of
 * `modelValue` / `disabled` taken during setup. If those props change
 * before the editor exists, the watches no-op and the editor can come up
 * empty — then setEditable(true) emits that empty doc through v-model.
 */
import type { JiraAdfDocument } from '@/types/jira'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import JiraDescriptionEditor from '@/components/JiraDescriptionEditor.vue'

function adfDoc(text: string): JiraAdfDocument {
  return {
    type: 'doc',
    version: 1,
    content: [
      { type: 'paragraph', content: text ? [{ type: 'text', text }] : [] },
    ],
  }
}

describe('jira description editor open-ticket race', () => {
  it('applies a modelValue that arrived before the TipTap instance existed', async () => {
    const model = ref<JiraAdfDocument | null>(null)
    const disabled = ref(true)
    const emitted: Array<JiraAdfDocument | null> = []

    const Host = defineComponent({
      setup() {
        return () => h(JiraDescriptionEditor, {
          'modelValue': model.value,
          'disabled': disabled.value,
          'onUpdate:modelValue': (value: JiraAdfDocument | null) => {
            emitted.push(value)
            model.value = value
          },
        })
      },
    })

    const wrapper = mount(Host)
    // Simulate the detail fetch resolving during the same tick as mount,
    // before useEditor's onMounted creates the instance.
    model.value = adfDoc('real description')
    disabled.value = false
    await nextTick()
    await nextTick()
    // Editor onMounted + setContent
    await nextTick()

    const prose = wrapper.find('.tiptap')
    expect(prose.exists()).toBe(true)
    expect(prose.text()).toContain('real description')

    const emptied = emitted.some(doc => !doc || !JSON.stringify(doc).includes('real description'))
    expect(emptied).toBe(false)

    wrapper.unmount()
  })
})

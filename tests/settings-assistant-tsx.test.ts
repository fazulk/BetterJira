// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AssistantMarkdown from '@/components/AssistantMarkdown'
import AssistantSkillPicker from '@/components/AssistantSkillPicker'
import AssistantSkillModal from '@/components/settings/AssistantSkillModal'

const skills = [
  { id: 'skill-1', name: 'Triage', body: 'triage prompt', updatedAt: 10 },
  { id: 'skill-2', name: 'Release', body: 'release prompt', updatedAt: 20 },
]

vi.mock('@/composables/useAssistantSkills', () => ({
  useAssistantSkills: () => ({ skills: { value: skills } }),
}))

function setFieldValue(selector: string, value: string): void {
  const field = document.body.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)
  expect(field).toBeInstanceOf(HTMLElement)
  field!.value = value
  field!.dispatchEvent(new Event('input', { bubbles: true }))
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('settings assistant TSX components', () => {
  it('renders escaped markdown and preserves assistant link attributes', () => {
    const wrapper = mount(AssistantMarkdown, {
      props: {
        content: 'See https://example.com\n\n<script>alert("x")</script>',
      },
    })

    const link = wrapper.find('a')
    expect(link.attributes('href')).toBe('https://example.com')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.html()).toContain('&lt;script&gt;')
  })

  it('emits model updates when selecting and removing assistant skills', async () => {
    const wrapper = mount(AssistantSkillPicker, {
      props: {
        modelValue: ['skill-1'],
      },
    })

    expect(wrapper.text()).toContain('Skills')
    expect(wrapper.text()).toContain('Triage')

    await wrapper.find('button[title="Remove Triage"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[]])

    await wrapper.setProps({ modelValue: [] })
    await wrapper.find('button').trigger('click')
    const releaseOption = wrapper.findAll('button').find(button => button.text() === 'Release')
    expect(releaseOption).toBeDefined()
    await releaseOption!.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([['skill-2']])
  })

  it('keeps new skill modal save disabled until both fields have content', async () => {
    const wrapper = mount(AssistantSkillModal, {
      props: {
        skill: null,
      },
    })

    const saveButton = [...document.body.querySelectorAll('button')]
      .find(button => button.textContent === 'Save') as HTMLButtonElement | undefined
    expect(saveButton?.disabled).toBe(true)

    setFieldValue('input[name="skill-name"]', 'Updated')
    setFieldValue('textarea[name="skill-body"]', 'New prompt')
    await wrapper.vm.$nextTick()
    expect(saveButton?.disabled).toBe(false)
  })

  it('saves and exposes delete for existing skills', async () => {
    const wrapper = mount(AssistantSkillModal, {
      props: {
        skill: skills[0],
      },
    })

    const saveButton = [...document.body.querySelectorAll('button')]
      .find(button => button.textContent === 'Save') as HTMLButtonElement | undefined
    setFieldValue('input[name="skill-name"]', 'Updated')
    setFieldValue('textarea[name="skill-body"]', 'New prompt')
    saveButton!.click()

    expect(wrapper.emitted('save')).toEqual([[{ name: 'Updated', body: 'New prompt' }]])

    document.body.querySelector<HTMLButtonElement>('button[aria-label="Skill options"]')!.click()
    await wrapper.vm.$nextTick()
    const deleteButton = [...document.body.querySelectorAll('button')]
      .find(button => button.textContent?.trim() === 'Delete skill') as HTMLButtonElement | undefined
    deleteButton!.click()
    expect(wrapper.emitted('delete')).toEqual([[]])
  })
})

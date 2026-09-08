// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import ProjectIconPickerButton from '@/components/ProjectIconPickerButton'
import SpaceIconPicker from '@/components/SpaceIconPicker'

vi.mock('@/utils/spaceIconNames', () => ({ SPACE_ICON_NAMES: ['folder', 'star', 'heart'] }))
vi.mock('@/composables/useProjectAppearances', () => ({
  useProjectAppearances: () => ({
    getProjectAppearance: () => ({ icon: 'folder', color: '#123456' }),
    setProjectAppearance: vi.fn(),
    resetProjectAppearance: vi.fn(),
  }),
}))

afterEach(() => {
  document.body.innerHTML = ''
})

describe('shared TSX controls', () => {
  it('waits for composition end before filtering icons and preserves model events', async () => {
    const wrapper = mount(SpaceIconPicker, { props: { icon: null, color: '#123456' } })
    const input = wrapper.get<HTMLInputElement>('input[placeholder="Search icons..."]')
    await input.trigger('compositionstart')
    input.element.value = 'heart'
    await input.trigger('input')
    expect(wrapper.find('button[aria-label="folder"]').exists()).toBe(true)
    await input.trigger('compositionend')
    expect(wrapper.find('button[aria-label="folder"]').exists()).toBe(false)
    await wrapper.get('button[aria-label="heart"]').trigger('click')
    expect(wrapper.emitted('update:icon')).toEqual([['heart']])
    await wrapper.get('input[type="color"]').setValue('#abcdef')
    expect(wrapper.emitted('update:color')).toEqual([['#abcdef']])
    wrapper.unmount()
  })

  it('closes the picker on Escape, outside clicks and project changes', async () => {
    const wrapper = mount(ProjectIconPickerButton, { props: { projectKey: 'SMP-1' }, attachTo: document.body })
    const button = wrapper.get('button[aria-label="Change project icon and color"]')
    const bubbled = vi.fn()
    window.addEventListener('keydown', bubbled)
    try {
      await button.trigger('click')
      expect(wrapper.findComponent(SpaceIconPicker).exists()).toBe(true)
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await nextTick()
      expect(wrapper.findComponent(SpaceIconPicker).exists()).toBe(false)
      expect(bubbled).not.toHaveBeenCalled()
      await button.trigger('click')
      await wrapper.setProps({ projectKey: 'SMP-2' })
      expect(wrapper.findComponent(SpaceIconPicker).exists()).toBe(false)
      await button.trigger('click')
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
      await nextTick()
      expect(wrapper.findComponent(SpaceIconPicker).exists()).toBe(false)
    }
    finally {
      window.removeEventListener('keydown', bubbled)
      wrapper.unmount()
    }
  })
})

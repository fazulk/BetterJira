// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import JiraAdfRenderer from '@/components/JiraAdfRenderer'

describe('aDF rendering', () => {
  it('renders paragraph, heading, nested list and linked text and reacts to content changes', async () => {
    const wrapper = mount(JiraAdfRenderer, {
      props: {
        nodes: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Release notes' }] },
          { type: 'paragraph', content: [
            { type: 'text', text: 'First line\nSecond line', marks: [{ type: 'strong' }] },
            { type: 'text', text: 'Open details', marks: [{ type: 'link', attrs: { href: 'https://example.com/details' } }] },
          ] },
          { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Nested item' }] }] }] },
        ],
      },
    })
    expect(wrapper.text()).toContain('Release notes')
    expect(wrapper.text()).toContain('First line')
    expect(wrapper.text()).toContain('Second line')
    expect(wrapper.find('br').exists()).toBe(true)
    expect(wrapper.get('li').text()).toContain('Nested item')
    expect(wrapper.get('a').text()).toBe('Open details')
    expect(wrapper.get('a').attributes('href')).toBe('https://example.com/details')
    await wrapper.setProps({ nodes: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated description' }] }] })
    expect(wrapper.text()).toBe('Updated description')
    wrapper.unmount()
  })
})

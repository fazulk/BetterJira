// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"navigation":{"disableMainFrameNavigation":true,"disableChildPageNavigation":true}}}
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import JiraAdfRenderer from '@/components/JiraAdfRenderer'
import { useJiraIssueLinks } from '@/composables/useJiraIssueLinks'
import { parseJiraIssueUrl } from '@/utils/jiraIssueUrl'

const baseUrl = 'https://jira.example.com'

describe('jira issue URLs', () => {
  it.each([
    ['/browse/BJ-12', 'BJ-12'],
    ['/browse/bj-12/?focusedCommentId=123#comment-123', 'BJ-12'],
    ['/jira/software/c/projects/BJ/issues/BJ-12', 'BJ-12'],
    ['/jira/software/c/projects/BJ/boards/1?selectedIssue=BJ-12', 'BJ-12'],
    ['/issues/?selectedIssue=BJ-12', 'BJ-12'],
    ['/browse/BJ-12/attachments', null],
    ['/browse/invalid', null],
    ['/browse/BJ-0', null],
    ['/projects/BJ', null],
    ['/browse/%E0%A4%A', null],
  ])('recognizes %s', (path, key) => {
    expect(parseJiraIssueUrl(`${baseUrl}${path}`, baseUrl)).toBe(key)
  })

  it.each([
    'https://another.atlassian.net/browse/BJ-12',
    'https://jira.example.com.evil.test/browse/BJ-12',
    'https://jira.example.com@other.example.com/browse/BJ-12',
    'http://jira.example.com/browse/BJ-12',
    'javascript:alert(1)',
    '/browse/BJ-12',
    'not a URL',
  ])('leaves other URLs alone: %s', (href) => {
    expect(parseJiraIssueUrl(href, baseUrl)).toBeNull()
  })

  it('requires a configured Jira URL and respects its context path', () => {
    expect(parseJiraIssueUrl(`${baseUrl}/browse/BJ-12`, '')).toBeNull()
    expect(parseJiraIssueUrl(`${baseUrl}/jira/browse/BJ-12`, `${baseUrl}/jira/`)).toBe('BJ-12')
    expect(parseJiraIssueUrl(`${baseUrl}/browse/BJ-12`, `${baseUrl}/jira`)).toBeNull()
    expect(parseJiraIssueUrl(`${baseUrl}/jira-other/browse/BJ-12`, `${baseUrl}/jira`)).toBeNull()
  })
})

describe('jira link clicks', () => {
  function setupLink() {
    const openTicket = vi.fn()
    const configuredUrl = ref(baseUrl)
    const openInApp = ref(true)
    const href = `${baseUrl}/browse/BJ-12?focusedCommentId=123#comment-123`
    const Host = defineComponent({
      setup() {
        useJiraIssueLinks({ baseUrl: () => configuredUrl.value, openInApp: () => openInApp.value, openTicket })
        return () => h(JiraAdfRenderer, { nodes: [{
          type: 'paragraph',
          content: [{ type: 'text', text: 'Related issue', marks: [{ type: 'link', attrs: { href } }] }],
        }] })
      },
    })
    const wrapper = mount(Host, { attachTo: document.body })
    return { wrapper, openTicket, configuredUrl, openInApp, href }
  }

  it('opens linked text in the app and retains the original href', () => {
    const { wrapper, openTicket, href } = setupLink()
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    wrapper.get('a span').element.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
    expect(openTicket).toHaveBeenCalledExactlyOnceWith('BJ-12')
    expect(wrapper.get('a').attributes('href')).toBe(href)
    wrapper.unmount()
  })

  it('opens the exact original URL on Ctrl-click', () => {
    const { wrapper, openTicket, href } = setupLink()
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    wrapper.get('a span').element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }))
    expect(openTicket).not.toHaveBeenCalled()
    expect(open).toHaveBeenCalledExactlyOnceWith(href, '_blank', 'noopener,noreferrer')
    wrapper.unmount()
    open.mockRestore()
  })

  it('reverses both clicks immediately when the preference changes', () => {
    const { wrapper, openTicket, openInApp, href } = setupLink()
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    openInApp.value = false
    wrapper.get('a span').element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(open).toHaveBeenCalledExactlyOnceWith(href, '_blank', 'noopener,noreferrer')
    expect(openTicket).not.toHaveBeenCalled()
    wrapper.get('a span').element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }))
    expect(openTicket).toHaveBeenCalledExactlyOnceWith('BJ-12')
    expect(open).toHaveBeenCalledTimes(1)
    wrapper.unmount()
    open.mockRestore()
  })

  it.each([true, false])('handles macOS Control-click (open in app: %s) and preserves ordinary context menus', (preference) => {
    const { wrapper, openTicket, openInApp, href } = setupLink()
    openInApp.value = preference
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const ordinaryMenu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 })
    wrapper.get('a span').element.dispatchEvent(ordinaryMenu)
    expect(ordinaryMenu.defaultPrevented).toBe(false)
    expect(open).not.toHaveBeenCalled()
    expect(openTicket).not.toHaveBeenCalled()

    const controlClick = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2, ctrlKey: true })
    wrapper.get('a span').element.dispatchEvent(controlClick)
    expect(controlClick.defaultPrevented).toBe(true)
    if (preference) {
      expect(open).toHaveBeenCalledExactlyOnceWith(href, '_blank', 'noopener,noreferrer')
      expect(openTicket).not.toHaveBeenCalled()
    }
    else {
      expect(openTicket).toHaveBeenCalledExactlyOnceWith('BJ-12')
      expect(open).not.toHaveBeenCalled()
    }
    wrapper.unmount()
    open.mockRestore()
  })

  it.each([{ metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])('preserves other modified clicks: %j', (modifier) => {
    const { wrapper, openTicket } = setupLink()
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, ...modifier })
    wrapper.get('a span').element.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(false)
    expect(openTicket).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('uses the current Jira connection and removes its listener on unmount', () => {
    const { wrapper, openTicket, configuredUrl } = setupLink()
    configuredUrl.value = 'https://another.atlassian.net'
    const anchor = wrapper.get('a').element
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    anchor.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(false)
    configuredUrl.value = baseUrl
    wrapper.unmount()
    document.body.append(anchor)
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(openTicket).not.toHaveBeenCalled()
    anchor.remove()
  })
})

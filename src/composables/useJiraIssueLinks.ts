import { onBeforeUnmount, onMounted } from 'vue'
import { parseJiraIssueUrl } from '@/utils/jiraIssueUrl'

interface JiraIssueLinksOptions {
  baseUrl: () => string
  openInApp: () => boolean
  openTicket: (key: string) => void
}

export function useJiraIssueLinks(options: JiraIssueLinksOptions): void {
  function handleClick(event: MouseEvent): void {
    if (event.defaultPrevented || event.metaKey || event.shiftKey || event.altKey)
      return
    // macOS reports Control-click as a context menu instead of a normal click.
    if (event.type === 'contextmenu' ? !event.ctrlKey : event.button !== 0)
      return

    const link = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (!link || link.hasAttribute('download'))
      return

    const href = link.getAttribute('href')
    const key = href ? parseJiraIssueUrl(href, options.baseUrl()) : null
    if (!href || !key)
      return

    // Capture before the rich-text editor handles the click; leave its document untouched.
    event.preventDefault()
    event.stopPropagation()
    if (event.ctrlKey === options.openInApp()) {
      window.open(href, '_blank', 'noopener,noreferrer')
      return
    }

    options.openTicket(key)
  }

  onMounted(() => {
    document.addEventListener('click', handleClick, true)
    document.addEventListener('contextmenu', handleClick, true)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('click', handleClick, true)
    document.removeEventListener('contextmenu', handleClick, true)
  })
}

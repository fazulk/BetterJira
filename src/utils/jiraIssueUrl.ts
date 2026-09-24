export function buildJiraIssueUrl(baseUrl: string, issueKey: string): string | null {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '')
  const normalizedIssueKey = issueKey.trim()

  if (!normalizedBaseUrl || !normalizedIssueKey) {
    return null
  }

  return `${normalizedBaseUrl}/browse/${encodeURIComponent(normalizedIssueKey)}`
}

export function parseJiraIssueUrl(href: string, baseUrl: string): string | null {
  try {
    const url = new URL(href)
    const base = new URL(baseUrl)
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== base.origin)
      return null

    const basePath = base.pathname.replace(/\/+$/, '')
    if (!url.pathname.startsWith(`${basePath}/`))
      return null

    const path = decodeURIComponent(url.pathname.slice(basePath.length))
    const key = url.searchParams.get('selectedIssue')
      ?? path.match(/^\/browse\/([^/]+)\/?$/)?.[1]
      ?? path.match(/^\/jira\/.+\/issues\/([^/]+)\/?$/)?.[1]

    return key && /^[A-Z]\w*-[1-9]\d*$/i.test(key) ? key.toUpperCase() : null
  }
  catch {
    return null
  }
}

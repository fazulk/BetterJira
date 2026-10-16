import { describe, expect, it } from 'vitest'
import { issueKeyFromDeepLink } from '../electron/deepLink'

describe('betterJira ticket deep links', () => {
  it('opens a ticket by its Jira key', () => {
    expect(issueKeyFromDeepLink('betterjira://issue/LMD-65')).toBe('LMD-65')
    expect(issueKeyFromDeepLink('betterjira://issue/lmd-65')).toBe('LMD-65')
  })

  it.each([
    'https://issue/LMD-65',
    'betterjira://settings/LMD-65',
    'betterjira://user@issue/LMD-65',
    'betterjira://issue/LMD-65/other',
    'betterjira://issue/LMD-65?redirect=https://example.com',
    'betterjira://issue/LMD-65#other',
    'betterjira://issue/../settings',
    'betterjira://issue/LMD-0',
    'not a URL',
  ])('rejects unsupported links: %s', (url) => {
    expect(issueKeyFromDeepLink(url)).toBeNull()
  })
})

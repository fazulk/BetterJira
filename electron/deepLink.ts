export function issueKeyFromDeepLink(rawUrl: string) {
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'betterjira:' || url.host !== 'issue'
      || url.username || url.password || url.search || url.hash) {
      return null
    }
    const key = url.pathname.slice(1)
    return /^[A-Z]\w*-[1-9]\d*$/i.test(key) ? key.toUpperCase() : null
  }
  catch {
    return null
  }
}

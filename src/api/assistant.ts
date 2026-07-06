import type {
  AssistantChatRequest,
  AssistantStreamChunk,
} from '~/shared/assistant'
import { isRecord } from '~/shared/typeGuards'

const ASSISTANT_CHAT_URL = '/api/assistant/chat'

function parseChunk(data: string): AssistantStreamChunk | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  }
  catch {
    // Ignore malformed lines (e.g. SSE comments / keepalives).
    return null
  }

  if (!isRecord(parsed)) {
    return null
  }

  const record = parsed
  const text = typeof record.text === 'string' ? record.text : ''
  const message = typeof record.message === 'string' ? record.message : 'The assistant request failed.'

  if (record.type === 'delta') {
    return { type: 'delta', text }
  }
  if (record.type === 'status') {
    return { type: 'status', text }
  }
  if (record.type === 'done') {
    return { type: 'done' }
  }
  if (record.type === 'error') {
    return { type: 'error', message }
  }
  return null
}

/**
 * Streams an assistant chat turn from the local CLI proxy.
 *
 * Intentional Vue Query bypass: this is a long-lived `text/event-stream` consumed
 * incrementally via a ReadableStream reader, which does not map onto Vue Query's
 * request/response cache model. The composable that drives it owns the reactive
 * transcript and lifecycle instead.
 */
export async function streamAssistantChat(
  request: AssistantChatRequest,
  onChunk: (chunk: AssistantStreamChunk) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(ASSISTANT_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  })

  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => '')
    throw new Error(`Assistant request failed: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      let separatorIndex = buffer.indexOf('\n\n')
      while (separatorIndex !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex)
        buffer = buffer.slice(separatorIndex + 2)

        for (const line of rawEvent.split('\n')) {
          if (line.startsWith('data:')) {
            const chunk = parseChunk(line.slice(5).trim())
            if (chunk) {
              onChunk(chunk)
            }
          }
        }

        separatorIndex = buffer.indexOf('\n\n')
      }
    }
  }
  finally {
    reader.releaseLock()
  }
}

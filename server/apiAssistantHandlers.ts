import type { H3Event } from 'h3'
import type { AssistantChatRequest, AssistantStreamChunk } from '../shared/assistant'
import { getQuery, readBody } from 'h3'
import { isAssistantProvider, normalizeAssistantChatRequest } from '../shared/assistant'
import { streamAssistantChat } from './ai/assistant'
import { getAssistantModels } from './ai/assistantModels'
import { API_HEADERS, badRequestResponse } from './apiRouteUtils'

function encodeChunk(chunk: AssistantStreamChunk): Uint8Array {
  return new TextEncoder().encode(`event: ${chunk.type}\ndata: ${JSON.stringify(chunk)}\n\n`)
}

function assistantChatStream(event: H3Event, request: AssistantChatRequest): Response {
  const abortController = new AbortController()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      const close = (): void => {
        if (closed) {
          return
        }
        closed = true
        try {
          controller.close()
        }
        catch {
          // Stream already closed.
        }
      }

      const enqueue = (chunk: AssistantStreamChunk): void => {
        if (closed) {
          return
        }
        try {
          controller.enqueue(encodeChunk(chunk))
        }
        catch {
          closed = true
        }
        if (chunk.type === 'done' || chunk.type === 'error') {
          close()
        }
      }

      event.node.req.on('close', () => {
        abortController.abort()
        close()
      })

      streamAssistantChat(request, enqueue, abortController.signal)
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'The assistant request failed.'
          enqueue({ type: 'error', message })
        })
        .finally(close)
    },
    cancel() {
      abortController.abort()
    },
  })

  return new Response(stream, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Content-Type': 'text/event-stream',
    },
  })
}

export async function handleAssistantApiRoute(
  event: H3Event,
  segments: string[],
  method: string,
): Promise<Response | null> {
  if (segments.length === 2 && segments[0] === 'assistant' && segments[1] === 'models' && method === 'GET') {
    const provider = getQuery(event).provider
    if (!isAssistantProvider(provider))
      return badRequestResponse('A valid assistant provider is required.')
    const models = await getAssistantModels(provider)
    return Response.json(models, { headers: { ...API_HEADERS, 'Cache-Control': 'no-store' } })
  }

  if (segments.length === 2 && segments[0] === 'assistant' && segments[1] === 'chat' && method === 'POST') {
    const body = await readBody<unknown>(event)
    const request = normalizeAssistantChatRequest(body)
    if (!request) {
      return badRequestResponse('A non-empty user message is required.')
    }
    return assistantChatStream(event, request)
  }

  return null
}

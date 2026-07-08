import type { H3Event } from 'h3'
import { defineEventHandler, getMethod, getRequestURL, readBody } from 'h3'
import { isRecord } from '../../shared/typeGuards'
import { handleAssistantApiRoute } from '../apiAssistantHandlers'
import { handleGeneralApiRoute } from '../apiGeneralHandlers'
import { handleLocalTicketApiRoute } from '../apiLocalTicketHandlers'
import { handleRemoteTicketApiRoute } from '../apiRemoteTicketHandlers'
import { API_HEADERS, notFoundResponse, parseRefreshUpdatedSince } from '../apiRouteUtils'
import { JiraApiError, JiraNetworkError, ValidationError } from '../errors'
import { addClient, removeClient } from '../events'
import { forceRefreshTickets } from '../jira'
import { MissingJiraCredentialsError } from '../jiraCredentials'

function eventStreamResponse(event: H3Event): Response {
  let clientId = -1
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      clientId = addClient(controller)
      controller.enqueue(new TextEncoder().encode(': connected\n\n'))
    },
    cancel() {
      if (clientId >= 0) {
        removeClient(clientId)
      }
    },
  })

  event.node.req.on('close', () => {
    if (clientId >= 0) {
      removeClient(clientId)
      clientId = -1
    }
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

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const url = getRequestURL(event)
  const path = url.pathname.replace(/^\/api\/?/, '')
  const segments = path.split('/').filter(segment => segment.length > 0)

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: API_HEADERS })
  }

  try {
    if (segments.length === 1 && segments[0] === 'events' && method === 'GET') {
      return eventStreamResponse(event)
    }

    const assistantResponse = await handleAssistantApiRoute(event, segments, method)
    if (assistantResponse)
      return assistantResponse

    const generalResponse = await handleGeneralApiRoute(event, segments, method)
    if (generalResponse)
      return generalResponse

    const localTicketResponse = await handleLocalTicketApiRoute(event, segments, method)
    if (localTicketResponse)
      return localTicketResponse

    const remoteTicketResponse = await handleRemoteTicketApiRoute(event, segments, method)
    if (remoteTicketResponse)
      return remoteTicketResponse

    if (segments.length === 1 && segments[0] === 'refresh' && method === 'POST') {
      const body = await readBody<unknown>(event)
      const updatedSince = isRecord(body) ? parseRefreshUpdatedSince(body.updatedSince) : undefined
      const payload = await forceRefreshTickets(updatedSince)
      return Response.json(payload, { headers: API_HEADERS })
    }

    return notFoundResponse()
  }
  catch (error: unknown) {
    if (error instanceof MissingJiraCredentialsError) {
      console.error('Request blocked: Jira credentials missing')
      return Response.json({
        error: error.message,
        code: 'JIRA_CREDENTIALS_MISSING',
        missingKeys: error.missingKeys,
      }, { status: 409, headers: API_HEADERS })
    }

    if (error instanceof ValidationError) {
      console.error('Validation error:', error.message)
      return Response.json({ error: error.message }, { status: 400, headers: API_HEADERS })
    }

    if (error instanceof JiraApiError) {
      // Convention: upstream 404 passes through; every other Jira failure is a 502.
      const status = error.status === 404 ? 404 : 502
      console.error('Jira API error:', error.message)
      return Response.json({ error: error.message }, { status, headers: API_HEADERS })
    }

    if (error instanceof JiraNetworkError) {
      // Couldn't reach Jira at all — a bad gateway from our proxy's perspective.
      console.error('Jira network error:', error.message)
      return Response.json({
        error: error.message,
        code: 'JIRA_NETWORK_ERROR',
        networkCode: error.code,
      }, { status: 502, headers: API_HEADERS })
    }

    const message = error instanceof Error ? error.message : 'Unknown request error'
    console.error('Request error:', message)
    return Response.json({ error: message }, { status: 500, headers: API_HEADERS })
  }
})

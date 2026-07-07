import { AI_PROVIDERS, isAiProvider } from '../shared/ai'
import { isJiraAdfDocument } from '../shared/jiraAdf'
import { isRecord } from '../shared/typeGuards'
import { generateTicketDescription } from './ai/generateDescription'
import { API_HEADERS, badRequestResponse } from './apiRouteUtils'

export async function generateAiDescriptionResponse(body: unknown): Promise<Response> {
  const instruction = isRecord(body) && typeof body.instruction === 'string'
    ? body.instruction.trim()
    : ''

  if (!instruction) {
    return badRequestResponse('AI instruction cannot be empty.')
  }

  const provider = isRecord(body) && isAiProvider(body.provider)
    ? body.provider
    : null

  if (!provider) {
    return badRequestResponse(`provider must be one of: ${AI_PROVIDERS.join(', ')}.`)
  }

  const model = isRecord(body) && typeof body.model === 'string'
    ? body.model.trim()
    : ''

  if (!model) {
    return badRequestResponse('model must be a non-empty string.')
  }

  const currentDescriptionAdf = isRecord(body) && isJiraAdfDocument(body.currentDescriptionAdf)
    ? body.currentDescriptionAdf
    : null

  const description = await generateTicketDescription({
    instruction,
    currentDescriptionAdf,
    provider,
    model,
  })

  return Response.json(description, { headers: API_HEADERS })
}

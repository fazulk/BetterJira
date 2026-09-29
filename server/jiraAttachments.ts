import type { JiraAttachment } from './jiraTypes'
import { isRecord } from '../shared/typeGuards'
import { JiraApiError } from './errors'
import {
  createJiraAuthenticationError,
  formatJiraLogLines,
  formatJiraRequestTarget,
  getJiraConfig,
  isJiraAuthenticationFailure,
  jiraFetch,
  toJiraNetworkError,
} from './jiraClient'
import { mapAttachment } from './jiraIssueMapping'
import { getTicket } from './jiraIssueQueries'

export async function getJiraAttachmentContent(attachmentId: string): Promise<Response> {
  const jiraConfig = getJiraConfig()
  const url = new URL(`${jiraConfig.baseUrl}/rest/api/3/attachment/content/${encodeURIComponent(attachmentId)}`)
  const requestTarget = formatJiraRequestTarget(url)
  const startedAt = Date.now()

  console.warn(formatJiraLogLines('->', 'GET', requestTarget, []))

  let res: Response
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: jiraConfig.authHeader,
        Accept: '*/*',
      },
    })
  }
  catch (error: unknown) {
    const durationMs = Date.now() - startedAt
    const networkError = toJiraNetworkError(error, url)
    console.error(formatJiraLogLines('xx', 'GET', `${requestTarget} (${durationMs}ms)`, [
      `error: ${networkError.message}`,
    ]))
    throw networkError
  }

  const durationMs = Date.now() - startedAt
  console.warn(`[jira] <- ${res.status} GET ${requestTarget} (${durationMs}ms)`)

  if (isJiraAuthenticationFailure(res)) {
    throw createJiraAuthenticationError()
  }

  if (!res.ok) {
    const body = await res.text()
    throw new JiraApiError(res.status, `JIRA attachment API ${res.status}: ${body.slice(0, 200)}`)
  }

  return res
}

export async function getJiraAttachmentContentByFilename(ticketKey: string, filename: string): Promise<Response> {
  const ticket = await getTicket(ticketKey)
  const normalizedFilename = filename.trim().toLowerCase()
  const attachment = ticket.attachments?.find(candidate => candidate.filename === filename)
    ?? ticket.attachments?.find(candidate => candidate.filename.trim().toLowerCase() === normalizedFilename)
  if (!attachment) {
    throw new JiraApiError(404, `No attachment named ${filename} found on ${ticketKey}.`)
  }

  return getJiraAttachmentContent(attachment.id)
}

export async function uploadTicketAttachment(
  key: string,
  file: { filename: string, mimeType: string, data: Uint8Array },
): Promise<JiraAttachment> {
  const jiraConfig = getJiraConfig()
  const url = new URL(`${jiraConfig.baseUrl}/rest/api/3/issue/${encodeURIComponent(key)}/attachments`)
  const requestTarget = formatJiraRequestTarget(url)
  const startedAt = Date.now()
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(file.data)], { type: file.mimeType }), file.filename)

  console.warn(formatJiraLogLines('->', 'POST', requestTarget, [`file: ${file.filename}`]))

  let res: Response
  try {
    res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': jiraConfig.authHeader,
        'Accept': 'application/json',
        'X-Atlassian-Token': 'no-check',
      },
      body: formData,
    })
  }
  catch (error: unknown) {
    const durationMs = Date.now() - startedAt
    const networkError = toJiraNetworkError(error, url)
    console.error(formatJiraLogLines('xx', 'POST', `${requestTarget} (${durationMs}ms)`, [
      `error: ${networkError.message}`,
      `file: ${file.filename}`,
    ]))
    throw networkError
  }

  const durationMs = Date.now() - startedAt
  console.warn(`[jira] <- ${res.status} POST ${requestTarget} (${durationMs}ms)`)

  if (isJiraAuthenticationFailure(res)) {
    throw createJiraAuthenticationError()
  }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`JIRA attachment upload API ${res.status}: ${body.slice(0, 200)}`)
  }

  const uploadedAttachments: unknown = await res.json()
  const [uploadedAttachment] = Array.isArray(uploadedAttachments)
    ? uploadedAttachments.map(attachment => mapAttachment(isRecord(attachment) ? attachment : {})).filter((attachment): attachment is JiraAttachment => attachment !== null)
    : []

  if (!uploadedAttachment) {
    throw new Error('Jira did not return uploaded attachment metadata.')
  }

  return uploadedAttachment
}

export async function deleteTicketAttachment(key: string, attachmentId: string): Promise<void> {
  // Jira deletes by attachment id alone, so confirm it belongs to this ticket first.
  const ticket = await getTicket(key)
  if (!ticket.attachments?.some(attachment => attachment.id === attachmentId)) {
    throw new JiraApiError(404, `No attachment ${attachmentId} found on ${key}.`)
  }

  await jiraFetch(`/attachment/${encodeURIComponent(attachmentId)}`, { method: 'DELETE' })
}

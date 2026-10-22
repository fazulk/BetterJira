import { isRecord } from '../shared/typeGuards'
import { jiraFetch } from './jiraClient'

let fieldIdPromise: Promise<string | null> | null = null

export function resolveAdditionalBugDetailsFieldId() {
  fieldIdPromise ??= findAdditionalBugDetailsFieldId().catch((error: unknown) => {
    fieldIdPromise = null
    throw error
  })
  return fieldIdPromise
}

async function findAdditionalBugDetailsFieldId() {
  const matches: string[] = []
  let startAt = 0
  while (true) {
    const data = await jiraFetch('/field/search', {
      params: { query: 'Additional', maxResults: '50', startAt: String(startAt) },
    })
    if (!isRecord(data) || !Array.isArray(data.values))
      break
    for (const field of data.values) {
      if (!isRecord(field) || typeof field.id !== 'string' || typeof field.name !== 'string')
        continue
      if (field.name.toLowerCase().replace(/\s/g, '') !== 'additionalbugdetails')
        continue
      const schema = isRecord(field.schema) ? field.schema : null
      if (schema?.custom === 'com.atlassian.jira.plugin.system.customfieldtypes:textarea')
        matches.push(field.id)
    }
    startAt += data.values.length
    if (!data.values.length || data.isLast === true || typeof data.total !== 'number' || startAt >= data.total)
      break
  }
  return matches.length === 1 ? matches[0]! : null
}

export function canEditAdditionalBugDetails(editmeta: unknown, fieldId: string) {
  if (!isRecord(editmeta) || !isRecord(editmeta.fields))
    return false
  const field = editmeta.fields[fieldId]
  return isRecord(field) && Array.isArray(field.operations) && field.operations.includes('set')
}

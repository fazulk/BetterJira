import { randomUUID } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { isRecord } from '../shared/typeGuards'
import { getAppDataDir } from './runtimePaths'

const credentialsFilePath = resolve(getAppDataDir(), 'credentials.json')

export interface StoredCredentials {
  jiraApiToken: string
  cerebrasApiKey: string
}

export function readStoredCredentials(): StoredCredentials {
  if (!existsSync(credentialsFilePath)) {
    return { jiraApiToken: '', cerebrasApiKey: '' }
  }

  const value: unknown = JSON.parse(readFileSync(credentialsFilePath, 'utf8'))
  if (!isRecord(value) || typeof value.jiraApiToken !== 'string' || typeof value.cerebrasApiKey !== 'string') {
    throw new Error('Invalid credentials file')
  }

  return {
    jiraApiToken: value.jiraApiToken.trim(),
    cerebrasApiKey: value.cerebrasApiKey.trim(),
  }
}

export function writeStoredCredentials(credentials: StoredCredentials): void {
  mkdirSync(dirname(credentialsFilePath), { recursive: true })
  const temporaryPath = `${credentialsFilePath}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(credentials, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
    renameSync(temporaryPath, credentialsFilePath)
    chmodSync(credentialsFilePath, 0o600)
  }
  catch (error) {
    rmSync(temporaryPath, { force: true })
    throw error
  }
}

export function migrateLegacyCredentials(credentials: StoredCredentials): void {
  if (existsSync(credentialsFilePath)) {
    readStoredCredentials()
    return
  }
  writeStoredCredentials(credentials)
}

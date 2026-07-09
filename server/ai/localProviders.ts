import type { AiProvider, AiProviderAvailability, CliToolAvailability } from '../../shared/ai'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'
import process from 'node:process'

export type LocalAiProvider = 'codex' | 'claude'

interface LocalProviderCommandConfig {
  provider: LocalAiProvider
  command: string
  label: string
}

const LOCAL_PROVIDER_COMMANDS: LocalProviderCommandConfig[] = [
  { provider: 'codex', command: 'codex', label: 'Codex CLI' },
  { provider: 'claude', command: 'claude', label: 'Claude Code CLI' },
]

const LOCAL_PROVIDER_CACHE_TTL_MS = 15_000
let cachedProviderAvailability: AiProviderAvailability[] | null = null
let cachedProviderAvailabilityAt = 0
let cachedAcliAvailability: CliToolAvailability | null = null
let cachedAcliAvailabilityAt = 0

function isLocalAiProvider(provider: AiProvider): provider is LocalAiProvider {
  return provider === 'codex' || provider === 'claude'
}

function getEnvironmentValue(name: string): string | undefined {
  const directValue = process.env[name]
  if (directValue !== undefined || process.platform !== 'win32') {
    return directValue
  }

  return Object.entries(process.env).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1]
}

function getPathEntries(): string[] {
  const entries = new Set<string>()
  const envPath = getEnvironmentValue('PATH') ?? ''

  for (const entry of envPath.split(delimiter)) {
    if (entry.trim()) {
      entries.add(entry.trim())
    }
  }

  const home = homedir()
  const fnmMultishellsPath = join(home, '.local', 'state', 'fnm_multishells')
  const appData = getEnvironmentValue('APPDATA')
  const localAppData = getEnvironmentValue('LOCALAPPDATA')
  const staticEntries = process.platform === 'win32'
    ? [
        appData ? join(appData, 'npm') : join(home, 'AppData', 'Roaming', 'npm'),
        join(home, '.local', 'bin'),
        join(home, '.bun', 'bin'),
        join(home, 'scoop', 'shims'),
        ...(localAppData ? [join(localAppData, 'Programs', 'Atlassian', 'acli')] : []),
      ]
    : [
        '/opt/homebrew/bin',
        '/usr/local/bin',
        join(home, '.local', 'bin'),
        join(home, '.npm-global', 'bin'),
        join(home, '.bun', 'bin'),
        join(home, '.fnm', 'aliases', 'default', 'bin'),
      ]

  for (const entry of staticEntries) {
    entries.add(entry)
  }

  if (existsSync(fnmMultishellsPath)) {
    try {
      for (const entry of readdirSync(fnmMultishellsPath, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          entries.add(join(fnmMultishellsPath, entry.name, 'bin'))
        }
      }
    }
    catch {
      // Ignore unreadable shell-manager directories; shell resolution below is still attempted.
    }
  }

  return [...entries]
}

export function commandPathCandidates(
  command: string,
  platform: NodeJS.Platform = process.platform,
  pathExt = getEnvironmentValue('PATHEXT'),
): string[] {
  if (platform !== 'win32' || /\.[^./\\]+$/.test(command)) {
    return [command]
  }

  const extensions = (pathExt ?? '.COM;.EXE;.BAT;.CMD')
    .split(';')
    .map(extension => extension.trim())
    .filter(Boolean)
    .map(extension => extension.startsWith('.') ? extension : `.${extension}`)

  return extensions.map(extension => `${command}${extension.toLowerCase()}`)
}

export function requiresWindowsCommandShell(
  commandPath: string,
  platform: NodeJS.Platform = process.platform,
): boolean {
  return platform === 'win32' && /\.(?:bat|cmd)$/i.test(commandPath)
}

export function resolveCommandFromPaths(
  command: string,
  pathEntries: string[],
  platform: NodeJS.Platform = process.platform,
  pathExt = getEnvironmentValue('PATHEXT'),
): string | null {
  for (const entry of pathEntries) {
    for (const candidate of commandPathCandidates(command, platform, pathExt)) {
      const candidatePath = join(entry, candidate)
      if (existsSync(candidatePath)) {
        return candidatePath
      }
    }
  }

  return null
}

function resolveFromCandidatePaths(command: string): string | null {
  return resolveCommandFromPaths(command, getPathEntries())
}

function resolveFromUserShell(command: string): string | null {
  const shells = [process.env.SHELL, '/bin/zsh', '/bin/bash'].filter((value, index, values): value is string => (
    typeof value === 'string' && value.length > 0 && values.indexOf(value) === index
  ))

  for (const shellPath of shells) {
    if (!existsSync(shellPath)) {
      continue
    }

    try {
      const output = execFileSync(shellPath, ['-lc', `command -v ${command}`], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 1500,
      }).trim()
      const [firstLine] = output.split(/\r?\n/)

      if (firstLine && firstLine.startsWith('/')) {
        return firstLine
      }
    }
    catch {
      // Try the next shell or path-based fallback.
    }
  }

  return null
}

function resolveCommandPath(command: string): string | null {
  return resolveFromCandidatePaths(command) ?? resolveFromUserShell(command)
}

function createAvailability(config: LocalProviderCommandConfig): AiProviderAvailability {
  const commandPath = resolveCommandPath(config.command)

  if (!commandPath) {
    return {
      provider: config.provider,
      available: false,
      detail: `${config.label} was not found on this computer.`,
    }
  }

  return {
    provider: config.provider,
    available: true,
    detail: `${config.label} detected at ${commandPath}.`,
    commandPath,
  }
}

export function acliInstallInstructions(platform: NodeJS.Platform = process.platform): string[] {
  if (platform === 'win32') {
    return [
      'In PowerShell, download ACLI: Invoke-WebRequest -Uri https://acli.atlassian.com/windows/latest/acli_windows_amd64/acli.exe -OutFile acli.exe',
      'Move acli.exe to a directory on your PATH, then restart BetterJira.',
      'acli jira auth login --web',
      'https://developer.atlassian.com/cloud/acli/guides/install-windows/',
    ]
  }

  if (platform === 'darwin') {
    return [
      'brew tap atlassian/homebrew-acli && brew install acli',
      'acli jira auth login --web',
      'https://developer.atlassian.com/cloud/acli/guides/install-macos/',
    ]
  }

  return [
    'Install ACLI using your Linux distribution package manager, then ensure the acli command is on PATH.',
    'acli jira auth login --web',
    'https://developer.atlassian.com/cloud/acli/guides/install-linux/',
  ]
}

function createAcliAvailability(): CliToolAvailability {
  const commandPath = resolveCommandPath('acli')

  if (!commandPath) {
    return {
      tool: 'acli',
      label: 'Atlassian CLI',
      available: false,
      detail: 'Atlassian CLI was not found on this computer. Jira actions will not work until it is installed and authenticated.',
      installInstructions: acliInstallInstructions(),
    }
  }

  return {
    tool: 'acli',
    label: 'Atlassian CLI',
    available: true,
    detail: `Atlassian CLI detected at ${commandPath}.`,
    commandPath,
  }
}

export function getLocalAiCommandPathEnv(): string {
  return getPathEntries().join(delimiter)
}

export function getLocalAiProviderAvailability(): AiProviderAvailability[] {
  const now = Date.now()
  if (cachedProviderAvailability && now - cachedProviderAvailabilityAt < LOCAL_PROVIDER_CACHE_TTL_MS) {
    return cachedProviderAvailability
  }

  cachedProviderAvailability = LOCAL_PROVIDER_COMMANDS.map(createAvailability)
  cachedProviderAvailabilityAt = now
  return cachedProviderAvailability
}

export function getAcliAvailability(): CliToolAvailability {
  const now = Date.now()
  if (cachedAcliAvailability && now - cachedAcliAvailabilityAt < LOCAL_PROVIDER_CACHE_TTL_MS) {
    return cachedAcliAvailability
  }

  cachedAcliAvailability = createAcliAvailability()
  cachedAcliAvailabilityAt = now
  return cachedAcliAvailability
}

export function resolveLocalAiCommand(provider: LocalAiProvider): string | null {
  const cachedAvailability = getLocalAiProviderAvailability().find(entry => entry.provider === provider)
  if (cachedAvailability?.commandPath) {
    return cachedAvailability.commandPath
  }

  const config = LOCAL_PROVIDER_COMMANDS.find(entry => entry.provider === provider)
  return config ? resolveCommandPath(config.command) : null
}

export function assertLocalAiProviderConfigured(provider: AiProvider): void {
  if (!isLocalAiProvider(provider)) {
    return
  }

  if (resolveLocalAiCommand(provider)) {
    return
  }

  const label = provider === 'codex' ? 'Codex CLI' : 'Claude Code CLI'
  const command = provider === 'codex' ? 'codex' : 'claude'
  throw new Error(`${label} is selected but the ${command} command was not found on this computer.`)
}

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  acliInstallInstructions,
  commandPathCandidates,
  requiresWindowsCommandShell,
  resolveCommandFromPaths,
} from '../server/ai/localProviders'

describe('windows local CLI support', () => {
  it('shows Windows ACLI installation guidance instead of macOS Homebrew commands', () => {
    const instructions = acliInstallInstructions('win32')

    expect(instructions.join('\n')).toContain('Invoke-WebRequest')
    expect(instructions.join('\n')).toContain('acli.exe')
    expect(instructions.join('\n')).not.toContain('brew')
  })

  it('considers executable extensions from PATHEXT when resolving commands', () => {
    expect(commandPathCandidates('codex', 'win32', '.COM;.EXE;.BAT;.CMD')).toEqual([
      'codex.com',
      'codex.exe',
      'codex.bat',
      'codex.cmd',
    ])
    expect(commandPathCandidates('claude', 'win32', '.EXE;.CMD')).toEqual(['claude.exe', 'claude.cmd'])
    expect(commandPathCandidates('acli', 'win32', '.EXE;.CMD')).toEqual(['acli.exe', 'acli.cmd'])
  })

  it('preserves an explicit executable extension and shells npm command wrappers', () => {
    expect(commandPathCandidates('claude.cmd', 'win32', '.EXE;.CMD')).toEqual(['claude.cmd'])
    expect(requiresWindowsCommandShell('C:\\Users\\Jane Doe\\AppData\\Roaming\\npm\\codex.cmd', 'win32')).toBe(true)
    expect(requiresWindowsCommandShell('C:\\tools\\acli.exe', 'win32')).toBe(false)
  })

  it('resolves npm wrappers and native executables from a Windows PATH entry', async () => {
    const commandDirectory = await mkdtemp(join(tmpdir(), 'better-jira-windows-cli-'))
    const codexPath = join(commandDirectory, 'codex.cmd')
    const claudePath = join(commandDirectory, 'claude.cmd')
    const acliPath = join(commandDirectory, 'acli.exe')

    try {
      await Promise.all([writeFile(codexPath, ''), writeFile(claudePath, ''), writeFile(acliPath, '')])

      expect(resolveCommandFromPaths('codex', [commandDirectory], 'win32', '.EXE;.CMD')).toBe(codexPath)
      expect(resolveCommandFromPaths('claude', [commandDirectory], 'win32', '.EXE;.CMD')).toBe(claudePath)
      expect(resolveCommandFromPaths('acli', [commandDirectory], 'win32', '.EXE;.CMD')).toBe(acliPath)
    }
    finally {
      await rm(commandDirectory, { recursive: true, force: true })
    }
  })
})

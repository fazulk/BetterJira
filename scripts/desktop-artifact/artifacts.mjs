import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { dirname, extname, join, relative } from 'node:path'
import process from 'node:process'
import { buildEnv, runCommand } from './command.mjs'
import { fail, log, PLATFORM_CONFIG, repoDir } from './config.mjs'

async function collectFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = join(rootDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)))
      continue
    }
    files.push(entryPath)
  }

  return files
}

export async function copyArtifacts(sourceFiles, sourceRoot, outputDir) {
  await mkdir(outputDir, { recursive: true })
  const copiedPaths = []

  for (const sourceFile of sourceFiles) {
    const relativePath = relative(sourceRoot, sourceFile)
    const destination = join(outputDir, relativePath)
    await mkdir(dirname(destination), { recursive: true })
    await copyFile(sourceFile, destination)
    copiedPaths.push(destination)
  }

  return copiedPaths
}

async function listFinalArtifactFiles(distDir) {
  const sourceFiles = await collectFiles(distDir)
  return sourceFiles.filter((sourceFile) => {
    const relativePath = relative(distDir, sourceFile)
    const segments = relativePath.split(/[\\/]/)
    if (segments.some(segment => segment.endsWith('.app') || segment.endsWith('-unpacked'))) {
      return false
    }

    const extension = extname(sourceFile)
    if (!extension) {
      return false
    }

    return true
  })
}

export async function buildPlatformArtifact(stageAppDir, options, targets = [options.target]) {
  log(`[desktop-artifact] Packaging ${options.platform}/${targets.join('+')} (arch=${options.arch})...`)
  await runCommand(
    'bun',
    [
      'x',
      'electron-builder',
      '--config',
      'electron-builder.yml',
      PLATFORM_CONFIG[options.platform].cliFlag,
      ...targets,
      `--${options.arch}`,
      '--publish',
      'never',
    ],
    {
      cwd: stageAppDir,
      env: buildEnv(),
      verbose: options.verbose,
    },
  )

  const distDir = join(stageAppDir, 'dist')
  const sourceFiles = await listFinalArtifactFiles(distDir)
  if (sourceFiles.length === 0) {
    fail(`Build completed but no artifacts were produced in ${distDir}`)
  }

  return copyArtifacts(sourceFiles, distDir, options.outputDir)
}

export async function openArtifacts(artifactPaths, verbose) {
  if (process.platform !== 'darwin') {
    fail('--open is only supported on macOS.')
  }

  for (const artifactPath of artifactPaths) {
    log(`[desktop-artifact] Opening ${artifactPath}...`)
    await runCommand('open', [artifactPath], {
      cwd: repoDir,
      env: process.env,
      verbose,
      shell: false,
    })
  }
}

import { cp, mkdir, readdir, readlink, rm, symlink, unlink } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import process from 'node:process'
import { buildPlatformArtifact } from './artifacts.mjs'
import { buildEnv, runCommand } from './command.mjs'
import { fail, log } from './config.mjs'

async function findAppBundle(distDir) {
  const files = await readdir(distDir, { withFileTypes: true })
  for (const entry of files) {
    const entryPath = join(distDir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.endsWith('.app')) {
        return entryPath
      }
      const nested = await findAppBundle(entryPath)
      if (nested) {
        return nested
      }
    }
  }

  return null
}

async function patchAndSignMacApp(appBundlePath, verbose) {
  const frameworksDir = join(appBundlePath, 'Contents', 'Frameworks')
  const frameworkEntries = await readdir(frameworksDir, { withFileTypes: true })
  for (const frameworkEntry of frameworkEntries) {
    if (!frameworkEntry.isDirectory() || !frameworkEntry.name.endsWith('.framework')) {
      continue
    }

    const frameworkDir = join(frameworksDir, frameworkEntry.name)
    const frameworkChildren = await readdir(frameworkDir)
    for (const childName of frameworkChildren) {
      if (childName === 'Versions') {
        continue
      }

      const linkPath = join(frameworkDir, childName)
      try {
        await readlink(linkPath)
      }
      catch {
        continue
      }

      await unlink(linkPath)
      await symlink(join('Versions', 'Current', childName), linkPath)
    }
  }

  const plistPath = join(appBundlePath, 'Contents', 'Info.plist')
  await runCommand('plutil', ['-remove', 'ElectronAsarIntegrity', plistPath], {
    cwd: dirname(appBundlePath),
    env: process.env,
    verbose,
  })
  await runCommand('codesign', ['--force', '--deep', '-s', '-', appBundlePath], {
    cwd: dirname(appBundlePath),
    env: process.env,
    verbose,
  })
}

async function copyMacDirArtifact(appBundlePath, distDir, outputDir) {
  const relativeBundlePath = relative(distDir, appBundlePath)
  const destination = join(outputDir, relativeBundlePath)
  await rm(destination, { recursive: true, force: true })
  await mkdir(dirname(destination), { recursive: true })
  await cp(appBundlePath, destination, { recursive: true, verbatimSymlinks: true })
  return [destination]
}

export async function buildMacArtifact(stageAppDir, options) {
  // Release artifacts go through electron-builder directly so it Developer ID
  // signs, notarizes (when APPLE_* credentials are set), and emits the zip +
  // latest-mac.yml that electron-updater needs on macOS alongside the dmg.
  if (options.target !== 'dir') {
    return buildPlatformArtifact(stageAppDir, options, ['dmg', 'zip'])
  }

  // Local dev `dir` builds skip signing/notarization for speed; the ad-hoc
  // re-sign below keeps the modified bundle launchable on Apple Silicon.
  log(`[desktop-artifact] Packaging mac/dir (arch=${options.arch})...`)
  await runCommand(
    'bun',
    [
      'x',
      'electron-builder',
      '--config',
      'electron-builder.yml',
      '--mac',
      '--dir',
      `--${options.arch}`,
      '--publish',
      'never',
    ],
    {
      cwd: stageAppDir,
      env: buildEnv({ signing: false }),
      verbose: options.verbose,
    },
  )

  const distDir = join(stageAppDir, 'dist')
  const appBundlePath = await findAppBundle(distDir)
  if (!appBundlePath) {
    fail(`Could not find macOS app bundle in ${distDir}`)
  }

  await patchAndSignMacApp(appBundlePath, options.verbose)
  return copyMacDirArtifact(appBundlePath, distDir, options.outputDir)
}

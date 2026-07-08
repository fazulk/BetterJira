#!/usr/bin/env node
import { rm } from 'node:fs/promises'

import process from 'node:process'
import { buildPlatformArtifact, openArtifacts } from './desktop-artifact/artifacts.mjs'
import { log, parseArgs, resolveOptions } from './desktop-artifact/config.mjs'
import { buildMacArtifact } from './desktop-artifact/mac.mjs'
import {
  ensureBuildOutputs,
  installStageDependencies,
  loadRootPackageJson,
  loadServerPackageJson,
  stageApp,
} from './desktop-artifact/stage.mjs'

async function main() {
  const options = resolveOptions(parseArgs(process.argv.slice(2)))
  const rootPackageJson = await loadRootPackageJson()

  await ensureBuildOutputs(options.skipBuild, options.verbose)
  const serverPackageJson = await loadServerPackageJson()
  const { stageRoot, stageAppDir } = await stageApp(rootPackageJson, serverPackageJson)

  try {
    await installStageDependencies(stageAppDir, options.verbose)

    const copiedArtifacts
      = options.platform === 'mac'
        ? await buildMacArtifact(stageAppDir, options)
        : await buildPlatformArtifact(stageAppDir, options)

    log('[desktop-artifact] Done. Artifacts:')
    for (const artifactPath of copiedArtifacts) {
      log(`  ${artifactPath}`)
    }

    if (options.open) {
      await openArtifacts(copiedArtifacts, options.verbose)
    }

    if (options.keepStage) {
      log(`[desktop-artifact] Kept stage at ${stageRoot}`)
    }
  }
  finally {
    if (!options.keepStage) {
      await rm(stageRoot, { recursive: true, force: true })
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})

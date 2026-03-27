import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const packageJson = JSON.parse(
  readFileSync(join(root, 'package.json'), 'utf-8')
)
const version = packageJson.version

const define = { __DUST_VERSION__: JSON.stringify(version) }

// Bundle core principles before building
const bundlePrinciples = Bun.spawn(
  ['bun', 'run', join(root, 'scripts', 'bundle-core-principles.ts')],
  {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
  }
)
const bundleExitCode = await bundlePrinciples.exited
if (bundleExitCode !== 0) {
  console.error('Failed to bundle core principles')
  process.exit(bundleExitCode)
}

const bundles: { entrypoint: string; outfile: string; shebang?: boolean }[] = [
  { entrypoint: 'lib/cli/run.ts', outfile: 'dist/dust.js', shebang: true },
  { entrypoint: 'lib/logging/index.ts', outfile: 'dist/logging.js' },
  { entrypoint: 'lib/agents/detection.ts', outfile: 'dist/agents.js' },
  { entrypoint: 'lib/artifacts/index.ts', outfile: 'dist/artifacts.js' },
  { entrypoint: 'lib/audits/index.ts', outfile: 'dist/audits.js' },
  { entrypoint: 'lib/biome/index.ts', outfile: 'dist/biome.js' },
  {
    entrypoint: 'lib/filesystem/emulator.ts',
    outfile: 'dist/filesystem-emulator.js',
  },
  { entrypoint: 'lib/validation/index.ts', outfile: 'dist/validation.js' },
  { entrypoint: 'lib/patch/index.ts', outfile: 'dist/patch.js' },
  {
    entrypoint: 'lib/core-principles.ts',
    outfile: 'dist/core-principles.js',
  },
]

for (const { entrypoint, outfile, shebang } of bundles) {
  const result = await Bun.build({
    entrypoints: [join(root, entrypoint)],
    outdir: join(root, 'dist'),
    target: 'node',
    define,
    naming: outfile.replace('dist/', ''),
  })

  if (!result.success) {
    console.error(`Failed to build ${entrypoint}:`, result.logs)
    process.exit(1)
  }

  if (shebang) {
    const path = join(root, outfile)
    const content = readFileSync(path, 'utf-8')
    await Bun.write(path, `#!/usr/bin/env node\n${content}`)
  }
}

// Emit declaration files
const tsc = Bun.spawn(['bunx', 'tsc', '--project', 'tsconfig.build.json'], {
  cwd: root,
  stdout: 'inherit',
  stderr: 'inherit',
})
const exitCode = await tsc.exited
if (exitCode !== 0) {
  process.exit(exitCode)
}

console.log(`Built v${version}`)

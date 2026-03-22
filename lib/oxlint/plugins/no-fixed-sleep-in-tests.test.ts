import { spawn } from 'node:child_process'
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolvePath(currentDir, '../../..')

async function lint(code: string, filename: string): Promise<string> {
  const dir = join(tmpdir(), `oxlint-test-${Date.now()}-${Math.random()}`)
  const pluginsDir = join(dir, 'lib', 'oxlint', 'plugins')
  await mkdir(pluginsDir, { recursive: true })

  // Copy plugin files
  await copyFile(
    join(projectRoot, 'lib/oxlint/plugins/dust.js'),
    join(pluginsDir, 'dust.js')
  )
  await copyFile(
    join(projectRoot, 'lib/oxlint/plugins/no-fixed-sleep-in-tests.js'),
    join(pluginsDir, 'no-fixed-sleep-in-tests.js')
  )
  await copyFile(
    join(projectRoot, 'lib/oxlint/plugins/no-thin-delegate-wrappers.js'),
    join(pluginsDir, 'no-thin-delegate-wrappers.js')
  )
  await copyFile(
    join(
      projectRoot,
      'lib/oxlint/plugins/command-exports-matching-filename.js'
    ),
    join(pluginsDir, 'command-exports-matching-filename.js')
  )

  const oxlintConfig = JSON.stringify({
    jsPlugins: ['./lib/oxlint/plugins/dust.js'],
    rules: {
      'dust/no-fixed-sleep-in-tests': 'error',
    },
  })

  await writeFile(join(dir, '.oxlintrc.json'), oxlintConfig)
  await writeFile(join(dir, filename), code)

  return new Promise((onResolve, onReject) => {
    const proc = spawn('bunx', ['oxlint', filename], { cwd: dir })
    let output = ''
    proc.stdout.on('data', data => (output += data))
    proc.stderr.on('data', data => (output += data))
    proc.on('close', async () => {
      await rm(dir, { recursive: true })
      onResolve(output)
    })
    proc.on('error', onReject)
  })
}

describe('no-fixed-sleep-in-tests', () => {
  describe('setTimeout', () => {
    test('flags setTimeout with non-zero numeric delay', async () => {
      const output = await lint(`setTimeout(() => {}, 100)`, 'example.test.ts')
      expect(output).toContain('no-fixed-sleep-in-tests')
    })

    test('flags setTimeout with variable delay', async () => {
      const output = await lint(
        `const delay = 100; setTimeout(() => {}, delay)`,
        'example.test.ts'
      )
      expect(output).toContain('no-fixed-sleep-in-tests')
    })

    test('allows setTimeout with zero delay', async () => {
      const output = await lint(`setTimeout(() => {}, 0)`, 'example.test.ts')
      expect(output).not.toContain('no-fixed-sleep-in-tests')
    })

    test('flags globalThis.setTimeout with non-zero delay', async () => {
      const output = await lint(
        `globalThis.setTimeout(() => {}, 10)`,
        'example.test.ts'
      )
      expect(output).toContain('no-fixed-sleep-in-tests')
    })

    test('allows globalThis.setTimeout with zero delay', async () => {
      const output = await lint(
        `globalThis.setTimeout(() => {}, 0)`,
        'example.test.ts'
      )
      expect(output).not.toContain('no-fixed-sleep-in-tests')
    })
  })

  describe('sleep', () => {
    test('flags sleep with non-zero numeric delay', async () => {
      const output = await lint(`await sleep(100)`, 'example.test.ts')
      expect(output).toContain('no-fixed-sleep-in-tests')
    })

    test('flags sleep with variable delay', async () => {
      const output = await lint(
        `const delay = 100; await sleep(delay)`,
        'example.test.ts'
      )
      expect(output).toContain('no-fixed-sleep-in-tests')
    })

    test('allows sleep with zero delay', async () => {
      const output = await lint(`await sleep(0)`, 'example.test.ts')
      expect(output).not.toContain('no-fixed-sleep-in-tests')
    })
  })

  describe('file filtering', () => {
    test('ignores non-test files', async () => {
      const output = await lint(`setTimeout(() => {}, 100)`, 'example.ts')
      expect(output).not.toContain('no-fixed-sleep-in-tests')
    })

    test('applies to .test.ts files', async () => {
      const output = await lint(`setTimeout(() => {}, 100)`, 'example.test.ts')
      expect(output).toContain('no-fixed-sleep-in-tests')
    })
  })
})

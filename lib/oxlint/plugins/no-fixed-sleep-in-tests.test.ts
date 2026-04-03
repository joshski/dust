import { spawn } from 'node:child_process'
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolvePath(currentDir, '../../..')
const oxlintBin = join(projectRoot, 'node_modules/.bin/oxlint')

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
    const proc = spawn(oxlintBin, [filename], { cwd: dir })
    let output = ''
    let resolved = false

    const finalize = async (
      result:
        | { success: true; output: string }
        | { success: false; error: Error }
    ) => {
      if (resolved) return
      resolved = true

      clearTimeout(timeout)

      try {
        proc.kill()
      } catch {
        // Ignore errors when killing process
      }

      try {
        await rm(dir, { recursive: true })
      } catch {
        // Ignore cleanup errors
      }

      if (result.success) {
        onResolve(result.output)
      } else {
        onReject(result.error)
      }
    }

    // oxlint-disable-next-line dust/no-fixed-sleep-in-tests -- timeout needed to prevent hanging tests
    const timeout = setTimeout(() => {
      finalize({ success: false, error: new Error('oxlint process timed out') })
    }, 10000)

    proc.stdout?.on('data', data => (output += data))
    proc.stderr?.on('data', data => (output += data))

    proc.on('close', () => {
      finalize({ success: true, output })
    })

    proc.on('error', error => {
      finalize({ success: false, error })
    })
  })
}

describe('no-fixed-sleep-in-tests', () => {
  describe('setTimeout', () => {
    test('flags setTimeout with non-zero numeric delay', async () => {
      const output = await lint(`setTimeout(() => {}, 100)`, 'example.test.ts')
      expect(output).toContain('no-fixed-sleep-in-tests')
    }, 15000)

    test('flags setTimeout with variable delay', async () => {
      const output = await lint(
        `const delay = 100; setTimeout(() => {}, delay)`,
        'example.test.ts'
      )
      expect(output).toContain('no-fixed-sleep-in-tests')
    }, 15000)

    test('allows setTimeout with zero delay', async () => {
      const output = await lint(`setTimeout(() => {}, 0)`, 'example.test.ts')
      expect(output).not.toContain('no-fixed-sleep-in-tests')
    }, 15000)

    test('flags globalThis.setTimeout with non-zero delay', async () => {
      const output = await lint(
        `globalThis.setTimeout(() => {}, 10)`,
        'example.test.ts'
      )
      expect(output).toContain('no-fixed-sleep-in-tests')
    }, 15000)

    test('allows globalThis.setTimeout with zero delay', async () => {
      const output = await lint(
        `globalThis.setTimeout(() => {}, 0)`,
        'example.test.ts'
      )
      expect(output).not.toContain('no-fixed-sleep-in-tests')
    }, 15000)
  })

  describe('sleep', () => {
    test('flags sleep with non-zero numeric delay', async () => {
      const output = await lint(`await sleep(100)`, 'example.test.ts')
      expect(output).toContain('no-fixed-sleep-in-tests')
    }, 15000)

    test('flags sleep with variable delay', async () => {
      const output = await lint(
        `const delay = 100; await sleep(delay)`,
        'example.test.ts'
      )
      expect(output).toContain('no-fixed-sleep-in-tests')
    }, 15000)

    test('allows sleep with zero delay', async () => {
      const output = await lint(`await sleep(0)`, 'example.test.ts')
      expect(output).not.toContain('no-fixed-sleep-in-tests')
    }, 15000)
  })

  describe('file filtering', () => {
    test('ignores non-test files', async () => {
      const output = await lint(`setTimeout(() => {}, 100)`, 'example.ts')
      expect(output).not.toContain('no-fixed-sleep-in-tests')
    }, 15000)

    test('applies to .test.ts files', async () => {
      const output = await lint(`setTimeout(() => {}, 100)`, 'example.test.ts')
      expect(output).toContain('no-fixed-sleep-in-tests')
    }, 15000)
  })
})

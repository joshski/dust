import { spawn } from 'node:child_process'
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

const currentDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolvePath(currentDir, '../../..')
const oxlintBin = join(projectRoot, 'node_modules/.bin/oxlint')

let sharedDir: string
let testCounter = 0

beforeAll(async () => {
  sharedDir = join(tmpdir(), `oxlint-test-${Date.now()}`)
  const pluginsDir = join(sharedDir, 'lib', 'oxlint', 'plugins')
  await mkdir(pluginsDir, { recursive: true })

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

  await writeFile(join(sharedDir, '.oxlintrc.json'), oxlintConfig)
}, 15000)

afterAll(async () => {
  try {
    await rm(sharedDir, { recursive: true })
  } catch {
    // Ignore cleanup errors
  }
})

async function lint(code: string, ext: 'ts' | 'test.ts'): Promise<string> {
  const id = testCounter++
  const filename = `example-${id}.${ext}`
  await writeFile(join(sharedDir, filename), code)

  return new Promise((onResolve, onReject) => {
    const proc = spawn(oxlintBin, [filename], { cwd: sharedDir })
    let output = ''
    let resolved = false

    const finalize = (
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
    test.concurrent('flags setTimeout with non-zero numeric delay', async () => {
      const output = await lint(`setTimeout(() => {}, 100)`, 'test.ts')
      expect(output).toContain('no-fixed-sleep-in-tests')
    }, 15000)

    test.concurrent('flags setTimeout with variable delay', async () => {
      const output = await lint(
        `const delay = 100; setTimeout(() => {}, delay)`,
        'test.ts'
      )
      expect(output).toContain('no-fixed-sleep-in-tests')
    }, 15000)

    test.concurrent('allows setTimeout with zero delay', async () => {
      const output = await lint(`setTimeout(() => {}, 0)`, 'test.ts')
      expect(output).not.toContain('no-fixed-sleep-in-tests')
    }, 15000)

    test.concurrent('flags globalThis.setTimeout with non-zero delay', async () => {
      const output = await lint(
        `globalThis.setTimeout(() => {}, 10)`,
        'test.ts'
      )
      expect(output).toContain('no-fixed-sleep-in-tests')
    }, 15000)

    test.concurrent('allows globalThis.setTimeout with zero delay', async () => {
      const output = await lint(`globalThis.setTimeout(() => {}, 0)`, 'test.ts')
      expect(output).not.toContain('no-fixed-sleep-in-tests')
    }, 15000)
  })

  describe('sleep', () => {
    test.concurrent('flags sleep with non-zero numeric delay', async () => {
      const output = await lint(`await sleep(100)`, 'test.ts')
      expect(output).toContain('no-fixed-sleep-in-tests')
    }, 15000)

    test.concurrent('flags sleep with variable delay', async () => {
      const output = await lint(
        `const delay = 100; await sleep(delay)`,
        'test.ts'
      )
      expect(output).toContain('no-fixed-sleep-in-tests')
    }, 15000)

    test.concurrent('allows sleep with zero delay', async () => {
      const output = await lint(`await sleep(0)`, 'test.ts')
      expect(output).not.toContain('no-fixed-sleep-in-tests')
    }, 15000)
  })

  describe('file filtering', () => {
    test.concurrent('ignores non-test files', async () => {
      const output = await lint(`setTimeout(() => {}, 100)`, 'ts')
      expect(output).not.toContain('no-fixed-sleep-in-tests')
    }, 15000)

    test.concurrent('applies to .test.ts files', async () => {
      const output = await lint(`setTimeout(() => {}, 100)`, 'test.ts')
      expect(output).toContain('no-fixed-sleep-in-tests')
    }, 15000)
  })
})

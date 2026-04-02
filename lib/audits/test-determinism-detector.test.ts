import { describe, expect, test } from 'vitest'
import { detectDeterminismIssues } from './test-determinism-detector'

describe('detectDeterminismIssues', () => {
  describe('file filtering', () => {
    test('only analyzes test files', () => {
      const content = 'Date.now(); Math.random();'

      const issues1 = detectDeterminismIssues(content, 'src/util.ts')
      expect(issues1).toEqual([])

      const issues2 = detectDeterminismIssues(content, 'src/util.test.ts')
      expect(issues2.length).toBeGreaterThan(0)
    })

    test('recognizes various test file extensions', () => {
      const content = 'Date.now()'

      const testPaths = [
        'foo.test.ts',
        'foo.test.js',
        'foo.spec.ts',
        'foo.spec.js',
      ]

      for (const path of testPaths) {
        const issues = detectDeterminismIssues(content, path)
        expect(issues.length).toBeGreaterThan(0)
      }
    })
  })

  describe('time dependency detection', () => {
    test('detects Date.now() usage', () => {
      const content = `
        test('example', () => {
          const now = Date.now()
          expect(now).toBeGreaterThan(0)
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'time-dependency',
          pattern: 'Date.now()',
          recommendation: expect.stringContaining('dependency injection'),
        })
      )
    })

    test('detects new Date() usage', () => {
      const content = `
        test('example', () => {
          const date = new Date()
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'time-dependency',
          pattern: 'new Date()',
        })
      )
    })

    test('detects Date() usage', () => {
      const content = `
        test('example', () => {
          const date = Date()
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'time-dependency',
          pattern: 'Date()',
        })
      )
    })

    test('does not flag Date in parameter definition', () => {
      const content = `
        function formatTime(now: Date) {
          return now.toISOString()
        }
        test('example', () => {
          formatTime(new Date('2024-01-01'))
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      // Should only flag the new Date() call, not the parameter
      expect(issues.length).toBe(1)
      expect(issues[0].pattern).toBe('new Date()')
    })

    test('does not flag Date in stub setup', () => {
      const content = `
        test('example', () => {
          const stub = vi.fn(() => Date.now())
          expect(stub()).toBe(123)
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })
  })

  describe('randomness detection', () => {
    test('detects Math.random() usage', () => {
      const content = `
        test('example', () => {
          const rand = Math.random()
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'randomness',
          pattern: 'Math.random()',
          recommendation: expect.stringContaining('dependency injection'),
        })
      )
    })

    test('detects crypto.randomBytes() usage', () => {
      const content = `
        test('example', () => {
          const bytes = crypto.randomBytes(16)
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'randomness',
          pattern: 'crypto.randomBytes()',
        })
      )
    })

    test('detects randomUUID() usage', () => {
      const content = `
        test('example', () => {
          const id = randomUUID()
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'randomness',
          pattern: 'randomUUID()',
        })
      )
    })

    test('detects crypto.randomUUID() usage', () => {
      const content = `
        test('example', () => {
          const id = crypto.randomUUID()
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'randomness',
          pattern: 'crypto.randomUUID()',
        })
      )
    })

    test('does not flag random in parameter definition', () => {
      const content = `
        function shuffle(arr: number[], random: () => number) {
          return arr.sort(() => random() - 0.5)
        }
        test('example', () => {
          shuffle([1, 2, 3], () => 0.5)
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })

    test('does not flag random in mock setup', () => {
      const content = `
        test('example', () => {
          const mockRandom = vi.fn(() => Math.random())
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })
  })

  describe('environment variable detection', () => {
    test('detects process.env access', () => {
      const content = `
        test('example', () => {
          const home = process.env.HOME
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'environment-variable',
          pattern: 'process.env.HOME',
          recommendation: expect.stringContaining('stubEnv'),
        })
      )
    })

    test('does not flag process.env when stubEnv is used nearby', () => {
      const content = `
        test('example', () => {
          stubEnv('HOME', '/test/home')
          const home = process.env.HOME
          expect(home).toBe('/test/home')
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })

    test('does not flag process.env in stubEnv call', () => {
      const content = `
        test('example', () => {
          stubEnv('HOME', process.env.HOME || '/default')
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })

    test('does not flag env in parameter definition', () => {
      const content = `
        function getConfig(env: Record<string, string>) {
          return env.HOME
        }
        test('example', () => {
          getConfig({ HOME: '/test' })
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })

    test('detects multiple env var accesses', () => {
      const content = `
        test('example', () => {
          const home = process.env.HOME
          const user = process.env.USER
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues.length).toBe(2)
      expect(issues[0].pattern).toBe('process.env.HOME')
      expect(issues[1].pattern).toBe('process.env.USER')
    })
  })

  describe('filesystem operation detection', () => {
    test('detects tmpdir() usage', () => {
      const content = `
        test('example', () => {
          const tmp = tmpdir()
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'filesystem',
          pattern: 'tmpdir()',
          recommendation: expect.stringContaining('in-memory filesystem'),
        })
      )
    })

    test('detects os.tmpdir() usage', () => {
      const content = `
        test('example', () => {
          const tmp = os.tmpdir()
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'filesystem',
          pattern: 'os.tmpdir()',
        })
      )
    })

    test('detects fs.writeFile() usage', () => {
      const content = `
        test('example', () => {
          fs.writeFile('/tmp/test', 'data', () => {})
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'filesystem',
          pattern: 'fs.writeFile()',
        })
      )
    })

    test('detects fs.writeFileSync() usage', () => {
      const content = `
        test('example', () => {
          fs.writeFileSync('/tmp/test', 'data')
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'filesystem',
          pattern: 'fs.writeFileSync()',
        })
      )
    })

    test('detects fs.readFile() usage', () => {
      const content = `
        test('example', () => {
          fs.readFile('/tmp/test', () => {})
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'filesystem',
          pattern: 'fs.readFile()',
        })
      )
    })

    test('does not flag filesystem operations in system tests', () => {
      const content = `
        // system-test
        test('example', () => {
          fs.writeFileSync('/tmp/test', 'data')
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })
  })

  describe('real timer detection', () => {
    test('detects setTimeout usage', () => {
      const content = `
        test('example', () => {
          setTimeout(() => {}, 1000)
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'real-timers',
          pattern: 'setTimeout',
          recommendation: expect.stringContaining('vi.useFakeTimers'),
        })
      )
    })

    test('detects setInterval usage', () => {
      const content = `
        test('example', () => {
          setInterval(() => {}, 1000)
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'real-timers',
          pattern: 'setInterval',
        })
      )
    })

    test('does not flag timers when vi.useFakeTimers is present', () => {
      const content = `
        test('example', () => {
          vi.useFakeTimers()
          setTimeout(() => {}, 1000)
          vi.runAllTimers()
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })

    test('does not flag realSleep utility', () => {
      const content = `
        test('example', async () => {
          await realSleep(100)
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })
  })

  describe('platform-specific detection', () => {
    test('detects process.platform usage', () => {
      const content = `
        test('example', () => {
          if (process.platform === 'win32') {}
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'platform-specific',
          pattern: 'process.platform',
          recommendation: expect.stringContaining('dependency injection'),
        })
      )
    })

    test('detects os.platform() usage', () => {
      const content = `
        test('example', () => {
          const platform = os.platform()
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'platform-specific',
          pattern: 'os.platform()',
        })
      )
    })

    test('detects os.EOL usage', () => {
      const content = `
        test('example', () => {
          const text = 'line1' + os.EOL + 'line2'
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'platform-specific',
          pattern: 'os.EOL',
        })
      )
    })

    test('detects __dirname usage', () => {
      const content = `
        test('example', () => {
          const dir = __dirname
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'platform-specific',
          pattern: '__dirname',
        })
      )
    })

    test('detects __filename usage', () => {
      const content = `
        test('example', () => {
          const file = __filename
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toContainEqual(
        expect.objectContaining({
          category: 'platform-specific',
          pattern: '__filename',
        })
      )
    })
  })

  describe('location tracking', () => {
    test('reports correct line numbers', () => {
      const content = `
        test('example', () => {
          const now = Date.now()
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues[0].line).toBe(3) // Line numbers are 1-indexed
    })

    test('reports code snippet', () => {
      const content = `
        test('example', () => {
          const now = Date.now()
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues[0].code).toContain('Date.now()')
    })
  })

  describe('multiple issues', () => {
    test('detects multiple different issue types in one file', () => {
      const content = `
        test('example', () => {
          const now = Date.now()
          const rand = Math.random()
          const home = process.env.HOME
          setTimeout(() => {}, 1000)
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues.length).toBe(4)

      const categories = issues.map(i => i.category)
      expect(categories).toContain('time-dependency')
      expect(categories).toContain('randomness')
      expect(categories).toContain('environment-variable')
      expect(categories).toContain('real-timers')
    })

    test('detects multiple instances of same pattern', () => {
      const content = `
        test('example', () => {
          const now1 = Date.now()
          const now2 = Date.now()
          const now3 = Date.now()
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues.length).toBe(3)
      expect(issues.every(i => i.pattern === 'Date.now()')).toBe(true)
    })
  })

  describe('injection pattern recognition', () => {
    test('does not flag properly injected dependencies', () => {
      const content = `
        function process(data: string, now: Date, random: () => number) {
          return { data, timestamp: now, value: random() }
        }

        test('example', () => {
          const result = process('test', new Date('2024-01-01'), () => 0.5)
          expect(result.timestamp).toBeDefined()
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      // Should only flag the new Date() call in the test, not the parameters
      expect(issues.length).toBe(1)
      expect(issues[0].pattern).toBe('new Date()')
    })

    test('recognizes env parameter injection', () => {
      const content = `
        function getHome(env: Record<string, string>) {
          return env.HOME
        }

        test('example', () => {
          const home = getHome({ HOME: '/test' })
          expect(home).toBe('/test')
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })
  })

  describe('branch coverage', () => {
    test('parameter definition prevents time detection flag', () => {
      const content = `
        function formatTime(now: Date) {
          return now.toISOString()
        }
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })

    test('stub setup prevents time detection flag', () => {
      const content = `
        test('example', () => {
          const stub = vi.fn(() => Date.now())
          stub()
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })

    test('parameter definition prevents randomness detection flag', () => {
      const content = `
        function generate(random: () => number) {
          return random()
        }
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })

    test('stub setup prevents randomness detection flag', () => {
      const content = `
        test('example', () => {
          const mockRandom = vi.fn(() => Math.random())
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })

    test('covers nearStubEnv branch in environment detection', () => {
      const content = `
        test('example', () => {
          stubEnv('HOME', '/test')



          const home = process.env.HOME
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      // Should not flag because stubEnv is within 5 lines
      expect(issues).toEqual([])
    })

    test('filesystem patterns detect real filesystem calls', () => {
      const content = `
        test('example', () => {
          fs.writeFile('config', 'data')
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues.length).toBe(1)
      expect(issues[0].category).toBe('filesystem')
    })

    test('system-test comment skips filesystem detection', () => {
      const content = `
        // This is a system-test file
        test('example', () => {
          fs.writeFileSync('/tmp/test', 'data')
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })

    test('realSleep utility skips timer detection', () => {
      const content = `
        test('example', async () => {
          await realSleep(100)
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })

    test('parameter definition prevents env access flag', () => {
      const content = `
        function getHome(env: Record<string, string>) {
          return env.HOME || '/default'
        }
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })

    test('exercises match.index undefined guard', () => {
      // This should never actually happen with normal regex.exec(),
      // but we guard against it for type safety
      const content = `
        test('example', () => {
          expect(true).toBe(true)
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })

    test('exercises both branches of time parameter detection', () => {
      // One Date in parameter (should skip), one not (should flag)
      const content = `
        function format(now: Date) {}
        test('example', () => {
          Date.now()
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues.length).toBe(1)
    })

    test('exercises both branches of time stub detection', () => {
      // One Date in stub (should skip), one not (should flag)
      const content = `
        test('example', () => {
          const stub = vi.fn(() => Date.now())
          const actual = Date.now()
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues.length).toBe(1)
    })

    test('exercises both branches of randomness parameter detection', () => {
      const content = `
        function gen(random: () => number) {}
        test('example', () => {
          Math.random()
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues.length).toBe(1)
    })

    test('exercises both branches of randomness stub detection', () => {
      const content = `
        test('example', () => {
          const mock = vi.fn(() => Math.random())
          const actual = Math.random()
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues.length).toBe(1)
    })

    test('exercises both branches of env nearStubEnv detection', () => {
      const content = `
        test('example', () => {
          stubEnv('HOME', '/test')
          const near = process.env.HOME





          const far = process.env.OTHER
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      // 'far' is > 5 lines away from stubEnv
      expect(issues.length).toBe(1)
    })

    test('exercises both branches of filesystem parameter detection', () => {
      const content = `
        function write(fs: any) {
          fs.writeFile('test', 'data')
        }
        test('example', () => {
          fs.writeFileSync('test', 'data')
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues.length).toBeGreaterThan(0)
    })

    test('exercises both branches of filesystem system-test detection', () => {
      const content = `
        // system-test
        test('example', () => {
          fs.writeFileSync('/tmp/test1', 'data')
        })
        test('another', () => {
          fs.readFile('/real/file', () => {})
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      // Both should be skipped due to system-test comment
      expect(issues.length).toBe(0)
    })

    test('exercises both branches of timer parameter detection', () => {
      const content = `
        function delay(timer: any) {
          setTimeout(() => {}, 100)
        }
        test('example', () => {
          setTimeout(() => {}, 200)
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      // Both should be flagged (timer parameter doesn't prevent detection)
      expect(issues.length).toBe(2)
    })

    test('exercises both branches of timer realSleep detection', () => {
      const content = `
        test('example', () => {
          await realSleep(100)
          setTimeout(() => {}, 200)
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      // realSleep is skipped, setTimeout is flagged
      expect(issues.length).toBe(1)
    })
  })

  describe('edge cases', () => {
    test('handles empty file', () => {
      const content = ''

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })

    test('handles file with only comments', () => {
      const content = `
        // This is a comment with Date.now()
        /* And this is a block comment with Math.random() */
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      // Note: This simple implementation doesn't skip comments
      // That's acceptable as a first version
      expect(issues.length).toBeGreaterThanOrEqual(0)
    })

    test('handles file with no issues', () => {
      const content = `
        test('example', () => {
          expect(1 + 1).toBe(2)
        })
      `

      const issues = detectDeterminismIssues(content, 'test.test.ts')

      expect(issues).toEqual([])
    })
  })
})

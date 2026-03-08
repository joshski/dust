import { describe, expect, test } from 'vitest'
import { analyzePolicyViolations } from './policy-checker'

describe('analyzePolicyViolations', () => {
  test('flags abbreviated binding names with mapped messages', () => {
    const diagnostics = analyzePolicyViolations(
      '/repo/sample.ts',
      'const ctx = 1\nfunction run(opts: string) { return opts + ctx }\n'
    )

    expect(diagnostics).toEqual([
      {
        policy: 'dust-no-abbreviated-names',
        filePath: '/repo/sample.ts',
        line: 1,
        column: 7,
        message: "Avoid abbreviated name 'ctx'. Use 'context' instead.",
      },
      {
        policy: 'dust-no-abbreviated-names',
        filePath: '/repo/sample.ts',
        line: 2,
        column: 14,
        message: "Avoid abbreviated name 'opts'. Use 'options' instead.",
      },
    ])
  })

  test('flags disallowed vitest mocking APIs', () => {
    const diagnostics = analyzePolicyViolations(
      '/repo/example.test.ts',
      'vi.mock("./module")\nvi.spyOn(obj, "read")\nvi.fn()\n'
    )

    expect(diagnostics).toEqual([
      {
        policy: 'no-vitest-mocking',
        filePath: '/repo/example.test.ts',
        line: 1,
        column: 1,
        message:
          'Avoid vi.mock(). Use dependency injection or a test helper instead.',
      },
      {
        policy: 'no-vitest-mocking',
        filePath: '/repo/example.test.ts',
        line: 2,
        column: 1,
        message:
          'Avoid vi.spyOn(). Use dependency injection or a test helper instead.',
      },
      {
        policy: 'no-vitest-mocking',
        filePath: '/repo/example.test.ts',
        line: 3,
        column: 1,
        message:
          'Avoid vi.fn(). Use a typed test double or test helper instead.',
      },
    ])
  })

  test('flags as unknown as only in *.test.ts files', () => {
    const testFileDiagnostics = analyzePolicyViolations(
      '/repo/value.test.ts',
      'const value = raw as unknown as Target\n'
    )
    const nonTestFileDiagnostics = analyzePolicyViolations(
      '/repo/value.ts',
      'const value = raw as unknown as Target\n'
    )

    expect(testFileDiagnostics).toContainEqual({
      policy: 'no-unsafe-double-cast',
      filePath: '/repo/value.test.ts',
      line: 1,
      column: 33,
      message:
        "Avoid double-casting with 'as unknown as'. Prefer typed helpers/adapters, or add a local suppression with rationale at unavoidable interop boundaries.",
    })
    expect(
      nonTestFileDiagnostics.some(d => d.policy === 'no-unsafe-double-cast')
    ).toBe(false)
  })

  test('ignores safe names and unrelated calls', () => {
    const diagnostics = analyzePolicyViolations(
      '/repo/ok.ts',
      'const context = 1\nlogger.mock()\n'
    )

    expect(diagnostics).toEqual([])
  })

  test('handles non-matching branches without diagnostics', () => {
    const diagnostics = analyzePolicyViolations(
      '/repo/branches.test.ts',
      [
        'const [first, , second] = values',
        'try { work() } catch { cleanup() }',
        'vi.doThing()',
        'const cast = raw as number as Target',
      ].join('\n')
    )

    expect(diagnostics).toEqual([])
  })
})

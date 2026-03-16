import { describe, expect, test } from 'vitest'
import { injectAdHocScope, transformAuditContent } from '../../audits/index'
import { loadStockAudits } from '../../audits/stock-audits'
import {
  createContextEmulator,
  createFileSystemEmulator,
  createTestRuntimeConfig,
  type FileSystemEmulator,
  lintTaskFile,
} from '../../test/test-utilities'
import type { CommandContext, CommandDependencies } from '../types'
import { audit } from './audit'

function createDependencies(
  context: CommandContext,
  fileSystem: FileSystemEmulator
): CommandDependencies {
  return {
    arguments: [],
    context,
    fileSystem,
    globScanner: fileSystem,
    runtime: createTestRuntimeConfig(),
    settings: { dustCommand: 'dust' },
  }
}

describe('audit command', () => {
  test('lists stock audits when no user audits exist', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {},
      },
    })

    const result = await audit(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('🔍 Audits')
    expect(output).toContain(
      'Audits are canned tasks that help maintain project health.'
    )
    expect(output).toContain('security-review')
    expect(output).toContain(
      'Review the codebase for common security vulnerabilities and misconfigurations.'
    )
    expect(output).toContain('→ stock')
    expect(output).toContain('test-coverage')
    expect(output).toContain(
      'Identify untested code paths and areas that need additional test coverage.'
    )
    expect(output).toContain('dead-code')
    expect(output).toContain(
      'Find and remove unused code to improve maintainability and reduce bundle size.'
    )
  })

  test('lists user-configured audits from .dust/config/audits', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            audits: {
              'custom-audit.md':
                '# Custom Audit\n\nThis is a custom audit for our project.',
            },
          },
        },
      },
    })

    const result = await audit(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('Custom Audit')
    expect(output).toContain('This is a custom audit for our project.')
    expect(output).toContain('→ .dust/config/audits/custom-audit.md')
  })

  test('user audits take precedence over stock audits with the same name', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            audits: {
              'security-review.md':
                '# Custom Security Review\n\nOur custom security review process.',
            },
          },
        },
      },
    })

    const result = await audit(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    // Should show user's custom version
    expect(output).toContain('Custom Security Review')
    expect(output).toContain('Our custom security review process.')
    expect(output).toContain('→ .dust/config/audits/security-review.md')
    // Should NOT show stock version source (stock overridden)
    const lines = context.stdoutLines
    const securityReviewIndex = lines.findIndex(l =>
      l.includes('Custom Security Review')
    )
    // The source for this audit should be the user path, not "stock"
    expect(lines[securityReviewIndex + 2]).toContain(
      '.dust/config/audits/security-review.md'
    )
  })

  test('shows both stock and user audits together', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            audits: {
              'custom-audit.md': '# Custom Audit\n\nA custom audit.',
            },
          },
        },
      },
    })

    const result = await audit(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    // Stock audits should appear
    expect(output).toContain('security-review')
    expect(output).toContain('test-coverage')
    // User audit should appear
    expect(output).toContain('Custom Audit')
  })

  test('handles missing .dust/config/audits directory gracefully', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {},
        },
      },
    })

    const result = await audit(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    // Should still list stock audits
    expect(output).toContain('security-review')
    expect(output).toContain('test-coverage')
  })

  test('handles missing .dust directory gracefully', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {},
    })

    const result = await audit(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    // Should still list stock audits
    expect(output).toContain('security-review')
    expect(output).toContain('test-coverage')
  })

  test('uses filename as name if no title in markdown', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            audits: {
              'no-title-audit.md': 'No heading in this file, just content.',
            },
          },
        },
      },
    })

    const result = await audit(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('no-title-audit')
    expect(output).toContain('→ .dust/config/audits/no-title-audit.md')
  })

  test('handles empty description gracefully', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            audits: {
              'empty-desc.md': '# Empty Description Audit',
            },
          },
        },
      },
    })

    const result = await audit(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('Empty Description Audit')
    expect(output).toContain('→ .dust/config/audits/empty-desc.md')
  })

  test('loadStockAudits loads audits from markdown files', () => {
    const audits = loadStockAudits()
    expect(audits).toBeInstanceOf(Array)
    expect(audits.length).toBe(26)

    const names = audits.map(a => a.name)
    expect(names).toContain('agent-developer-experience')
    expect(names).toContain('checks-audit')
    expect(names).toContain('component-reuse')
    expect(names).toContain('coverage-exclusions')
    expect(names).toContain('data-access-review')
    expect(names).toContain('dead-code')
    expect(names).toContain('error-handling')
    expect(names).toContain('facts-verification')
    expect(names).toContain('global-state')
    expect(names).toContain('ideas-from-commits')
    expect(names).toContain('ideas-from-principles')
    expect(names).toContain('naming-consistency')
    expect(names).toContain('performance-review')
    expect(names).toContain('primitive-obsession')
    expect(names).toContain('refactoring-opportunities')
    expect(names).toContain('security-review')
    expect(names).toContain('single-responsibility-violations')
    expect(names).toContain('stale-ideas')
    expect(names).toContain('test-assertions')
    expect(names).toContain('test-coverage')
    expect(names).toContain('ubiquitous-language')
    expect(names).toContain('ux-audit')

    for (const stockAudit of audits) {
      expect(typeof stockAudit.name).toBe('string')
      expect(typeof stockAudit.description).toBe('string')
      expect(typeof stockAudit.template).toBe('string')
      expect(stockAudit.template).toContain('# ')
    }
  })

  test('stock audits have no principles because they are designed for downstream projects', () => {
    // component-reuse references the reasonably-dry principle to help agents avoid over-extraction
    // coverage-exclusions references decoupling and test coverage principles
    // checks-audit references batteries-included, easy-adoption, stop-the-line, lint-everything, comprehensive-test-coverage
    // error-handling references actionable-errors, debugging-tooling, stop-the-line principles
    // global-state references dependency-injection, decoupled-code, test-isolation principles
    // refactoring-opportunities references boy scout rule, make the change easy, etc.
    // ubiquitous-language references naming principles that are universally applicable
    // ux-audit references actionable-errors and unsurprising-ux principles
    const auditsWithPrinciples = [
      'algorithms',
      'checks-audit',
      'component-reuse',
      'coverage-exclusions',
      'data-access-review',
      'design-patterns',
      'error-handling',
      'global-state',
      'naming-consistency',
      'primitive-obsession',
      'refactoring-opportunities',
      'single-responsibility-violations',
      'slow-tests',
      'test-assertions',
      'ubiquitous-language',
      'ux-audit',
    ]
    const audits = loadStockAudits()
    for (const stockAudit of audits) {
      const goalsMatch = stockAudit.template.match(
        /## Principles\n\n([\s\S]*?)(?=\n## |\n*$)/
      )
      expect(
        goalsMatch,
        `${stockAudit.name} should have a Principles section`
      ).not.toBeNull()
      if (auditsWithPrinciples.includes(stockAudit.name)) {
        expect(goalsMatch?.[1].trim()).not.toBe('(none)')
      } else {
        expect(goalsMatch?.[1].trim()).toBe('(none)')
      }
    }
  })

  test('naming-consistency audit enforces factory-constructor high-confidence contract', () => {
    const namingConsistencyAudit = loadStockAudits().find(
      a => a.name === 'naming-consistency'
    )

    expect(namingConsistencyAudit).toBeDefined()
    expect(namingConsistencyAudit?.template).toContain(
      'Focus only on high-confidence factory/constructor naming inconsistencies'
    )
    expect(namingConsistencyAudit?.template).toContain(
      '`build*`, `create*`, `make*`, or `new*`'
    )
    expect(namingConsistencyAudit?.template).toContain(
      '**Inconsistent term set** - The observed naming variants'
    )
    expect(namingConsistencyAudit?.template).toContain(
      '**Canonical proposal** - The recommended canonical name and rationale'
    )
    expect(namingConsistencyAudit?.template).toContain(
      '**Migration strategy** - Choose either **incremental**'
    )
    expect(namingConsistencyAudit?.template).toContain(
      'do not propose speculative broad renames'
    )
    expect(namingConsistencyAudit?.template).toContain(
      'Canonical artifact-list ordering or shape checks'
    )
  })

  test('primitive-obsession audit enforces existing-type and numeric high-confidence contract', () => {
    const primitiveObsessionAudit = loadStockAudits().find(
      a => a.name === 'primitive-obsession'
    )

    expect(primitiveObsessionAudit).toBeDefined()
    expect(primitiveObsessionAudit?.template).toContain(
      'Focus only on two high-confidence slices'
    )
    expect(primitiveObsessionAudit?.template).toContain('`ArtifactType`')
    expect(primitiveObsessionAudit?.template).toContain('retry counts like `3`')
    expect(primitiveObsessionAudit?.template).toContain(
      'Obvious local loop indices/counters and trivial literals like `0` or `1`'
    )
    expect(primitiveObsessionAudit?.template).toContain(
      '**Locations** - File paths and line numbers where primitive literals are used'
    )
    expect(primitiveObsessionAudit?.template).toContain(
      '**Primitive pattern** - The free-form literal pattern currently used (string concept or numeric role)'
    )
    expect(primitiveObsessionAudit?.template).toContain(
      '**Constant/type opportunity** - The canonical existing type or named constant/domain wrapper that should be used instead'
    )
    expect(primitiveObsessionAudit?.template).toContain(
      '**Incremental migration path** - A safe sequence of steps to migrate call sites with minimal risk'
    )
    expect(primitiveObsessionAudit?.template).toContain(
      '**Numeric pattern** - The repeated threshold/limit/retry/timing literal pattern'
    )
    expect(primitiveObsessionAudit?.template).toContain(
      'Avoided speculative introduction of entirely new types'
    )
  })

  test('single-responsibility-violations audit enforces responsibility-count high-confidence contract', () => {
    const singleResponsibilityAudit = loadStockAudits().find(
      a => a.name === 'single-responsibility-violations'
    )

    expect(singleResponsibilityAudit).toBeDefined()
    expect(singleResponsibilityAudit?.template).toContain(
      'Focus only on high-confidence function-level findings where one function clearly combines 3+ distinct responsibilities'
    )
    expect(singleResponsibilityAudit?.template).toContain(
      'Include both runtime code and test helpers.'
    )
    expect(singleResponsibilityAudit?.template).toContain(
      'Module-level layer-mixing findings (future slices)'
    )
    expect(singleResponsibilityAudit?.template).toContain(
      'Collector/orchestrator hotspot findings based on collaborator/parameter load (future slices)'
    )
    expect(singleResponsibilityAudit?.template).toContain(
      'Keep findings only when 3+ distinct responsibilities are clearly present in the same function'
    )
    expect(singleResponsibilityAudit?.template).toContain(
      'For each finding, provide:'
    )
    expect(singleResponsibilityAudit?.template).toContain(
      '**Location** - File path and function name where applicable'
    )
    expect(singleResponsibilityAudit?.template).toContain(
      '**Responsibility split** - Distinct responsibilities currently mixed'
    )
    expect(singleResponsibilityAudit?.template).toContain(
      '**Severity** - `high`, `medium`, or `low`'
    )
    expect(singleResponsibilityAudit?.template).toContain(
      '**Suggested extraction plan** - A small-step plan'
    )
    expect(singleResponsibilityAudit?.template).toContain(
      'Kept recommendations high-confidence only with clear concern boundaries'
    )
    expect(singleResponsibilityAudit?.template).toContain(
      'Preserve Functional Core, Imperative Shell boundaries'
    )
  })
})

describe('audit add command', () => {
  test('creates task from user audit template', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            audits: {
              'my-audit.md':
                '# My Custom Audit\n\nCheck for custom issues.\n\n## Principles\n\n- [Example Principle](../principles/example.md)',
            },
          },
          tasks: {},
        },
      },
    })

    const result = await audit({
      ...createDependencies(context, fileSystem),
      arguments: ['my-audit'],
    })

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain(
      '→ .dust/tasks/audit-my-audit.md'
    )
    expect(
      fileSystem.writtenFiles.has('/project/.dust/tasks/audit-my-audit.md')
    ).toBe(true)
    const writtenContent = fileSystem.writtenFiles.get(
      '/project/.dust/tasks/audit-my-audit.md'
    )
    expect(writtenContent).toContain('# Audit: My Custom Audit')
    expect(writtenContent).toContain('Check for custom issues.')
  })

  test('errors if audit task already exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            audits: {
              'my-audit.md': '# My Custom Audit\n\nContent here.',
            },
          },
          tasks: {
            'audit-my-audit.md': '# Audit: My Custom Audit\n\nExisting task.',
          },
        },
      },
    })

    const result = await audit({
      ...createDependencies(context, fileSystem),
      arguments: ['my-audit'],
    })

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      'Error: Audit task already exists'
    )
  })

  test('errors if audit name not found', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            audits: {},
          },
          tasks: {},
        },
      },
    })

    const result = await audit({
      ...createDependencies(context, fileSystem),
      arguments: ['nonexistent'],
    })

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      "Error: Audit 'nonexistent' not found"
    )
  })

  test('user audit takes precedence over stock audit with same name', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            audits: {
              'security-review.md':
                '# Custom Security Review\n\nOur custom security process.',
            },
          },
          tasks: {},
        },
      },
    })

    const result = await audit({
      ...createDependencies(context, fileSystem),
      arguments: ['security-review'],
    })

    expect(result.exitCode).toBe(0)
    const writtenContent = fileSystem.writtenFiles.get(
      '/project/.dust/tasks/audit-security-review.md'
    )
    expect(writtenContent).toContain('# Audit: Custom Security Review')
    expect(writtenContent).toContain('Our custom security process.')
  })

  test('creates task from stock audit with template', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {},
          tasks: {},
        },
      },
    })

    const result = await audit({
      ...createDependencies(context, fileSystem),
      arguments: ['security-review'],
    })

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain(
      '→ .dust/tasks/audit-security-review.md'
    )
    const writtenContent = fileSystem.writtenFiles.get(
      '/project/.dust/tasks/audit-security-review.md'
    )
    expect(writtenContent).toContain('# Audit: Security Review')
    expect(writtenContent).toContain('Review the codebase for common security')
  })

  test('creates task with ad-hoc details when provided', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {},
          tasks: {},
        },
      },
    })

    const result = await audit({
      ...createDependencies(context, fileSystem),
      arguments: [
        'security-review',
        'Focus on authentication changes from last week',
      ],
    })

    expect(result.exitCode).toBe(0)
    const writtenContent = fileSystem.writtenFiles.get(
      '/project/.dust/tasks/audit-security-review.md'
    )
    expect(writtenContent).toContain('## Ad-hoc Scope')
    expect(writtenContent).toContain(
      'Focus on authentication changes from last week'
    )
    // Verify Ad-hoc Scope appears before ## Scope
    const adHocIndex = writtenContent?.indexOf('## Ad-hoc Scope')
    const scopeIndex = writtenContent?.indexOf('## Scope')
    expect(adHocIndex).toBeLessThan(scopeIndex as number)
  })

  test('creates task without ad-hoc section when no details provided', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {},
          tasks: {},
        },
      },
    })

    const result = await audit({
      ...createDependencies(context, fileSystem),
      arguments: ['security-review'],
    })

    expect(result.exitCode).toBe(0)
    const writtenContent = fileSystem.writtenFiles.get(
      '/project/.dust/tasks/audit-security-review.md'
    )
    expect(writtenContent).not.toContain('## Ad-hoc Scope')
  })

  test('creates task with ad-hoc details from user audit', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            audits: {
              'my-audit.md':
                '# My Custom Audit\n\nCheck for custom issues.\n\n## Scope\n\nFocus on these areas.',
            },
          },
          tasks: {},
        },
      },
    })

    const result = await audit({
      ...createDependencies(context, fileSystem),
      arguments: ['my-audit', 'Check src/api/ directory specifically'],
    })

    expect(result.exitCode).toBe(0)
    const writtenContent = fileSystem.writtenFiles.get(
      '/project/.dust/tasks/audit-my-audit.md'
    )
    expect(writtenContent).toContain('## Ad-hoc Scope')
    expect(writtenContent).toContain('Check src/api/ directory specifically')
    // Verify Ad-hoc Scope appears before ## Scope
    const adHocIndex = writtenContent?.indexOf('## Ad-hoc Scope')
    const scopeIndex = writtenContent?.indexOf('## Scope')
    expect(adHocIndex).toBeLessThan(scopeIndex as number)
  })
})

describe('generated stock audit tasks pass lint rules', () => {
  for (const stockAudit of loadStockAudits()) {
    test(`${stockAudit.name} produces a valid task file`, async () => {
      const context = createContextEmulator()
      const fileSystem = createFileSystemEmulator({
        project: {
          '.dust': {
            config: {},
            tasks: {},
          },
        },
      })

      const result = await audit({
        ...createDependencies(context, fileSystem),
        arguments: [stockAudit.name],
      })

      expect(result.exitCode).toBe(0)
      const filePath = `/project/.dust/tasks/audit-${stockAudit.name}.md`
      const content = fileSystem.writtenFiles.get(filePath) as string
      expect(lintTaskFile(filePath, content)).toEqual([])
    })
  }
})

describe('transformAuditContent', () => {
  test('transforms title to include Audit prefix', () => {
    const content = '# My Audit\n\nSome content.'
    const result = transformAuditContent(content)
    expect(result).toBe('# Audit: My Audit\n\nSome content.')
  })

  test('preserves content without a title', () => {
    const content = 'No title here, just content.'
    const result = transformAuditContent(content)
    expect(result).toBe('No title here, just content.')
  })

  test('only transforms the first title', () => {
    const content = '# First Title\n\nContent.\n\n# Second Title'
    const result = transformAuditContent(content)
    expect(result).toBe('# Audit: First Title\n\nContent.\n\n# Second Title')
  })
})

describe('injectAdHocScope', () => {
  test('injects ad-hoc scope section before ## Scope', () => {
    const content =
      '# Audit: Security Review\n\nDescription.\n\n## Scope\n\nFocus areas.'
    const result = injectAdHocScope(content, 'Check authentication code')
    expect(result).toBe(
      '# Audit: Security Review\n\nDescription.\n\n## Ad-hoc Scope\n\nCheck authentication code\n\n## Scope\n\nFocus areas.'
    )
  })

  test('appends ad-hoc scope at end when no ## Scope heading exists', () => {
    const content = '# Audit: Simple\n\nDescription.'
    const result = injectAdHocScope(content, 'Focus on this area')
    expect(result).toBe(
      '# Audit: Simple\n\nDescription.\n\n## Ad-hoc Scope\n\nFocus on this area\n'
    )
  })

  test('preserves multiline ad-hoc details', () => {
    const content = '# Audit: Test\n\nDesc.\n\n## Scope\n\nAreas.'
    const result = injectAdHocScope(content, 'Line 1\nLine 2\nLine 3')
    expect(result).toContain('Line 1\nLine 2\nLine 3')
  })
})

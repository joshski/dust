import { describe, expect, test } from 'vitest'
import { injectComment, transformAuditContent } from '../../audits/index'
import { loadStockAudits } from '../../audits/stock-audits'
import {
  createContextEmulator,
  createFileSystemEmulator,
  createTestRuntimeConfig,
  type FileSystemEmulator,
  lintTaskFile,
} from '../../test-support/test-utilities'
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
      'Verify security tooling is configured and suggest missing tools.'
    )
    expect(output).toContain('→ stock')
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
    expect(output).toContain('dead-code')
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
    expect(output).toContain('dead-code')
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
    expect(output).toContain('dead-code')
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
    expect(audits.length).toBe(34)

    const names = audits.map(a => a.name)
    expect(names).toContain('agent-developer-experience')
    expect(names).toContain('checks-audit')
    expect(names).toContain('ci-development-parity')
    expect(names).toContain('component-reuse')
    expect(names).toContain('coverage-exclusions')
    expect(names).toContain('data-access-review')
    expect(names).toContain('dead-code')
    expect(names).toContain('dependency-health')
    expect(names).toContain('design-patterns')
    expect(names).toContain('directory-hierarchy')
    expect(names).toContain('documentation-drift')
    expect(names).toContain('error-handling')
    expect(names).toContain('facts-verification')
    expect(names).toContain('flaky-tests')
    expect(names).toContain('global-state')
    expect(names).toContain('commit-review')
    expect(names).toContain('ideas-from-principles')
    expect(names).toContain('idiomatic-style')
    expect(names).toContain('logging-and-traceability')
    expect(names).toContain('primitive-obsession')
    expect(names).toContain('security-review')
    expect(names).toContain('single-responsibility-violations')
    expect(names).toContain('stale-ideas')
    expect(names).toContain('test-assertions')
    expect(names).toContain('test-pyramid')
    expect(names).toContain('ubiquitous-language')
    expect(names).toContain('ux-audit')

    for (const stockAudit of audits) {
      expect(typeof stockAudit.name).toBe('string')
      expect(typeof stockAudit.description).toBe('string')
      expect(typeof stockAudit.template).toBe('string')
      expect(stockAudit.template).toContain('# ')
    }
  })

  test('stock audits have no Principles sections (removed to avoid broken links in consumer repos)', () => {
    const audits = loadStockAudits()
    for (const stockAudit of audits) {
      expect(
        stockAudit.template,
        `${stockAudit.name} should not have a Principles section`
      ).not.toContain('## Principles')
    }
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
    expect(writtenContent).toContain('Verify security tooling is configured')
  })

  test('creates task with comment when --comment flag is provided', async () => {
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
        '--comment',
        'Focus on authentication changes from last week',
      ],
    })

    expect(result.exitCode).toBe(0)
    const writtenContent = fileSystem.writtenFiles.get(
      '/project/.dust/tasks/audit-security-review.md'
    )
    expect(writtenContent).toContain('## Comments')
    expect(writtenContent).toContain(
      'Focus on authentication changes from last week'
    )
    // Verify Comments appears before ## Scope
    const commentsIndex = writtenContent?.indexOf('## Comments')
    const scopeIndex = writtenContent?.indexOf('## Scope')
    expect(commentsIndex).toBeLessThan(scopeIndex as number)
  })

  test('creates task without Comments section when no comment provided', async () => {
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
    expect(writtenContent).not.toContain('## Comments')
  })

  test('creates task with comment from user audit', async () => {
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
      arguments: [
        'my-audit',
        '--comment',
        'Check src/api/ directory specifically',
      ],
    })

    expect(result.exitCode).toBe(0)
    const writtenContent = fileSystem.writtenFiles.get(
      '/project/.dust/tasks/audit-my-audit.md'
    )
    expect(writtenContent).toContain('## Comments')
    expect(writtenContent).toContain('Check src/api/ directory specifically')
    // Verify Comments appears before ## Scope
    const commentsIndex = writtenContent?.indexOf('## Comments')
    const scopeIndex = writtenContent?.indexOf('## Scope')
    expect(commentsIndex).toBeLessThan(scopeIndex as number)
  })

  test('lists audits when --comment flag comes before audit name', async () => {
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
      arguments: ['--comment', 'Focus on this area'],
    })

    // Without an audit name, should list audits instead
    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('🔍 Audits')
    expect(output).toContain('security-review')
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

describe('injectComment', () => {
  test('injects comment section before ## Scope', () => {
    const content =
      '# Audit: Security Review\n\nDescription.\n\n## Scope\n\nFocus areas.'
    const result = injectComment(content, 'Check authentication code')
    expect(result).toBe(
      '# Audit: Security Review\n\nDescription.\n\n## Comments\n\nCheck authentication code\n\n## Scope\n\nFocus areas.'
    )
  })

  test('appends comment at end when no ## Scope heading exists', () => {
    const content = '# Audit: Simple\n\nDescription.'
    const result = injectComment(content, 'Focus on this area')
    expect(result).toBe(
      '# Audit: Simple\n\nDescription.\n\n## Comments\n\nFocus on this area\n'
    )
  })

  test('preserves multiline comments', () => {
    const content = '# Audit: Test\n\nDesc.\n\n## Scope\n\nAreas.'
    const result = injectComment(content, 'Line 1\nLine 2\nLine 3')
    expect(result).toContain('Line 1\nLine 2\nLine 3')
  })
})

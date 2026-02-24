import { describe, expect, test } from 'vitest'
import { injectAdHocScope, transformAuditContent } from '../../audits/index'
import { loadStockAudits } from '../../audits/stock-audits'
import {
  createContextEmulator,
  createFileSystemEmulator,
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
    expect(audits.length).toBe(17)

    const names = audits.map(a => a.name)
    expect(names).toContain('agent-developer-experience')
    expect(names).toContain('component-reuse')
    expect(names).toContain('coverage-exclusions')
    expect(names).toContain('data-access-review')
    expect(names).toContain('dead-code')
    expect(names).toContain('error-handling')
    expect(names).toContain('facts-verification')
    expect(names).toContain('global-state')
    expect(names).toContain('ideas-from-commits')
    expect(names).toContain('ideas-from-principles')
    expect(names).toContain('performance-review')
    expect(names).toContain('refactoring-opportunities')
    expect(names).toContain('security-review')
    expect(names).toContain('stale-ideas')
    expect(names).toContain('test-coverage')
    expect(names).toContain('ubiquitous-language')

    for (const audit of audits) {
      expect(typeof audit.name).toBe('string')
      expect(typeof audit.description).toBe('string')
      expect(typeof audit.template).toBe('string')
      expect(audit.template).toContain('# ')
    }
  })

  test('stock audits have no principles because they are designed for downstream projects', () => {
    // component-reuse references the reasonably-dry principle to help agents avoid over-extraction
    // coverage-exclusions references decoupling and test coverage principles
    // error-handling references actionable-errors, debugging-tooling, stop-the-line principles
    // global-state references dependency-injection, decoupled-code, test-isolation principles
    // refactoring-opportunities references boy scout rule, make the change easy, etc.
    // ubiquitous-language references naming principles that are universally applicable
    const auditsWithPrinciples = [
      'component-reuse',
      'coverage-exclusions',
      'data-access-review',
      'error-handling',
      'global-state',
      'refactoring-opportunities',
      'ubiquitous-language',
    ]
    const audits = loadStockAudits()
    for (const audit of audits) {
      const goalsMatch = audit.template.match(
        /## Principles\n\n([\s\S]*?)(?=\n## |\n*$)/
      )
      expect(
        goalsMatch,
        `${audit.name} should have a Principles section`
      ).not.toBeNull()
      if (auditsWithPrinciples.includes(audit.name)) {
        expect(goalsMatch?.[1].trim()).not.toBe('(none)')
      } else {
        expect(goalsMatch?.[1].trim()).toBe('(none)')
      }
    }
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

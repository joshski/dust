import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
} from '../../test/test-utilities'
import type { CommandContext, CommandDependencies } from '../types'
import { audit, STOCK_AUDITS, transformAuditContent } from './audit'

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
      'Check for common security issues in the codebase.'
    )
    expect(output).toContain('→ stock')
    expect(output).toContain('test-coverage')
    expect(output).toContain('Identify areas with missing test coverage.')
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

  test('stock audits array has expected structure', () => {
    expect(STOCK_AUDITS).toBeInstanceOf(Array)
    expect(STOCK_AUDITS.length).toBeGreaterThan(0)

    for (const audit of STOCK_AUDITS) {
      expect(audit).toHaveProperty('name')
      expect(audit).toHaveProperty('description')
      expect(typeof audit.name).toBe('string')
      expect(typeof audit.description).toBe('string')
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
                '# My Custom Audit\n\nCheck for custom issues.\n\n## Goals\n\n- [Example Goal](../goals/example.md)',
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

  test('errors if stock audit has no template', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {},
          tasks: {},
        },
      },
    })

    // 'security-review' is a stock audit without a template
    const result = await audit({
      ...createDependencies(context, fileSystem),
      arguments: ['security-review'],
    })

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      "Error: Stock audit 'security-review' does not have a template yet"
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
    // Temporarily add a stock audit with a template
    const testAudit = {
      name: 'test-audit-with-template',
      description: 'A test audit with a template.',
      template:
        '# Test Audit\n\nThis is a test audit template.\n\n## Goals\n\n- Test Goal',
    }
    STOCK_AUDITS.push(testAudit)

    try {
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
        arguments: ['test-audit-with-template'],
      })

      expect(result.exitCode).toBe(0)
      expect(context.stdoutLines.join('\n')).toContain(
        '→ .dust/tasks/audit-test-audit-with-template.md'
      )
      const writtenContent = fileSystem.writtenFiles.get(
        '/project/.dust/tasks/audit-test-audit-with-template.md'
      )
      expect(writtenContent).toContain('# Audit: Test Audit')
      expect(writtenContent).toContain('This is a test audit template.')
    } finally {
      // Clean up the test audit
      const index = STOCK_AUDITS.indexOf(testAudit)
      if (index > -1) {
        STOCK_AUDITS.splice(index, 1)
      }
    }
  })
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

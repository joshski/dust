import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
} from '../../test/test-utilities'
import type { CommandContext, CommandDependencies } from '../types'
import { audit, STOCK_AUDITS } from './audit'

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

import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator } from '../test/test-utilities'
import { buildAuditsRepository } from './index'

function createFileSystem() {
  return createFileSystemEmulator({
    project: {
      '.dust': {
        config: {
          audits: {
            'custom-audit.md': `# Custom Audit

Review the codebase for custom things.

## Scope

Focus on custom areas.

## Definition of Done

- Custom things reviewed
`,
            'dead-code.md': `# Custom Dead Code Audit

A customized version of the dead code audit.

## Definition of Done

- Dead code identified
`,
          },
        },
        tasks: {},
      },
    },
  })
}

describe('buildAuditsRepository', () => {
  describe('listAudits', () => {
    test('returns all stock audits when no user audits exist', async () => {
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': { tasks: {} } },
      })
      const repository = buildAuditsRepository(fileSystem, '/project/.dust')

      const audits = await repository.listAudits()

      expect(audits.length).toBeGreaterThan(0)
      expect(audits.every(a => a.source === 'stock')).toBe(true)
      // Check a known stock audit exists
      expect(audits.some(a => a.name === 'dead-code')).toBe(true)
    })

    test('returns combined stock and user audits', async () => {
      const fileSystem = createFileSystem()
      const repository = buildAuditsRepository(fileSystem, '/project/.dust')

      const audits = await repository.listAudits()

      // Should have stock audits plus the custom one
      expect(audits.some(a => a.name === 'custom-audit')).toBe(true)
      expect(audits.some(a => a.name === 'security-review')).toBe(true)
    })

    test('user audits take precedence over stock audits', async () => {
      const fileSystem = createFileSystem()
      const repository = buildAuditsRepository(fileSystem, '/project/.dust')

      const audits = await repository.listAudits()

      const deadCodeAudit = audits.find(a => a.name === 'dead-code')
      expect(deadCodeAudit).toBeDefined()
      expect(deadCodeAudit?.source).toBe('.dust/config/audits/dead-code.md')
      expect(deadCodeAudit?.title).toBe('Custom Dead Code Audit')
    })

    test('audits are sorted alphabetically by name', async () => {
      const fileSystem = createFileSystem()
      const repository = buildAuditsRepository(fileSystem, '/project/.dust')

      const audits = await repository.listAudits()
      const names = audits.map(a => a.name)

      expect(names).toEqual([...names].sort())
    })
  })

  describe('parseAudit', () => {
    test('parses a stock audit by name', async () => {
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': { tasks: {} } },
      })
      const repository = buildAuditsRepository(fileSystem, '/project/.dust')

      const audit = await repository.parseAudit({ name: 'security-review' })

      expect(audit.name).toBe('security-review')
      expect(audit.title).toBe('Security Review')
      expect(audit.source).toBe('stock')
      expect(audit.template).toContain('Security Review')
      expect(audit.description).toBeDefined()
    })

    test('parses a user audit by name', async () => {
      const fileSystem = createFileSystem()
      const repository = buildAuditsRepository(fileSystem, '/project/.dust')

      const audit = await repository.parseAudit({ name: 'custom-audit' })

      expect(audit.name).toBe('custom-audit')
      expect(audit.title).toBe('Custom Audit')
      expect(audit.source).toBe('.dust/config/audits/custom-audit.md')
      expect(audit.template).toContain('Review the codebase for custom things')
    })

    test('user audit overrides stock audit with same name', async () => {
      const fileSystem = createFileSystem()
      const repository = buildAuditsRepository(fileSystem, '/project/.dust')

      const audit = await repository.parseAudit({ name: 'dead-code' })

      expect(audit.name).toBe('dead-code')
      expect(audit.title).toBe('Custom Dead Code Audit')
      expect(audit.source).toBe('.dust/config/audits/dead-code.md')
    })

    test('throws when audit does not exist', async () => {
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': { tasks: {} } },
      })
      const repository = buildAuditsRepository(fileSystem, '/project/.dust')

      await expect(
        repository.parseAudit({ name: 'nonexistent' })
      ).rejects.toThrow('Audit not found: "nonexistent"')
    })

    test('uses filename as title when audit has no title heading', async () => {
      const fileSystem = createFileSystemEmulator({
        project: {
          '.dust': {
            config: {
              audits: {
                'no-title-audit.md': 'Just some content without a heading.',
              },
            },
            tasks: {},
          },
        },
      })
      const repository = buildAuditsRepository(fileSystem, '/project/.dust')

      const audit = await repository.parseAudit({ name: 'no-title-audit' })

      expect(audit.name).toBe('no-title-audit')
      expect(audit.title).toBe('no-title-audit')
    })

    test('uses empty string for description when audit has no opening sentence', async () => {
      const fileSystem = createFileSystemEmulator({
        project: {
          '.dust': {
            config: {
              audits: {
                'no-description.md':
                  '# Audit Title\n\n## Scope\n\nJust a scope section.',
              },
            },
            tasks: {},
          },
        },
      })
      const repository = buildAuditsRepository(fileSystem, '/project/.dust')

      const audit = await repository.parseAudit({ name: 'no-description' })

      expect(audit.name).toBe('no-description')
      expect(audit.description).toBe('')
    })
  })

  describe('createAuditTask', () => {
    test('creates a task from a stock audit', async () => {
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': { tasks: {} } },
      })
      const repository = buildAuditsRepository(fileSystem, '/project/.dust')

      const result = await repository.createAuditTask({
        name: 'security-review',
      })

      expect(result.filePath).toBe(
        '/project/.dust/tasks/audit-security-review.md'
      )
      expect(result.relativePath).toBe('.dust/tasks/audit-security-review.md')

      const content = fileSystem.writtenFiles.get(result.filePath) as string
      expect(content).toContain('# Audit: Security Review')
    })

    test('creates a task from a user audit', async () => {
      const fileSystem = createFileSystem()
      const repository = buildAuditsRepository(fileSystem, '/project/.dust')

      const result = await repository.createAuditTask({ name: 'custom-audit' })

      expect(result.filePath).toBe('/project/.dust/tasks/audit-custom-audit.md')

      const content = fileSystem.writtenFiles.get(result.filePath) as string
      expect(content).toContain('# Audit: Custom Audit')
    })

    test('throws when audit task already exists', async () => {
      const fileSystem = createFileSystemEmulator({
        project: {
          '.dust': {
            tasks: {
              'audit-security-review.md': '# Existing task',
            },
          },
        },
      })
      const repository = buildAuditsRepository(fileSystem, '/project/.dust')

      await expect(
        repository.createAuditTask({ name: 'security-review' })
      ).rejects.toThrow(
        'Audit task already exists at .dust/tasks/audit-security-review.md'
      )
    })

    test('throws when audit does not exist', async () => {
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': { tasks: {} } },
      })
      const repository = buildAuditsRepository(fileSystem, '/project/.dust')

      await expect(
        repository.createAuditTask({ name: 'nonexistent' })
      ).rejects.toThrow('Audit not found: "nonexistent"')
    })

    test('transforms audit title to include Audit prefix', async () => {
      const fileSystem = createFileSystem()
      const repository = buildAuditsRepository(fileSystem, '/project/.dust')

      const result = await repository.createAuditTask({ name: 'dead-code' })

      const content = fileSystem.writtenFiles.get(result.filePath) as string
      expect(content).toContain('# Audit: Custom Dead Code Audit')
      expect(content).not.toMatch(/^# Custom Dead Code Audit$/m)
    })
  })
})

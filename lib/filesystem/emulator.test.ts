import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator } from './emulator'

describe('createFileSystemEmulator with flatFiles', () => {
  test('creates files with exact paths', async () => {
    const fileSystem = createFileSystemEmulator(
      {},
      {
        '.dust/config/audits/security.md': '# Security Audit',
        '.dust/tasks/audit-security.md': '# Run security audit',
      }
    )

    expect(fileSystem.exists('.dust/config/audits/security.md')).toBe(true)
    expect(await fileSystem.readFile('.dust/config/audits/security.md')).toBe(
      '# Security Audit'
    )
  })

  test('creates parent directories', () => {
    const fileSystem = createFileSystemEmulator(
      {},
      {
        '.dust/config/audits/security.md': '# Security Audit',
      }
    )

    expect(fileSystem.exists('.dust')).toBe(true)
    expect(fileSystem.exists('.dust/config')).toBe(true)
    expect(fileSystem.exists('.dust/config/audits')).toBe(true)
    expect(fileSystem.isDirectory('.dust/config/audits')).toBe(true)
  })

  test('handles root-level files without directories', () => {
    const fileSystem = createFileSystemEmulator(
      {},
      {
        'README.md': '# Hello',
      }
    )

    expect(fileSystem.exists('README.md')).toBe(true)
    expect(fileSystem.isDirectory('README.md')).toBe(false)
  })

  test('readdir lists directory contents', async () => {
    const fileSystem = createFileSystemEmulator(
      {},
      {
        '.dust/config/audits/security.md': '# Security',
        '.dust/config/audits/dead-code.md': '# Dead Code',
      }
    )

    const entries = await fileSystem.readdir('.dust/config/audits')
    expect(entries.sort()).toEqual(['dead-code.md', 'security.md'])
  })
})

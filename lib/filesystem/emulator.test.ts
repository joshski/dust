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
    expect(entries.toSorted()).toEqual(['dead-code.md', 'security.md'])
  })
})

describe('createFileSystemEmulator scan', () => {
  test('yields files in directory', async () => {
    const fileSystem = createFileSystemEmulator(
      {},
      {
        '/docs/readme.md': '# Readme',
        '/docs/guide.md': '# Guide',
        '/docs/nested/deep.md': '# Deep',
        '/other/file.md': '# Other',
      }
    )

    const files: string[] = []
    for await (const file of fileSystem.scan('/docs')) {
      files.push(file)
    }
    expect(files.toSorted()).toEqual([
      'guide.md',
      'nested/deep.md',
      'readme.md',
    ])
  })

  test('throws ENOENT for non-existent directory', async () => {
    const fileSystem = createFileSystemEmulator({})

    const collectFiles = async () => {
      const files: string[] = []
      for await (const file of fileSystem.scan('/nonexistent')) {
        files.push(file)
      }
      return files
    }
    await expect(collectFiles()).rejects.toThrow('ENOENT')
  })

  test('yields empty for empty directory', async () => {
    const fileSystem = createFileSystemEmulator({
      docs: {},
    })

    const files: string[] = []
    for await (const file of fileSystem.scan('/docs')) {
      files.push(file)
    }
    expect(files).toEqual([])
  })
})

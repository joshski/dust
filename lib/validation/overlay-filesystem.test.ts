import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator } from '../filesystem/emulator'
import { createOverlayFileSystem } from './overlay-filesystem'

describe('createOverlayFileSystem', () => {
  describe('exists', () => {
    test('returns true for patched files', () => {
      const base = createFileSystemEmulator({})
      const overlay = createOverlayFileSystem(
        base,
        new Map([['new-file.md', 'content']])
      )
      expect(overlay.exists('new-file.md')).toBe(true)
    })

    test('returns true for base files', () => {
      const base = createFileSystemEmulator(
        {},
        { 'existing.md': 'base content' }
      )
      const overlay = createOverlayFileSystem(base, new Map())
      expect(overlay.exists('existing.md')).toBe(true)
    })

    test('returns false for deleted files', () => {
      const base = createFileSystemEmulator({}, { 'deleted.md': 'content' })
      const overlay = createOverlayFileSystem(
        base,
        new Map(),
        new Set(['deleted.md'])
      )
      expect(overlay.exists('deleted.md')).toBe(false)
    })

    test('returns true for directories created by patch files', () => {
      const base = createFileSystemEmulator({})
      const overlay = createOverlayFileSystem(
        base,
        new Map([['dir/subdir/file.md', 'content']])
      )
      expect(overlay.exists('dir')).toBe(true)
      expect(overlay.exists('dir/subdir')).toBe(true)
    })
  })

  describe('readFile', () => {
    test('returns patch content for patched files', async () => {
      const base = createFileSystemEmulator(
        {},
        { 'file.md': 'original content' }
      )
      const overlay = createOverlayFileSystem(
        base,
        new Map([['file.md', 'patched content']])
      )
      expect(await overlay.readFile('file.md')).toBe('patched content')
    })

    test('returns base content for unpatched files', async () => {
      const base = createFileSystemEmulator({}, { 'file.md': 'base content' })
      const overlay = createOverlayFileSystem(base, new Map())
      expect(await overlay.readFile('file.md')).toBe('base content')
    })

    test('throws ENOENT for deleted files', async () => {
      const base = createFileSystemEmulator({}, { 'deleted.md': 'content' })
      const overlay = createOverlayFileSystem(
        base,
        new Map(),
        new Set(['deleted.md'])
      )
      await expect(overlay.readFile('deleted.md')).rejects.toThrow('ENOENT')
    })
  })

  describe('readdir', () => {
    test('includes entries from patch files', async () => {
      const base = createFileSystemEmulator({})
      const overlay = createOverlayFileSystem(
        base,
        new Map([
          ['dir/file1.md', 'content1'],
          ['dir/file2.md', 'content2'],
        ])
      )
      const entries = await overlay.readdir('dir')
      expect(entries.toSorted()).toEqual(['file1.md', 'file2.md'])
    })

    test('includes entries from base filesystem', async () => {
      const base = createFileSystemEmulator(
        {},
        { 'dir/base-file.md': 'content' }
      )
      const overlay = createOverlayFileSystem(base, new Map())
      const entries = await overlay.readdir('dir')
      expect(entries).toContain('base-file.md')
    })

    test('merges entries from patch and base', async () => {
      const base = createFileSystemEmulator(
        {},
        { 'dir/base.md': 'base content' }
      )
      const overlay = createOverlayFileSystem(
        base,
        new Map([['dir/patch.md', 'patch content']])
      )
      const entries = await overlay.readdir('dir')
      expect(entries.toSorted()).toEqual(['base.md', 'patch.md'])
    })

    test('excludes deleted entries from base', async () => {
      const base = createFileSystemEmulator(
        {},
        { 'dir/keep.md': 'keep', 'dir/delete.md': 'delete' }
      )
      const overlay = createOverlayFileSystem(
        base,
        new Map(),
        new Set(['dir/delete.md'])
      )
      const entries = await overlay.readdir('dir')
      expect(entries).toContain('keep.md')
      expect(entries).not.toContain('delete.md')
    })

    test('returns first segment for nested patch files', async () => {
      const base = createFileSystemEmulator({})
      const overlay = createOverlayFileSystem(
        base,
        new Map([['dir/subdir/file.md', 'content']])
      )
      const entries = await overlay.readdir('dir')
      expect(entries).toContain('subdir')
    })
  })

  describe('isDirectory', () => {
    test('returns true for directories created by patch files', () => {
      const base = createFileSystemEmulator({})
      const overlay = createOverlayFileSystem(
        base,
        new Map([['dir/file.md', 'content']])
      )
      expect(overlay.isDirectory('dir')).toBe(true)
    })

    test('returns true for base directories', () => {
      const base = createFileSystemEmulator({}, { 'dir/file.md': 'content' })
      const overlay = createOverlayFileSystem(base, new Map())
      expect(overlay.isDirectory('dir')).toBe(true)
    })

    test('returns false for deleted directories', () => {
      const base = createFileSystemEmulator({}, { 'dir/file.md': 'content' })
      const overlay = createOverlayFileSystem(base, new Map(), new Set(['dir']))
      expect(overlay.isDirectory('dir')).toBe(false)
    })
  })

  describe('error handling', () => {
    test('readdir re-throws non-ENOENT errors from base', async () => {
      const permissionError = new Error('EACCES: permission denied')
      ;(permissionError as NodeJS.ErrnoException).code = 'EACCES'
      const base = createFileSystemEmulator({}, { '/a/existing.md': 'content' })
      base.readdir = async () => {
        throw permissionError
      }
      const overlay = createOverlayFileSystem(base, new Map())
      await expect(overlay.readdir('/a')).rejects.toThrow(
        'EACCES: permission denied'
      )
    })

    test('readdir handles ENOENT from base gracefully', async () => {
      const enoentError = new Error('ENOENT: no such file')
      ;(enoentError as NodeJS.ErrnoException).code = 'ENOENT'
      const base = createFileSystemEmulator({})
      base.readdir = async () => {
        throw enoentError
      }
      const overlay = createOverlayFileSystem(
        base,
        new Map([['/a/new.md', 'content']])
      )
      const entries = await overlay.readdir('/a')
      expect(entries).toContain('new.md')
    })
  })
})

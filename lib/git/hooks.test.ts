import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator } from '../cli/test-utilities'
import type { DustSettings } from '../cli/types'
import { createHooksManager } from './hooks'

const defaultSettings: DustSettings = {
  dustCommand: 'bin/dust',
}

describe('createHooksManager', () => {
  describe('isGitRepo', () => {
    test('returns true when .git directory exists', () => {
      const fs = createFileSystemEmulator({
        project: { '.git': {} },
      })
      const manager = createHooksManager('/project', fs, defaultSettings)

      expect(manager.isGitRepo()).toBe(true)
    })

    test('returns false when .git directory does not exist', () => {
      const fs = createFileSystemEmulator()
      const manager = createHooksManager('/project', fs, defaultSettings)

      expect(manager.isGitRepo()).toBe(false)
    })
  })

  describe('isHookInstalled', () => {
    test('returns false when pre-push hook does not exist', async () => {
      const fs = createFileSystemEmulator({
        project: { '.git': { hooks: {} } },
      })
      const manager = createHooksManager('/project', fs, defaultSettings)

      expect(await manager.isHookInstalled()).toBe(false)
    })

    test('returns false when pre-push hook exists but has no dust section', async () => {
      const fs = createFileSystemEmulator({
        project: {
          '.git': {
            hooks: { 'pre-push': '#!/bin/sh\necho "hello"' },
          },
        },
      })
      const manager = createHooksManager('/project', fs, defaultSettings)

      expect(await manager.isHookInstalled()).toBe(false)
    })

    test('returns true when pre-push hook has dust section', async () => {
      const fs = createFileSystemEmulator({
        project: {
          '.git': {
            hooks: {
              'pre-push':
                '#!/bin/sh\n# BEGIN DUST HOOK\nbin/dust pre push\n# END DUST HOOK',
            },
          },
        },
      })
      const manager = createHooksManager('/project', fs, defaultSettings)

      expect(await manager.isHookInstalled()).toBe(true)
    })
  })

  describe('installHook', () => {
    test('creates new hook file when none exists', async () => {
      const fs = createFileSystemEmulator({
        project: { '.git': { hooks: {} } },
      })
      const manager = createHooksManager('/project', fs, defaultSettings)

      await manager.installHook()

      expect(fs.writtenFiles.has('/project/.git/hooks/pre-push')).toBe(true)
      const content = fs.writtenFiles.get('/project/.git/hooks/pre-push')
      expect(content).toContain('#!/bin/sh')
      expect(content).toContain('# BEGIN DUST HOOK')
      expect(content).toContain('bin/dust pre push')
      expect(content).toContain('# END DUST HOOK')
    })

    test('creates hooks directory if it does not exist', async () => {
      const fs = createFileSystemEmulator({
        project: { '.git': {} },
      })
      const manager = createHooksManager('/project', fs, defaultSettings)

      await manager.installHook()

      expect(fs.createdDirs).toContain('/project/.git/hooks')
    })

    test('appends to existing hook file', async () => {
      const fs = createFileSystemEmulator({
        project: {
          '.git': {
            hooks: { 'pre-push': '#!/bin/sh\necho "existing hook"' },
          },
        },
      })
      const manager = createHooksManager('/project', fs, defaultSettings)

      await manager.installHook()

      const content = fs.writtenFiles.get('/project/.git/hooks/pre-push')
      expect(content).toContain('echo "existing hook"')
      expect(content).toContain('# BEGIN DUST HOOK')
      expect(content).toContain('bin/dust pre push')
    })

    test('updates existing dust hook section', async () => {
      const fs = createFileSystemEmulator({
        project: {
          '.git': {
            hooks: {
              'pre-push':
                '#!/bin/sh\necho "existing"\n\n# BEGIN DUST HOOK\nold/path pre push\n# END DUST HOOK',
            },
          },
        },
      })
      const settings: DustSettings = { dustCommand: 'new/path' }
      const manager = createHooksManager('/project', fs, settings)

      await manager.installHook()

      const content = fs.writtenFiles.get('/project/.git/hooks/pre-push')
      expect(content).not.toContain('old/path')
      expect(content).toContain('new/path pre push')
      expect(content).toContain('echo "existing"')
    })

    test('handles hook with only start marker (incomplete dust section)', async () => {
      const fs = createFileSystemEmulator({
        project: {
          '.git': {
            hooks: {
              'pre-push':
                '#!/bin/sh\necho "existing"\n\n# BEGIN DUST HOOK\nold/path pre push',
            },
          },
        },
      })
      const settings: DustSettings = { dustCommand: 'new/path' }
      const manager = createHooksManager('/project', fs, settings)

      await manager.installHook()

      // The incomplete dust section should be preserved (removeDustSection returns content as-is)
      // and the new complete dust section should be appended
      const content = fs.writtenFiles.get('/project/.git/hooks/pre-push')
      expect(content).toContain('# BEGIN DUST HOOK')
      expect(content).toContain('new/path pre push')
      expect(content).toContain('# END DUST HOOK')
    })

    test('handles hook with only dust section (no other content)', async () => {
      const fs = createFileSystemEmulator({
        project: {
          '.git': {
            hooks: {
              'pre-push':
                '# BEGIN DUST HOOK\nold/path pre push\nif [ $? -ne 0 ]; then\n  exit 1\nfi\n# END DUST HOOK',
            },
          },
        },
      })
      const settings: DustSettings = { dustCommand: 'new/path' }
      const manager = createHooksManager('/project', fs, settings)

      await manager.installHook()

      // When there's no other content, it should create a fresh hook file
      const content = fs.writtenFiles.get('/project/.git/hooks/pre-push')
      expect(content).toContain('#!/bin/sh')
      expect(content).toContain('new/path pre push')
      expect(content).not.toContain('old/path')
    })

    test('sets hook file to executable mode', async () => {
      const fs = createFileSystemEmulator({
        project: { '.git': { hooks: {} } },
      })
      const manager = createHooksManager('/project', fs, defaultSettings)

      await manager.installHook()

      expect(fs.permissions.get('/project/.git/hooks/pre-push')).toBe(0o755)
    })
  })

  describe('getHookBinaryPath', () => {
    test('returns null when hook does not exist', async () => {
      const fs = createFileSystemEmulator({
        project: { '.git': { hooks: {} } },
      })
      const manager = createHooksManager('/project', fs, defaultSettings)

      expect(await manager.getHookBinaryPath()).toBe(null)
    })

    test('returns null when hook has no dust section', async () => {
      const fs = createFileSystemEmulator({
        project: {
          '.git': {
            hooks: { 'pre-push': '#!/bin/sh\necho "hello"' },
          },
        },
      })
      const manager = createHooksManager('/project', fs, defaultSettings)

      expect(await manager.getHookBinaryPath()).toBe(null)
    })

    test('returns binary path from dust section', async () => {
      const fs = createFileSystemEmulator({
        project: {
          '.git': {
            hooks: {
              'pre-push':
                '#!/bin/sh\n# BEGIN DUST HOOK\nbin/dust pre push\n# END DUST HOOK',
            },
          },
        },
      })
      const manager = createHooksManager('/project', fs, defaultSettings)

      expect(await manager.getHookBinaryPath()).toBe('bin/dust')
    })

    test('returns null when dust section has no valid command', async () => {
      const fs = createFileSystemEmulator({
        project: {
          '.git': {
            hooks: {
              'pre-push':
                '#!/bin/sh\n# BEGIN DUST HOOK\nsome invalid content\n# END DUST HOOK',
            },
          },
        },
      })
      const manager = createHooksManager('/project', fs, defaultSettings)

      expect(await manager.getHookBinaryPath()).toBe(null)
    })
  })

  describe('updateHookBinaryPath', () => {
    test('does nothing when hook does not exist', async () => {
      const fs = createFileSystemEmulator({
        project: { '.git': { hooks: {} } },
      })
      const manager = createHooksManager('/project', fs, defaultSettings)

      await manager.updateHookBinaryPath('new/path')

      expect(fs.writtenFiles.size).toBe(0)
    })

    test('does nothing when hook has no dust section', async () => {
      const fs = createFileSystemEmulator({
        project: {
          '.git': {
            hooks: { 'pre-push': '#!/bin/sh\necho "hello"' },
          },
        },
      })
      const manager = createHooksManager('/project', fs, defaultSettings)

      await manager.updateHookBinaryPath('new/path')

      expect(fs.writtenFiles.size).toBe(0)
    })

    test('updates binary path in dust section', async () => {
      const fs = createFileSystemEmulator({
        project: {
          '.git': {
            hooks: {
              'pre-push':
                '#!/bin/sh\n# BEGIN DUST HOOK\nold/path pre push\nif [ $? -ne 0 ]; then\n  echo "dust pre-push check failed"\n  exit 1\nfi\n# END DUST HOOK',
            },
          },
        },
      })
      const manager = createHooksManager('/project', fs, defaultSettings)

      await manager.updateHookBinaryPath('new/path')

      const content = fs.writtenFiles.get('/project/.git/hooks/pre-push')
      expect(content).not.toContain('old/path')
      expect(content).toContain('new/path pre push')
    })

    test('handles hook with only start marker (incomplete dust section)', async () => {
      const fs = createFileSystemEmulator({
        project: {
          '.git': {
            hooks: {
              'pre-push': '#!/bin/sh\n# BEGIN DUST HOOK\nold/path pre push',
            },
          },
        },
      })
      const manager = createHooksManager('/project', fs, defaultSettings)

      await manager.updateHookBinaryPath('new/path')

      // Should not update since the dust section is incomplete
      expect(fs.writtenFiles.size).toBe(0)
    })

    test('handles hook with only dust section (no other content)', async () => {
      const fs = createFileSystemEmulator({
        project: {
          '.git': {
            hooks: {
              'pre-push':
                '# BEGIN DUST HOOK\nold/path pre push\nif [ $? -ne 0 ]; then\n  exit 1\nfi\n# END DUST HOOK',
            },
          },
        },
      })
      const manager = createHooksManager('/project', fs, defaultSettings)

      await manager.updateHookBinaryPath('new/path')

      // When there's no other content, it should create a fresh hook file
      const content = fs.writtenFiles.get('/project/.git/hooks/pre-push')
      expect(content).toContain('#!/bin/sh')
      expect(content).toContain('new/path pre push')
      expect(content).not.toContain('old/path')
    })

    test('sets hook file to executable mode', async () => {
      const fs = createFileSystemEmulator({
        project: {
          '.git': {
            hooks: {
              'pre-push':
                '#!/bin/sh\n# BEGIN DUST HOOK\nold/path pre push\nif [ $? -ne 0 ]; then\n  echo "dust pre-push check failed"\n  exit 1\nfi\n# END DUST HOOK',
            },
          },
        },
      })
      const manager = createHooksManager('/project', fs, defaultSettings)

      await manager.updateHookBinaryPath('new/path')

      expect(fs.permissions.get('/project/.git/hooks/pre-push')).toBe(0o755)
    })
  })

  describe('error handling', () => {
    test('isHookInstalled returns false when readFile throws', async () => {
      const fs = createFileSystemEmulator({
        project: {
          '.git': {
            hooks: { 'pre-push': '' },
          },
        },
      })
      fs.readFile = async () => {
        throw new Error('Read error')
      }
      const manager = createHooksManager('/project', fs, defaultSettings)

      expect(await manager.isHookInstalled()).toBe(false)
    })

    test('getHookBinaryPath returns null when readFile throws', async () => {
      const fs = createFileSystemEmulator({
        project: {
          '.git': {
            hooks: { 'pre-push': '' },
          },
        },
      })
      fs.readFile = async () => {
        throw new Error('Read error')
      }
      const manager = createHooksManager('/project', fs, defaultSettings)

      expect(await manager.getHookBinaryPath()).toBe(null)
    })
  })
})

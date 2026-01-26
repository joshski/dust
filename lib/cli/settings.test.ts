import { describe, expect, test } from 'vitest'
import { loadSettings } from './settings'
import type { FileSystem } from './types'

function createMockFs(files: Map<string, string> = new Map()): FileSystem {
  return {
    exists: (path: string) => files.has(path),
    readFile: async (path: string) => files.get(path) || '',
    writeFile: async () => {},
    mkdir: async () => {},
    readdir: async () => [],
  }
}

describe('loadSettings', () => {
  test('returns default settings when no config file exists', async () => {
    const fs = createMockFs()
    const settings = await loadSettings('/project', fs)

    expect(settings.binaryPath).toBe('dust')
  })

  test('loads binaryPath from settings.json', async () => {
    const fs = createMockFs(
      new Map([
        ['/project/.dust/config/settings.json', '{"binaryPath": "bin/dust"}'],
      ])
    )
    const settings = await loadSettings('/project', fs)

    expect(settings.binaryPath).toBe('bin/dust')
  })

  test('returns default settings when config file is invalid JSON', async () => {
    const fs = createMockFs(
      new Map([['/project/.dust/config/settings.json', 'not valid json']])
    )
    const settings = await loadSettings('/project', fs)

    expect(settings.binaryPath).toBe('dust')
  })

  test('merges partial settings with defaults', async () => {
    const fs = createMockFs(
      new Map([['/project/.dust/config/settings.json', '{}']])
    )
    const settings = await loadSettings('/project', fs)

    expect(settings.binaryPath).toBe('dust')
  })
})

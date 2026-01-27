import { afterEach, describe, expect, test, vi } from 'vitest'
import { detectDustCommand, loadSettings } from './settings'
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

describe('detectDustCommand', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('returns bunx dust when bun.lockb exists', () => {
    const fs = createMockFs(new Map([['/project/bun.lockb', '']]))
    expect(detectDustCommand('/project', fs)).toBe('bunx dust')
  })

  test('returns pnpx dust when pnpm-lock.yaml exists', () => {
    const fs = createMockFs(new Map([['/project/pnpm-lock.yaml', '']]))
    expect(detectDustCommand('/project', fs)).toBe('pnpx dust')
  })

  test('returns npx dust when package-lock.json exists', () => {
    const fs = createMockFs(new Map([['/project/package-lock.json', '']]))
    expect(detectDustCommand('/project', fs)).toBe('npx dust')
  })

  test('returns bunx dust when BUN_INSTALL env var is set and no lockfiles', () => {
    vi.stubEnv('BUN_INSTALL', '/home/user/.bun')
    const fs = createMockFs()
    expect(detectDustCommand('/project', fs)).toBe('bunx dust')
  })

  test('returns npx dust as default when no lockfiles and no BUN_INSTALL', () => {
    vi.stubEnv('BUN_INSTALL', '')
    const fs = createMockFs()
    expect(detectDustCommand('/project', fs)).toBe('npx dust')
  })

  test('prioritizes bun.lockb over pnpm-lock.yaml', () => {
    const fs = createMockFs(
      new Map([
        ['/project/bun.lockb', ''],
        ['/project/pnpm-lock.yaml', ''],
      ])
    )
    expect(detectDustCommand('/project', fs)).toBe('bunx dust')
  })

  test('prioritizes pnpm-lock.yaml over package-lock.json', () => {
    const fs = createMockFs(
      new Map([
        ['/project/pnpm-lock.yaml', ''],
        ['/project/package-lock.json', ''],
      ])
    )
    expect(detectDustCommand('/project', fs)).toBe('pnpx dust')
  })

  test('prioritizes lockfiles over BUN_INSTALL env var', () => {
    vi.stubEnv('BUN_INSTALL', '/home/user/.bun')
    const fs = createMockFs(new Map([['/project/package-lock.json', '']]))
    expect(detectDustCommand('/project', fs)).toBe('npx dust')
  })
})

describe('loadSettings', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('returns auto-detected dustCommand when no config file exists', async () => {
    vi.stubEnv('BUN_INSTALL', '')
    const fs = createMockFs()
    const settings = await loadSettings('/project', fs)

    expect(settings.dustCommand).toBe('npx dust')
  })

  test('loads dustCommand from settings.json', async () => {
    const fs = createMockFs(
      new Map([
        ['/project/.dust/config/settings.json', '{"dustCommand": "bin/dust"}'],
      ])
    )
    const settings = await loadSettings('/project', fs)

    expect(settings.dustCommand).toBe('bin/dust')
  })

  test('returns auto-detected dustCommand when config file is invalid JSON', async () => {
    vi.stubEnv('BUN_INSTALL', '')
    const fs = createMockFs(
      new Map([['/project/.dust/config/settings.json', 'not valid json']])
    )
    const settings = await loadSettings('/project', fs)

    expect(settings.dustCommand).toBe('npx dust')
  })

  test('auto-detects dustCommand when not set in settings', async () => {
    const fs = createMockFs(
      new Map([
        ['/project/.dust/config/settings.json', '{}'],
        ['/project/bun.lockb', ''],
      ])
    )
    const settings = await loadSettings('/project', fs)

    expect(settings.dustCommand).toBe('bunx dust')
  })

  test('uses explicit dustCommand over auto-detection', async () => {
    const fs = createMockFs(
      new Map([
        [
          '/project/.dust/config/settings.json',
          '{"dustCommand": "custom/dust"}',
        ],
        ['/project/bun.lockb', ''],
      ])
    )
    const settings = await loadSettings('/project', fs)

    expect(settings.dustCommand).toBe('custom/dust')
  })
})

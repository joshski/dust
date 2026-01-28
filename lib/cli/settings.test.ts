import { afterEach, describe, expect, test, vi } from 'vitest'
import { detectDustCommand, loadSettings } from './settings'
import { createMockFileSystem } from './test-utilities'

describe('detectDustCommand', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('returns bunx dust when bun.lockb exists', () => {
    const fs = createMockFileSystem({
      files: new Map([['/project/bun.lockb', '']]),
    })
    expect(detectDustCommand('/project', fs)).toBe('bunx dust')
  })

  test('returns pnpx dust when pnpm-lock.yaml exists', () => {
    const fs = createMockFileSystem({
      files: new Map([['/project/pnpm-lock.yaml', '']]),
    })
    expect(detectDustCommand('/project', fs)).toBe('pnpx dust')
  })

  test('returns npx dust when package-lock.json exists', () => {
    const fs = createMockFileSystem({
      files: new Map([['/project/package-lock.json', '']]),
    })
    expect(detectDustCommand('/project', fs)).toBe('npx dust')
  })

  test('returns bunx dust when BUN_INSTALL env var is set and no lockfiles', () => {
    vi.stubEnv('BUN_INSTALL', '/home/user/.bun')
    const fs = createMockFileSystem()
    expect(detectDustCommand('/project', fs)).toBe('bunx dust')
  })

  test('returns npx dust as default when no lockfiles and no BUN_INSTALL', () => {
    vi.stubEnv('BUN_INSTALL', '')
    const fs = createMockFileSystem()
    expect(detectDustCommand('/project', fs)).toBe('npx dust')
  })

  test('prioritizes bun.lockb over pnpm-lock.yaml', () => {
    const fs = createMockFileSystem({
      files: new Map([
        ['/project/bun.lockb', ''],
        ['/project/pnpm-lock.yaml', ''],
      ]),
    })
    expect(detectDustCommand('/project', fs)).toBe('bunx dust')
  })

  test('prioritizes pnpm-lock.yaml over package-lock.json', () => {
    const fs = createMockFileSystem({
      files: new Map([
        ['/project/pnpm-lock.yaml', ''],
        ['/project/package-lock.json', ''],
      ]),
    })
    expect(detectDustCommand('/project', fs)).toBe('pnpx dust')
  })

  test('prioritizes lockfiles over BUN_INSTALL env var', () => {
    vi.stubEnv('BUN_INSTALL', '/home/user/.bun')
    const fs = createMockFileSystem({
      files: new Map([['/project/package-lock.json', '']]),
    })
    expect(detectDustCommand('/project', fs)).toBe('npx dust')
  })
})

describe('loadSettings', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('returns auto-detected dustCommand when no config file exists', async () => {
    vi.stubEnv('BUN_INSTALL', '')
    const fs = createMockFileSystem()
    const settings = await loadSettings('/project', fs)

    expect(settings.dustCommand).toBe('npx dust')
    // Exercise the readFile fallback for non-existent files
    expect(await fs.readFile('/non-existent')).toBe('')
  })

  test('loads dustCommand from settings.json', async () => {
    const fs = createMockFileSystem({
      files: new Map([
        ['/project/.dust/config/settings.json', '{"dustCommand": "bin/dust"}'],
      ]),
    })
    const settings = await loadSettings('/project', fs)

    expect(settings.dustCommand).toBe('bin/dust')
  })

  test('returns auto-detected dustCommand when config file is invalid JSON', async () => {
    vi.stubEnv('BUN_INSTALL', '')
    const fs = createMockFileSystem({
      files: new Map([
        ['/project/.dust/config/settings.json', 'not valid json'],
      ]),
    })
    const settings = await loadSettings('/project', fs)

    expect(settings.dustCommand).toBe('npx dust')
  })

  test('auto-detects dustCommand when not set in settings', async () => {
    const fs = createMockFileSystem({
      files: new Map([
        ['/project/.dust/config/settings.json', '{}'],
        ['/project/bun.lockb', ''],
      ]),
    })
    const settings = await loadSettings('/project', fs)

    expect(settings.dustCommand).toBe('bunx dust')
  })

  test('uses explicit dustCommand over auto-detection', async () => {
    const fs = createMockFileSystem({
      files: new Map([
        [
          '/project/.dust/config/settings.json',
          '{"dustCommand": "custom/dust"}',
        ],
        ['/project/bun.lockb', ''],
      ]),
    })
    const settings = await loadSettings('/project', fs)

    expect(settings.dustCommand).toBe('custom/dust')
  })
})

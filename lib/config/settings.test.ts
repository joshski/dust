import { afterEach, describe, expect, test } from 'vitest'
import {
  createFileSystemEmulator,
  restoreEnv,
  stubEnv,
} from '../test/test-utilities'
import {
  detectDustCommand,
  detectInstallCommand,
  detectTestCommand,
  loadSettings,
} from './settings'

describe('detectDustCommand', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('returns bunx dust when bun.lockb exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'bun.lockb': '' },
    })
    expect(detectDustCommand('/project', fileSystem)).toBe('bunx dust')
  })

  test('returns pnpx dust when pnpm-lock.yaml exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'pnpm-lock.yaml': '' },
    })
    expect(detectDustCommand('/project', fileSystem)).toBe('pnpx dust')
  })

  test('returns npx dust when package-lock.json exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'package-lock.json': '' },
    })
    expect(detectDustCommand('/project', fileSystem)).toBe('npx dust')
  })

  test('returns bunx dust when BUN_INSTALL env var is set and no lockfiles', () => {
    stubEnv('BUN_INSTALL', '/home/user/.bun')
    const fileSystem = createFileSystemEmulator()
    expect(detectDustCommand('/project', fileSystem)).toBe('bunx dust')
  })

  test('returns npx dust as default when no lockfiles and no BUN_INSTALL', () => {
    stubEnv('BUN_INSTALL', '')
    const fileSystem = createFileSystemEmulator()
    expect(detectDustCommand('/project', fileSystem)).toBe('npx dust')
  })

  test('prioritizes bun.lockb over pnpm-lock.yaml', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        'bun.lockb': '',
        'pnpm-lock.yaml': '',
      },
    })
    expect(detectDustCommand('/project', fileSystem)).toBe('bunx dust')
  })

  test('prioritizes pnpm-lock.yaml over package-lock.json', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        'pnpm-lock.yaml': '',
        'package-lock.json': '',
      },
    })
    expect(detectDustCommand('/project', fileSystem)).toBe('pnpx dust')
  })

  test('prioritizes lockfiles over BUN_INSTALL env var', () => {
    stubEnv('BUN_INSTALL', '/home/user/.bun')
    const fileSystem = createFileSystemEmulator({
      project: { 'package-lock.json': '' },
    })
    expect(detectDustCommand('/project', fileSystem)).toBe('npx dust')
  })
})

describe('detectInstallCommand', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('returns bun install when bun.lockb exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'bun.lockb': '' },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBe('bun install')
  })

  test('returns pnpm install when pnpm-lock.yaml exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'pnpm-lock.yaml': '' },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBe('pnpm install')
  })

  test('returns npm install when package-lock.json exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'package-lock.json': '' },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBe('npm install')
  })

  test('returns bun install when BUN_INSTALL env var is set and no lockfiles', () => {
    stubEnv('BUN_INSTALL', '/home/user/.bun')
    const fileSystem = createFileSystemEmulator()
    expect(detectInstallCommand('/project', fileSystem)).toBe('bun install')
  })

  test('returns npm install as default when no lockfiles and no BUN_INSTALL', () => {
    stubEnv('BUN_INSTALL', '')
    const fileSystem = createFileSystemEmulator()
    expect(detectInstallCommand('/project', fileSystem)).toBe('npm install')
  })

  test('prioritizes bun.lockb over pnpm-lock.yaml', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        'bun.lockb': '',
        'pnpm-lock.yaml': '',
      },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBe('bun install')
  })

  test('prioritizes lockfiles over BUN_INSTALL env var', () => {
    stubEnv('BUN_INSTALL', '/home/user/.bun')
    const fileSystem = createFileSystemEmulator({
      project: { 'package-lock.json': '' },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBe('npm install')
  })
})

describe('detectTestCommand', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('returns bun test when bun.lockb exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'bun.lockb': '' },
    })
    expect(detectTestCommand('/project', fileSystem)).toBe('bun test')
  })

  test('returns bun test when bun.lock exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'bun.lock': '' },
    })
    expect(detectTestCommand('/project', fileSystem)).toBe('bun test')
  })

  test('returns pnpm test when pnpm-lock.yaml exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'pnpm-lock.yaml': '' },
    })
    expect(detectTestCommand('/project', fileSystem)).toBe('pnpm test')
  })

  test('returns npm test when package-lock.json exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'package-lock.json': '' },
    })
    expect(detectTestCommand('/project', fileSystem)).toBe('npm test')
  })

  test('returns yarn test when yarn.lock exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'yarn.lock': '' },
    })
    expect(detectTestCommand('/project', fileSystem)).toBe('yarn test')
  })

  test('returns bun test when BUN_INSTALL env var is set and no lockfiles', () => {
    stubEnv('BUN_INSTALL', '/home/user/.bun')
    const fileSystem = createFileSystemEmulator({
      project: { 'package.json': '' },
    })
    expect(detectTestCommand('/project', fileSystem)).toBe('bun test')
  })

  test('returns npm test when only package.json exists and no BUN_INSTALL', () => {
    stubEnv('BUN_INSTALL', '')
    const fileSystem = createFileSystemEmulator({
      project: { 'package.json': '' },
    })
    expect(detectTestCommand('/project', fileSystem)).toBe('npm test')
  })

  test('returns null when no lockfiles and no package.json', () => {
    stubEnv('BUN_INSTALL', '')
    const fileSystem = createFileSystemEmulator()
    expect(detectTestCommand('/project', fileSystem)).toBeNull()
  })

  test('prioritizes bun.lockb over other lockfiles', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        'bun.lockb': '',
        'pnpm-lock.yaml': '',
        'package-lock.json': '',
        'yarn.lock': '',
      },
    })
    expect(detectTestCommand('/project', fileSystem)).toBe('bun test')
  })

  test('prioritizes lockfiles over BUN_INSTALL env var', () => {
    stubEnv('BUN_INSTALL', '/home/user/.bun')
    const fileSystem = createFileSystemEmulator({
      project: { 'package-lock.json': '' },
    })
    expect(detectTestCommand('/project', fileSystem)).toBe('npm test')
  })

  test('prioritizes BUN_INSTALL over package.json fallback', () => {
    stubEnv('BUN_INSTALL', '/home/user/.bun')
    const fileSystem = createFileSystemEmulator({
      project: { 'package.json': '' },
    })
    expect(detectTestCommand('/project', fileSystem)).toBe('bun test')
  })
})

describe('loadSettings', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('returns auto-detected dustCommand when no config file exists', async () => {
    stubEnv('BUN_INSTALL', '')
    stubEnv('DUST_EVENTS_URL', '')
    const fileSystem = createFileSystemEmulator()
    const settings = await loadSettings('/project', fileSystem)

    expect(settings.dustCommand).toBe('npx dust')
    expect(settings.eventsUrl).toBeUndefined()
  })

  test('readFile throws ENOENT for non-existent files', async () => {
    const fileSystem = createFileSystemEmulator()
    await expect(fileSystem.readFile('/non-existent')).rejects.toThrow('ENOENT')
  })

  test('loads dustCommand from settings.json', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': '{"dustCommand": "bin/dust"}' },
        },
      },
    })
    const settings = await loadSettings('/project', fileSystem)

    expect(settings.dustCommand).toBe('bin/dust')
  })

  test('returns auto-detected dustCommand when config file is invalid JSON', async () => {
    stubEnv('BUN_INSTALL', '')
    stubEnv('DUST_EVENTS_URL', '')
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': 'not valid json' },
        },
      },
    })
    const settings = await loadSettings('/project', fileSystem)

    expect(settings.dustCommand).toBe('npx dust')
    expect(settings.eventsUrl).toBeUndefined()
  })

  test('auto-detects dustCommand when not set in settings', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': '{}' },
        },
        'bun.lockb': '',
      },
    })
    const settings = await loadSettings('/project', fileSystem)

    expect(settings.dustCommand).toBe('bunx dust')
  })

  test('uses explicit dustCommand over auto-detection', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': '{"dustCommand": "custom/dust"}' },
        },
        'bun.lockb': '',
      },
    })
    const settings = await loadSettings('/project', fileSystem)

    expect(settings.dustCommand).toBe('custom/dust')
  })

  test('auto-detects installCommand when not set in settings', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': '{}' },
        },
        'bun.lockb': '',
      },
    })
    const settings = await loadSettings('/project', fileSystem)

    expect(settings.installCommand).toBe('bun install')
  })

  test('uses explicit installCommand over auto-detection', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            'settings.json': '{"installCommand": "custom install"}',
          },
        },
        'bun.lockb': '',
      },
    })
    const settings = await loadSettings('/project', fileSystem)

    expect(settings.installCommand).toBe('custom install')
  })

  test('loads eventsUrl from settings.json', async () => {
    stubEnv('DUST_EVENTS_URL', '') // Clear env var to test config file only
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            'settings.json': '{"eventsUrl": "https://example.com/events"}',
          },
        },
      },
    })
    const settings = await loadSettings('/project', fileSystem)

    expect(settings.eventsUrl).toBe('https://example.com/events')
  })

  test('DUST_EVENTS_URL env var overrides settings.json value', async () => {
    stubEnv('DUST_EVENTS_URL', 'https://env.example.com/events')
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            'settings.json':
              '{"eventsUrl": "https://config.example.com/events"}',
          },
        },
      },
    })
    const settings = await loadSettings('/project', fileSystem)

    expect(settings.eventsUrl).toBe('https://env.example.com/events')
  })

  test('DUST_EVENTS_URL env var works when settings.json has no eventsUrl', async () => {
    stubEnv('DUST_EVENTS_URL', 'https://env.example.com/events')
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': '{}' },
        },
      },
    })
    const settings = await loadSettings('/project', fileSystem)

    expect(settings.eventsUrl).toBe('https://env.example.com/events')
  })

  test('DUST_EVENTS_URL env var works when no settings.json exists', async () => {
    stubEnv('DUST_EVENTS_URL', 'https://env.example.com/events')
    stubEnv('BUN_INSTALL', '')
    const fileSystem = createFileSystemEmulator()
    const settings = await loadSettings('/project', fileSystem)

    expect(settings.eventsUrl).toBe('https://env.example.com/events')
  })

  test('eventsUrl is undefined when neither env var nor config is set', async () => {
    stubEnv('DUST_EVENTS_URL', '')
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': '{}' },
        },
      },
    })
    const settings = await loadSettings('/project', fileSystem)

    expect(settings.eventsUrl).toBeUndefined()
  })

  test('DUST_EVENTS_URL env var works when settings.json is invalid JSON', async () => {
    stubEnv('DUST_EVENTS_URL', 'https://env.example.com/events')
    stubEnv('BUN_INSTALL', '')
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': 'not valid json' },
        },
      },
    })
    const settings = await loadSettings('/project', fileSystem)

    expect(settings.eventsUrl).toBe('https://env.example.com/events')
  })

  test('normalizes string entries in checks array to CheckConfig objects', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            'settings.json': JSON.stringify({
              checks: ['npm run lint', { name: 'test', command: 'npm test' }],
            }),
          },
        },
      },
    })
    const settings = await loadSettings('/project', fileSystem)

    expect(settings.checks).toEqual([
      { name: 'npm run lint', command: 'npm run lint' },
      { name: 'test', command: 'npm test' },
    ])
  })

  test('preserves timeoutMilliseconds on object check entries', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            'settings.json': JSON.stringify({
              checks: [
                {
                  name: 'test',
                  command: 'npm test',
                  timeoutMilliseconds: 30000,
                },
              ],
            }),
          },
        },
      },
    })
    const settings = await loadSettings('/project', fileSystem)

    expect(settings.checks?.[0].timeoutMilliseconds).toBe(30000)
  })
})

describe('stubEnv and restoreEnv', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('restores env var that did not exist originally by deleting it', () => {
    const uniqueVarName = 'DUST_TEST_NONEXISTENT_VAR_12345'
    // Ensure it doesn't exist
    delete process.env[uniqueVarName]
    expect(process.env[uniqueVarName]).toBeUndefined()

    // Stub it
    stubEnv(uniqueVarName, 'test-value')
    expect(process.env[uniqueVarName]).toBe('test-value')

    // Restore should delete it
    restoreEnv()
    expect(process.env[uniqueVarName]).toBeUndefined()
  })

  test('restores env var to original value when it existed', () => {
    const uniqueVarName = 'DUST_TEST_EXISTING_VAR_12345'
    // Set an original value
    process.env[uniqueVarName] = 'original-value'

    // Stub it with a different value
    stubEnv(uniqueVarName, 'stubbed-value')
    expect(process.env[uniqueVarName]).toBe('stubbed-value')

    // Restore should bring back original value
    restoreEnv()
    expect(process.env[uniqueVarName]).toBe('original-value')

    // Clean up
    delete process.env[uniqueVarName]
  })

  test('keeps original value when stubbing same var multiple times', () => {
    const uniqueVarName = 'DUST_TEST_MULTI_STUB_VAR_12345'
    // Set an original value
    process.env[uniqueVarName] = 'original-value'

    // Stub it multiple times
    stubEnv(uniqueVarName, 'first-stub')
    expect(process.env[uniqueVarName]).toBe('first-stub')

    stubEnv(uniqueVarName, 'second-stub')
    expect(process.env[uniqueVarName]).toBe('second-stub')

    // Restore should bring back original value, not first stub
    restoreEnv()
    expect(process.env[uniqueVarName]).toBe('original-value')

    // Clean up
    delete process.env[uniqueVarName]
  })
})

import { afterEach, describe, expect, test } from 'vitest'
import {
  detectDustCommand,
  detectInstallDependenciesHint,
  loadSettings,
} from './settings'
import { createFileSystemEmulator, restoreEnv, stubEnv } from './test-utilities'

describe('detectDustCommand', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('returns bunx dust when bun.lockb exists', () => {
    const fs = createFileSystemEmulator({
      project: { 'bun.lockb': '' },
    })
    expect(detectDustCommand('/project', fs)).toBe('bunx dust')
  })

  test('returns pnpx dust when pnpm-lock.yaml exists', () => {
    const fs = createFileSystemEmulator({
      project: { 'pnpm-lock.yaml': '' },
    })
    expect(detectDustCommand('/project', fs)).toBe('pnpx dust')
  })

  test('returns npx dust when package-lock.json exists', () => {
    const fs = createFileSystemEmulator({
      project: { 'package-lock.json': '' },
    })
    expect(detectDustCommand('/project', fs)).toBe('npx dust')
  })

  test('returns bunx dust when BUN_INSTALL env var is set and no lockfiles', () => {
    stubEnv('BUN_INSTALL', '/home/user/.bun')
    const fs = createFileSystemEmulator()
    expect(detectDustCommand('/project', fs)).toBe('bunx dust')
  })

  test('returns npx dust as default when no lockfiles and no BUN_INSTALL', () => {
    stubEnv('BUN_INSTALL', '')
    const fs = createFileSystemEmulator()
    expect(detectDustCommand('/project', fs)).toBe('npx dust')
  })

  test('prioritizes bun.lockb over pnpm-lock.yaml', () => {
    const fs = createFileSystemEmulator({
      project: {
        'bun.lockb': '',
        'pnpm-lock.yaml': '',
      },
    })
    expect(detectDustCommand('/project', fs)).toBe('bunx dust')
  })

  test('prioritizes pnpm-lock.yaml over package-lock.json', () => {
    const fs = createFileSystemEmulator({
      project: {
        'pnpm-lock.yaml': '',
        'package-lock.json': '',
      },
    })
    expect(detectDustCommand('/project', fs)).toBe('pnpx dust')
  })

  test('prioritizes lockfiles over BUN_INSTALL env var', () => {
    stubEnv('BUN_INSTALL', '/home/user/.bun')
    const fs = createFileSystemEmulator({
      project: { 'package-lock.json': '' },
    })
    expect(detectDustCommand('/project', fs)).toBe('npx dust')
  })
})

describe('detectInstallDependenciesHint', () => {
  test('returns bun install when bun.lockb exists', () => {
    const fs = createFileSystemEmulator({
      project: { 'bun.lockb': '' },
    })
    expect(detectInstallDependenciesHint('/project', fs)).toBe(
      'Run `bun install`'
    )
  })

  test('returns bun install when bun.lock exists', () => {
    const fs = createFileSystemEmulator({
      project: { 'bun.lock': '' },
    })
    expect(detectInstallDependenciesHint('/project', fs)).toBe(
      'Run `bun install`'
    )
  })

  test('returns pnpm install when pnpm-lock.yaml exists', () => {
    const fs = createFileSystemEmulator({
      project: { 'pnpm-lock.yaml': '' },
    })
    expect(detectInstallDependenciesHint('/project', fs)).toBe(
      'Run `pnpm install`'
    )
  })

  test('returns npm install when package-lock.json exists', () => {
    const fs = createFileSystemEmulator({
      project: { 'package-lock.json': '' },
    })
    expect(detectInstallDependenciesHint('/project', fs)).toBe(
      'Run `npm install`'
    )
  })

  test('returns yarn install when yarn.lock exists', () => {
    const fs = createFileSystemEmulator({
      project: { 'yarn.lock': '' },
    })
    expect(detectInstallDependenciesHint('/project', fs)).toBe(
      'Run `yarn install`'
    )
  })

  test('returns generic hint when no lockfile exists', () => {
    const fs = createFileSystemEmulator()
    expect(detectInstallDependenciesHint('/project', fs)).toBe(
      'Install any dependencies'
    )
  })

  test('prioritizes bun.lockb over other lockfiles', () => {
    const fs = createFileSystemEmulator({
      project: {
        'bun.lockb': '',
        'pnpm-lock.yaml': '',
        'package-lock.json': '',
        'yarn.lock': '',
      },
    })
    expect(detectInstallDependenciesHint('/project', fs)).toBe(
      'Run `bun install`'
    )
  })

  test('prioritizes pnpm-lock.yaml over npm and yarn', () => {
    const fs = createFileSystemEmulator({
      project: {
        'pnpm-lock.yaml': '',
        'package-lock.json': '',
        'yarn.lock': '',
      },
    })
    expect(detectInstallDependenciesHint('/project', fs)).toBe(
      'Run `pnpm install`'
    )
  })

  test('prioritizes package-lock.json over yarn.lock', () => {
    const fs = createFileSystemEmulator({
      project: {
        'package-lock.json': '',
        'yarn.lock': '',
      },
    })
    expect(detectInstallDependenciesHint('/project', fs)).toBe(
      'Run `npm install`'
    )
  })
})

describe('loadSettings', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('returns auto-detected dustCommand when no config file exists', async () => {
    stubEnv('BUN_INSTALL', '')
    const fs = createFileSystemEmulator()
    const settings = await loadSettings('/project', fs)

    expect(settings.dustCommand).toBe('npx dust')
    // Exercise the readFile fallback for non-existent files
    expect(await fs.readFile('/non-existent')).toBe('')
  })

  test('loads dustCommand from settings.json', async () => {
    const fs = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': '{"dustCommand": "bin/dust"}' },
        },
      },
    })
    const settings = await loadSettings('/project', fs)

    expect(settings.dustCommand).toBe('bin/dust')
  })

  test('returns auto-detected dustCommand when config file is invalid JSON', async () => {
    stubEnv('BUN_INSTALL', '')
    const fs = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': 'not valid json' },
        },
      },
    })
    const settings = await loadSettings('/project', fs)

    expect(settings.dustCommand).toBe('npx dust')
  })

  test('auto-detects dustCommand when not set in settings', async () => {
    const fs = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': '{}' },
        },
        'bun.lockb': '',
      },
    })
    const settings = await loadSettings('/project', fs)

    expect(settings.dustCommand).toBe('bunx dust')
  })

  test('uses explicit dustCommand over auto-detection', async () => {
    const fs = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': '{"dustCommand": "custom/dust"}' },
        },
        'bun.lockb': '',
      },
    })
    const settings = await loadSettings('/project', fs)

    expect(settings.dustCommand).toBe('custom/dust')
  })

  test('returns auto-detected installDependenciesHint when no config file exists', async () => {
    stubEnv('BUN_INSTALL', '')
    const fs = createFileSystemEmulator({
      project: { 'yarn.lock': '' },
    })
    const settings = await loadSettings('/project', fs)

    expect(settings.installDependenciesHint).toBe('Run `yarn install`')
  })

  test('auto-detects installDependenciesHint when not set in settings', async () => {
    const fs = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': '{}' },
        },
        'pnpm-lock.yaml': '',
      },
    })
    const settings = await loadSettings('/project', fs)

    expect(settings.installDependenciesHint).toBe('Run `pnpm install`')
  })

  test('uses explicit installDependenciesHint over auto-detection', async () => {
    const fs = createFileSystemEmulator({
      project: {
        '.dust': {
          config: {
            'settings.json': '{"installDependenciesHint": "Run `make deps`"}',
          },
        },
        'bun.lockb': '',
      },
    })
    const settings = await loadSettings('/project', fs)

    expect(settings.installDependenciesHint).toBe('Run `make deps`')
  })

  test('returns auto-detected installDependenciesHint when config file is invalid JSON', async () => {
    stubEnv('BUN_INSTALL', '')
    const fs = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': 'not valid json' },
        },
        'package-lock.json': '',
      },
    })
    const settings = await loadSettings('/project', fs)

    expect(settings.installDependenciesHint).toBe('Run `npm install`')
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

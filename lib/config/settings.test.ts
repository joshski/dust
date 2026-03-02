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
  validateSettingsJson,
} from './settings'

describe('detectDustCommand', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('returns bunx dust when bun.lock exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'bun.lock': '' },
    })
    expect(detectDustCommand('/project', fileSystem)).toBe('bunx dust')
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

  test('prioritizes bun.lock over bun.lockb', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        'bun.lock': '',
        'bun.lockb': '',
      },
    })
    expect(detectDustCommand('/project', fileSystem)).toBe('bunx dust')
  })

  test('prioritizes bun lockfiles over pnpm-lock.yaml', () => {
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

  // JavaScript ecosystem
  test('returns bun install when bun.lock exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'bun.lock': '' },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBe('bun install')
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

  test('prioritizes bun.lock over bun.lockb', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        'bun.lock': '',
        'bun.lockb': '',
      },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBe('bun install')
  })

  test('prioritizes bun lockfiles over pnpm-lock.yaml', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        'bun.lockb': '',
        'pnpm-lock.yaml': '',
      },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBe('bun install')
  })

  // Ruby ecosystem
  test('returns bundle install when Gemfile.lock exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'Gemfile.lock': '' },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBe('bundle install')
  })

  // Python ecosystem
  test('returns poetry install when poetry.lock exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'poetry.lock': '' },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBe('poetry install')
  })

  test('returns pipenv install when Pipfile.lock exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'Pipfile.lock': '' },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBe('pipenv install')
  })

  test('returns pip install -r requirements.txt when requirements.txt exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'requirements.txt': '' },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBe(
      'pip install -r requirements.txt'
    )
  })

  test('prioritizes poetry.lock over Pipfile.lock', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        'poetry.lock': '',
        'Pipfile.lock': '',
      },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBe('poetry install')
  })

  // Go ecosystem
  test('returns go mod download when go.sum exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'go.sum': '' },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBe('go mod download')
  })

  // Rust ecosystem
  test('returns cargo build when Cargo.lock exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'Cargo.lock': '' },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBe('cargo build')
  })

  // PHP ecosystem
  test('returns composer install when composer.lock exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'composer.lock': '' },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBe(
      'composer install'
    )
  })

  // Elixir ecosystem
  test('returns mix deps.get when mix.lock exists', () => {
    const fileSystem = createFileSystemEmulator({
      project: { 'mix.lock': '' },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBe('mix deps.get')
  })

  // No lockfile case
  test('returns null when no lockfiles exist', () => {
    const fileSystem = createFileSystemEmulator()
    expect(detectInstallCommand('/project', fileSystem)).toBeNull()
  })

  // Multi-ecosystem case
  test('returns null when multiple ecosystems are detected', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        'package-lock.json': '',
        'Gemfile.lock': '',
      },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBeNull()
  })

  test('returns null when JS and Python ecosystems are detected', () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        'bun.lockb': '',
        'requirements.txt': '',
      },
    })
    expect(detectInstallCommand('/project', fileSystem)).toBeNull()
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
    expect(settings.installCommand).toBeUndefined()
    expect(settings.eventsUrl).toBeUndefined()
  })

  test('auto-detects installCommand when no config file exists and lockfile found', async () => {
    stubEnv('BUN_INSTALL', '')
    stubEnv('DUST_EVENTS_URL', '')
    const fileSystem = createFileSystemEmulator({
      project: { 'Gemfile.lock': '' },
    })
    const settings = await loadSettings('/project', fileSystem)

    expect(settings.dustCommand).toBe('npx dust')
    expect(settings.installCommand).toBe('bundle install')
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

  test('throws when config file is invalid JSON', async () => {
    stubEnv('BUN_INSTALL', '')
    stubEnv('DUST_EVENTS_URL', '')
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': 'not valid json' },
        },
      },
    })

    await expect(loadSettings('/project', fileSystem)).rejects.toThrow(
      SyntaxError
    )
  })

  test('throws when config file is invalid JSON even with lockfile', async () => {
    stubEnv('BUN_INSTALL', '')
    stubEnv('DUST_EVENTS_URL', '')
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': 'not valid json' },
        },
        'go.sum': '',
      },
    })

    await expect(loadSettings('/project', fileSystem)).rejects.toThrow(
      SyntaxError
    )
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

  test('installCommand is undefined when settings.json exists but no lockfile detected', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': '{}' },
        },
      },
    })
    const settings = await loadSettings('/project', fileSystem)

    expect(settings.installCommand).toBeUndefined()
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

  test('throws when settings.json is invalid JSON even with DUST_EVENTS_URL env var', async () => {
    stubEnv('DUST_EVENTS_URL', 'https://env.example.com/events')
    stubEnv('BUN_INSTALL', '')
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': 'not valid json' },
        },
      },
    })

    await expect(loadSettings('/project', fileSystem)).rejects.toThrow(
      SyntaxError
    )
  })

  test('re-throws unexpected filesystem errors', async () => {
    stubEnv('BUN_INSTALL', '')
    stubEnv('DUST_EVENTS_URL', '')
    const permissionError = new Error('EACCES: permission denied')
    ;(permissionError as NodeJS.ErrnoException).code = 'EACCES'
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': '{}' },
        },
      },
    })
    fileSystem.readFile = async () => {
      throw permissionError
    }

    await expect(loadSettings('/project', fileSystem)).rejects.toThrow(
      'EACCES: permission denied'
    )
  })

  test('returns defaults when readFile throws ENOENT after exists check', async () => {
    // Race condition case: file exists when checked but deleted before read
    stubEnv('BUN_INSTALL', '')
    stubEnv('DUST_EVENTS_URL', 'https://env.example.com/events')
    const enoentError = new Error('ENOENT: no such file')
    ;(enoentError as NodeJS.ErrnoException).code = 'ENOENT'
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': '{}' },
        },
        'bun.lockb': '',
      },
    })
    fileSystem.readFile = async () => {
      throw enoentError
    }

    const settings = await loadSettings('/project', fileSystem)
    expect(settings.dustCommand).toBe('bunx dust')
    expect(settings.installCommand).toBe('bun install')
    expect(settings.eventsUrl).toBe('https://env.example.com/events')
  })

  test('returns defaults without optional properties when ENOENT and no lockfile', async () => {
    // Test the false branches: no lockfile detected and no DUST_EVENTS_URL
    stubEnv('BUN_INSTALL', '')
    stubEnv('DUST_EVENTS_URL', '')
    const enoentError = new Error('ENOENT: no such file')
    ;(enoentError as NodeJS.ErrnoException).code = 'ENOENT'
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          config: { 'settings.json': '{}' },
        },
      },
    })
    fileSystem.readFile = async () => {
      throw enoentError
    }

    const settings = await loadSettings('/project', fileSystem)
    expect(settings.dustCommand).toBe('npx dust')
    expect(settings.installCommand).toBeUndefined()
    expect(settings.eventsUrl).toBeUndefined()
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

  test('scopes env var to callback and restores after sync callback', () => {
    const uniqueVarName = 'DUST_TEST_SCOPED_VAR_12345'
    process.env[uniqueVarName] = 'original-value'

    stubEnv(uniqueVarName, 'scoped-value', () => {
      expect(process.env[uniqueVarName]).toBe('scoped-value')
    })

    expect(process.env[uniqueVarName]).toBe('original-value')
    delete process.env[uniqueVarName]
  })

  test('scopes env var to callback and restores after async callback', async () => {
    const uniqueVarName = 'DUST_TEST_SCOPED_ASYNC_VAR_12345'
    process.env[uniqueVarName] = 'original-value'

    await stubEnv(uniqueVarName, 'scoped-value', async () => {
      expect(process.env[uniqueVarName]).toBe('scoped-value')
      await Promise.resolve()
      expect(process.env[uniqueVarName]).toBe('scoped-value')
    })

    expect(process.env[uniqueVarName]).toBe('original-value')
    delete process.env[uniqueVarName]
  })

  test('restores env var when scoped callback throws', () => {
    const uniqueVarName = 'DUST_TEST_SCOPED_THROW_VAR_12345'
    process.env[uniqueVarName] = 'original-value'

    expect(() =>
      stubEnv(uniqueVarName, 'scoped-value', () => {
        expect(process.env[uniqueVarName]).toBe('scoped-value')
        throw new Error('boom')
      })
    ).toThrow('boom')

    expect(process.env[uniqueVarName]).toBe('original-value')
    delete process.env[uniqueVarName]
  })
})

describe('validateSettingsJson', () => {
  test('returns empty array for valid settings', () => {
    const settings = JSON.stringify({
      dustCommand: 'bin/dust',
      checks: [
        { name: 'lint', command: 'npm run lint' },
        { name: 'test', command: 'npm test', hints: ['Run tests first'] },
      ],
    })
    expect(validateSettingsJson(settings)).toEqual([])
  })

  test('returns violation for invalid JSON', () => {
    const violations = validateSettingsJson('not valid json')
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('Invalid JSON')
  })

  test('returns violation when settings is not an object', () => {
    expect(validateSettingsJson('[]')[0].message).toBe(
      'settings.json must be a JSON object'
    )
    expect(validateSettingsJson('null')[0].message).toBe(
      'settings.json must be a JSON object'
    )
    expect(validateSettingsJson('"string"')[0].message).toBe(
      'settings.json must be a JSON object'
    )
  })

  test('returns violation for unknown top-level key', () => {
    const settings = JSON.stringify({
      dustCommand: 'bin/dust',
      unknownKey: 'value',
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('Unknown key "unknownKey"')
    expect(violations[0].message).toContain('Known keys:')
  })

  test('returns violation for typo like "check" instead of "checks"', () => {
    const settings = JSON.stringify({
      check: [{ name: 'lint', command: 'npm run lint' }],
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('Unknown key "check"')
  })

  test('returns violation when checks is not an array', () => {
    const settings = JSON.stringify({
      checks: 'not an array',
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe('"checks" must be an array')
  })

  test('accepts string shorthand in checks array', () => {
    const settings = JSON.stringify({
      checks: ['npm run lint', 'npm test'],
    })
    expect(validateSettingsJson(settings)).toEqual([])
  })

  test('returns violation for check entry that is not string or object', () => {
    const settings = JSON.stringify({
      checks: [123],
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe('checks[0] must be a string or object')
  })

  test('returns violation for check entry missing name', () => {
    const settings = JSON.stringify({
      checks: [{ command: 'npm test' }],
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe(
      'checks[0] is missing required field "name"'
    )
  })

  test('returns violation for check entry missing command', () => {
    const settings = JSON.stringify({
      checks: [{ name: 'lint' }],
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe(
      'checks[0] is missing required field "command"'
    )
  })

  test('returns violation for check entry with name not being a string', () => {
    const settings = JSON.stringify({
      checks: [{ name: 123, command: 'npm test' }],
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe('checks[0].name must be a string')
  })

  test('returns violation for check entry with command not being a string', () => {
    const settings = JSON.stringify({
      checks: [{ name: 'lint', command: 123 }],
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe('checks[0].command must be a string')
  })

  test('returns violation for unknown key in check entry', () => {
    const settings = JSON.stringify({
      checks: [{ name: 'lint', command: 'npm run lint', unknownField: true }],
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toContain('Unknown key "unknownField"')
    expect(violations[0].message).toContain('checks[0]')
  })

  test('returns violation when hints is not an array', () => {
    const settings = JSON.stringify({
      checks: [
        { name: 'lint', command: 'npm run lint', hints: 'not an array' },
      ],
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe(
      'checks[0].hints must be an array of strings'
    )
  })

  test('returns violation when hints contains non-string', () => {
    const settings = JSON.stringify({
      checks: [
        { name: 'lint', command: 'npm run lint', hints: ['valid', 123] },
      ],
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe('checks[0].hints[1] must be a string')
  })

  test('returns violation when timeoutMilliseconds is not a positive number', () => {
    const settings = JSON.stringify({
      checks: [
        {
          name: 'lint',
          command: 'npm run lint',
          timeoutMilliseconds: 'not a number',
        },
      ],
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe(
      'checks[0].timeoutMilliseconds must be a positive number'
    )
  })

  test('returns violation when timeoutMilliseconds is zero', () => {
    const settings = JSON.stringify({
      checks: [
        { name: 'lint', command: 'npm run lint', timeoutMilliseconds: 0 },
      ],
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe(
      'checks[0].timeoutMilliseconds must be a positive number'
    )
  })

  test('returns violation when timeoutMilliseconds is negative', () => {
    const settings = JSON.stringify({
      checks: [
        { name: 'lint', command: 'npm run lint', timeoutMilliseconds: -100 },
      ],
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe(
      'checks[0].timeoutMilliseconds must be a positive number'
    )
  })

  test('accepts valid positive timeoutMilliseconds', () => {
    const settings = JSON.stringify({
      checks: [
        { name: 'lint', command: 'npm run lint', timeoutMilliseconds: 30000 },
      ],
    })
    expect(validateSettingsJson(settings)).toEqual([])
  })

  test('returns violation when extraDirectories is not an array', () => {
    const settings = JSON.stringify({
      extraDirectories: 'not an array',
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe(
      '"extraDirectories" must be an array of strings'
    )
  })

  test('returns violation when extraDirectories contains non-string', () => {
    const settings = JSON.stringify({
      extraDirectories: ['templates', 123],
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe('extraDirectories[1] must be a string')
  })

  test('accepts valid extraDirectories', () => {
    const settings = JSON.stringify({
      extraDirectories: ['templates', 'examples'],
    })
    expect(validateSettingsJson(settings)).toEqual([])
  })

  test('returns violation when dustCommand is not a string', () => {
    const settings = JSON.stringify({
      dustCommand: 123,
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe('"dustCommand" must be a string')
  })

  test('returns violation when installCommand is not a string', () => {
    const settings = JSON.stringify({
      installCommand: 123,
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe('"installCommand" must be a string')
  })

  test('returns violation when eventsUrl is not a string', () => {
    const settings = JSON.stringify({
      eventsUrl: 123,
    })
    const violations = validateSettingsJson(settings)
    expect(violations).toHaveLength(1)
    expect(violations[0].message).toBe('"eventsUrl" must be a string')
  })

  test('reports all schema violations at once', () => {
    const settings = JSON.stringify({
      unknownKey: 'value',
      dustCommand: 123,
      checks: [
        { wrongField: true },
        { name: 'lint', command: 'npm run lint', hints: 'not array' },
      ],
    })
    const violations = validateSettingsJson(settings)
    // Should have: unknown key, dustCommand not string, wrongField in checks[0],
    // missing name in checks[0], missing command in checks[0], hints not array in checks[1]
    expect(violations.length).toBeGreaterThan(1)
    const messages = violations.map(v => v.message)
    expect(messages.some(m => m.includes('Unknown key "unknownKey"'))).toBe(
      true
    )
    expect(
      messages.some(m => m.includes('"dustCommand" must be a string'))
    ).toBe(true)
  })

  test('validates all known settings keys are accepted', () => {
    const settings = JSON.stringify({
      dustCommand: 'bin/dust',
      installCommand: 'bun install',
      eventsUrl: 'https://example.com',
      checks: [{ name: 'lint', command: 'npm run lint' }],
      extraDirectories: ['templates'],
    })
    expect(validateSettingsJson(settings)).toEqual([])
  })

  test('returns empty array for empty object', () => {
    expect(validateSettingsJson('{}')).toEqual([])
  })
})

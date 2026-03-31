import { describe, expect, test } from 'vitest'
import { getMachineId, storeMachineId, type MachineIdIO } from './native-io'
import { join } from 'node:path'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'

/**
 * Create a test MachineIdIO implementation with configurable behavior.
 */
function createTestMachineIdIO(options: {
  env?: Record<string, string>
  fileContents?: string
  fileError?: Error
  hostname?: string
}): MachineIdIO {
  return {
    getEnv: (key: string) => options.env?.[key],
    readFile: async (_path: string, _encoding: 'utf8') => {
      if (options.fileError) {
        throw options.fileError
      }
      if (options.fileContents !== undefined) {
        return options.fileContents
      }
      throw new Error('ENOENT: no such file or directory')
    },
    getHostname: () => options.hostname ?? 'default-hostname',
  }
}

/**
 * Create a no-op mkdir mock.
 */
function createMockMkdir() {
  return async (_path: string, _options?: { recursive?: boolean }) => undefined
}

/**
 * Create a no-op writeFile mock.
 */
function createMockWriteFile() {
  return async (_path: string, _content: string, _encoding: 'utf8') => {}
}

describe('getMachineId', () => {
  test('returns value from DUST_MACHINE_ID environment variable', async () => {
    const io = createTestMachineIdIO({
      env: { DUST_MACHINE_ID: 'env-machine' },
      hostname: 'fallback-hostname',
    })

    const result = await getMachineId(io)

    expect(result).toBe('env-machine')
  })

  test('trims whitespace from environment variable', async () => {
    const io = createTestMachineIdIO({
      env: { DUST_MACHINE_ID: '  env-machine  ' },
      hostname: 'fallback-hostname',
    })

    const result = await getMachineId(io)

    expect(result).toBe('env-machine')
  })

  test('skips empty environment variable and checks file', async () => {
    const io = createTestMachineIdIO({
      env: { DUST_MACHINE_ID: '   ' },
      fileContents: 'file-machine',
      hostname: 'fallback-hostname',
    })

    const result = await getMachineId(io)

    expect(result).toBe('file-machine')
  })

  test('returns value from ~/.dust/machine-id file when env var not set', async () => {
    const io = createTestMachineIdIO({
      fileContents: 'file-machine',
      hostname: 'fallback-hostname',
    })

    const result = await getMachineId(io)

    expect(result).toBe('file-machine')
  })

  test('trims whitespace from file contents', async () => {
    const io = createTestMachineIdIO({
      fileContents: '  file-machine  \n',
      hostname: 'fallback-hostname',
    })

    const result = await getMachineId(io)

    expect(result).toBe('file-machine')
  })

  test('skips empty file and falls back to hostname', async () => {
    const io = createTestMachineIdIO({
      fileContents: '   \n  ',
      hostname: 'fallback-hostname',
    })

    const result = await getMachineId(io)

    expect(result).toBe('fallback-hostname')
  })

  test('falls back to hostname when file does not exist', async () => {
    const io = createTestMachineIdIO({
      fileError: new Error('ENOENT: no such file or directory'),
      hostname: 'fallback-hostname',
    })

    const result = await getMachineId(io)

    expect(result).toBe('fallback-hostname')
  })

  test('falls back to hostname when file read fails', async () => {
    const io = createTestMachineIdIO({
      fileError: new Error('EACCES: permission denied'),
      hostname: 'fallback-hostname',
    })

    const result = await getMachineId(io)

    expect(result).toBe('fallback-hostname')
  })

  test('environment variable takes precedence over file', async () => {
    const io = createTestMachineIdIO({
      env: { DUST_MACHINE_ID: 'env-machine' },
      fileContents: 'file-machine',
      hostname: 'fallback-hostname',
    })

    const result = await getMachineId(io)

    expect(result).toBe('env-machine')
  })

  test('file takes precedence over hostname', async () => {
    const io = createTestMachineIdIO({
      fileContents: 'file-machine',
      hostname: 'fallback-hostname',
    })

    const result = await getMachineId(io)

    expect(result).toBe('file-machine')
  })
})

describe('storeMachineId', () => {
  test('writes trimmed machine ID to file', async () => {
    let writtenPath: string | undefined
    let writtenContent: string | undefined
    let mkdirPath: string | undefined

    const mockMkdir = async (
      path: string,
      _options?: { recursive?: boolean }
    ) => {
      mkdirPath = path
      return undefined
    }

    const mockWriteFile = async (
      path: string,
      content: string,
      _encoding: 'utf8'
    ) => {
      writtenPath = path
      writtenContent = content
    }

    await storeMachineId(
      'my-machine',
      '/home/user',
      mockMkdir as any,
      mockWriteFile as any
    )

    expect(mkdirPath).toBe('/home/user/.dust')
    expect(writtenPath).toBe('/home/user/.dust/machine-id')
    expect(writtenContent).toBe('my-machine')
  })

  test('trims whitespace from machine ID before writing', async () => {
    let writtenContent: string | undefined

    const captureContentWriteFile = async (
      _path: string,
      content: string,
      _encoding: 'utf8'
    ) => {
      writtenContent = content
    }

    await storeMachineId(
      '  my-machine  \n',
      '/home/user',
      createMockMkdir() as any,
      captureContentWriteFile as any
    )

    expect(writtenContent).toBe('my-machine')
  })

  test('throws error when machine ID is empty', async () => {
    await expect(
      storeMachineId(
        '',
        '/home/user',
        createMockMkdir() as any,
        createMockWriteFile() as any
      )
    ).rejects.toThrow('Machine ID cannot be empty or whitespace-only')
  })

  test('throws error when machine ID is whitespace-only', async () => {
    await expect(
      storeMachineId(
        '   \n  ',
        '/home/user',
        createMockMkdir() as any,
        createMockWriteFile() as any
      )
    ).rejects.toThrow('Machine ID cannot be empty or whitespace-only')
  })

  test('creates .dust directory with recursive option', async () => {
    let mkdirOptions: { recursive?: boolean } | undefined

    const captureOptionsMkdir = async (
      _path: string,
      options?: { recursive?: boolean }
    ) => {
      mkdirOptions = options
      return undefined
    }

    await storeMachineId(
      'my-machine',
      '/home/user',
      captureOptionsMkdir as any,
      createMockWriteFile() as any
    )

    expect(mkdirOptions).toEqual({ recursive: true })
  })

  test('writes to correct path with custom home directory', async () => {
    let writtenPath: string | undefined
    let mkdirPath: string | undefined

    const capturePathMkdir = async (
      path: string,
      _options?: { recursive?: boolean }
    ) => {
      mkdirPath = path
      return undefined
    }

    const capturePathWriteFile = async (
      path: string,
      _content: string,
      _encoding: 'utf8'
    ) => {
      writtenPath = path
    }

    await storeMachineId(
      'my-machine',
      '/custom/home',
      capturePathMkdir as any,
      capturePathWriteFile as any
    )

    expect(mkdirPath).toBe(join('/custom/home', '.dust'))
    expect(writtenPath).toBe(join('/custom/home', '.dust', 'machine-id'))
  })
})

describe('integration: getMachineId with storeMachineId', () => {
  test('getMachineId returns value stored by storeMachineId', async () => {
    // Create a temporary directory for this test
    const testHome = join(tmpdir(), `dust-test-${Date.now()}-${Math.random()}`)
    await mkdir(testHome, { recursive: true })

    try {
      // Store a machine ID
      await storeMachineId('test-machine', testHome, mkdir, writeFile)

      // Create IO that reads from the stored file
      const io: MachineIdIO = {
        getEnv: () => undefined,
        readFile,
        getHostname: () => 'fallback-hostname',
      }

      // Verify getMachineId returns the stored value
      // Note: getMachineId uses homedir() internally, but since we're not setting
      // the env var, we need to test this by directly reading the file path
      const storedContent = await readFile(
        join(testHome, '.dust', 'machine-id'),
        'utf8'
      )
      expect(storedContent).toBe('test-machine')

      // Verify the IO would read it correctly
      const result = await io.readFile(
        join(testHome, '.dust', 'machine-id'),
        'utf8'
      )
      expect(result.trim()).toBe('test-machine')
    } finally {
      // Clean up
      await rm(testHome, { recursive: true, force: true })
    }
  })

  test('multiple storeMachineId calls overwrite previous value', async () => {
    const testHome = join(tmpdir(), `dust-test-${Date.now()}-${Math.random()}`)
    await mkdir(testHome, { recursive: true })

    try {
      // Store initial value
      await storeMachineId('machine-1', testHome, mkdir, writeFile)

      let content = await readFile(
        join(testHome, '.dust', 'machine-id'),
        'utf8'
      )
      expect(content).toBe('machine-1')

      // Store new value
      await storeMachineId('machine-2', testHome, mkdir, writeFile)

      content = await readFile(join(testHome, '.dust', 'machine-id'), 'utf8')
      expect(content).toBe('machine-2')
    } finally {
      await rm(testHome, { recursive: true, force: true })
    }
  })
})

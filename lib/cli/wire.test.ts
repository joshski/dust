import { afterEach, describe, expect, test } from 'vitest'
import {
  createTestRuntimeConfig,
  restoreEnv,
  stubEnv,
} from '../test-support/test-utilities'
import {
  type ConsolePrimitives,
  createFileSystem,
  createGlobScanner,
  type FileSystemPrimitives,
  type ProcessPrimitives,
  wireEntry,
} from './wire'

function createFsPrimitives(
  files: Map<string, string> = new Map()
): FileSystemPrimitives {
  const dirs = new Set<string>()
  return {
    existsSync: (path: string) => files.has(path) || dirs.has(path),
    statSync: (path: string) => ({
      isDirectory: () => dirs.has(path) || (!files.has(path) && path !== '/'),
      birthtimeMs: 0,
    }),
    readFile: async (path: string) => files.get(path) ?? '',
    writeFile: async () => {},
    mkdir: async (path: string) => {
      dirs.add(path)
      return undefined
    },
    readdir: async (path: string) => {
      const prefix = `${path}/`
      return Array.from(files.keys())
        .filter(f => f.startsWith(prefix))
        .map(f => f.slice(prefix.length))
    },
    chmod: async () => {},
    rename: async () => {},
  }
}

describe('createFileSystem', () => {
  test('exists delegates to existsSync', () => {
    const files = new Map([['/test.txt', 'content']])
    const primitives = createFsPrimitives(files)
    const fileSystem = createFileSystem(primitives)

    expect(fileSystem.exists('/test.txt')).toBe(true)
    expect(fileSystem.exists('/missing.txt')).toBe(false)
  })

  test('isDirectory delegates to statSync', () => {
    const files = new Map([['/dir/file.txt', 'content']])
    const primitives = createFsPrimitives(files)
    const fileSystem = createFileSystem(primitives)

    expect(fileSystem.isDirectory('/dir')).toBe(true)
    expect(fileSystem.isDirectory('/dir/file.txt')).toBe(false)
  })

  test('isDirectory returns false when statSync throws', () => {
    const primitives = createFsPrimitives()
    primitives.statSync = () => {
      throw new Error('ENOENT')
    }
    const fileSystem = createFileSystem(primitives)

    expect(fileSystem.isDirectory('/any-path')).toBe(false)
  })

  test('readFile delegates with utf-8 encoding', async () => {
    const files = new Map([['/test.txt', 'hello world']])
    const primitives = createFsPrimitives(files)
    const fileSystem = createFileSystem(primitives)

    const content = await fileSystem.readFile('/test.txt')
    expect(content).toBe('hello world')
  })

  test('writeFile delegates with utf-8 encoding', async () => {
    let writtenPath = ''
    let writtenContent = ''
    let writtenOptions: { encoding: string; flag?: string } | undefined

    const primitives = createFsPrimitives()
    primitives.writeFile = async (path, content, options) => {
      writtenPath = path
      writtenContent = content
      writtenOptions = options
    }
    const fileSystem = createFileSystem(primitives)

    await fileSystem.writeFile('/out.txt', 'test content')

    expect(writtenPath).toBe('/out.txt')
    expect(writtenContent).toBe('test content')
    expect(writtenOptions).toEqual({ encoding: 'utf-8', flag: undefined })
  })

  test('writeFile passes flag option', async () => {
    let writtenOptions: { encoding: string; flag?: string } | undefined

    const primitives = createFsPrimitives()
    primitives.writeFile = async (_path, _content, options) => {
      writtenOptions = options
    }
    const fileSystem = createFileSystem(primitives)

    await fileSystem.writeFile('/out.txt', 'test content', { flag: 'wx' })

    expect(writtenOptions).toEqual({ encoding: 'utf-8', flag: 'wx' })
  })

  test('mkdir delegates to primitive', async () => {
    let mkdirPath = ''
    let mkdirOptions: { recursive?: boolean } | undefined

    const primitives = createFsPrimitives()
    primitives.mkdir = async (path, options) => {
      mkdirPath = path
      mkdirOptions = options
      return undefined
    }
    const fileSystem = createFileSystem(primitives)

    await fileSystem.mkdir('/new/dir', { recursive: true })

    expect(mkdirPath).toBe('/new/dir')
    expect(mkdirOptions).toEqual({ recursive: true })
  })

  test('readdir delegates to primitive', async () => {
    const files = new Map([
      ['/dir/a.txt', ''],
      ['/dir/b.txt', ''],
    ])
    const primitives = createFsPrimitives(files)
    const fileSystem = createFileSystem(primitives)

    const entries = await fileSystem.readdir('/dir')

    expect(entries).toEqual(['a.txt', 'b.txt'])
  })

  test('chmod delegates to primitive', async () => {
    let chmodPath = ''
    let chmodMode = 0

    const primitives = createFsPrimitives()
    primitives.chmod = async (path, mode) => {
      chmodPath = path
      chmodMode = mode
    }
    const fileSystem = createFileSystem(primitives)

    await fileSystem.chmod('/test.sh', 0o755)

    expect(chmodPath).toBe('/test.sh')
    expect(chmodMode).toBe(0o755)
  })

  test('rename delegates to primitive', async () => {
    let renameOldPath = ''
    let renameNewPath = ''

    const primitives = createFsPrimitives()
    primitives.rename = async (oldPath, newPath) => {
      renameOldPath = oldPath
      renameNewPath = newPath
    }
    const fileSystem = createFileSystem(primitives)

    await fileSystem.rename('/old.txt', '/new.txt')

    expect(renameOldPath).toBe('/old.txt')
    expect(renameNewPath).toBe('/new.txt')
  })

  test('getFileCreationTime delegates to statSync birthtimeMs', () => {
    const primitives = createFsPrimitives()
    primitives.statSync = () => ({
      isDirectory: () => false,
      birthtimeMs: 1234567890,
    })
    const fileSystem = createFileSystem(primitives)

    expect(fileSystem.getFileCreationTime('/test.txt')).toBe(1234567890)
  })
})

describe('createGlobScanner', () => {
  test('yields only .md files', async () => {
    const files = new Map([
      ['/docs/readme.md', ''],
      ['/docs/guide.md', ''],
      ['/docs/image.png', ''],
      ['/docs/script.js', ''],
    ])
    const primitives = createFsPrimitives(files)
    const scanner = createGlobScanner(primitives.readdir)

    const results: string[] = []
    for await (const file of scanner.scan('/docs')) {
      results.push(file)
    }

    expect(results).toEqual(['readme.md', 'guide.md'])
  })

  test('yields files recursively', async () => {
    const files = new Map([
      ['/docs/readme.md', ''],
      ['/docs/sub/nested.md', ''],
    ])
    const primitives = createFsPrimitives(files)
    const scanner = createGlobScanner(primitives.readdir)

    const results: string[] = []
    for await (const file of scanner.scan('/docs')) {
      results.push(file)
    }

    expect(results).toEqual(['readme.md', 'sub/nested.md'])
  })
})

describe('wireEntry', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('wires dependencies and calls main', async () => {
    stubEnv('BUN_INSTALL', '')
    const files = new Map<string, string>()
    const fsPrimitives = createFsPrimitives(files)

    let exitCode = -1
    const processPrimitives: ProcessPrimitives = {
      argv: ['node', 'dust', 'help'],
      cwd: () => '/project',
      exit: (code: number) => {
        exitCode = code
      },
    }

    const logLines: string[] = []
    const errorLines: string[] = []
    const consolePrimitives: ConsolePrimitives = {
      log: logLines.push.bind(logLines),
      error: errorLines.push.bind(errorLines),
    }

    await wireEntry(
      fsPrimitives,
      processPrimitives,
      consolePrimitives,
      createTestRuntimeConfig()
    )

    expect(exitCode).toBe(0)
    expect(logLines.join('\n')).toContain(
      '✨ dust - Flow state for AI coding agents'
    )
  })

  test('passes exit code from main result', async () => {
    stubEnv('BUN_INSTALL', '')
    const fsPrimitives = createFsPrimitives()

    let exitCode = -1
    const processPrimitives: ProcessPrimitives = {
      argv: ['node', 'dust', 'unknown-command'],
      cwd: () => '/project',
      exit: (code: number) => {
        exitCode = code
      },
    }

    const consolePrimitives: ConsolePrimitives = {
      log: () => {},
      error: () => {},
    }

    await wireEntry(
      fsPrimitives,
      processPrimitives,
      consolePrimitives,
      createTestRuntimeConfig()
    )

    expect(exitCode).toBe(1)
  })

  test('slices argv to remove node and script path', async () => {
    stubEnv('BUN_INSTALL', '')
    const files = new Map<string, string>()
    const fsPrimitives = createFsPrimitives(files)

    let exitCode = -1
    const processPrimitives: ProcessPrimitives = {
      argv: ['node', '/path/to/dust', 'help'],
      cwd: () => '/project',
      exit: (code: number) => {
        exitCode = code
      },
    }

    const logLines: string[] = []
    const consolePrimitives: ConsolePrimitives = {
      log: logLines.push.bind(logLines),
      error: () => {},
    }

    await wireEntry(
      fsPrimitives,
      processPrimitives,
      consolePrimitives,
      createTestRuntimeConfig()
    )

    expect(exitCode).toBe(0)
    expect(logLines.join('\n')).toContain(
      '✨ dust - Flow state for AI coding agents'
    )
  })

  test('uses cwd from process primitives', async () => {
    const files = new Map([
      ['/custom/path/.dust/config/settings.json', '{"dustCommand": "custom"}'],
    ])
    const fsPrimitives = createFsPrimitives(files)

    let exitCode = -1
    const processPrimitives: ProcessPrimitives = {
      argv: ['node', 'dust', 'help'],
      cwd: () => '/custom/path',
      exit: (code: number) => {
        exitCode = code
      },
    }

    const logLines: string[] = []
    const consolePrimitives: ConsolePrimitives = {
      log: logLines.push.bind(logLines),
      error: () => {},
    }

    await wireEntry(
      fsPrimitives,
      processPrimitives,
      consolePrimitives,
      createTestRuntimeConfig()
    )

    expect(exitCode).toBe(0)
    expect(logLines.join('\n')).toContain('Usage: custom <command>')
  })
})

import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator } from '../filesystem/emulator'
import { parseArtifacts, validateArtifacts } from './validation-pipeline'

describe('parseArtifacts', () => {
  const dustPath = '/project/.dust'

  function makeFs(files: Record<string, string> = {}) {
    const tree = {
      project: {
        '.dust': {
          principles: {} as Record<string, string>,
          facts: {} as Record<string, string>,
          ideas: {} as Record<string, string>,
          tasks: {} as Record<string, string>,
        },
      },
    }
    const flatFiles: Record<string, string> = {}
    for (const [path, content] of Object.entries(files)) {
      flatFiles[`${dustPath}/${path}`] = content
    }
    return createFileSystemEmulator(tree, flatFiles)
  }

  test('parses content directory files into byType arrays', async () => {
    const fileSystem = makeFs({
      'facts/my-fact.md': '# My Fact\n\nThis is a fact.',
      'ideas/my-idea.md': '# My Idea\n\nThis is an idea.',
    })
    const { context } = await parseArtifacts(fileSystem, dustPath)

    expect(context.byType.facts).toHaveLength(1)
    expect(context.byType.ideas).toHaveLength(1)
    expect(context.byType.principles).toHaveLength(0)
    expect(context.byType.tasks).toHaveLength(0)
  })

  test('parses root-level markdown files', async () => {
    const fileSystem = makeFs({
      'repository.md': '# Repository\n\nProject context.',
    })
    const { context } = await parseArtifacts(fileSystem, dustPath)

    expect(context.rootFiles).toHaveLength(1)
    expect(context.rootFiles[0].title).toBe('Repository')
  })

  test('handles ENOENT when reading dustPath directory', async () => {
    const fileSystem = makeFs()
    const originalReaddir = fileSystem.readdir.bind(fileSystem)
    fileSystem.readdir = async (path: string) => {
      if (path === dustPath) {
        const error = new Error('ENOENT: no such file or directory')
        ;(error as NodeJS.ErrnoException).code = 'ENOENT'
        throw error
      }
      return originalReaddir(path)
    }

    const { context } = await parseArtifacts(fileSystem, dustPath)
    expect(context.rootFiles).toHaveLength(0)
    expect(context.artifacts.size).toBe(0)
  })

  test('rethrows non-ENOENT errors when reading dustPath directory', async () => {
    const fileSystem = makeFs()
    const originalReaddir = fileSystem.readdir.bind(fileSystem)
    fileSystem.readdir = async (path: string) => {
      if (path === dustPath) {
        const error = new Error('Permission denied')
        ;(error as NodeJS.ErrnoException).code = 'EACCES'
        throw error
      }
      return originalReaddir(path)
    }

    await expect(parseArtifacts(fileSystem, dustPath)).rejects.toThrow(
      'Permission denied'
    )
  })

  test('handles ENOENT when reading root-level markdown file', async () => {
    const fileSystem = makeFs({
      'repository.md': '# Repository\n\nProject context.',
    })
    const originalReadFile = fileSystem.readFile.bind(fileSystem)
    fileSystem.readFile = async (path: string) => {
      if (path === `${dustPath}/repository.md`) {
        const error = new Error('ENOENT: file deleted')
        ;(error as NodeJS.ErrnoException).code = 'ENOENT'
        throw error
      }
      return originalReadFile(path)
    }

    const { context } = await parseArtifacts(fileSystem, dustPath)
    expect(context.rootFiles).toHaveLength(0)
  })

  test('rethrows non-ENOENT errors when reading root-level markdown file', async () => {
    const fileSystem = makeFs({
      'repository.md': '# Repository\n\nProject context.',
    })
    const originalReadFile = fileSystem.readFile.bind(fileSystem)
    fileSystem.readFile = async (path: string) => {
      if (path === `${dustPath}/repository.md`) {
        const error = new Error('Permission denied')
        ;(error as NodeJS.ErrnoException).code = 'EACCES'
        throw error
      }
      return originalReadFile(path)
    }

    await expect(parseArtifacts(fileSystem, dustPath)).rejects.toThrow(
      'Permission denied'
    )
  })

  test('handles ENOENT when reading content directory', async () => {
    const fileSystem = makeFs()
    const originalReaddir = fileSystem.readdir.bind(fileSystem)
    fileSystem.readdir = async (path: string) => {
      if (path === `${dustPath}/ideas`) {
        const error = new Error('ENOENT: directory deleted')
        ;(error as NodeJS.ErrnoException).code = 'ENOENT'
        throw error
      }
      return originalReaddir(path)
    }

    const { context } = await parseArtifacts(fileSystem, dustPath)
    expect(context.byType.ideas).toHaveLength(0)
  })

  test('rethrows non-ENOENT errors when reading content directory', async () => {
    const fileSystem = makeFs()
    const originalReaddir = fileSystem.readdir.bind(fileSystem)
    fileSystem.readdir = async (path: string) => {
      if (path === `${dustPath}/ideas`) {
        const error = new Error('Permission denied')
        ;(error as NodeJS.ErrnoException).code = 'EACCES'
        throw error
      }
      return originalReaddir(path)
    }

    await expect(parseArtifacts(fileSystem, dustPath)).rejects.toThrow(
      'Permission denied'
    )
  })
})

describe('validateArtifacts', () => {
  const dustPath = '/project/.dust'

  function makeFs(files: Record<string, string> = {}) {
    const tree = {
      project: {
        '.dust': {
          principles: {} as Record<string, string>,
          facts: {} as Record<string, string>,
          ideas: {} as Record<string, string>,
          tasks: {} as Record<string, string>,
        },
      },
    }
    const flatFiles: Record<string, string> = {}
    for (const [path, content] of Object.entries(files)) {
      flatFiles[`${dustPath}/${path}`] = content
    }
    return createFileSystemEmulator(tree, flatFiles)
  }

  test('validates links in root-level files', async () => {
    const fileSystem = makeFs({
      'repository.md': '# Repository\n\nSee [broken link](../nonexistent.md).',
    })
    const { context } = await parseArtifacts(fileSystem, dustPath)
    const violations = validateArtifacts(context)

    expect(violations.some(v => v.message.includes('Broken link'))).toBe(true)
  })

  test('validates content files', async () => {
    const fileSystem = makeFs({
      'facts/wrong-name.md': '# Different Title\n\nThis is a fact.',
    })
    const { context } = await parseArtifacts(fileSystem, dustPath)
    const violations = validateArtifacts(context)

    expect(
      violations.some(
        v =>
          v.message.includes('does not match title') ||
          v.message.includes('title')
      )
    ).toBe(true)
  })
})

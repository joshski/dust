import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator } from '../filesystem/emulator'
import { parseArtifacts, validateArtifacts } from './validation-pipeline'

describe('parseArtifacts', () => {
  const dustPath = '/project/.dust'

  function makeFs(
    files: Record<string, string> = {},
    extraDirs: Record<string, Record<string, string>> = {}
  ) {
    const tree = {
      project: {
        '.dust': {
          principles: {} as Record<string, string>,
          facts: {} as Record<string, string>,
          ideas: {} as Record<string, string>,
          tasks: {} as Record<string, string>,
          config: {
            audits: {} as Record<string, string>,
            ...extraDirs,
          },
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

  test('parses custom audit files from config/audits directory', async () => {
    const fileSystem = makeFs({
      'config/audits/my-audit.md':
        '# My Audit\n\nCheck something.\n\n## Scope\n\nFiles.\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
    })
    const { context } = await parseArtifacts(fileSystem, dustPath)

    expect(context.customAudits).toHaveLength(1)
    expect(context.customAudits[0].title).toBe('My Audit')
  })

  test('handles ENOENT when reading audits directory', async () => {
    const fileSystem = makeFs()
    const originalReaddir = fileSystem.readdir.bind(fileSystem)
    fileSystem.readdir = async (path: string) => {
      if (path === `${dustPath}/config/audits`) {
        const error = new Error('ENOENT: directory deleted')
        ;(error as NodeJS.ErrnoException).code = 'ENOENT'
        throw error
      }
      return originalReaddir(path)
    }

    const { context } = await parseArtifacts(fileSystem, dustPath)
    expect(context.customAudits).toHaveLength(0)
  })

  test('rethrows non-ENOENT errors when reading audits directory', async () => {
    const fileSystem = makeFs()
    const originalReaddir = fileSystem.readdir.bind(fileSystem)
    fileSystem.readdir = async (path: string) => {
      if (path === `${dustPath}/config/audits`) {
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

  test('handles ENOENT when reading audit file', async () => {
    const fileSystem = makeFs({
      'config/audits/my-audit.md': '# My Audit\n\nCheck something.',
    })
    const originalReadFile = fileSystem.readFile.bind(fileSystem)
    fileSystem.readFile = async (path: string) => {
      if (path === `${dustPath}/config/audits/my-audit.md`) {
        const error = new Error('ENOENT: file deleted')
        ;(error as NodeJS.ErrnoException).code = 'ENOENT'
        throw error
      }
      return originalReadFile(path)
    }

    const { context } = await parseArtifacts(fileSystem, dustPath)
    expect(context.customAudits).toHaveLength(0)
  })

  test('rethrows non-ENOENT errors when reading audit file', async () => {
    const fileSystem = makeFs({
      'config/audits/my-audit.md': '# My Audit\n\nCheck something.',
    })
    const originalReadFile = fileSystem.readFile.bind(fileSystem)
    fileSystem.readFile = async (path: string) => {
      if (path === `${dustPath}/config/audits/my-audit.md`) {
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

  test('ignores non-.md files in audits directory', async () => {
    const fileSystem = makeFs({
      'config/audits/my-audit.md':
        '# My Audit\n\nCheck something.\n\n## Scope\n\nFiles.\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
    })
    // Simulate a non-.md file in the directory
    const originalReaddir = fileSystem.readdir.bind(fileSystem)
    fileSystem.readdir = async (path: string) => {
      const entries = await originalReaddir(path)
      if (path === `${dustPath}/config/audits`) {
        return [...entries, 'README.txt', '.gitkeep']
      }
      return entries
    }

    const { context } = await parseArtifacts(fileSystem, dustPath)
    // Should only have the .md file, ignoring README.txt and .gitkeep
    expect(context.customAudits).toHaveLength(1)
    expect(context.customAudits[0].title).toBe('My Audit')
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
          config: {
            audits: {} as Record<string, string>,
          },
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

  test('validates custom audit file missing Scope section', async () => {
    const fileSystem = makeFs({
      'config/audits/my-audit.md':
        '# My Audit\n\nCheck something.\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
    })
    const { context } = await parseArtifacts(fileSystem, dustPath)
    const violations = validateArtifacts(context)

    expect(
      violations.some(v =>
        v.message.includes('Missing required heading: "## Scope"')
      )
    ).toBe(true)
  })

  test('validates custom audit file missing Blocked By section', async () => {
    const fileSystem = makeFs({
      'config/audits/my-audit.md':
        '# My Audit\n\nCheck something.\n\n## Scope\n\nFiles.\n\n## Definition of Done\n\n- Done',
    })
    const { context } = await parseArtifacts(fileSystem, dustPath)
    const violations = validateArtifacts(context)

    expect(
      violations.some(v =>
        v.message.includes('Missing required heading: "## Blocked By"')
      )
    ).toBe(true)
  })

  test('validates custom audit file missing Definition of Done section', async () => {
    const fileSystem = makeFs({
      'config/audits/my-audit.md':
        '# My Audit\n\nCheck something.\n\n## Scope\n\nFiles.\n\n## Blocked By\n\n(none)',
    })
    const { context } = await parseArtifacts(fileSystem, dustPath)
    const violations = validateArtifacts(context)

    expect(
      violations.some(v =>
        v.message.includes('Missing required heading: "## Definition of Done"')
      )
    ).toBe(true)
  })

  test('validates custom audit file missing opening sentence', async () => {
    const fileSystem = makeFs({
      'config/audits/my-audit.md':
        '# My Audit\n\n## Scope\n\nFiles.\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
    })
    const { context } = await parseArtifacts(fileSystem, dustPath)
    const violations = validateArtifacts(context)

    expect(
      violations.some(v =>
        v.message.includes('Missing or malformed opening sentence')
      )
    ).toBe(true)
  })

  test('validates custom audit file with too long opening sentence', async () => {
    const longSentence = 'A'.repeat(160) + '.'
    const fileSystem = makeFs({
      'config/audits/my-audit.md': `# My Audit\n\n${longSentence}\n\n## Scope\n\nFiles.\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done`,
    })
    const { context } = await parseArtifacts(fileSystem, dustPath)
    const violations = validateArtifacts(context)

    expect(
      violations.some(v => v.message.includes('Opening sentence is'))
    ).toBe(true)
  })

  test('validates custom audit file with invalid filename', async () => {
    const fileSystem = makeFs({
      'config/audits/MyAudit.md':
        '# My Audit\n\nCheck something.\n\n## Scope\n\nFiles.\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
    })
    const { context } = await parseArtifacts(fileSystem, dustPath)
    const violations = validateArtifacts(context)

    expect(
      violations.some(v =>
        v.message.includes('does not match slug-style naming')
      )
    ).toBe(true)
  })

  test('no violations for valid custom audit file', async () => {
    const fileSystem = makeFs({
      'config/audits/my-audit.md':
        '# My Audit\n\nCheck something important.\n\n## Scope\n\nFiles.\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
    })
    const { context } = await parseArtifacts(fileSystem, dustPath)
    const violations = validateArtifacts(context)

    const auditViolations = violations.filter(v =>
      v.file.includes('my-audit.md')
    )
    expect(auditViolations).toHaveLength(0)
  })
})

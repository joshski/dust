import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator } from '../filesystem/emulator'
import type { ArtifactPatch, ValidationResult } from './index'
import { validatePatch } from './index'
import { createOverlayFileSystem } from './overlay-filesystem'

describe('validatePatch', () => {
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

  test('valid patch with no violations', async () => {
    const fileSystem = makeFs()
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'facts/my-fact.md':
          '# My Fact\n\nThis fact describes something important.',
      },
    })
    expect(result.valid).toBe(true)
    expect(result.violations).toEqual([])
  })

  test('patch with filename validation error', async () => {
    const fileSystem = makeFs()
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'tasks/My Task.md': '# My Task\n\nDo something important.',
      },
    })
    expect(result.valid).toBe(false)
    expect(result.violations.some(v => v.file.includes('My Task.md'))).toBe(
      true
    )
  })

  test('patch with broken link', async () => {
    const fileSystem = makeFs()
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'facts/my-fact.md':
          '# My Fact\n\nThis fact links to [missing](../principles/nonexistent.md).',
      },
    })
    expect(result.valid).toBe(false)
    expect(result.violations.some(v => v.message.includes('Broken link'))).toBe(
      true
    )
  })

  test('patch with valid link to existing file', async () => {
    const fileSystem = makeFs({
      'principles/existing.md':
        '# Existing Principle\n\nThis principle exists already.',
    })
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'facts/my-fact.md':
          '# My Fact\n\nThis fact links to [existing](../principles/existing.md).',
      },
    })
    expect(result.valid).toBe(true)
  })

  test('patch with valid link between patch files', async () => {
    const fileSystem = makeFs()
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'facts/fact-a.md': '# Fact A\n\nThis links to [Fact B](fact-b.md).',
        'facts/fact-b.md': '# Fact B\n\nThis is fact B.',
      },
    })
    expect(result.valid).toBe(true)
  })

  test('principle patch with hierarchy validation', async () => {
    const fileSystem = makeFs({
      'principles/parent.md':
        '# Parent\n\nThis is the parent.\n\n## Parent Principle\n\nNone.\n\n## Sub-Principles\n\n- [Child](child.md)',
    })
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'principles/child.md':
          '# Child\n\nThis is the child.\n\n## Parent Principle\n\n- [Parent](parent.md)\n\n## Sub-Principles\n\nNone.',
      },
    })
    expect(result.valid).toBe(true)
  })

  test('principle patch with missing bidirectional link', async () => {
    const fileSystem = makeFs({
      'principles/parent.md':
        '# Parent\n\nThis is the parent.\n\n## Parent Principle\n\nNone.\n\n## Sub-Principles\n\n- [Child](child.md)',
    })
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'principles/child.md':
          '# Child\n\nThis is the child.\n\n## Parent Principle\n\nNone.\n\n## Sub-Principles\n\nNone.',
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.violations.some(
        v =>
          v.message.includes('does not list this principle') ||
          v.message.includes('bidirectional')
      )
    ).toBe(true)
  })

  test('non-markdown files in patch are not content-validated', async () => {
    const fileSystem = makeFs()
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'config/settings.json': '{}',
      },
    })
    expect(result.valid).toBe(true)
  })

  test('deleting an existing file is valid', async () => {
    const fileSystem = makeFs({
      'facts/old-fact.md': '# Old Fact\n\nThis fact is being removed.',
    })
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'facts/old-fact.md': null,
      },
    })
    expect(result.valid).toBe(true)
  })

  test('deleting a file breaks links from other patch files', async () => {
    const fileSystem = makeFs({
      'facts/target.md': '# Target\n\nThis is the target.',
      'facts/source.md': '# Source\n\nThis links to [target](target.md).',
    })
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'facts/target.md': null,
        'facts/source.md': '# Source\n\nThis links to [target](target.md).',
      },
    })
    expect(result.valid).toBe(false)
    expect(result.violations.some(v => v.message.includes('Broken link'))).toBe(
      true
    )
  })

  test('deleting a file while updating links is valid', async () => {
    const fileSystem = makeFs({
      'facts/target.md': '# Target\n\nThis is the target.',
      'facts/source.md': '# Source\n\nThis links to [target](target.md).',
    })
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'facts/target.md': null,
        'facts/source.md': '# Source\n\nThis no longer links anywhere.',
      },
    })
    expect(result.valid).toBe(true)
  })

  test('deleting a principle removes it from cross-file validation', async () => {
    const fileSystem = makeFs({
      'principles/parent.md':
        '# Parent\n\nThis is the parent.\n\n## Parent Principle\n\nNone.\n\n## Sub-Principles\n\n- [Child](child.md)',
      'principles/child.md':
        '# Child\n\nThis is the child.\n\n## Parent Principle\n\n- [Parent](parent.md)\n\n## Sub-Principles\n\nNone.',
    })
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'principles/child.md': null,
        'principles/parent.md':
          '# Parent\n\nThis is the parent.\n\n## Parent Principle\n\nNone.\n\n## Sub-Principles\n\nNone.',
      },
    })
    expect(result.valid).toBe(true)
  })

  test('title-filename mismatch', async () => {
    const fileSystem = makeFs()
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'facts/wrong-name.md':
          '# Correct Name\n\nThis fact has a mismatched title.',
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.violations.some(v => v.message.toLowerCase().includes('title'))
    ).toBe(true)
  })

  test('task patch validates headings and semantic links', async () => {
    const fileSystem = makeFs()
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'tasks/do-something.md':
          '# Do Something\n\nImplement this feature.\n\n## Principles\n\n- [P](../principles/nonexistent.md)',
      },
    })
    expect(result.valid).toBe(false)
  })

  test('idea patch validates open questions', async () => {
    const fileSystem = makeFs()
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'ideas/my-idea.md':
          '# My Idea\n\nThis idea explores something.\n\n## Open Questions\n\n### Not a question\n\n#### Option A\n\nDetails.',
      },
    })
    expect(result.valid).toBe(false)
    expect(result.violations.some(v => v.message.includes('?'))).toBe(true)
  })

  test('task with idea transition validates linked idea exists', async () => {
    const fileSystem = makeFs({
      'ideas/my-idea.md': '# My Idea\n\nThis idea exists.',
    })
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'tasks/refine-idea-my-idea.md':
          '# Refine Idea: My Idea\n\nRefine this idea.\n\n## Refines Idea\n\n- [My Idea](../ideas/my-idea.md)\n\n## Blocked By\n\nNone.\n\n## Definition of Done\n\nDone when refined.',
      },
    })
    expect(result.valid).toBe(true)
  })

  test('task with idea transition to missing idea fails', async () => {
    const fileSystem = makeFs()
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'tasks/refine-idea-my-idea.md':
          '# Refine Idea: My Idea\n\nRefine this idea.\n\n## Refines Idea\n\n- [My Idea](../ideas/my-idea.md)',
      },
    })
    expect(result.valid).toBe(false)
  })

  test('opening sentence length violation', async () => {
    const fileSystem = makeFs()
    const longSentence = 'A'.repeat(300)
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'facts/long-sentence.md': `# Long Sentence\n\n${longSentence}.`,
      },
    })
    expect(result.valid).toBe(false)
  })

  test('task with non-imperative opening sentence', async () => {
    const fileSystem = makeFs()
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'tasks/do-something.md':
          '# Do Something\n\nThe system should do something.\n\n## Blocked By\n\nNone.\n\n## Definition of Done\n\nDone.',
      },
    })
    expect(result.valid).toBe(false)
    expect(result.violations.some(v => v.message.includes('imperative'))).toBe(
      true
    )
  })

  test('md file outside content dirs skips content validation', async () => {
    const fileSystem = makeFs()
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'config/notes.md': '# Notes\n\nSome notes.',
      },
    })
    expect(result.valid).toBe(true)
  })

  test('missing opening sentence in content file', async () => {
    const fileSystem = makeFs()
    const result = await validatePatch(fileSystem, dustPath, {
      files: {
        'facts/no-sentence.md': '# No Sentence\n\n',
      },
    })
    expect(result.valid).toBe(false)
    expect(
      result.violations.some(v => v.message.includes('opening sentence'))
    ).toBe(true)
  })

  test('types are exported correctly', () => {
    const patch: ArtifactPatch = { files: { 'facts/a.md': 'content' } }
    expect(patch.files).toBeDefined()

    const result: ValidationResult = { valid: true, violations: [] }
    expect(result.valid).toBe(true)
  })
})

describe('createOverlayFileSystem', () => {
  test('deleted paths are hidden from exists', () => {
    const base = createFileSystemEmulator({}, { '/a/b.md': 'content' })
    const overlay = createOverlayFileSystem(
      base,
      new Map(),
      new Set(['/a/b.md'])
    )
    expect(overlay.exists('/a/b.md')).toBe(false)
  })

  test('readFile on deleted path throws ENOENT', async () => {
    const base = createFileSystemEmulator({}, { '/a/b.md': 'content' })
    const overlay = createOverlayFileSystem(
      base,
      new Map(),
      new Set(['/a/b.md'])
    )
    await expect(overlay.readFile('/a/b.md')).rejects.toThrow('ENOENT')
  })

  test('readdir excludes deleted paths', async () => {
    const base = createFileSystemEmulator(
      {},
      { '/a/b.md': 'content', '/a/c.md': 'other' }
    )
    const overlay = createOverlayFileSystem(
      base,
      new Map(),
      new Set(['/a/b.md'])
    )
    const entries = await overlay.readdir('/a')
    expect(entries).toContain('c.md')
    expect(entries).not.toContain('b.md')
  })

  test('isDirectory returns false for deleted paths', () => {
    const base = createFileSystemEmulator({}, { '/a/b/c.md': 'content' })
    expect(base.isDirectory('/a/b')).toBe(true)
    const overlay = createOverlayFileSystem(base, new Map(), new Set(['/a/b']))
    expect(overlay.isDirectory('/a/b')).toBe(false)
  })

  test('readdir merges patch entries into base', async () => {
    const base = createFileSystemEmulator({}, { '/a/existing.md': 'content' })
    const overlay = createOverlayFileSystem(
      base,
      new Map([
        ['/a/new.md', 'new content'],
        ['/b/other.md', 'other content'],
      ])
    )
    const entries = await overlay.readdir('/a')
    expect(entries).toContain('existing.md')
    expect(entries).toContain('new.md')
    expect(entries).not.toContain('other.md')
  })
})

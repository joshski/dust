import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator } from '../filesystem/emulator'
import { buildArtifactPatch, serializeFact, serializeTask } from './index'
import type { FactInput } from './fact'
import { buildFactFiles } from './fact'
import type { StandardTaskInput, WorkflowTaskInput } from './task'
import { buildTaskFiles } from './task'

describe('serializeFact', () => {
  test('produces valid fact markdown from a FactInput object', () => {
    const input: FactInput = {
      title: 'My Fact',
      body: 'This is the fact content.',
    }
    const result = serializeFact(input)
    expect(result).toBe('# My Fact\n\nThis is the fact content.\n')
  })

  test('handles multi-line body content', () => {
    const input: FactInput = {
      title: 'Multi-line Fact',
      body: 'First paragraph.\n\nSecond paragraph.\n\n- List item 1\n- List item 2',
    }
    const result = serializeFact(input)
    expect(result).toBe(
      '# Multi-line Fact\n\nFirst paragraph.\n\nSecond paragraph.\n\n- List item 1\n- List item 2\n'
    )
  })

  test('handles empty body', () => {
    const input: FactInput = {
      title: 'Empty Body Fact',
      body: '',
    }
    const result = serializeFact(input)
    expect(result).toBe('# Empty Body Fact\n\n\n')
  })
})

describe('buildFactFiles', () => {
  test('produces file entries for a patch', () => {
    const input: FactInput = {
      title: 'New Fact',
      body: 'Description here.',
    }
    const result = buildFactFiles(input, 'new-fact')
    expect(result).toEqual({
      'facts/new-fact.md': '# New Fact\n\nDescription here.\n',
    })
  })
})

describe('buildArtifactPatch', () => {
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

  test('accepts a facts object and returns { valid, violations, patch }', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'new-fact': { title: 'New Fact', body: 'Description here.' },
      },
    })

    expect(result).toHaveProperty('valid')
    expect(result).toHaveProperty('violations')
    expect(result).toHaveProperty('patch')
    expect(result.valid).toBe(true)
    expect(result.violations).toEqual([])
    expect(result.patch.files).toEqual({
      'facts/new-fact.md': '# New Fact\n\nDescription here.\n',
    })
  })

  test('creates multiple facts in one patch', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'fact-a': { title: 'Fact A', body: 'First fact.' },
        'fact-b': { title: 'Fact B', body: 'Second fact.' },
      },
    })

    expect(result.valid).toBe(true)
    expect(Object.keys(result.patch.files)).toHaveLength(2)
    expect(result.patch.files['facts/fact-a.md']).toContain('# Fact A')
    expect(result.patch.files['facts/fact-b.md']).toContain('# Fact B')
  })

  test('deleting a fact sets null in the patch', async () => {
    const fileSystem = makeFs({
      'facts/old-fact.md': '# Old Fact\n\nThis fact is being removed.',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'old-fact': null,
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['facts/old-fact.md']).toBeNull()
  })

  test('deleting a fact auto-discovers and updates artifacts that reference it', async () => {
    const fileSystem = makeFs({
      'facts/target-fact.md': '# Target Fact\n\nThis fact is being removed.',
      'facts/source-fact.md':
        '# Source Fact\n\nThis references [Target Fact](target-fact.md).',
      'ideas/my-idea.md':
        '# My Idea\n\nThis idea links to [Target Fact](../facts/target-fact.md).',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'target-fact': null,
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['facts/target-fact.md']).toBeNull()

    // The source fact should have its link removed
    expect(result.patch.files['facts/source-fact.md']).toBe(
      '# Source Fact\n\nThis references Target Fact.'
    )

    // The idea should have its link removed
    expect(result.patch.files['ideas/my-idea.md']).toBe(
      '# My Idea\n\nThis idea links to Target Fact.'
    )
  })

  test('does not update files that are also being deleted', async () => {
    const fileSystem = makeFs({
      'facts/fact-a.md':
        '# Fact A\n\nThis links to [Fact B](fact-b.md). This fact is going away.',
      'facts/fact-b.md': '# Fact B\n\nThis is fact B.',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'fact-a': null,
        'fact-b': null,
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['facts/fact-a.md']).toBeNull()
    expect(result.patch.files['facts/fact-b.md']).toBeNull()
    // Should only have the two deletion entries
    expect(Object.keys(result.patch.files)).toHaveLength(2)
  })

  test('validates the generated patch', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'wrong-name': { title: 'Correct Name', body: 'Mismatched title.' },
      },
    })

    expect(result.valid).toBe(false)
    expect(result.violations.length).toBeGreaterThan(0)
    expect(
      result.violations.some(v => v.message.toLowerCase().includes('title'))
    ).toBe(true)
  })

  test('validates opening sentence requirement', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'no-sentence': { title: 'No Sentence', body: '' },
      },
    })

    expect(result.valid).toBe(false)
    expect(
      result.violations.some(v => v.message.includes('opening sentence'))
    ).toBe(true)
  })

  test('returns relative paths in violations when cwd is provided', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(
      fileSystem,
      dustPath,
      {
        facts: {
          'wrong-name': { title: 'Correct Name', body: 'Mismatched.' },
        },
      },
      { cwd: '/project' }
    )

    expect(result.valid).toBe(false)
    expect(result.violations.some(v => v.file.startsWith('.dust/'))).toBe(true)
  })

  test('handles empty input', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {})

    expect(result.valid).toBe(true)
    expect(result.violations).toEqual([])
    expect(result.patch.files).toEqual({})
  })

  test('handles empty facts object', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {},
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files).toEqual({})
  })

  test('explicit patch entries take precedence over reference cleanup', async () => {
    const fileSystem = makeFs({
      'facts/target-fact.md': '# Target Fact\n\nThis fact is being removed.',
      'facts/source-fact.md':
        '# Source Fact\n\nThis references [Target Fact](target-fact.md).',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'target-fact': null,
        // Explicitly provide an update to the source fact
        'source-fact': {
          title: 'Source Fact',
          body: 'Updated with custom content.',
        },
      },
    })

    expect(result.valid).toBe(true)
    // The explicit update should be used, not the auto-generated one
    expect(result.patch.files['facts/source-fact.md']).toBe(
      '# Source Fact\n\nUpdated with custom content.\n'
    )
  })

  test('handles references with ../facts/ prefix', async () => {
    const fileSystem = makeFs({
      'facts/linked-fact.md': '# Linked Fact\n\nThis is linked.',
      'tasks/my-task.md':
        '# My Task\n\nDo something with [Linked Fact](../facts/linked-fact.md).\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\nDone.',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'linked-fact': null,
      },
    })

    expect(result.valid).toBe(true)
    // The task should have its link removed
    expect(result.patch.files['tasks/my-task.md']).toContain(
      'Do something with Linked Fact.'
    )
    expect(result.patch.files['tasks/my-task.md']).not.toContain(
      '../facts/linked-fact.md'
    )
  })

  test('handles non-existent directories gracefully', async () => {
    // Create a filesystem without some content directories
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          facts: {},
        },
      },
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'new-fact': { title: 'New Fact', body: 'In sparse repo.' },
      },
    })

    expect(result.valid).toBe(true)
  })

  test('preserves non-link content when removing links', async () => {
    const fileSystem = makeFs({
      'facts/deleted-fact.md': '# Deleted Fact\n\nGoing away.',
      'facts/complex-fact.md':
        '# Complex Fact\n\nSee [Deleted Fact](deleted-fact.md) for details and [External](https://example.com) for more.',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'deleted-fact': null,
      },
    })

    expect(result.valid).toBe(true)
    // The link to deleted-fact should be removed, but external link preserved
    const updatedContent = result.patch.files['facts/complex-fact.md']
    expect(updatedContent).toContain('See Deleted Fact for details')
    expect(updatedContent).toContain('[External](https://example.com)')
    expect(updatedContent).not.toContain('deleted-fact.md')
  })

  test('handles multiple links to the same deleted fact', async () => {
    const fileSystem = makeFs({
      'facts/deleted-fact.md': '# Deleted Fact\n\nGoing away.',
      'facts/multi-link-fact.md':
        '# Multi Link Fact\n\nFirst [Deleted Fact](deleted-fact.md), second [Deleted Fact](deleted-fact.md).',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'deleted-fact': null,
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['facts/multi-link-fact.md']).toBe(
      '# Multi Link Fact\n\nFirst Deleted Fact, second Deleted Fact.'
    )
  })

  test('skips non-md files when scanning for references', async () => {
    const fileSystem = makeFs({
      'facts/deleted-fact.md': '# Deleted Fact\n\nGoing away.',
    })
    // Add a non-md file directly to the internal files map
    fileSystem.files.set(`${dustPath}/facts/data.txt`, 'some text content')
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'deleted-fact': null,
      },
    })

    // Only the deletion should be in the patch, no update for the txt file
    expect(Object.keys(result.patch.files)).toHaveLength(1)
    expect(result.patch.files['facts/deleted-fact.md']).toBeNull()
  })

  test('does not include files with no link changes in patch', async () => {
    const fileSystem = makeFs({
      'facts/deleted-fact.md': '# Deleted Fact\n\nGoing away.',
      'facts/unrelated-fact.md':
        '# Unrelated Fact\n\nThis has no links to the deleted fact.',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'deleted-fact': null,
      },
    })

    expect(result.valid).toBe(true)
    // Only the deletion should be in the patch
    expect(Object.keys(result.patch.files)).toHaveLength(1)
    expect(result.patch.files['facts/deleted-fact.md']).toBeNull()
    expect(result.patch.files['facts/unrelated-fact.md']).toBeUndefined()
  })

  test('handles links with full dust directory path prefix', async () => {
    const fileSystem = makeFs({
      'facts/deleted-fact.md': '# Deleted Fact\n\nGoing away.',
      'facts/linking-fact.md':
        '# Linking Fact\n\nThis links to [Deleted Fact](facts/deleted-fact.md).',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'deleted-fact': null,
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['facts/linking-fact.md']).toBe(
      '# Linking Fact\n\nThis links to Deleted Fact.'
    )
  })

  test('re-throws non-ENOENT errors from readdir', async () => {
    const fileSystem = makeFs({
      'facts/deleted-fact.md': '# Deleted Fact\n\nGoing away.',
    })
    const originalReaddir = fileSystem.readdir.bind(fileSystem)
    const permissionError = new Error('EACCES: permission denied')
    ;(permissionError as NodeJS.ErrnoException).code = 'EACCES'
    fileSystem.readdir = async (path: string) => {
      if (path === `${dustPath}/ideas`) {
        throw permissionError
      }
      return originalReaddir(path)
    }

    await expect(
      buildArtifactPatch(fileSystem, dustPath, {
        facts: {
          'deleted-fact': null,
        },
      })
    ).rejects.toThrow('EACCES: permission denied')
  })

  test('ignores links with unrecognized path patterns', async () => {
    const fileSystem = makeFs({
      'facts/deleted-fact.md': '# Deleted Fact\n\nGoing away.',
      'facts/linking-fact.md':
        '# Linking Fact\n\nThis links to [Unknown](unknown/path.md) and [Deleted](deleted-fact.md).',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'deleted-fact': null,
      },
    })

    // The unknown link should be preserved, the deleted-fact link should be removed
    // Note: validation will fail due to broken link, but the patch itself is correct
    expect(result.patch.files['facts/linking-fact.md']).toBe(
      '# Linking Fact\n\nThis links to [Unknown](unknown/path.md) and Deleted.'
    )
  })

  test('handles ../ paths that resolve to content directories', async () => {
    const fileSystem = makeFs({
      'principles/deleted-principle.md':
        '# Deleted Principle\n\nGoing away.\n\n## Parent Principle\n\nNone.\n\n## Sub-Principles\n\nNone.',
      'tasks/my-task.md':
        '# My Task\n\nSee [Principle](../principles/deleted-principle.md) for guidance.\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\nDone.',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        // Delete something to trigger the reference scan
      },
    })

    // No deletions, so no reference updates needed
    expect(result.valid).toBe(true)
    expect(Object.keys(result.patch.files)).toHaveLength(0)
  })

  test('scans directories that exist while skipping missing ones (ENOENT)', async () => {
    const fileSystem = makeFs({
      'facts/deleted-fact.md': '# Deleted Fact\n\nThis fact is being removed.',
      'facts/source-fact.md':
        '# Source Fact\n\nThis links to [Deleted Fact](deleted-fact.md).',
    })

    // Override readdir to throw ENOENT for ideas directory
    const originalReaddir = fileSystem.readdir.bind(fileSystem)
    const enoentError = new Error(
      "ENOENT: no such file or directory, scandir '/project/.dust/ideas'"
    )
    ;(enoentError as NodeJS.ErrnoException).code = 'ENOENT'
    fileSystem.readdir = async (path: string) => {
      if (path === `${dustPath}/ideas`) {
        throw enoentError
      }
      return originalReaddir(path)
    }

    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'deleted-fact': null,
      },
    })

    expect(result.valid).toBe(true)
    // The source fact should have its link removed
    expect(result.patch.files['facts/source-fact.md']).toBe(
      '# Source Fact\n\nThis links to Deleted Fact.'
    )
  })

  test('handles path with dot segments', async () => {
    // This tests the branch where part === '.' or part === ''
    // The path ./../facts/deleted-fact.md should resolve correctly
    const fileSystem = makeFs({
      'facts/deleted-fact.md': '# Deleted Fact\n\nGoing away.',
      'ideas/my-idea.md':
        '# My Idea\n\nThis links to [Fact](./../facts/deleted-fact.md).',
    })

    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'deleted-fact': null,
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['ideas/my-idea.md']).toBe(
      '# My Idea\n\nThis links to Fact.'
    )
  })

  // Task-related tests
  test('accepts a tasks object and creates task files', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      tasks: {
        'implement-feature': {
          title: 'Implement Feature',
          definitionOfDone: ['Feature works', 'Tests pass'],
        },
      },
    })

    expect(result).toHaveProperty('valid')
    expect(result).toHaveProperty('patch')
    expect(result.patch.files['tasks/implement-feature.md']).toContain(
      '# Implement Feature'
    )
    expect(result.patch.files['tasks/implement-feature.md']).toContain(
      '## Blocked By'
    )
    expect(result.patch.files['tasks/implement-feature.md']).toContain(
      '## Definition of Done'
    )
  })

  test('creates task with body, blockedBy, and principles', async () => {
    const fileSystem = makeFs({
      'tasks/design-feature.md':
        '# Design Feature\n\nDesign the feature.\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Design complete',
      'principles/small-units.md':
        '# Small Units\n\nKeep units small.\n\n## Parent Principle\n\nNone.\n\n## Sub-Principles\n\nNone.',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      tasks: {
        'implement-feature': {
          title: 'Implement Feature',
          body: 'Additional context here.',
          blockedBy: ['design-feature'],
          principles: ['small-units'],
          definitionOfDone: ['Feature works', 'Tests pass'],
        },
      },
    })

    expect(result.valid).toBe(true)
    const content = result.patch.files['tasks/implement-feature.md']
    expect(content).toContain('# Implement Feature')
    expect(content).toContain('Additional context here.')
    expect(content).toContain('## Principles')
    expect(content).toContain('[Small Units](../principles/small-units.md)')
    expect(content).toContain('## Blocked By')
    expect(content).toContain('[Design Feature](design-feature.md)')
    expect(content).toContain('- Feature works')
    expect(content).toContain('- Tests pass')
  })

  test('creates workflow task with refine-idea type', async () => {
    const fileSystem = makeFs({
      'ideas/my-feature.md': '# My Feature\n\nA new feature idea.',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      tasks: {
        'refine-idea-my-feature': {
          type: 'refine-idea',
          ideaSlug: 'my-feature',
        },
      },
    })

    expect(result.valid).toBe(true)
    const content = result.patch.files['tasks/refine-idea-my-feature.md']
    expect(content).toContain('# Refine Idea: My Feature')
    expect(content).toContain('## Refines Idea')
    expect(content).toContain('[My Feature](../ideas/my-feature.md)')
    expect(content).toContain('## Blocked By')
    expect(content).toContain('(none)')
    expect(content).toContain('## Definition of Done')
  })

  test('creates workflow task with decompose-idea type', async () => {
    const fileSystem = makeFs({
      'ideas/my-feature.md': '# My Feature\n\nA new feature idea.',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      tasks: {
        'decompose-idea-my-feature': {
          type: 'decompose-idea',
          ideaSlug: 'my-feature',
        },
      },
    })

    expect(result.valid).toBe(true)
    const content = result.patch.files['tasks/decompose-idea-my-feature.md']
    expect(content).toContain('# Decompose Idea: My Feature')
    expect(content).toContain('## Decomposes Idea')
    expect(content).toContain('[My Feature](../ideas/my-feature.md)')
  })

  test('creates workflow task with shelve-idea type', async () => {
    const fileSystem = makeFs({
      'ideas/old-feature.md': '# Old Feature\n\nAn old feature idea.',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      tasks: {
        'shelve-idea-old-feature': {
          type: 'shelve-idea',
          ideaSlug: 'old-feature',
        },
      },
    })

    expect(result.valid).toBe(true)
    const content = result.patch.files['tasks/shelve-idea-old-feature.md']
    expect(content).toContain('# Shelve Idea: Old Feature')
    expect(content).toContain('## Shelves Idea')
    expect(content).toContain('[Old Feature](../ideas/old-feature.md)')
  })

  test('creates workflow task with capture-idea type', async () => {
    const fileSystem = makeFs({
      'ideas/new-feature.md': '# New Feature\n\nA new feature idea.',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      tasks: {
        'add-idea-new-feature': {
          type: 'capture-idea',
          ideaSlug: 'new-feature',
        },
      },
    })

    expect(result.valid).toBe(true)
    const content = result.patch.files['tasks/add-idea-new-feature.md']
    expect(content).toContain('# Add Idea: New Feature')
    expect(content).toContain('## Captures Idea')
    expect(content).toContain('[New Feature](../ideas/new-feature.md)')
  })

  test('workflow task accepts custom definitionOfDone', async () => {
    const fileSystem = makeFs({
      'ideas/my-feature.md': '# My Feature\n\nA new feature idea.',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      tasks: {
        'refine-idea-my-feature': {
          type: 'refine-idea',
          ideaSlug: 'my-feature',
          definitionOfDone: ['Custom item 1', 'Custom item 2'],
        },
      },
    })

    expect(result.valid).toBe(true)
    const content = result.patch.files['tasks/refine-idea-my-feature.md']
    expect(content).toContain('- Custom item 1')
    expect(content).toContain('- Custom item 2')
  })

  test('deleting a task sets null in the patch', async () => {
    const fileSystem = makeFs({
      'tasks/old-task.md':
        '# Old Task\n\nThis task is being removed.\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      tasks: {
        'old-task': null,
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['tasks/old-task.md']).toBeNull()
  })

  test('deleting a task updates Blocked By sections in other tasks', async () => {
    const fileSystem = makeFs({
      'tasks/deleted-task.md':
        '# Deleted Task\n\nRemove stale code.\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
      'tasks/dependent-task.md':
        '# Dependent Task\n\nImplement the feature.\n\n## Blocked By\n\n- [Deleted Task](deleted-task.md)\n\n## Definition of Done\n\n- Done',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      tasks: {
        'deleted-task': null,
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['tasks/deleted-task.md']).toBeNull()
    // The dependent task should have its Blocked By section cleaned up
    const updatedContent = result.patch.files['tasks/dependent-task.md']
    expect(updatedContent).toContain('## Blocked By')
    expect(updatedContent).toContain('(none)')
    expect(updatedContent).not.toContain('deleted-task.md')
  })

  test('deleting a task preserves other blockedBy links', async () => {
    const fileSystem = makeFs({
      'tasks/deleted-task.md':
        '# Deleted Task\n\nRemove stale code.\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
      'tasks/other-task.md':
        '# Other Task\n\nKeep the other feature.\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
      'tasks/dependent-task.md':
        '# Dependent Task\n\nImplement the feature.\n\n## Blocked By\n\n- [Deleted Task](deleted-task.md)\n- [Other Task](other-task.md)\n\n## Definition of Done\n\n- Done',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      tasks: {
        'deleted-task': null,
      },
    })

    expect(result.valid).toBe(true)
    const updatedContent = result.patch.files['tasks/dependent-task.md']
    expect(updatedContent).toContain('## Blocked By')
    expect(updatedContent).toContain('[Other Task](other-task.md)')
    expect(updatedContent).not.toContain('deleted-task.md')
  })

  test('validates invalid blockedBy reference', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      tasks: {
        'new-task': {
          title: 'New Task',
          blockedBy: ['nonexistent-task'],
          definitionOfDone: ['Done'],
        },
      },
    })

    expect(result.valid).toBe(false)
    expect(
      result.violations.some(
        v =>
          v.message.includes('nonexistent-task') ||
          v.message.includes('broken') ||
          v.message.includes('link')
      )
    ).toBe(true)
  })

  test('validates invalid principles reference', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      tasks: {
        'new-task': {
          title: 'New Task',
          principles: ['nonexistent-principle'],
          definitionOfDone: ['Done'],
        },
      },
    })

    expect(result.valid).toBe(false)
    expect(
      result.violations.some(
        v =>
          v.message.includes('nonexistent-principle') ||
          v.message.includes('broken') ||
          v.message.includes('link')
      )
    ).toBe(true)
  })

  test('handles mixed facts and tasks in same patch', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'new-fact': { title: 'New Fact', body: 'Define the fact.' },
      },
      tasks: {
        'new-task': {
          title: 'New Task',
          body: 'Implement the new feature.',
          definitionOfDone: ['Done'],
        },
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['facts/new-fact.md']).toContain('# New Fact')
    expect(result.patch.files['tasks/new-task.md']).toContain('# New Task')
  })

  test('handles Blocked By section at end of file', async () => {
    // Task file where Blocked By is the last section (no Definition of Done after it in content)
    const fileSystem = makeFs({
      'tasks/deleted-task.md':
        '# Deleted Task\n\nRemove stale code.\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
      'tasks/dependent-task.md':
        '# Dependent Task\n\nImplement the feature.\n\n## Definition of Done\n\n- Done\n\n## Blocked By\n\n- [Deleted Task](deleted-task.md)',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      tasks: {
        'deleted-task': null,
      },
    })

    // The patch is generated but may fail validation due to heading order
    const updatedContent = result.patch.files['tasks/dependent-task.md']
    expect(updatedContent).toContain('## Blocked By')
    expect(updatedContent).toContain('(none)')
  })

  test('handles non-bullet content in Blocked By section', async () => {
    const fileSystem = makeFs({
      'tasks/deleted-task.md':
        '# Deleted Task\n\nRemove stale code.\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
      'tasks/dependent-task.md':
        '# Dependent Task\n\nImplement the feature.\n\n## Blocked By\n\nSome descriptive text here.\n\n## Definition of Done\n\n- Done',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      tasks: {
        'deleted-task': null,
      },
    })

    // The patch should preserve the descriptive text
    // No changes needed since no links to deleted-task
    expect(result.patch.files['tasks/dependent-task.md']).toBeUndefined()
  })

  test('preserves non-bullet content when link is removed from same section', async () => {
    const fileSystem = makeFs({
      'tasks/deleted-task.md':
        '# Deleted Task\n\nRemove stale code.\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
      'tasks/dependent-task.md':
        '# Dependent Task\n\nImplement the feature.\n\n## Blocked By\n\nSee related context:\n- [Deleted Task](deleted-task.md)\n\n## Definition of Done\n\n- Done',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      tasks: {
        'deleted-task': null,
      },
    })

    const updatedContent = result.patch.files['tasks/dependent-task.md']
    // The non-bullet content should be preserved and section should be cleaned up
    expect(updatedContent).toBeDefined()
    expect(updatedContent).toContain('## Blocked By')
    expect(updatedContent).not.toContain('deleted-task.md')
  })

  test('cleans up Blocked By with existing (none) and a link', async () => {
    const fileSystem = makeFs({
      'tasks/deleted-task.md':
        '# Deleted Task\n\nRemove stale code.\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
      'tasks/dependent-task.md':
        '# Dependent Task\n\nImplement the feature.\n\n## Blocked By\n\n(none)\n- [Deleted Task](deleted-task.md)\n\n## Definition of Done\n\n- Done',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      tasks: {
        'deleted-task': null,
      },
    })

    const updatedContent = result.patch.files['tasks/dependent-task.md']
    expect(updatedContent).toContain('## Blocked By')
    expect(updatedContent).toContain('(none)')
    expect(updatedContent).not.toContain('deleted-task.md')
  })
})

describe('serializeTask', () => {
  test('produces valid task markdown for standard task', () => {
    const input: StandardTaskInput = {
      title: 'Implement Feature',
      definitionOfDone: ['Feature works', 'Tests pass'],
    }
    const result = serializeTask(input)
    expect(result).toContain('# Implement Feature')
    expect(result).toContain('## Blocked By')
    expect(result).toContain('(none)')
    expect(result).toContain('## Definition of Done')
    expect(result).toContain('- Feature works')
    expect(result).toContain('- Tests pass')
  })

  test('includes body in standard task', () => {
    const input: StandardTaskInput = {
      title: 'Implement Feature',
      body: 'Additional context here.',
      definitionOfDone: ['Done'],
    }
    const result = serializeTask(input)
    expect(result).toContain('Additional context here.')
  })

  test('includes principles section when provided', () => {
    const input: StandardTaskInput = {
      title: 'Implement Feature',
      principles: ['small-units', 'functional-core'],
      definitionOfDone: ['Done'],
    }
    const result = serializeTask(input)
    expect(result).toContain('## Principles')
    expect(result).toContain('[Small Units](../principles/small-units.md)')
    expect(result).toContain(
      '[Functional Core](../principles/functional-core.md)'
    )
  })

  test('omits principles section when empty array', () => {
    const input: StandardTaskInput = {
      title: 'Implement Feature',
      principles: [],
      definitionOfDone: ['Done'],
    }
    const result = serializeTask(input)
    // Empty principles array means no principles section
    expect(result).not.toContain('## Principles')
  })

  test('includes blockedBy section when provided', () => {
    const input: StandardTaskInput = {
      title: 'Implement Feature',
      blockedBy: ['design-feature'],
      definitionOfDone: ['Done'],
    }
    const result = serializeTask(input)
    expect(result).toContain('## Blocked By')
    expect(result).toContain('[Design Feature](design-feature.md)')
  })

  test('produces valid task markdown for refine-idea workflow task', () => {
    const input: WorkflowTaskInput = {
      type: 'refine-idea',
      ideaSlug: 'my-feature',
    }
    const result = serializeTask(input)
    expect(result).toContain('# Refine Idea: My Feature')
    expect(result).toContain('## Refines Idea')
    expect(result).toContain('[My Feature](../ideas/my-feature.md)')
    expect(result).toContain('## Blocked By')
    expect(result).toContain('(none)')
    expect(result).toContain('## Definition of Done')
  })

  test('produces valid task markdown for decompose-idea workflow task', () => {
    const input: WorkflowTaskInput = {
      type: 'decompose-idea',
      ideaSlug: 'my-feature',
    }
    const result = serializeTask(input)
    expect(result).toContain('# Decompose Idea: My Feature')
    expect(result).toContain('## Decomposes Idea')
    expect(result).toContain('[My Feature](../ideas/my-feature.md)')
  })

  test('produces valid task markdown for shelve-idea workflow task', () => {
    const input: WorkflowTaskInput = {
      type: 'shelve-idea',
      ideaSlug: 'old-feature',
    }
    const result = serializeTask(input)
    expect(result).toContain('# Shelve Idea: Old Feature')
    expect(result).toContain('## Shelves Idea')
    expect(result).toContain('[Old Feature](../ideas/old-feature.md)')
  })

  test('produces valid task markdown for capture-idea workflow task', () => {
    const input: WorkflowTaskInput = {
      type: 'capture-idea',
      ideaSlug: 'new-feature',
    }
    const result = serializeTask(input)
    expect(result).toContain('# Add Idea: New Feature')
    expect(result).toContain('## Captures Idea')
    expect(result).toContain('[New Feature](../ideas/new-feature.md)')
  })

  test('uses custom definitionOfDone for workflow task', () => {
    const input: WorkflowTaskInput = {
      type: 'refine-idea',
      ideaSlug: 'my-feature',
      definitionOfDone: ['Custom item'],
    }
    const result = serializeTask(input)
    expect(result).toContain('- Custom item')
  })

  test('uses default definitionOfDone for workflow task when not provided', () => {
    const input: WorkflowTaskInput = {
      type: 'refine-idea',
      ideaSlug: 'my-feature',
    }
    const result = serializeTask(input)
    expect(result).toContain(
      '- Idea is thoroughly researched with relevant codebase context'
    )
  })
})

describe('buildTaskFiles', () => {
  test('produces file entries for a standard task patch', () => {
    const input: StandardTaskInput = {
      title: 'New Task',
      definitionOfDone: ['Done'],
    }
    const result = buildTaskFiles(input, 'new-task')
    expect(Object.keys(result)).toContain('tasks/new-task.md')
    expect(result['tasks/new-task.md']).toContain('# New Task')
  })

  test('produces file entries for a workflow task patch', () => {
    const input: WorkflowTaskInput = {
      type: 'refine-idea',
      ideaSlug: 'my-feature',
    }
    const result = buildTaskFiles(input, 'refine-idea-my-feature')
    expect(Object.keys(result)).toContain('tasks/refine-idea-my-feature.md')
    expect(result['tasks/refine-idea-my-feature.md']).toContain(
      '# Refine Idea: My Feature'
    )
  })
})

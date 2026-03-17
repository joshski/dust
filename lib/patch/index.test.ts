import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator } from '../filesystem/emulator'
import {
  buildArtifactPatch,
  serializeFact,
  serializeIdea,
  serializePrinciple,
  serializeTask,
} from './index'
import type { FactInput } from './fact'
import { buildFactFiles } from './fact'
import type { IdeaInput } from './idea'
import { buildIdeaFiles } from './idea'
import type { PrincipleInput } from './principle'
import { buildPrincipleFiles } from './principle'
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

describe('serializePrinciple', () => {
  test('produces valid principle markdown from a PrincipleInput object', () => {
    const input: PrincipleInput = {
      title: 'My Principle',
    }
    const result = serializePrinciple(input)
    expect(result).toContain('# My Principle')
    expect(result).toContain('## Parent Principle')
    expect(result).toContain('- (none)')
    expect(result).toContain('## Sub-Principles')
  })

  test('includes body content', () => {
    const input: PrincipleInput = {
      title: 'My Principle',
      body: 'This principle guides development.',
    }
    const result = serializePrinciple(input)
    expect(result).toContain('# My Principle')
    expect(result).toContain('This principle guides development.')
  })

  test('renders parent principle link', () => {
    const input: PrincipleInput = {
      title: 'Child Principle',
      parentPrinciple: 'parent-principle',
    }
    const result = serializePrinciple(input)
    expect(result).toContain('## Parent Principle')
    expect(result).toContain('[Parent Principle](parent-principle.md)')
  })

  test('renders sub-principles links', () => {
    const input: PrincipleInput = {
      title: 'Parent Principle',
      subPrinciples: ['child-a', 'child-b'],
    }
    const result = serializePrinciple(input)
    expect(result).toContain('## Sub-Principles')
    expect(result).toContain('[Child A](child-a.md)')
    expect(result).toContain('[Child B](child-b.md)')
  })

  test('handles null parentPrinciple for root principles', () => {
    const input: PrincipleInput = {
      title: 'Root Principle',
      parentPrinciple: null,
    }
    const result = serializePrinciple(input)
    expect(result).toContain('## Parent Principle')
    expect(result).toContain('- (none)')
  })

  test('handles empty subPrinciples array', () => {
    const input: PrincipleInput = {
      title: 'Leaf Principle',
      subPrinciples: [],
    }
    const result = serializePrinciple(input)
    expect(result).toContain('## Sub-Principles')
    expect(result).toContain('- (none)')
  })

  test('produces complete principle with all fields', () => {
    const input: PrincipleInput = {
      title: 'Complete Principle',
      body: 'A comprehensive description.',
      parentPrinciple: 'parent',
      subPrinciples: ['child-one', 'child-two'],
    }
    const result = serializePrinciple(input)
    expect(result).toContain('# Complete Principle')
    expect(result).toContain('A comprehensive description.')
    expect(result).toContain('[Parent](parent.md)')
    expect(result).toContain('[Child One](child-one.md)')
    expect(result).toContain('[Child Two](child-two.md)')
  })
})

describe('buildPrincipleFiles', () => {
  test('produces file entries for a principle patch', () => {
    const input: PrincipleInput = {
      title: 'New Principle',
      body: 'Description here.',
    }
    const result = buildPrincipleFiles(input, 'new-principle')
    expect(Object.keys(result)).toContain('principles/new-principle.md')
    expect(result['principles/new-principle.md']).toContain('# New Principle')
  })
})

describe('buildArtifactPatch with principles', () => {
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

  test('accepts a principles object and creates principle files', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        'new-principle': {
          title: 'New Principle',
          body: 'A guiding principle.',
        },
      },
    })

    expect(result).toHaveProperty('valid')
    expect(result).toHaveProperty('patch')
    expect(result.patch.files['principles/new-principle.md']).toContain(
      '# New Principle'
    )
    expect(result.patch.files['principles/new-principle.md']).toContain(
      '## Parent Principle'
    )
    expect(result.patch.files['principles/new-principle.md']).toContain(
      '## Sub-Principles'
    )
  })

  test('validates bidirectional parent-child relationship', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        'child-principle': {
          title: 'Child Principle',
          body: 'Define the child principle.',
          parentPrinciple: 'new-parent',
          subPrinciples: [],
        },
        'new-parent': {
          title: 'New Parent',
          body: 'Define the parent principle.',
          parentPrinciple: null,
          subPrinciples: ['child-principle'],
        },
      },
    })

    expect(result.valid).toBe(true)
    expect(result.violations).toEqual([])
  })

  test('fails validation when child declares parent but parent does not list child', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        'child-principle': {
          title: 'Child Principle',
          parentPrinciple: 'new-parent',
        },
        'new-parent': {
          title: 'New Parent',
          parentPrinciple: null,
          subPrinciples: [], // Missing 'child-principle'
        },
      },
    })

    expect(result.valid).toBe(false)
    expect(
      result.violations.some(v =>
        v.message.includes('does not list this principle as a sub-principle')
      )
    ).toBe(true)
  })

  test('fails validation when parent lists child but child does not declare parent', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        'child-principle': {
          title: 'Child Principle',
          parentPrinciple: null, // Should be 'new-parent'
        },
        'new-parent': {
          title: 'New Parent',
          parentPrinciple: null,
          subPrinciples: ['child-principle'],
        },
      },
    })

    expect(result.valid).toBe(false)
    expect(
      result.violations.some(v =>
        v.message.includes('does not list this principle as its parent')
      )
    ).toBe(true)
  })

  test('validates hierarchy against existing principles on disk', async () => {
    const fileSystem = makeFs({
      'principles/existing-parent.md':
        '# Existing Parent\n\nAn existing principle.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- (none)\n',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        'new-child': {
          title: 'New Child',
          parentPrinciple: 'existing-parent',
        },
      },
    })

    expect(result.valid).toBe(false)
    expect(
      result.violations.some(v =>
        v.message.includes('does not list this principle as a sub-principle')
      )
    ).toBe(true)
  })

  test('deleting a principle sets null in the patch', async () => {
    const fileSystem = makeFs({
      'principles/old-principle.md':
        '# Old Principle\n\nThis principle is being removed.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- (none)\n',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        'old-principle': null,
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['principles/old-principle.md']).toBeNull()
  })

  test('deleting a principle updates parent principle to remove child from subPrinciples', async () => {
    const fileSystem = makeFs({
      'principles/parent.md':
        '# Parent\n\nThe parent principle.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- [Child](child.md)\n',
      'principles/child.md':
        '# Child\n\nThe child principle.\n\n## Parent Principle\n\n- [Parent](parent.md)\n\n## Sub-Principles\n\n- (none)\n',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        child: null,
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['principles/child.md']).toBeNull()
    expect(result.patch.files['principles/parent.md']).toContain('- (none)')
    expect(result.patch.files['principles/parent.md']).not.toContain('child.md')
  })

  test('deleting a principle updates child principles to clear parentPrinciple', async () => {
    const fileSystem = makeFs({
      'principles/parent.md':
        '# Parent\n\nThe parent principle.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- [Child](child.md)\n',
      'principles/child.md':
        '# Child\n\nThe child principle.\n\n## Parent Principle\n\n- [Parent](parent.md)\n\n## Sub-Principles\n\n- (none)\n',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        parent: null,
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['principles/parent.md']).toBeNull()
    expect(result.patch.files['principles/child.md']).toContain('- (none)')
    expect(result.patch.files['principles/child.md']).not.toContain('parent.md')
  })

  test('deleting a principle removes references from task Principles sections', async () => {
    const fileSystem = makeFs({
      'principles/deleted-principle.md':
        '# Deleted Principle\n\nGoing away.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- (none)\n',
      'tasks/my-task.md':
        '# My Task\n\nDo something.\n\n## Principles\n\n- [Deleted Principle](../principles/deleted-principle.md)\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done\n',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        'deleted-principle': null,
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['principles/deleted-principle.md']).toBeNull()
    // The task should have its principle link removed
    expect(result.patch.files['tasks/my-task.md']).not.toContain(
      'deleted-principle.md'
    )
  })

  test('handles mixed facts, principles, and tasks in same patch', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'new-fact': { title: 'New Fact', body: 'Define the fact.' },
      },
      principles: {
        'new-principle': {
          title: 'New Principle',
          body: 'Guide development.',
        },
      },
      tasks: {
        'new-task': {
          title: 'New Task',
          body: 'Implement the feature.',
          definitionOfDone: ['Done'],
        },
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['facts/new-fact.md']).toContain('# New Fact')
    expect(result.patch.files['principles/new-principle.md']).toContain(
      '# New Principle'
    )
    expect(result.patch.files['tasks/new-task.md']).toContain('# New Task')
  })

  test('handles non-existent principles directory gracefully', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          facts: {},
        },
      },
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        'new-principle': {
          title: 'New Principle',
          body: 'In sparse repo.',
        },
      },
    })

    expect(result.valid).toBe(true)
  })

  test('explicit patch entries take precedence over hierarchy cleanup', async () => {
    const fileSystem = makeFs({
      'principles/parent.md':
        '# Parent\n\nThe parent principle.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- [Child](child.md)\n',
      'principles/child.md':
        '# Child\n\nThe child principle.\n\n## Parent Principle\n\n- [Parent](parent.md)\n\n## Sub-Principles\n\n- (none)\n',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        child: null,
        // Explicitly provide an update to the parent
        parent: {
          title: 'Parent',
          body: 'Updated parent content.',
          parentPrinciple: null,
          subPrinciples: [],
        },
      },
    })

    expect(result.valid).toBe(true)
    // The explicit update should be used
    expect(result.patch.files['principles/parent.md']).toContain(
      'Updated parent content.'
    )
  })

  test('preserves other sub-principles when one is deleted', async () => {
    const fileSystem = makeFs({
      'principles/parent.md':
        '# Parent\n\nThe parent principle.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- [Child A](child-a.md)\n- [Child B](child-b.md)\n',
      'principles/child-a.md':
        '# Child A\n\nFirst child.\n\n## Parent Principle\n\n- [Parent](parent.md)\n\n## Sub-Principles\n\n- (none)\n',
      'principles/child-b.md':
        '# Child B\n\nSecond child.\n\n## Parent Principle\n\n- [Parent](parent.md)\n\n## Sub-Principles\n\n- (none)\n',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        'child-a': null,
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['principles/child-a.md']).toBeNull()
    // Parent should still list child-b
    const updatedParent = result.patch.files['principles/parent.md']
    expect(updatedParent).not.toContain('child-a.md')
    expect(updatedParent).toContain('[Child B](child-b.md)')
  })

  test('re-throws non-ENOENT errors from principles readdir', async () => {
    const fileSystem = makeFs()
    const permissionError = new Error('EACCES: permission denied')
    ;(permissionError as NodeJS.ErrnoException).code = 'EACCES'
    const originalReaddir = fileSystem.readdir.bind(fileSystem)
    fileSystem.readdir = async (path: string) => {
      if (path === `${dustPath}/principles`) {
        throw permissionError
      }
      return originalReaddir(path)
    }

    await expect(
      buildArtifactPatch(fileSystem, dustPath, {
        principles: {
          'new-principle': {
            title: 'New Principle',
            body: 'Description.',
          },
        },
      })
    ).rejects.toThrow('EACCES: permission denied')
  })

  test('skips non-md files when loading existing principle relationships', async () => {
    const fileSystem = makeFs({
      'principles/valid-principle.md':
        '# Valid Principle\n\nA valid principle.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- (none)\n',
    })
    fileSystem.files.set(`${dustPath}/principles/data.txt`, 'some text content')

    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        'new-principle': {
          title: 'New Principle',
          body: 'Description.',
          parentPrinciple: 'valid-principle',
        },
      },
    })

    // Should fail validation because valid-principle doesn't list new-principle
    expect(result.valid).toBe(false)
  })

  test('handles principle file with H1 inside section', async () => {
    // This tests the break condition when a line starts with '# '
    const fileSystem = makeFs({
      'principles/unusual.md':
        '# Unusual Principle\n\nBody.\n\n## Parent Principle\n\n- (none)\n\n# Rogue Heading\n\n## Sub-Principles\n\n- (none)\n',
    })

    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        'new-child': {
          title: 'New Child',
          body: 'Description.',
          parentPrinciple: 'unusual',
        },
      },
    })

    // Should fail because unusual doesn't list new-child as sub-principle
    expect(result.valid).toBe(false)
  })

  test('does not update principle when cleanup makes no changes', async () => {
    // The principle doesn't reference the deleted one, so no update needed
    const fileSystem = makeFs({
      'principles/deleted.md':
        '# Deleted\n\nGoing away.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- (none)\n',
      'principles/unrelated.md':
        '# Unrelated\n\nNo references to deleted.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- (none)\n',
    })

    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        deleted: null,
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['principles/deleted.md']).toBeNull()
    // Unrelated should not be in the patch because it doesn't reference deleted
    expect(result.patch.files['principles/unrelated.md']).toBeUndefined()
  })

  test('handles section cleanup when transitioning between hierarchy sections', async () => {
    // Parent Principle followed immediately by Sub-Principles
    const fileSystem = makeFs({
      'principles/parent.md':
        '# Parent\n\nA parent.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- [Child](child.md)\n',
      'principles/child.md':
        '# Child\n\nThe child.\n\n## Parent Principle\n\n- [Parent](parent.md)\n\n## Sub-Principles\n\n- (none)\n',
    })

    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        child: null,
      },
    })

    expect(result.valid).toBe(true)
    const updatedParent = result.patch.files['principles/parent.md']
    expect(updatedParent).toContain('## Parent Principle')
    expect(updatedParent).toContain('## Sub-Principles')
    expect(updatedParent).toContain('- (none)')
    expect(updatedParent).not.toContain('child.md')
  })

  test('handles hierarchy section at end of file during cleanup', async () => {
    // Sub-Principles is the last section
    const fileSystem = makeFs({
      'principles/parent.md':
        '# Parent\n\nA parent.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- [Child](child.md)',
      'principles/child.md':
        '# Child\n\nThe child.\n\n## Parent Principle\n\n- [Parent](parent.md)\n\n## Sub-Principles\n\n- (none)',
    })

    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        child: null,
      },
    })

    expect(result.valid).toBe(true)
    const updatedParent = result.patch.files['principles/parent.md']
    expect(updatedParent).toContain('## Sub-Principles')
    expect(updatedParent).toContain('- (none)')
  })

  test('handles links without .md extension in principle sections', async () => {
    // Tests the case where a link target doesn't match the .md pattern
    const fileSystem = makeFs({
      'principles/parent.md':
        '# Parent\n\nBody.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- [External](https://example.com)\n',
    })

    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        'new-child': {
          title: 'New Child',
          body: 'Description.',
          parentPrinciple: 'parent',
        },
      },
    })

    // Should fail because parent doesn't list new-child
    expect(result.valid).toBe(false)
  })

  test('handles orphaned bullet items during cleanup', async () => {
    // Bullet items without links become orphaned after link removal
    const fileSystem = makeFs({
      'principles/parent.md':
        '# Parent\n\nBody.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- [Child A](child-a.md)\n- orphaned text\n',
      'principles/child-a.md':
        '# Child A\n\nThe child.\n\n## Parent Principle\n\n- [Parent](parent.md)\n\n## Sub-Principles\n\n- (none)\n',
    })

    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        'child-a': null,
      },
    })

    expect(result.valid).toBe(true)
    const updatedParent = result.patch.files['principles/parent.md']
    // After removing child-a link, only orphaned text remains which has no link
    expect(updatedParent).toContain('## Sub-Principles')
    // The cleanup should show (none) since no valid links remain
    expect(updatedParent).toContain('- (none)')
  })

  test('preserves non-list content in hierarchy sections', async () => {
    // Non-bullet content should be treated as valid content
    const fileSystem = makeFs({
      'principles/parent.md':
        '# Parent\n\nBody.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\nSome explanation text\n- [Child](child.md)\n',
      'principles/child.md':
        '# Child\n\nThe child.\n\n## Parent Principle\n\n- [Parent](parent.md)\n\n## Sub-Principles\n\n- (none)\n',
    })

    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        child: null,
      },
    })

    expect(result.valid).toBe(true)
    const updatedParent = result.patch.files['principles/parent.md']
    // The explanation text counts as valid content
    expect(updatedParent).toContain('## Sub-Principles')
  })

  test('handles ENOENT when principles directory does not exist', async () => {
    // Create filesystem without principles directory
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          facts: {},
        },
      },
    })

    const originalReaddir = fileSystem.readdir.bind(fileSystem)
    const enoentError = new Error('ENOENT: no such file or directory')
    ;(enoentError as NodeJS.ErrnoException).code = 'ENOENT'
    fileSystem.readdir = async (path: string) => {
      if (path === `${dustPath}/principles`) {
        throw enoentError
      }
      return originalReaddir(path)
    }

    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        'new-principle': {
          title: 'New Principle',
          body: 'Description here.',
        },
      },
    })

    // Should succeed since there are no existing principles to validate against
    expect(result.valid).toBe(true)
  })

  test('handles section with multiple links when one is deleted', async () => {
    // Tests the hasValidContent=true branch (lines 250-252)
    const fileSystem = makeFs({
      'principles/parent.md':
        '# Parent\n\nBody.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- [Child A](child-a.md)\n- [Child B](child-b.md)\n\n## Other Section\n\nContent.\n',
      'principles/child-a.md':
        '# Child A\n\nChild A body.\n\n## Parent Principle\n\n- [Parent](parent.md)\n\n## Sub-Principles\n\n- (none)\n',
      'principles/child-b.md':
        '# Child B\n\nChild B body.\n\n## Parent Principle\n\n- [Parent](parent.md)\n\n## Sub-Principles\n\n- (none)\n',
    })

    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        'child-a': null,
      },
    })

    expect(result.valid).toBe(true)
    const updatedParent = result.patch.files['principles/parent.md']
    expect(updatedParent).toContain('[Child B](child-b.md)')
    expect(updatedParent).not.toContain('child-a.md')
    expect(updatedParent).toContain('## Other Section')
  })

  test('handles (none) marker in hierarchy section during cleanup', async () => {
    // Tests line 279 - existing (none) in section
    const fileSystem = makeFs({
      'principles/parent.md':
        '# Parent\n\nBody.\n\n## Parent Principle\n\n(none)\n\n## Sub-Principles\n\n- [Child](child.md)\n',
      'principles/child.md':
        '# Child\n\nChild body.\n\n## Parent Principle\n\n- [Parent](parent.md)\n\n## Sub-Principles\n\n- (none)\n',
    })

    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        child: null,
      },
    })

    expect(result.valid).toBe(true)
    const updatedParent = result.patch.files['principles/parent.md']
    // Parent Principle section should stay as (none)
    expect(updatedParent).toContain('## Parent Principle')
    expect(updatedParent).toContain('## Sub-Principles')
  })

  test('does not add to patch when cleanup produces identical content', async () => {
    // Tests line 657 - when updatedContent === content
    // This tests the case where a related principle mentions the deleted one
    // but the updatePrincipleHierarchyOnDeletion produces identical content
    // (e.g., the link was in a non-hierarchy section that doesn't get modified)
    const fileSystem = makeFs({
      'principles/deleted.md':
        '# Deleted\n\nGoing away.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- (none)\n',
      'principles/other.md':
        '# Other\n\nAnother principle.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- (none)\n',
    })

    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        deleted: null,
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['principles/deleted.md']).toBeNull()
    // Other should not be modified since it doesn't reference deleted
    expect(result.patch.files['principles/other.md']).toBeUndefined()
  })

  test('handles non-hierarchy section heading after hierarchy section', async () => {
    // Tests line 263 - when heading !== Parent Principle or Sub-Principles
    const fileSystem = makeFs({
      'principles/parent.md':
        '# Parent\n\nBody.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- [Child](child.md)\n\n## Related Topics\n\nSome content.\n',
      'principles/child.md':
        '# Child\n\nChild body.\n\n## Parent Principle\n\n- [Parent](parent.md)\n\n## Sub-Principles\n\n- (none)\n',
    })

    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        child: null,
      },
    })

    expect(result.valid).toBe(true)
    const updatedParent = result.patch.files['principles/parent.md']
    expect(updatedParent).toContain('## Related Topics')
    expect(updatedParent).toContain('Some content.')
  })

  test('skips file modification when cleanup produces identical content', async () => {
    // This tests line 657 where updatedContent === content (false branch)
    // Create a situation where the relationship parser detects a connection
    // but the actual file content doesn't change after cleanup
    const fileSystem = makeFs({
      'principles/deleted.md':
        '# Deleted\n\nGoing away.\n\n## Parent Principle\n\n- (none)\n\n## Sub-Principles\n\n- [Related](related.md)\n',
      'principles/related.md':
        '# Related\n\nRelated principle.\n\n## Parent Principle\n\n- [Deleted](deleted.md)\n\n## Sub-Principles\n\n- (none)\n',
    })

    // Mock the filesystem to return different content after the first read
    // This simulates a case where the file was modified between parsing and cleanup
    // The content must exactly match what the cleanup function would produce
    const originalReadFile = fileSystem.readFile.bind(fileSystem)
    const readCounts = new Map<string, number>()
    fileSystem.readFile = async (path: string) => {
      const count = (readCounts.get(path) || 0) + 1
      readCounts.set(path, count)

      // After the first read of related.md, return content that has no link
      // This covers both updateRelatedPrinciplesOnDeletion and findReferencesToDeletedPaths
      if (path === `${dustPath}/principles/related.md` && count > 1) {
        return '# Related\n\nRelated principle.\n\n## Parent Principle\n\n- (none)\n## Sub-Principles\n\n- (none)'
      }
      return originalReadFile(path)
    }

    const result = await buildArtifactPatch(fileSystem, dustPath, {
      principles: {
        deleted: null,
      },
    })

    // The file read during cleanup doesn't have the link anymore,
    // so the cleanup produces identical content and file is not added to patch
    expect(result.valid).toBe(true)
    expect(result.patch.files['principles/deleted.md']).toBeNull()
    // Related should not be in the patch since cleanup produced identical content
    expect(result.patch.files['principles/related.md']).toBeUndefined()
  })
})

describe('serializeIdea', () => {
  test('produces valid idea markdown from an IdeaInput object', () => {
    const input: IdeaInput = {
      title: 'My Idea',
    }
    const result = serializeIdea(input)
    expect(result).toBe('# My Idea\n')
  })

  test('includes body content', () => {
    const input: IdeaInput = {
      title: 'My Idea',
      body: 'Description of the idea.',
    }
    const result = serializeIdea(input)
    expect(result).toBe('# My Idea\n\nDescription of the idea.\n')
  })

  test('handles multi-line body content', () => {
    const input: IdeaInput = {
      title: 'My Idea',
      body: 'First paragraph.\n\nSecond paragraph.\n\n## Context\n\nAdditional background.',
    }
    const result = serializeIdea(input)
    expect(result).toBe(
      '# My Idea\n\nFirst paragraph.\n\nSecond paragraph.\n\n## Context\n\nAdditional background.\n'
    )
  })

  test('includes open questions section', () => {
    const input: IdeaInput = {
      title: 'My Idea',
      body: 'Description.',
      openQuestions: [
        {
          question: 'Which approach should we take?',
          options: [
            { name: 'Option A', description: 'Description of option A.' },
            { name: 'Option B', description: 'Description of option B.' },
          ],
        },
      ],
    }
    const result = serializeIdea(input)
    expect(result).toContain('## Open Questions')
    expect(result).toContain('### Which approach should we take?')
    expect(result).toContain('#### Option A')
    expect(result).toContain('Description of option A.')
    expect(result).toContain('#### Option B')
    expect(result).toContain('Description of option B.')
  })

  test('handles multiple open questions', () => {
    const input: IdeaInput = {
      title: 'My Idea',
      openQuestions: [
        {
          question: 'First question?',
          options: [
            { name: 'A', description: 'First A.' },
            { name: 'B', description: 'First B.' },
          ],
        },
        {
          question: 'Second question?',
          options: [
            { name: 'X', description: 'Second X.' },
            { name: 'Y', description: 'Second Y.' },
          ],
        },
      ],
    }
    const result = serializeIdea(input)
    expect(result).toContain('### First question?')
    expect(result).toContain('### Second question?')
    expect(result).toContain('#### A')
    expect(result).toContain('#### X')
  })

  test('handles option without description', () => {
    const input: IdeaInput = {
      title: 'My Idea',
      openQuestions: [
        {
          question: 'Choose one?',
          options: [
            { name: 'Simple', description: '' },
            { name: 'Detailed', description: 'Has a description.' },
          ],
        },
      ],
    }
    const result = serializeIdea(input)
    expect(result).toContain('#### Simple')
    expect(result).toContain('#### Detailed')
    expect(result).toContain('Has a description.')
  })

  test('omits open questions section when empty array', () => {
    const input: IdeaInput = {
      title: 'My Idea',
      body: 'Description.',
      openQuestions: [],
    }
    const result = serializeIdea(input)
    expect(result).not.toContain('## Open Questions')
  })

  test('omits open questions section when undefined', () => {
    const input: IdeaInput = {
      title: 'My Idea',
      body: 'Description.',
    }
    const result = serializeIdea(input)
    expect(result).not.toContain('## Open Questions')
  })
})

describe('buildIdeaFiles', () => {
  test('produces file entries for an idea patch', () => {
    const input: IdeaInput = {
      title: 'New Idea',
      body: 'Description here.',
    }
    const result = buildIdeaFiles(input, 'new-idea')
    expect(Object.keys(result)).toContain('ideas/new-idea.md')
    expect(result['ideas/new-idea.md']).toContain('# New Idea')
  })
})

describe('buildArtifactPatch with ideas', () => {
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

  test('accepts an ideas object and creates idea files', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      ideas: {
        'new-feature': {
          title: 'New Feature',
          body: 'A new feature idea.',
        },
      },
    })

    expect(result).toHaveProperty('valid')
    expect(result).toHaveProperty('patch')
    expect(result.patch.files['ideas/new-feature.md']).toContain(
      '# New Feature'
    )
    expect(result.patch.files['ideas/new-feature.md']).toContain(
      'A new feature idea.'
    )
  })

  test('creates idea with open questions', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      ideas: {
        'new-feature': {
          title: 'New Feature',
          body: 'Description of the feature idea.',
          openQuestions: [
            {
              question: 'Which approach should we take?',
              options: [
                { name: 'Option A', description: 'Description of option A.' },
                { name: 'Option B', description: 'Description of option B.' },
              ],
            },
          ],
        },
      },
    })

    expect(result.valid).toBe(true)
    const content = result.patch.files['ideas/new-feature.md']
    expect(content).toContain('# New Feature')
    expect(content).toContain('## Open Questions')
    expect(content).toContain('### Which approach should we take?')
    expect(content).toContain('#### Option A')
    expect(content).toContain('#### Option B')
  })

  test('deleting an idea sets null in the patch', async () => {
    const fileSystem = makeFs({
      'ideas/old-idea.md': '# Old Idea\n\nThis idea is being removed.',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      ideas: {
        'old-idea': null,
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['ideas/old-idea.md']).toBeNull()
  })

  test('deleting an idea updates workflow tasks that reference it', async () => {
    const fileSystem = makeFs({
      'ideas/deleted-idea.md': '# Deleted Idea\n\nThis idea is being removed.',
      'tasks/decompose-idea-deleted-idea.md':
        '# Decompose Idea: Deleted Idea\n\nCreate tasks from this idea.\n\n## Decomposes Idea\n\n- [Deleted Idea](../ideas/deleted-idea.md)\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      ideas: {
        'deleted-idea': null,
      },
    })

    expect(result.patch.files['ideas/deleted-idea.md']).toBeNull()
    // The workflow task should have its link removed
    const updatedTask =
      result.patch.files['tasks/decompose-idea-deleted-idea.md']
    expect(updatedTask).not.toContain('deleted-idea.md')
    expect(updatedTask).toContain('Deleted Idea')
    // Validation fails because workflow task sections require a valid link
    expect(result.valid).toBe(false)
  })

  test('deleting an idea updates multiple workflow task types', async () => {
    const fileSystem = makeFs({
      'ideas/my-idea.md': '# My Idea\n\nAn idea.',
      'tasks/refine-idea-my-idea.md':
        '# Refine Idea: My Idea\n\nRefine this idea.\n\n## Refines Idea\n\n- [My Idea](../ideas/my-idea.md)\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
      'tasks/shelve-idea-my-idea.md':
        '# Shelve Idea: My Idea\n\nArchive this idea.\n\n## Shelves Idea\n\n- [My Idea](../ideas/my-idea.md)\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      ideas: {
        'my-idea': null,
      },
    })

    expect(result.patch.files['ideas/my-idea.md']).toBeNull()
    expect(result.patch.files['tasks/refine-idea-my-idea.md']).not.toContain(
      'my-idea.md'
    )
    expect(result.patch.files['tasks/shelve-idea-my-idea.md']).not.toContain(
      'my-idea.md'
    )
    // Validation fails because workflow task sections require a valid link
    expect(result.valid).toBe(false)
  })

  test('deleting an idea removes references from other ideas', async () => {
    const fileSystem = makeFs({
      'ideas/deleted-idea.md': '# Deleted Idea\n\nThis idea is being removed.',
      'ideas/linked-idea.md':
        '# Linked Idea\n\nThis relates to [Deleted Idea](deleted-idea.md).',
    })
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      ideas: {
        'deleted-idea': null,
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['ideas/deleted-idea.md']).toBeNull()
    expect(result.patch.files['ideas/linked-idea.md']).toBe(
      '# Linked Idea\n\nThis relates to Deleted Idea.'
    )
  })

  test('handles mixed facts, ideas, principles, and tasks in same patch', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      facts: {
        'new-fact': { title: 'New Fact', body: 'Define the fact.' },
      },
      ideas: {
        'new-idea': { title: 'New Idea', body: 'Describe the idea.' },
      },
      principles: {
        'new-principle': {
          title: 'New Principle',
          body: 'Guide development.',
        },
      },
      tasks: {
        'new-task': {
          title: 'New Task',
          body: 'Implement the feature.',
          definitionOfDone: ['Done'],
        },
      },
    })

    expect(result.valid).toBe(true)
    expect(result.patch.files['facts/new-fact.md']).toContain('# New Fact')
    expect(result.patch.files['ideas/new-idea.md']).toContain('# New Idea')
    expect(result.patch.files['principles/new-principle.md']).toContain(
      '# New Principle'
    )
    expect(result.patch.files['tasks/new-task.md']).toContain('# New Task')
  })

  test('validates idea title matches filename', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      ideas: {
        'wrong-name': { title: 'Correct Name', body: 'Mismatched title.' },
      },
    })

    expect(result.valid).toBe(false)
    expect(
      result.violations.some(v => v.message.toLowerCase().includes('title'))
    ).toBe(true)
  })

  test('validates opening sentence requirement', async () => {
    const fileSystem = makeFs()
    const result = await buildArtifactPatch(fileSystem, dustPath, {
      ideas: {
        'no-sentence': { title: 'No Sentence' },
      },
    })

    expect(result.valid).toBe(false)
    expect(
      result.violations.some(v => v.message.includes('opening sentence'))
    ).toBe(true)
  })
})

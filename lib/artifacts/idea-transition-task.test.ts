import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator } from '../test/test-utilities'
import {
  createIdeaTransitionTask,
  IDEA_TRANSITION_PREFIXES,
  titleToFilename,
} from './idea-transition-task'

describe('IDEA_TRANSITION_PREFIXES', () => {
  test('contains all three transition prefixes', () => {
    expect(IDEA_TRANSITION_PREFIXES).toEqual([
      'Refine Idea: ',
      'Create Task From Idea: ',
      'Shelve Idea: ',
    ])
  })
})

describe('titleToFilename', () => {
  test('converts titles to kebab-case filenames', () => {
    expect(titleToFilename('Refine Idea: My Great Idea')).toBe(
      'refine-idea-my-great-idea.md'
    )
  })
})

describe('createIdeaTransitionTask', () => {
  const baseInput = {
    ideaSlug: 'my-great-idea',
    openingSentence: 'Refine the great idea into actionable steps.',
    goals: ['decoupled-code'],
    blockedBy: [],
    definitionOfDone: ['Idea is refined', 'Tasks are created'],
  }

  function createFileSystem() {
    return createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'my-great-idea.md': '# My Great Idea\n\nA great idea.',
          },
          tasks: {},
          goals: {
            'decoupled-code.md': '# Decoupled Code\n\nDescription.',
          },
        },
      },
    })
  }

  test('creates a refine-idea task', async () => {
    const fileSystem = createFileSystem()
    const result = await createIdeaTransitionTask(
      fileSystem,
      '/project/.dust',
      { ...baseInput, transition: 'refine-idea' }
    )

    expect(result.filePath).toBe(
      '/project/.dust/tasks/refine-idea-my-great-idea.md'
    )
    const content = fileSystem.writtenFiles.get(result.filePath)
    expect(content).toContain('# Refine Idea: My Great Idea')
    expect(content).toContain('Refine the great idea into actionable steps.')
    expect(content).toContain('## Goals')
    expect(content).toContain('- [decoupled-code](../goals/decoupled-code.md)')
    expect(content).toContain('## Blocked By')
    expect(content).toContain('(none)')
    expect(content).toContain('## Definition of Done')
    expect(content).toContain('- [ ] Idea is refined')
    expect(content).toContain('- [ ] Tasks are created')
  })

  test('creates a create-task-from-idea task', async () => {
    const fileSystem = createFileSystem()
    const result = await createIdeaTransitionTask(
      fileSystem,
      '/project/.dust',
      { ...baseInput, transition: 'create-task-from-idea' }
    )

    expect(result.filePath).toBe(
      '/project/.dust/tasks/create-task-from-idea-my-great-idea.md'
    )
    const content = fileSystem.writtenFiles.get(result.filePath)
    expect(content).toContain('# Create Task From Idea: My Great Idea')
  })

  test('creates a shelve-idea task', async () => {
    const fileSystem = createFileSystem()
    const result = await createIdeaTransitionTask(
      fileSystem,
      '/project/.dust',
      { ...baseInput, transition: 'shelve-idea' }
    )

    expect(result.filePath).toBe(
      '/project/.dust/tasks/shelve-idea-my-great-idea.md'
    )
    const content = fileSystem.writtenFiles.get(result.filePath)
    expect(content).toContain('# Shelve Idea: My Great Idea')
  })

  test('throws when the referenced idea does not exist', async () => {
    const fileSystem = createFileSystem()
    await expect(
      createIdeaTransitionTask(fileSystem, '/project/.dust', {
        ...baseInput,
        transition: 'refine-idea',
        ideaSlug: 'nonexistent-idea',
      })
    ).rejects.toThrow(
      'Idea not found: "nonexistent-idea" (expected file at /project/.dust/ideas/nonexistent-idea.md)'
    )
  })

  test('throws when the idea file has no title', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'no-title.md': 'Just some text without a heading.',
          },
          tasks: {},
        },
      },
    })

    await expect(
      createIdeaTransitionTask(fileSystem, '/project/.dust', {
        ...baseInput,
        transition: 'refine-idea',
        ideaSlug: 'no-title',
      })
    ).rejects.toThrow(
      'Idea file has no title: /project/.dust/ideas/no-title.md'
    )
  })

  test('includes blocked-by links when provided', async () => {
    const fileSystem = createFileSystem()
    const result = await createIdeaTransitionTask(
      fileSystem,
      '/project/.dust',
      {
        ...baseInput,
        transition: 'refine-idea',
        blockedBy: ['other-task', 'another-task'],
      }
    )

    const content = fileSystem.writtenFiles.get(result.filePath)
    expect(content).toContain('- [other-task](../tasks/other-task.md)')
    expect(content).toContain('- [another-task](../tasks/another-task.md)')
    expect(content).not.toContain('(none)')
  })

  test('shows (none) for empty goals', async () => {
    const fileSystem = createFileSystem()
    const result = await createIdeaTransitionTask(
      fileSystem,
      '/project/.dust',
      {
        ...baseInput,
        transition: 'refine-idea',
        goals: [],
      }
    )

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    const goalsSection = content.split('## Goals')[1].split('## Blocked By')[0]
    expect(goalsSection).toContain('(none)')
  })
})

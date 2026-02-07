import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator } from './test/test-utilities'
import {
  createCaptureIdeaTask,
  createRefineIdeaTask,
  createShelveIdeaTask,
  createTaskFromIdea,
  IDEA_TRANSITION_PREFIXES,
  titleToFilename,
} from './workflow-tasks'

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

function createFileSystem() {
  return createFileSystemEmulator({
    project: {
      '.dust': {
        ideas: {
          'progress-broadcasting.md':
            '# Progress Broadcasting\n\nA great idea.',
        },
        tasks: {},
      },
    },
  })
}

describe('createRefineIdeaTask', () => {
  test('creates a refine-idea task with auto-filled defaults', async () => {
    const fileSystem = createFileSystem()
    const result = await createRefineIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )

    expect(result.filePath).toBe(
      '/project/.dust/tasks/refine-idea-progress-broadcasting.md'
    )
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('# Refine Idea: Progress Broadcasting')
    expect(content).toContain(
      'Research and refine this idea into a well-defined proposal. See [Progress Broadcasting](../ideas/progress-broadcasting.md).'
    )
    expect(content).toContain('## Goals\n\n(none)')
    expect(content).toContain('## Blocked By\n\n(none)')
    expect(content).toContain(
      '- [ ] Open questions are identified and resolved'
    )
    expect(content).toContain('- [ ] Idea file is updated with findings')
  })

  test('includes optional description as a new paragraph', async () => {
    const fileSystem = createFileSystem()
    const result = await createRefineIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting',
      'Focus on the WebSocket approach.'
    )

    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain(
      'See [Progress Broadcasting](../ideas/progress-broadcasting.md).\n\nFocus on the WebSocket approach.\n\n## Goals'
    )
  })
})

describe('createTaskFromIdea', () => {
  test('creates a task-from-idea task with auto-filled defaults', async () => {
    const fileSystem = createFileSystem()
    const result = await createTaskFromIdea(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )

    expect(result.filePath).toBe(
      '/project/.dust/tasks/create-task-from-idea-progress-broadcasting.md'
    )
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('# Create Task From Idea: Progress Broadcasting')
    expect(content).toContain(
      'Create a well-defined task from this idea. See [Progress Broadcasting](../ideas/progress-broadcasting.md).'
    )
    expect(content).toContain('- [ ] A new task is created in .dust/tasks/')
    expect(content).toContain(
      '- [ ] The original idea is deleted or updated to reflect remaining scope'
    )
  })
})

describe('createShelveIdeaTask', () => {
  test('creates a shelve-idea task with auto-filled defaults', async () => {
    const fileSystem = createFileSystem()
    const result = await createShelveIdeaTask(
      fileSystem,
      '/project/.dust',
      'progress-broadcasting'
    )

    expect(result.filePath).toBe(
      '/project/.dust/tasks/shelve-idea-progress-broadcasting.md'
    )
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('# Shelve Idea: Progress Broadcasting')
    expect(content).toContain(
      'Archive this idea and remove it from the active backlog. See [Progress Broadcasting](../ideas/progress-broadcasting.md).'
    )
    expect(content).toContain('- [ ] Idea file is deleted')
    expect(content).toContain(
      '- [ ] Rationale is recorded in the commit message'
    )
  })
})

describe('createCaptureIdeaTask', () => {
  test('creates a capture-idea task with description', async () => {
    const fileSystem = createFileSystem()
    const result = await createCaptureIdeaTask(
      fileSystem,
      '/project/.dust',
      'Allow agents to broadcast progress via WebSocket.'
    )

    expect(result.filePath).toBe('/project/.dust/tasks/capture-idea.md')
    const content = fileSystem.writtenFiles.get(result.filePath) as string
    expect(content).toContain('# Capture Idea')
    expect(content).toContain(
      'Research and capture a new idea in the dust backlog.'
    )
    expect(content).toContain(
      'Allow agents to broadcast progress via WebSocket.'
    )
    expect(content).toContain(
      '- [ ] A new idea file is created in .dust/ideas/'
    )
    expect(content).toContain('- [ ] Idea has a clear title and description')
  })

  test('throws if description is empty', async () => {
    const fileSystem = createFileSystem()
    await expect(
      createCaptureIdeaTask(fileSystem, '/project/.dust', '')
    ).rejects.toThrow('description is required and must not be whitespace-only')
  })

  test('throws if description is whitespace-only', async () => {
    const fileSystem = createFileSystem()
    await expect(
      createCaptureIdeaTask(fileSystem, '/project/.dust', '   ')
    ).rejects.toThrow('description is required and must not be whitespace-only')
  })
})

describe('shared error handling', () => {
  test('throws when the referenced idea does not exist', async () => {
    const fileSystem = createFileSystem()
    await expect(
      createRefineIdeaTask(fileSystem, '/project/.dust', 'nonexistent-idea')
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
      createRefineIdeaTask(fileSystem, '/project/.dust', 'no-title')
    ).rejects.toThrow(
      'Idea file has no title: /project/.dust/ideas/no-title.md'
    )
  })
})

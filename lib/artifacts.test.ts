import { describe, expect, test } from 'vitest'
import {
  buildArtifactsRepository,
  buildReadOnlyArtifactsRepository,
} from './artifacts'
import { createFileSystemEmulator } from './test/test-utilities'

function createFileSystem() {
  return createFileSystemEmulator({
    project: {
      '.dust': {
        ideas: {
          'progress-broadcasting.md':
            '# Progress Broadcasting\n\nA great idea.',
          'auto-linting.md': '# Auto Linting\n\nLint on save.',
        },
        tasks: {},
      },
    },
  })
}

describe('buildArtifactsRepository', () => {
  describe('parseIdea', () => {
    test('parses an idea by slug', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const idea = await repository.parseIdea({ slug: 'progress-broadcasting' })

      expect(idea.slug).toBe('progress-broadcasting')
      expect(idea.title).toBe('Progress Broadcasting')
      expect(idea.openingSentence).toBe('A great idea.')
    })

    test('throws when idea does not exist', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      await expect(
        repository.parseIdea({ slug: 'nonexistent' })
      ).rejects.toThrow('Idea not found: "nonexistent"')
    })
  })

  describe('listIdeas', () => {
    test('lists all idea slugs sorted alphabetically', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const ideas = await repository.listIdeas()

      expect(ideas).toEqual(['auto-linting', 'progress-broadcasting'])
    })

    test('returns empty array when ideas directory does not exist', async () => {
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': { tasks: {} } },
      })
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const ideas = await repository.listIdeas()

      expect(ideas).toEqual([])
    })
  })

  describe('createRefineIdeaTask', () => {
    test('creates a refine-idea task', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const result = await repository.createRefineIdeaTask({
        ideaSlug: 'progress-broadcasting',
      })

      expect(result.filePath).toBe(
        '/project/.dust/tasks/refine-idea-progress-broadcasting.md'
      )
      const content = fileSystem.writtenFiles.get(result.filePath) as string
      expect(content).toContain('# Refine Idea: Progress Broadcasting')
    })

    test('includes optional description', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const result = await repository.createRefineIdeaTask({
        ideaSlug: 'progress-broadcasting',
        description: 'Focus on WebSocket approach.',
      })

      const content = fileSystem.writtenFiles.get(result.filePath) as string
      expect(content).toContain('Focus on WebSocket approach.')
    })
  })

  describe('createDecomposeIdeaTask', () => {
    test('creates a decompose-idea task', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const result = await repository.createDecomposeIdeaTask({
        ideaSlug: 'progress-broadcasting',
      })

      expect(result.filePath).toBe(
        '/project/.dust/tasks/decompose-idea-progress-broadcasting.md'
      )
      const content = fileSystem.writtenFiles.get(result.filePath) as string
      expect(content).toContain('# Decompose Idea: Progress Broadcasting')
    })

    test('includes open question responses', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const result = await repository.createDecomposeIdeaTask({
        ideaSlug: 'progress-broadcasting',
        openQuestionResponses: [
          { question: 'Which protocol?', chosenOption: 'WebSockets' },
        ],
      })

      const content = fileSystem.writtenFiles.get(result.filePath) as string
      expect(content).toContain('## Resolved Questions')
      expect(content).toContain('**Decision:** WebSockets')
    })
  })

  describe('createShelveIdeaTask', () => {
    test('creates a shelve-idea task', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const result = await repository.createShelveIdeaTask({
        ideaSlug: 'progress-broadcasting',
      })

      expect(result.filePath).toBe(
        '/project/.dust/tasks/shelve-idea-progress-broadcasting.md'
      )
      const content = fileSystem.writtenFiles.get(result.filePath) as string
      expect(content).toContain('# Shelve Idea: Progress Broadcasting')
    })
  })

  describe('createCaptureIdeaTask', () => {
    test('creates a capture-idea task', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const result = await repository.createCaptureIdeaTask({
        title: 'New Feature',
        description: 'A new feature to implement.',
      })

      expect(result.filePath).toBe(
        '/project/.dust/tasks/add-idea-new-feature.md'
      )
      const content = fileSystem.writtenFiles.get(result.filePath) as string
      expect(content).toContain('# Add Idea: New Feature')
    })

    test('creates a build-idea task when buildItNow is true', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const result = await repository.createCaptureIdeaTask({
        title: 'New Feature',
        description: 'A new feature to implement.',
        buildItNow: true,
      })

      expect(result.filePath).toBe(
        '/project/.dust/tasks/build-idea-new-feature.md'
      )
      const content = fileSystem.writtenFiles.get(result.filePath) as string
      expect(content).toContain('# Build Idea: New Feature')
    })
  })

  describe('findWorkflowTaskForIdea', () => {
    test('returns null when no workflow task exists', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const result = await repository.findWorkflowTaskForIdea({
        ideaSlug: 'progress-broadcasting',
      })

      expect(result).toBeNull()
    })

    test('finds an existing workflow task', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      await repository.createRefineIdeaTask({
        ideaSlug: 'progress-broadcasting',
      })

      const result = await repository.findWorkflowTaskForIdea({
        ideaSlug: 'progress-broadcasting',
      })

      expect(result).toEqual({
        type: 'refine',
        ideaSlug: 'progress-broadcasting',
        taskSlug: 'refine-idea-progress-broadcasting',
      })
    })
  })

  describe('parseCaptureIdeaTask', () => {
    test('returns null when task does not exist', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const result = await repository.parseCaptureIdeaTask({
        taskSlug: 'nonexistent',
      })

      expect(result).toBeNull()
    })

    test('parses an existing capture-idea task', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      await repository.createCaptureIdeaTask({
        title: 'New Feature',
        description: 'A new feature to implement.',
      })

      const result = await repository.parseCaptureIdeaTask({
        taskSlug: 'add-idea-new-feature',
      })

      expect(result).toEqual({
        ideaTitle: 'New Feature',
        ideaDescription: 'A new feature to implement.',
        buildItNow: false,
      })
    })
  })
})

describe('buildReadOnlyArtifactsRepository', () => {
  test('provides read-only methods', async () => {
    const fileSystem = createFileSystem()
    const repository = buildReadOnlyArtifactsRepository(
      fileSystem,
      '/project/.dust'
    )

    const idea = await repository.parseIdea({ slug: 'progress-broadcasting' })
    expect(idea.title).toBe('Progress Broadcasting')

    const ideas = await repository.listIdeas()
    expect(ideas).toContain('progress-broadcasting')

    const workflowTask = await repository.findWorkflowTaskForIdea({
      ideaSlug: 'progress-broadcasting',
    })
    expect(workflowTask).toBeNull()

    const captureTask = await repository.parseCaptureIdeaTask({
      taskSlug: 'nonexistent',
    })
    expect(captureTask).toBeNull()
  })

  test('returns empty array from listIdeas when ideas directory does not exist', async () => {
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { tasks: {} } },
    })
    const repository = buildReadOnlyArtifactsRepository(
      fileSystem,
      '/project/.dust'
    )

    const ideas = await repository.listIdeas()

    expect(ideas).toEqual([])
  })
})

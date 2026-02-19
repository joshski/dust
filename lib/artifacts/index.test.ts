import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator } from '../test/test-utilities'
import {
  buildArtifactsRepository,
  buildReadOnlyArtifactsRepository,
} from './index'

function createFileSystem() {
  return createFileSystemEmulator({
    project: {
      '.dust': {
        ideas: {
          'progress-broadcasting.md':
            '# Progress Broadcasting\n\nA great idea.',
          'auto-linting.md': '# Auto Linting\n\nLint on save.',
        },
        principles: {
          'small-units.md': `# Small Units

Keep things small and focused.

## Parent Principle

- [Agent Autonomy](agent-autonomy.md)

## Sub-Principles

- [Single Responsibility](single-responsibility.md)
- [Focused Functions](focused-functions.md)
`,
          'agent-autonomy.md': `# Agent Autonomy

Agents should work autonomously.

## Parent Principle

(none)

## Sub-Principles

- [Small Units](small-units.md)
- [External Link](https://example.com)

# Appendix

This extra h1 tests the h1 break logic.
`,
        },
        facts: {
          'bun-runtime.md': '# Bun Runtime\n\nThis project uses Bun.',
          'typescript.md': '# TypeScript\n\nTypeScript is the language.',
        },
        tasks: {
          'add-feature.md': `# Add Feature

Implement a new feature.

## Principles

- [Small Units](../principles/small-units.md) - Keep it focused
- [External Reference](https://example.com/docs)

# Interlude

This h1 after Principles tests the h1 break in extractLinksFromSection.

## Blocked By

- [Setup CI](setup-ci.md)
- [Add Tests](add-tests.md)

## Definition of Done

- [ ] Feature is implemented
- [ ] Tests are written
- [x] Documentation is updated

# Notes

This section tests the h1 break logic.
`,
        },
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

  describe('parsePrinciple', () => {
    test('parses a principle by slug', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const principle = await repository.parsePrinciple({ slug: 'small-units' })

      expect(principle.slug).toBe('small-units')
      expect(principle.title).toBe('Small Units')
      expect(principle.parentPrinciple).toBe('agent-autonomy')
      expect(principle.subPrinciples).toEqual([
        'single-responsibility',
        'focused-functions',
      ])
    })

    test('throws when principle does not exist', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      await expect(
        repository.parsePrinciple({ slug: 'nonexistent' })
      ).rejects.toThrow('Principle not found: "nonexistent"')
    })

    test('parses principle with no parent', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const principle = await repository.parsePrinciple({
        slug: 'agent-autonomy',
      })

      expect(principle.parentPrinciple).toBeNull()
      expect(principle.subPrinciples).toEqual(['small-units'])
    })

    test('throws when principle has no title', async () => {
      const fileSystem = createFileSystemEmulator({
        project: {
          '.dust': {
            principles: {
              'no-title.md': 'This principle has no heading.',
            },
          },
        },
      })
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      await expect(
        repository.parsePrinciple({ slug: 'no-title' })
      ).rejects.toThrow('Principle file has no title')
    })
  })

  describe('listPrinciples', () => {
    test('lists all principle slugs sorted alphabetically', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const principles = await repository.listPrinciples()

      expect(principles).toEqual(['agent-autonomy', 'small-units'])
    })

    test('returns empty array when principles directory does not exist', async () => {
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': { tasks: {} } },
      })
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const principles = await repository.listPrinciples()

      expect(principles).toEqual([])
    })
  })

  describe('parseFact', () => {
    test('parses a fact by slug', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const fact = await repository.parseFact({ slug: 'bun-runtime' })

      expect(fact.slug).toBe('bun-runtime')
      expect(fact.title).toBe('Bun Runtime')
      expect(fact.content).toContain('This project uses Bun.')
    })

    test('throws when fact does not exist', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      await expect(
        repository.parseFact({ slug: 'nonexistent' })
      ).rejects.toThrow('Fact not found: "nonexistent"')
    })

    test('throws when fact has no title', async () => {
      const fileSystem = createFileSystemEmulator({
        project: {
          '.dust': {
            facts: {
              'no-title.md': 'This fact has no heading.',
            },
          },
        },
      })
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      await expect(repository.parseFact({ slug: 'no-title' })).rejects.toThrow(
        'Fact file has no title'
      )
    })
  })

  describe('listFacts', () => {
    test('lists all fact slugs sorted alphabetically', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const facts = await repository.listFacts()

      expect(facts).toEqual(['bun-runtime', 'typescript'])
    })

    test('returns empty array when facts directory does not exist', async () => {
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': { tasks: {} } },
      })
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const facts = await repository.listFacts()

      expect(facts).toEqual([])
    })
  })

  describe('parseTask', () => {
    test('parses a task by slug', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const task = await repository.parseTask({ slug: 'add-feature' })

      expect(task.slug).toBe('add-feature')
      expect(task.title).toBe('Add Feature')
      expect(task.principles).toEqual(['small-units'])
      expect(task.blockedBy).toEqual(['setup-ci', 'add-tests'])
      expect(task.definitionOfDone).toEqual([
        'Feature is implemented',
        'Tests are written',
        'Documentation is updated',
      ])
    })

    test('throws when task does not exist', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      await expect(
        repository.parseTask({ slug: 'nonexistent' })
      ).rejects.toThrow('Task not found: "nonexistent"')
    })

    test('throws when task has no title', async () => {
      const fileSystem = createFileSystemEmulator({
        project: {
          '.dust': {
            tasks: {
              'no-title.md': 'This task has no heading.',
            },
          },
        },
      })
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      await expect(repository.parseTask({ slug: 'no-title' })).rejects.toThrow(
        'Task file has no title'
      )
    })
  })

  describe('listTasks', () => {
    test('lists all task slugs sorted alphabetically', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const tasks = await repository.listTasks()

      expect(tasks).toEqual(['add-feature'])
    })

    test('returns empty array when tasks directory does not exist', async () => {
      const fileSystem = createFileSystemEmulator({
        project: { '.dust': {} },
      })
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const tasks = await repository.listTasks()

      expect(tasks).toEqual([])
    })
  })
})

describe('buildReadOnlyArtifactsRepository', () => {
  test('provides read-only methods for ideas', async () => {
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

  test('provides read-only methods for principles', async () => {
    const fileSystem = createFileSystem()
    const repository = buildReadOnlyArtifactsRepository(
      fileSystem,
      '/project/.dust'
    )

    const principle = await repository.parsePrinciple({ slug: 'small-units' })
    expect(principle.title).toBe('Small Units')

    const principles = await repository.listPrinciples()
    expect(principles).toContain('small-units')
  })

  test('provides read-only methods for facts', async () => {
    const fileSystem = createFileSystem()
    const repository = buildReadOnlyArtifactsRepository(
      fileSystem,
      '/project/.dust'
    )

    const fact = await repository.parseFact({ slug: 'bun-runtime' })
    expect(fact.title).toBe('Bun Runtime')

    const facts = await repository.listFacts()
    expect(facts).toContain('bun-runtime')
  })

  test('provides read-only methods for tasks', async () => {
    const fileSystem = createFileSystem()
    const repository = buildReadOnlyArtifactsRepository(
      fileSystem,
      '/project/.dust'
    )

    const task = await repository.parseTask({ slug: 'add-feature' })
    expect(task.title).toBe('Add Feature')

    const tasks = await repository.listTasks()
    expect(tasks).toContain('add-feature')
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

  test('returns empty array from listPrinciples when principles directory does not exist', async () => {
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { tasks: {} } },
    })
    const repository = buildReadOnlyArtifactsRepository(
      fileSystem,
      '/project/.dust'
    )

    const principles = await repository.listPrinciples()

    expect(principles).toEqual([])
  })

  test('returns empty array from listFacts when facts directory does not exist', async () => {
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { tasks: {} } },
    })
    const repository = buildReadOnlyArtifactsRepository(
      fileSystem,
      '/project/.dust'
    )

    const facts = await repository.listFacts()

    expect(facts).toEqual([])
  })

  test('returns empty array from listTasks when tasks directory does not exist', async () => {
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': {} },
    })
    const repository = buildReadOnlyArtifactsRepository(
      fileSystem,
      '/project/.dust'
    )

    const tasks = await repository.listTasks()

    expect(tasks).toEqual([])
  })
})

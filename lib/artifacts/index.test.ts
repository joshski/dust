import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator } from '../test-support/test-utilities'
import {
  buildArtifactsRepository,
  buildReadOnlyArtifactsRepository,
  DUST_PATH_PREFIX,
  parseArtifactPath,
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

- Feature is implemented
- Tests are written
- Documentation is updated

# Notes

This section tests the h1 break logic.
`,
        },
      },
    },
  })
}

describe('DUST_PATH_PREFIX', () => {
  test('is .dust/', () => {
    expect(DUST_PATH_PREFIX).toBe('.dust/')
  })
})

describe('parseArtifactPath', () => {
  test('parses a task path', () => {
    expect(parseArtifactPath('.dust/tasks/my-task.md')).toEqual({
      type: 'tasks',
      slug: 'my-task',
    })
  })

  test('parses an idea path', () => {
    expect(parseArtifactPath('.dust/ideas/cool-idea.md')).toEqual({
      type: 'ideas',
      slug: 'cool-idea',
    })
  })

  test('parses a principle path', () => {
    expect(parseArtifactPath('.dust/principles/small-units.md')).toEqual({
      type: 'principles',
      slug: 'small-units',
    })
  })

  test('parses a fact path', () => {
    expect(parseArtifactPath('.dust/facts/bun-runtime.md')).toEqual({
      type: 'facts',
      slug: 'bun-runtime',
    })
  })

  test('returns null for non-dust paths', () => {
    expect(parseArtifactPath('other/path.md')).toBeNull()
  })

  test('returns null for non-md files', () => {
    expect(parseArtifactPath('.dust/tasks/my-task.txt')).toBeNull()
  })

  test('returns null for unknown artifact types', () => {
    expect(parseArtifactPath('.dust/unknown/thing.md')).toBeNull()
  })

  test('returns null for files directly in .dust/', () => {
    expect(parseArtifactPath('.dust/readme.md')).toBeNull()
  })
})

describe('buildArtifactsRepository', () => {
  describe('artifactPath', () => {
    test('returns the path for an artifact', () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      expect(repository.artifactPath('ideas', 'my-idea')).toBe(
        '/project/.dust/ideas/my-idea.md'
      )
      expect(repository.artifactPath('tasks', 'my-task')).toBe(
        '/project/.dust/tasks/my-task.md'
      )
    })
  })

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

    test('includes open question responses', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const result = await repository.createRefineIdeaTask({
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

  describe('createExpediteIdeaTask', () => {
    test('creates an expedite-idea task', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const result = await repository.createExpediteIdeaTask({
        ideaSlug: 'progress-broadcasting',
      })

      expect(result.filePath).toBe(
        '/project/.dust/tasks/expedite-idea-progress-broadcasting.md'
      )
      const content = fileSystem.writtenFiles.get(result.filePath) as string
      expect(content).toContain('# Expedite Idea: Progress Broadcasting')
    })
  })

  describe('createIdeaTask', () => {
    test('creates a capture-idea task', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const result = await repository.createIdeaTask({
        title: 'New Feature',
        description: 'A new feature to implement.',
      })

      expect(result.filePath).toBe(
        '/project/.dust/tasks/add-idea-new-feature.md'
      )
      const content = fileSystem.writtenFiles.get(result.filePath) as string
      expect(content).toContain('# Add Idea: New Feature')
    })

    test('creates an expedite-idea task when expedite is true', async () => {
      const fileSystem = createFileSystem()
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const result = await repository.createIdeaTask({
        title: 'New Feature',
        description: 'A new feature to implement.',
        expedite: true,
      })

      expect(result.filePath).toBe(
        '/project/.dust/tasks/expedite-idea-new-feature.md'
      )
      const content = fileSystem.writtenFiles.get(result.filePath) as string
      expect(content).toContain('# Expedite Idea: New Feature')
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
        resolvedQuestions: [],
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

      await repository.createIdeaTask({
        title: 'New Feature',
        description: 'A new feature to implement.',
      })

      const result = await repository.parseCaptureIdeaTask({
        taskSlug: 'add-idea-new-feature',
      })

      expect(result).toEqual({
        ideaTitle: 'New Feature',
        ideaDescription: 'A new feature to implement.',
        expedite: false,
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

    test('uses slug as fallback title when principle has no title', async () => {
      const fileSystem = createFileSystemEmulator({
        project: {
          '.dust': {
            principles: {
              'no-title.md': `This principle has no heading.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
            },
          },
        },
      })
      const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

      const principle = await repository.parsePrinciple({ slug: 'no-title' })
      expect(principle.title).toBe('no-title')
      expect(principle.slug).toBe('no-title')
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
  test('artifactPath returns the path for an artifact', () => {
    const fileSystem = createFileSystem()
    const repository = buildReadOnlyArtifactsRepository(
      fileSystem,
      '/project/.dust'
    )

    expect(repository.artifactPath('ideas', 'my-idea')).toBe(
      '/project/.dust/ideas/my-idea.md'
    )
  })

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

describe('buildTaskGraph', () => {
  test('returns empty graph when no tasks exist', async () => {
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': {} },
    })
    const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

    const graph = await repository.buildTaskGraph()

    expect(graph.nodes).toEqual([])
    expect(graph.edges).toEqual([])
  })

  test('builds graph with task nodes and blocking edges', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'setup-ci.md': `# Setup CI

Configure continuous integration.

## Principles

(none)

## Blocked By

(none)

## Definition of Done

- CI is configured
`,
            'add-tests.md': `# Add Tests

Add unit tests.

## Principles

(none)

## Blocked By

- [Setup CI](setup-ci.md)

## Definition of Done

- Tests are added
`,
            'deploy.md': `# Deploy

Deploy the application.

## Principles

(none)

## Blocked By

- [Setup CI](setup-ci.md)
- [Add Tests](add-tests.md)

## Definition of Done

- Application is deployed
`,
          },
        },
      },
    })
    const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

    const graph = await repository.buildTaskGraph()

    expect(graph.nodes).toHaveLength(3)
    expect(graph.nodes.map(n => n.task.slug).toSorted()).toEqual([
      'add-tests',
      'deploy',
      'setup-ci',
    ])
    expect(graph.nodes.every(n => n.workflowType === null)).toBe(true)

    expect(graph.edges).toHaveLength(3)
    expect(graph.edges).toContainEqual({ from: 'setup-ci', to: 'add-tests' })
    expect(graph.edges).toContainEqual({ from: 'setup-ci', to: 'deploy' })
    expect(graph.edges).toContainEqual({ from: 'add-tests', to: 'deploy' })
  })

  test('includes workflow type for workflow tasks', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'new-feature.md': '# New Feature\n\nA new feature to implement.',
          },
          tasks: {
            'refine-idea-new-feature.md': `# Refine Idea: New Feature

Refine this idea.

## Refines Idea

- [New Feature](../ideas/new-feature.md)

## Blocked By

(none)

## Definition of Done

- Idea is refined
`,
            'regular-task.md': `# Regular Task

A regular non-workflow task.

## Principles

(none)

## Blocked By

(none)

## Definition of Done

- Task is done
`,
          },
        },
      },
    })
    const repository = buildArtifactsRepository(fileSystem, '/project/.dust')

    const graph = await repository.buildTaskGraph()

    expect(graph.nodes).toHaveLength(2)

    const refineNode = graph.nodes.find(
      n => n.task.slug === 'refine-idea-new-feature'
    )
    expect(refineNode?.workflowType).toBe('refine')

    const regularNode = graph.nodes.find(n => n.task.slug === 'regular-task')
    expect(regularNode?.workflowType).toBeNull()
  })

  test('read-only repository builds task graph with edges and workflow types', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'my-idea.md': '# My Idea\n\nAn idea.',
          },
          tasks: {
            'first-task.md': `# First Task

Do something first.

## Principles

(none)

## Blocked By

(none)

## Definition of Done

- Done
`,
            'second-task.md': `# Second Task

Do something second.

## Principles

(none)

## Blocked By

- [First Task](first-task.md)

## Definition of Done

- Done
`,
            'decompose-idea-my-idea.md': `# Decompose Idea: My Idea

Decompose this idea.

## Decomposes Idea

- [My Idea](../ideas/my-idea.md)

## Blocked By

(none)

## Definition of Done

- Tasks created
`,
          },
        },
      },
    })
    const repository = buildReadOnlyArtifactsRepository(
      fileSystem,
      '/project/.dust'
    )

    const graph = await repository.buildTaskGraph()

    expect(graph.nodes).toHaveLength(3)

    const decomposeNode = graph.nodes.find(
      n => n.task.slug === 'decompose-idea-my-idea'
    )
    expect(decomposeNode?.workflowType).toBe('decompose')

    expect(graph.edges).toContainEqual({
      from: 'first-task',
      to: 'second-task',
    })
  })
})

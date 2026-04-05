import { describe, expect, test } from 'vitest'
import { buildReadOnlyArtifactsRepository } from './index'
import type { ReadableFileSystem } from '../filesystem/types'

/**
 * Creates a mock filesystem for testing with principle files.
 */
function createMockFileSystem(
  principles: Array<{
    slug: string
    title: string
    parentPrinciple?: string | null
  }>
): ReadableFileSystem {
  const files = new Map<string, string>()

  for (const principle of principles) {
    const content = [
      `# ${principle.title}`,
      '',
      'Description of the principle.',
      '',
    ]

    if (principle.parentPrinciple) {
      content.push('## Parent Principle', '')
      content.push(`- [Parent](${principle.parentPrinciple}.md)`, '')
    }

    files.set(`.dust/principles/${principle.slug}.md`, content.join('\n'))
  }

  return {
    exists(path: string): boolean {
      return path === '.dust/principles' || files.has(path)
    },
    isDirectory(path: string): boolean {
      return path === '.dust/principles'
    },
    async readFile(path: string): Promise<string> {
      const content = files.get(path)
      if (!content) {
        throw new Error(`File not found: ${path}`)
      }
      return content
    },
    async readdir(path: string): Promise<string[]> {
      if (path === '.dust/principles') {
        return Array.from(files.keys())
          .filter(p => p.startsWith('.dust/principles/'))
          .map(p => p.replace('.dust/principles/', ''))
      }
      return []
    },
  }
}

describe('getRepositoryPrincipleHierarchy', () => {
  test('returns empty array when no principles exist', async () => {
    const fileSystem: ReadableFileSystem = {
      exists: () => false,
      isDirectory: () => false,
      async readFile() {
        throw new Error('No files')
      },
      async readdir() {
        return []
      },
    }

    const repo = buildReadOnlyArtifactsRepository(fileSystem, '.dust')
    const result = await repo.getRepositoryPrincipleHierarchy()

    expect(result).toEqual([])
  })

  test('returns empty array when .dust/principles/ directory is missing', async () => {
    const fileSystem: ReadableFileSystem = {
      exists: (path: string) => path !== '.dust/principles',
      isDirectory: () => false,
      async readFile() {
        throw new Error('No files')
      },
      async readdir() {
        return []
      },
    }

    const repo = buildReadOnlyArtifactsRepository(fileSystem, '.dust')
    const result = await repo.getRepositoryPrincipleHierarchy()

    expect(result).toEqual([])
  })

  test('returns single root node for principle without parent', async () => {
    const fileSystem = createMockFileSystem([
      { slug: 'root-principle', title: 'Root Principle' },
    ])

    const repo = buildReadOnlyArtifactsRepository(fileSystem, '.dust')
    const result = await repo.getRepositoryPrincipleHierarchy()

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      slug: 'root-principle',
      title: 'Root Principle',
      children: [],
    })
  })

  test('returns multiple root nodes', async () => {
    const fileSystem = createMockFileSystem([
      { slug: 'root-one', title: 'Root One' },
      { slug: 'root-two', title: 'Root Two' },
    ])

    const repo = buildReadOnlyArtifactsRepository(fileSystem, '.dust')
    const result = await repo.getRepositoryPrincipleHierarchy()

    expect(result).toHaveLength(2)
    expect(result[0].slug).toBe('root-one')
    expect(result[1].slug).toBe('root-two')
  })

  test('builds parent-child hierarchy', async () => {
    const fileSystem = createMockFileSystem([
      { slug: 'parent', title: 'Parent Principle' },
      { slug: 'child-a', title: 'Child A', parentPrinciple: 'parent' },
      { slug: 'child-b', title: 'Child B', parentPrinciple: 'parent' },
    ])

    const repo = buildReadOnlyArtifactsRepository(fileSystem, '.dust')
    const result = await repo.getRepositoryPrincipleHierarchy()

    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('parent')
    expect(result[0].children).toHaveLength(2)
    expect(result[0].children[0].slug).toBe('child-a')
    expect(result[0].children[1].slug).toBe('child-b')
  })

  test('promotes children to roots when parent is missing', async () => {
    const fileSystem = createMockFileSystem([
      {
        slug: 'child',
        title: 'Child Principle',
        parentPrinciple: 'missing-parent',
      },
    ])

    const repo = buildReadOnlyArtifactsRepository(fileSystem, '.dust')
    const result = await repo.getRepositoryPrincipleHierarchy()

    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('child')
    expect(result[0].children).toHaveLength(0)
  })

  test('sorts root nodes alphabetically by title', async () => {
    const fileSystem = createMockFileSystem([
      { slug: 'zebra-principle', title: 'Zebra Principle' },
      { slug: 'apple-principle', title: 'Apple Principle' },
      { slug: 'mango-principle', title: 'Mango Principle' },
    ])

    const repo = buildReadOnlyArtifactsRepository(fileSystem, '.dust')
    const result = await repo.getRepositoryPrincipleHierarchy()

    expect(result[0].slug).toBe('apple-principle')
    expect(result[1].slug).toBe('mango-principle')
    expect(result[2].slug).toBe('zebra-principle')
  })

  test('sorts children alphabetically by title', async () => {
    const fileSystem = createMockFileSystem([
      { slug: 'parent', title: 'Parent' },
      { slug: 'child-z', title: 'Zebra Child', parentPrinciple: 'parent' },
      { slug: 'child-a', title: 'Apple Child', parentPrinciple: 'parent' },
      { slug: 'child-m', title: 'Mango Child', parentPrinciple: 'parent' },
    ])

    const repo = buildReadOnlyArtifactsRepository(fileSystem, '.dust')
    const result = await repo.getRepositoryPrincipleHierarchy()

    expect(result[0].children[0].slug).toBe('child-a')
    expect(result[0].children[1].slug).toBe('child-m')
    expect(result[0].children[2].slug).toBe('child-z')
  })

  test('handles deep hierarchy with 4+ levels', async () => {
    const fileSystem = createMockFileSystem([
      { slug: 'level-1', title: 'Level 1' },
      { slug: 'level-2', title: 'Level 2', parentPrinciple: 'level-1' },
      { slug: 'level-3', title: 'Level 3', parentPrinciple: 'level-2' },
      { slug: 'level-4', title: 'Level 4', parentPrinciple: 'level-3' },
      { slug: 'level-5', title: 'Level 5', parentPrinciple: 'level-4' },
    ])

    const repo = buildReadOnlyArtifactsRepository(fileSystem, '.dust')
    const result = await repo.getRepositoryPrincipleHierarchy()

    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('level-1')
    expect(result[0].children[0].slug).toBe('level-2')
    expect(result[0].children[0].children[0].slug).toBe('level-3')
    expect(result[0].children[0].children[0].children[0].slug).toBe('level-4')
    expect(result[0].children[0].children[0].children[0].children[0].slug).toBe(
      'level-5'
    )
  })

  test('handles complex tree with multiple branches', async () => {
    const fileSystem = createMockFileSystem([
      { slug: 'root', title: 'Root' },
      { slug: 'branch-a', title: 'Branch A', parentPrinciple: 'root' },
      { slug: 'branch-b', title: 'Branch B', parentPrinciple: 'root' },
      { slug: 'leaf-a1', title: 'Leaf A1', parentPrinciple: 'branch-a' },
      { slug: 'leaf-a2', title: 'Leaf A2', parentPrinciple: 'branch-a' },
      { slug: 'leaf-b1', title: 'Leaf B1', parentPrinciple: 'branch-b' },
    ])

    const repo = buildReadOnlyArtifactsRepository(fileSystem, '.dust')
    const result = await repo.getRepositoryPrincipleHierarchy()

    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('root')
    expect(result[0].children).toHaveLength(2)
    expect(result[0].children[0].slug).toBe('branch-a')
    expect(result[0].children[0].children).toHaveLength(2)
    expect(result[0].children[1].slug).toBe('branch-b')
    expect(result[0].children[1].children).toHaveLength(1)
  })

  test('sorts deeply nested children alphabetically', async () => {
    const fileSystem = createMockFileSystem([
      { slug: 'root', title: 'Root' },
      { slug: 'child-z', title: 'Z Child', parentPrinciple: 'root' },
      { slug: 'child-a', title: 'A Child', parentPrinciple: 'root' },
      {
        slug: 'grandchild-z',
        title: 'Z Grandchild',
        parentPrinciple: 'child-a',
      },
      {
        slug: 'grandchild-a',
        title: 'A Grandchild',
        parentPrinciple: 'child-a',
      },
    ])

    const repo = buildReadOnlyArtifactsRepository(fileSystem, '.dust')
    const result = await repo.getRepositoryPrincipleHierarchy()

    expect(result[0].children[0].slug).toBe('child-a')
    expect(result[0].children[1].slug).toBe('child-z')
    expect(result[0].children[0].children[0].slug).toBe('grandchild-a')
    expect(result[0].children[0].children[1].slug).toBe('grandchild-z')
  })

  test('handles principles with null parent explicitly set', async () => {
    const fileSystem = createMockFileSystem([
      { slug: 'explicit-root', title: 'Explicit Root', parentPrinciple: null },
    ])

    const repo = buildReadOnlyArtifactsRepository(fileSystem, '.dust')
    const result = await repo.getRepositoryPrincipleHierarchy()

    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('explicit-root')
  })

  test('handles mixed roots and hierarchies', async () => {
    const fileSystem = createMockFileSystem([
      { slug: 'standalone', title: 'Standalone' },
      { slug: 'parent', title: 'Parent' },
      { slug: 'child', title: 'Child', parentPrinciple: 'parent' },
      { slug: 'another-standalone', title: 'Another Standalone' },
    ])

    const repo = buildReadOnlyArtifactsRepository(fileSystem, '.dust')
    const result = await repo.getRepositoryPrincipleHierarchy()

    expect(result).toHaveLength(3)
    // Should be sorted: Another Standalone, Parent, Standalone
    expect(result[0].slug).toBe('another-standalone')
    expect(result[1].slug).toBe('parent')
    expect(result[1].children).toHaveLength(1)
    expect(result[2].slug).toBe('standalone')
  })
})

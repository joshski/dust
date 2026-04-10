import { describe, expect, it } from 'vitest'
import { computeExecutionOrder } from './execution-order'

describe('computeExecutionOrder', () => {
  it('returns empty array for empty input', () => {
    expect(computeExecutionOrder([])).toEqual([])
  })

  it('orders tasks by lastCommittedAt ascending', () => {
    const nodes = [
      {
        slug: 'task-c',
        blockedBy: [],
        lastCommittedAt: '2024-03-01T00:00:00Z',
      },
      {
        slug: 'task-a',
        blockedBy: [],
        lastCommittedAt: '2024-01-01T00:00:00Z',
      },
      {
        slug: 'task-b',
        blockedBy: [],
        lastCommittedAt: '2024-02-01T00:00:00Z',
      },
    ]

    const result = computeExecutionOrder(nodes)

    expect(result.map(r => r.node.slug)).toEqual(['task-a', 'task-b', 'task-c'])
    expect(result.map(r => r.executionOrder)).toEqual([1, 2, 3])
  })

  it('places tasks with null lastCommittedAt last', () => {
    const nodes = [
      { slug: 'task-null', blockedBy: [], lastCommittedAt: null },
      {
        slug: 'task-early',
        blockedBy: [],
        lastCommittedAt: '2024-01-01T00:00:00Z',
      },
      {
        slug: 'task-late',
        blockedBy: [],
        lastCommittedAt: '2024-12-01T00:00:00Z',
      },
    ]

    const result = computeExecutionOrder(nodes)

    expect(result.map(r => r.node.slug)).toEqual([
      'task-early',
      'task-late',
      'task-null',
    ])
  })

  it('respects blockedBy dependencies', () => {
    const nodes = [
      {
        slug: 'task-a',
        blockedBy: [],
        lastCommittedAt: '2024-03-01T00:00:00Z',
      },
      {
        slug: 'task-b',
        blockedBy: ['task-a'],
        lastCommittedAt: '2024-01-01T00:00:00Z',
      },
    ]

    const result = computeExecutionOrder(nodes)

    // task-b has earlier timestamp but is blocked by task-a
    expect(result.map(r => r.node.slug)).toEqual(['task-a', 'task-b'])
  })

  it('handles chain of dependencies', () => {
    const nodes = [
      {
        slug: 'task-c',
        blockedBy: ['task-b'],
        lastCommittedAt: '2024-01-01T00:00:00Z',
      },
      {
        slug: 'task-b',
        blockedBy: ['task-a'],
        lastCommittedAt: '2024-02-01T00:00:00Z',
      },
      {
        slug: 'task-a',
        blockedBy: [],
        lastCommittedAt: '2024-03-01T00:00:00Z',
      },
    ]

    const result = computeExecutionOrder(nodes)

    // Must execute a -> b -> c despite c having earliest timestamp
    expect(result.map(r => r.node.slug)).toEqual(['task-a', 'task-b', 'task-c'])
  })

  it('ignores blockers not in the task set', () => {
    const nodes = [
      {
        slug: 'task-a',
        blockedBy: ['nonexistent'],
        lastCommittedAt: '2024-01-01T00:00:00Z',
      },
      {
        slug: 'task-b',
        blockedBy: [],
        lastCommittedAt: '2024-02-01T00:00:00Z',
      },
    ]

    const result = computeExecutionOrder(nodes)

    expect(result.map(r => r.node.slug)).toEqual(['task-a', 'task-b'])
  })

  it('maintains order for multiple tasks with null timestamps', () => {
    const nodes = [
      { slug: 'task-b', blockedBy: [], lastCommittedAt: null },
      { slug: 'task-a', blockedBy: [], lastCommittedAt: null },
      {
        slug: 'task-early',
        blockedBy: [],
        lastCommittedAt: '2024-01-01T00:00:00Z',
      },
    ]

    const result = computeExecutionOrder(nodes)

    expect(result[0]?.node.slug).toBe('task-early')
    expect(result.map(r => r.node.slug)).toContain('task-a')
    expect(result.map(r => r.node.slug)).toContain('task-b')
  })

  it('handles cycles gracefully', () => {
    const nodes = [
      {
        slug: 'task-a',
        blockedBy: ['task-b'],
        lastCommittedAt: '2024-01-01T00:00:00Z',
      },
      {
        slug: 'task-b',
        blockedBy: ['task-a'],
        lastCommittedAt: '2024-02-01T00:00:00Z',
      },
    ]

    const result = computeExecutionOrder(nodes)

    expect(result).toHaveLength(2)
    expect(result.map(r => r.node.slug)).toEqual(['task-a', 'task-b'])
  })

  it('handles cycle with mix of unblocked and cycled tasks', () => {
    const nodes = [
      {
        slug: 'task-free',
        blockedBy: [],
        lastCommittedAt: '2024-01-01T00:00:00Z',
      },
      {
        slug: 'task-a',
        blockedBy: ['task-b'],
        lastCommittedAt: '2024-02-01T00:00:00Z',
      },
      {
        slug: 'task-b',
        blockedBy: ['task-a'],
        lastCommittedAt: '2024-03-01T00:00:00Z',
      },
    ]

    const result = computeExecutionOrder(nodes)

    expect(result).toHaveLength(3)
    expect(result[0]?.node.slug).toBe('task-free')
    expect(result.map(r => r.node.slug)).toEqual([
      'task-free',
      'task-a',
      'task-b',
    ])
  })

  it('picks earliest unblocked task when multiple are available', () => {
    const nodes = [
      {
        slug: 'task-late',
        blockedBy: [],
        lastCommittedAt: '2024-12-01T00:00:00Z',
      },
      {
        slug: 'task-early',
        blockedBy: [],
        lastCommittedAt: '2024-01-01T00:00:00Z',
      },
      {
        slug: 'task-mid',
        blockedBy: [],
        lastCommittedAt: '2024-06-01T00:00:00Z',
      },
    ]

    const result = computeExecutionOrder(nodes)

    expect(result[0]?.node.slug).toBe('task-early')
  })

  it('assigns sequential 1-based execution orders', () => {
    const nodes = [
      {
        slug: 'task-1',
        blockedBy: [],
        lastCommittedAt: '2024-01-01T00:00:00Z',
      },
      {
        slug: 'task-2',
        blockedBy: [],
        lastCommittedAt: '2024-02-01T00:00:00Z',
      },
      {
        slug: 'task-3',
        blockedBy: [],
        lastCommittedAt: '2024-03-01T00:00:00Z',
      },
    ]

    const result = computeExecutionOrder(nodes)

    expect(result.map(r => r.executionOrder)).toEqual([1, 2, 3])
  })

  it('preserves extra properties on task nodes', () => {
    const nodes = [
      {
        slug: 'task-a',
        blockedBy: [],
        lastCommittedAt: '2024-01-01T00:00:00Z',
        extra: 'hello',
      },
    ]

    const result = computeExecutionOrder(nodes)

    expect(result[0]?.node.extra).toBe('hello')
  })
})

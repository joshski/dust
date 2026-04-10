export interface TaskNode {
  slug: string
  blockedBy: string[]
  lastCommittedAt: string | null
}

export interface OrderedTask<T extends TaskNode> {
  node: T
  executionOrder: number
}

/**
 * Computes execution order for tasks using topological sort.
 * Dependencies always trump timestamps: a blocked task never appears
 * before its blockers, regardless of commit time.
 * Among unblocked peers, earlier lastCommittedAt values come first;
 * null values sort last.
 */
export function computeExecutionOrder<T extends TaskNode>(
  nodes: T[]
): OrderedTask<T>[] {
  if (nodes.length === 0) return []

  const sorted = [...nodes].toSorted((a, b) => {
    if (a.lastCommittedAt === null && b.lastCommittedAt === null) return 0
    if (a.lastCommittedAt === null) return 1
    if (b.lastCommittedAt === null) return -1
    return (
      new Date(a.lastCommittedAt).getTime() -
      new Date(b.lastCommittedAt).getTime()
    )
  })

  const result: OrderedTask<T>[] = []
  const completed = new Set<string>()
  const nodeMap = new Map(nodes.map(n => [n.slug, n]))

  while (result.length < nodes.length) {
    const next = sorted.find(node => {
      if (completed.has(node.slug)) return false
      return node.blockedBy.every(
        slug => completed.has(slug) || !nodeMap.has(slug)
      )
    })

    if (!next) {
      // Cycle detected - add remaining tasks in sorted order
      for (const node of sorted) {
        if (!completed.has(node.slug)) {
          result.push({ node, executionOrder: result.length + 1 })
          completed.add(node.slug)
        }
      }
      break
    }

    result.push({ node: next, executionOrder: result.length + 1 })
    completed.add(next.slug)
  }

  return result
}

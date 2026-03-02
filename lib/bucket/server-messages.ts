/**
 * Typed server-to-client WebSocket messages for the bucket protocol.
 */

import type { Repository } from './repository'

export interface RepositoryListMessage {
  type: 'repository-list'
  repositories: RepositoryListItem[]
}

export interface RepositoryListItem extends Repository {
  hasTask: boolean
}

export interface TaskAvailableMessage {
  type: 'task-available'
  repository: string
}

export type ServerMessage = RepositoryListMessage | TaskAvailableMessage

/**
 * Parse and validate a server message from raw JSON data.
 * Returns the typed message if valid, or null if invalid.
 */
export function parseServerMessage(data: unknown): ServerMessage | null {
  if (typeof data !== 'object' || data === null) {
    return null
  }

  const message = data as Record<string, unknown>

  if (message.type === 'repository-list') {
    if (!Array.isArray(message.repositories)) {
      return null
    }
    const repositories: RepositoryListItem[] = []
    for (const r of message.repositories) {
      if (typeof r !== 'object' || r === null) {
        return null
      }
      const repo = r as Record<string, unknown>
      if (typeof repo.name !== 'string' || typeof repo.gitUrl !== 'string') {
        return null
      }
      if (
        typeof repo.id !== 'number' ||
        typeof repo.url !== 'string' ||
        typeof repo.hasTask !== 'boolean'
      ) {
        return null
      }
      const item: RepositoryListItem = {
        id: repo.id,
        name: repo.name,
        gitUrl: repo.gitUrl,
        url: repo.url,
        hasTask: repo.hasTask,
      }
      if (typeof repo.gitSshUrl === 'string') {
        item.gitSshUrl = repo.gitSshUrl
      }
      if (typeof repo.agentProvider === 'string') {
        item.agentProvider = repo.agentProvider
      }
      repositories.push(item)
    }
    return { type: 'repository-list', repositories }
  }

  if (message.type === 'task-available') {
    if (typeof message.repository !== 'string') {
      return null
    }
    return { type: 'task-available', repository: message.repository }
  }

  return null
}

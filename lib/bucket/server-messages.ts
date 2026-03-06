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

export interface ToolParameter {
  name: string
  type: 'string' | 'file' | 'number' | 'boolean'
  required: boolean
  description: string
}

export interface ToolDefinition {
  name: string
  description: string
  endpoint: string
  method: 'GET' | 'POST'
  parameters: ToolParameter[]
}

export interface ToolDefinitionsMessage {
  type: 'tool-definitions'
  tools: ToolDefinition[]
}

export type ServerMessage =
  | RepositoryListMessage
  | TaskAvailableMessage
  | ToolDefinitionsMessage

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

  if (message.type === 'tool-definitions') {
    if (!Array.isArray(message.tools)) {
      return null
    }
    const tools: ToolDefinition[] = []
    for (const t of message.tools) {
      if (typeof t !== 'object' || t === null) {
        return null
      }
      const tool = t as Record<string, unknown>
      if (
        typeof tool.name !== 'string' ||
        typeof tool.description !== 'string' ||
        typeof tool.endpoint !== 'string'
      ) {
        return null
      }
      if (tool.method !== 'GET' && tool.method !== 'POST') {
        return null
      }
      if (!Array.isArray(tool.parameters)) {
        return null
      }
      const parameters: ToolParameter[] = []
      for (const p of tool.parameters) {
        if (typeof p !== 'object' || p === null) {
          return null
        }
        const param = p as Record<string, unknown>
        if (
          typeof param.name !== 'string' ||
          typeof param.description !== 'string' ||
          typeof param.required !== 'boolean'
        ) {
          return null
        }
        if (
          param.type !== 'string' &&
          param.type !== 'file' &&
          param.type !== 'number' &&
          param.type !== 'boolean'
        ) {
          return null
        }
        parameters.push({
          name: param.name,
          description: param.description,
          required: param.required,
          type: param.type,
        })
      }
      tools.push({
        name: tool.name,
        description: tool.description,
        endpoint: tool.endpoint,
        method: tool.method,
        parameters,
      })
    }
    return { type: 'tool-definitions', tools }
  }

  return null
}

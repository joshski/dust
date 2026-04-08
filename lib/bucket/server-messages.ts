/**
 * Typed server-to-client WebSocket messages for the bucket protocol.
 */

import type { AgentCapability } from './agent-capabilities'

export interface RepositoryListMessage {
  type: 'repository-list'
  repositories: RepositoryListItem[]
}

export interface RepositoryListItem {
  name: string
  gitUrl: string
  gitSshUrl: string
  url: string
  id: number
  agentProvider?: string
  branch?: string
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
  children?: ToolDefinition[] // Sub-tools, max one level deep
}

export interface ToolDefinitionsMessage {
  type: 'tool-definitions'
  tools: ToolDefinition[]
}

// --- Connection Handshake Messages ---

/**
 * Sent by client on connect to initiate the handshake.
 * Includes version, platform, git remote, machine ID, and agent capabilities.
 */
export interface ConnectionInitMessage {
  type: 'connection-init'
  dustVersion: string
  platform: string
  gitRemote?: string
  machineId?: string
  agents: AgentCapability[]
}

/**
 * Sent by server to confirm connection is ready.
 * Includes tools and repositories atomically.
 */
export interface ConnectionReadyMessage {
  type: 'connection-ready'
  tools: ToolDefinition[]
  repositories: RepositoryListItem[]
}

/**
 * Sent by server to reject connection.
 * Client should log the reason and shut down without reconnecting.
 */
export interface ConnectionRejectedMessage {
  type: 'connection-rejected'
  reason: string
  minimumVersion?: string
}

export type ServerMessage =
  | RepositoryListMessage
  | TaskAvailableMessage
  | ToolDefinitionsMessage
  | ConnectionReadyMessage
  | ConnectionRejectedMessage

function parseParameter(p: unknown): ToolParameter | null {
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
  return {
    name: param.name,
    description: param.description,
    required: param.required,
    type: param.type,
  }
}

function parseTool(t: unknown, allowChildren: boolean): ToolDefinition | null {
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
    const param = parseParameter(p)
    if (param === null) {
      return null
    }
    parameters.push(param)
  }

  const result: ToolDefinition = {
    name: tool.name,
    description: tool.description,
    endpoint: tool.endpoint,
    method: tool.method,
    parameters,
  }

  if (tool.children !== undefined) {
    if (!allowChildren) {
      // Children cannot have children (max one level deep)
      return null
    }
    if (!Array.isArray(tool.children)) {
      return null
    }
    const children: ToolDefinition[] = []
    for (const c of tool.children) {
      const child = parseTool(c, false)
      if (child === null) {
        return null
      }
      children.push(child)
    }
    result.children = children
  }

  return result
}

function parseRepositoryItem(r: unknown): RepositoryListItem | null {
  if (typeof r !== 'object' || r === null) {
    return null
  }
  const repo = r as Record<string, unknown>
  if (typeof repo.name !== 'string' || typeof repo.gitUrl !== 'string') {
    return null
  }
  if (typeof repo.gitSshUrl !== 'string') {
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
    gitSshUrl: repo.gitSshUrl,
    url: repo.url,
    hasTask: repo.hasTask,
  }
  if (typeof repo.agentProvider === 'string') {
    item.agentProvider = repo.agentProvider
  }
  if (typeof repo.branch === 'string') {
    item.branch = repo.branch
  }
  return item
}

function parseRepositoryList(
  message: Record<string, unknown>
): RepositoryListMessage | null {
  if (!Array.isArray(message.repositories)) {
    return null
  }
  const repositories: RepositoryListItem[] = []
  for (const r of message.repositories) {
    const item = parseRepositoryItem(r)
    if (item === null) {
      return null
    }
    repositories.push(item)
  }
  return { type: 'repository-list', repositories }
}

function parseTaskAvailable(
  message: Record<string, unknown>
): TaskAvailableMessage | null {
  if (typeof message.repository !== 'string') {
    return null
  }
  return { type: 'task-available', repository: message.repository }
}

function parseToolDefinitions(
  message: Record<string, unknown>
): ToolDefinitionsMessage | null {
  if (!Array.isArray(message.tools)) {
    return null
  }
  const tools: ToolDefinition[] = []
  for (const t of message.tools) {
    const tool = parseTool(t, true)
    if (tool === null) {
      return null
    }
    tools.push(tool)
  }
  return { type: 'tool-definitions', tools }
}

function parseConnectionReady(
  message: Record<string, unknown>
): ConnectionReadyMessage | null {
  if (!Array.isArray(message.tools) || !Array.isArray(message.repositories)) {
    return null
  }
  const tools: ToolDefinition[] = []
  for (const t of message.tools) {
    const tool = parseTool(t, true)
    if (tool === null) {
      return null
    }
    tools.push(tool)
  }
  const repositories: RepositoryListItem[] = []
  for (const r of message.repositories) {
    const item = parseRepositoryItem(r)
    if (item === null) {
      return null
    }
    repositories.push(item)
  }
  return { type: 'connection-ready', tools, repositories }
}

function parseConnectionRejected(
  message: Record<string, unknown>
): ConnectionRejectedMessage | null {
  if (typeof message.reason !== 'string') {
    return null
  }
  const result: ConnectionRejectedMessage = {
    type: 'connection-rejected',
    reason: message.reason,
  }
  if (typeof message.minimumVersion === 'string') {
    result.minimumVersion = message.minimumVersion
  }
  return result
}

type MessageParser = (message: Record<string, unknown>) => ServerMessage | null

const messageParsers: Record<string, MessageParser> = {
  'repository-list': parseRepositoryList,
  'task-available': parseTaskAvailable,
  'tool-definitions': parseToolDefinitions,
  'connection-ready': parseConnectionReady,
  'connection-rejected': parseConnectionRejected,
}

/**
 * Parse and validate a server message from raw JSON data.
 * Returns the typed message if valid, or null if invalid.
 */
export function parseServerMessage(data: unknown): ServerMessage | null {
  if (typeof data !== 'object' || data === null) {
    return null
  }

  const message = data as Record<string, unknown>
  const messageType = message.type

  if (typeof messageType !== 'string') {
    return null
  }

  const parser = messageParsers[messageType]
  return parser ? parser(message) : null
}

// --- Connection Init Builder (Pure Function) ---

/**
 * Build a ConnectionInitMessage payload.
 * Pure function - no side effects.
 */
export function buildConnectionInitPayload(
  dustVersion: string,
  platform: string,
  gitRemote: string | undefined,
  agents: AgentCapability[],
  machineId?: string
): ConnectionInitMessage {
  const message: ConnectionInitMessage = {
    type: 'connection-init',
    dustVersion,
    platform,
    agents,
  }
  if (gitRemote !== undefined) {
    message.gitRemote = gitRemote
  }
  if (machineId !== undefined) {
    message.machineId = machineId
  }
  return message
}

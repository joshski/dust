/**
 * Persistent storage for server-defined tool definitions.
 *
 * Tool definitions received via WebSocket are stored to disk so that
 * CLI commands like `dust bucket tool` can access them without an
 * active WebSocket connection.
 */

import { join } from 'node:path'
import type { FileSystem } from '../filesystem/types'
import type { ToolDefinition } from './server-messages'

const DUST_DIR = '.dust'
const TOOLS_FILE = 'tools.json'

function toolsPath(homeDir: string): string {
  return join(homeDir, DUST_DIR, TOOLS_FILE)
}

/**
 * Load stored tool definitions from disk.
 * Returns an empty array if the file doesn't exist or is invalid.
 */
export async function loadStoredTools(
  fileSystem: FileSystem,
  homeDir: string
): Promise<ToolDefinition[]> {
  const path = toolsPath(homeDir)
  try {
    const content = await fileSystem.readFile(path)
    const data = JSON.parse(content)
    if (!Array.isArray(data.tools)) {
      return []
    }
    return data.tools
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    // For parse errors, also return empty - stale data is better ignored
    return []
  }
}

/**
 * Store tool definitions to disk.
 */
export async function storeTools(
  fileSystem: FileSystem,
  homeDir: string,
  tools: ToolDefinition[]
): Promise<void> {
  const dirPath = join(homeDir, DUST_DIR)
  await fileSystem.mkdir(dirPath, { recursive: true })
  await fileSystem.writeFile(toolsPath(homeDir), JSON.stringify({ tools }))
}

/**
 * Find a tool by name from stored definitions.
 */
export function findToolByName(
  tools: ToolDefinition[],
  name: string
): ToolDefinition | undefined {
  return tools.find(t => t.name === name)
}

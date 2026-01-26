/**
 * Settings module for dust CLI
 *
 * Reads optional configuration from .dust/config/settings.json
 */

import { join } from 'node:path'
import type { FileSystem } from './types'

export interface DustSettings {
  binaryPath: string
}

const DEFAULT_SETTINGS: DustSettings = {
  binaryPath: 'dust',
}

export async function loadSettings(
  cwd: string,
  fs: FileSystem
): Promise<DustSettings> {
  const settingsPath = join(cwd, '.dust', 'config', 'settings.json')

  if (!fs.exists(settingsPath)) {
    return DEFAULT_SETTINGS
  }

  try {
    const content = await fs.readFile(settingsPath)
    const parsed = JSON.parse(content)
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

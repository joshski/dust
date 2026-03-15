/**
 * Path utilities for dust bucket operations.
 *
 * Pure functions that compute paths from explicit parameters,
 * following the "functional core, imperative shell" pattern.
 */

import { join } from 'node:path'
import type { SessionConfig } from '../env-config'

/**
 * Compute the repositories directory path.
 *
 * If session.reposDir is set, returns that value.
 * Otherwise, returns the default path: ~/.dust/repos
 *
 * @param session - Session configuration from EnvConfig
 * @param homeDir - User's home directory path
 * @returns The resolved repositories directory path
 */
export function getReposDir(session: SessionConfig, homeDir: string): string {
  return session.reposDir || join(homeDir, '.dust', 'repos')
}

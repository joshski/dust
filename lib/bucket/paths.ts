/**
 * Path utilities for dust bucket operations.
 *
 * Pure functions that compute paths from explicit parameters,
 * following the "functional core, imperative shell" pattern.
 */

import { join } from 'node:path'

/**
 * Environment variables used by getReposDir.
 * Includes an index signature for compatibility with process.env.
 */
export interface ReposDirEnv {
  DUST_REPOS_DIR?: string
  [key: string]: string | undefined
}

/**
 * Compute the repositories directory path.
 *
 * If DUST_REPOS_DIR is set in the environment, returns that value.
 * Otherwise, returns the default path: ~/.dust/repos
 *
 * @param env - Environment variables object
 * @param homeDir - User's home directory path
 * @returns The resolved repositories directory path
 */
export function getReposDir(env: ReposDirEnv, homeDir: string): string {
  return env.DUST_REPOS_DIR || join(homeDir, '.dust', 'repos')
}

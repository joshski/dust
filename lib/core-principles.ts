/**
 * Core Principles Reading API - Entry point
 *
 * Imperative shell that reads principles from the package's bundled directory
 * and provides access through pure functional filtering.
 */

import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { parsePrinciple } from './artifacts/principles'
import type { Principle } from './artifacts/principles'
import {
  type CorePrinciplesConfig,
  type CorePrincipleNode,
  isInternalPrinciple,
  listCorePrinciples,
  getCorePrincipleTree,
} from './artifacts/core-principles'
import type { ReadableFileSystem } from './filesystem/types'

// Re-export types and pure functions
export type { CorePrinciplesConfig, CorePrincipleNode, Principle }
export { isInternalPrinciple, listCorePrinciples, getCorePrincipleTree }

/**
 * Creates a minimal ReadableFileSystem for use with parsePrinciple.
 */
function createReadableFileSystem(): ReadableFileSystem {
  return {
    exists: existsSync,
    /* v8 ignore start -- interface method not used by parsePrinciple */
    isDirectory: (path: string) => {
      try {
        return statSync(path).isDirectory()
      } catch {
        return false
      }
    },
    /* v8 ignore stop */
    readFile: (path: string) => readFile(path, 'utf-8'),
    /* v8 ignore next -- interface method not used by parsePrinciple */
    readdir: async (path: string) => readdirSync(path),
  }
}

/**
 * Locates the package's .dust/principles directory.
 * Works whether running from source or from the installed package.
 */
function locatePackagePrinciplesDir(): string {
  // __dirname equivalent for ESM
  const thisFile = fileURLToPath(import.meta.url)
  const thisDir = dirname(thisFile)

  // When running from dist/, go up one level to package root
  // When running from lib/, also go up one level to package root
  const packageRoot = dirname(thisDir)
  const principlesDir = join(packageRoot, '.dust', 'principles')

  /* v8 ignore start -- only fails if package is corrupted or not installed */
  if (!existsSync(principlesDir)) {
    throw new Error(
      `Core principles directory not found at ${principlesDir}. ` +
        'Ensure the @joshski/dust package is properly installed.'
    )
  }
  /* v8 ignore stop */

  return principlesDir
}

/**
 * Reads all principles from the package's bundled .dust/principles directory.
 * This is the imperative shell - it performs I/O to load principle data.
 */
export async function readAllCorePrinciples(): Promise<Principle[]> {
  const principlesDir = locatePackagePrinciplesDir()
  const packageRoot = dirname(dirname(principlesDir))
  const dustPath = join(packageRoot, '.dust')

  const fileSystem = createReadableFileSystem()
  const files = readdirSync(principlesDir)
  const mdFiles = files.filter(f => f.endsWith('.md'))

  const principles: Principle[] = []
  for (const file of mdFiles) {
    const slug = file.replace(/\.md$/, '')
    const principle = await parsePrinciple(fileSystem, dustPath, slug)
    principles.push(principle)
  }

  return principles
}

/**
 * Returns slugs of all public (non-Internal) core principles,
 * filtered by the provided configuration.
 */
export async function getCorePrincipleSlugs(
  config: CorePrinciplesConfig = {}
): Promise<string[]> {
  const allPrinciples = await readAllCorePrinciples()
  return listCorePrinciples(allPrinciples, config)
}

/**
 * Returns a hierarchy tree of all public (non-Internal) core principles,
 * filtered by the provided configuration.
 */
export async function getCorePrincipleHierarchy(
  config: CorePrinciplesConfig = {}
): Promise<CorePrincipleNode[]> {
  const allPrinciples = await readAllCorePrinciples()
  return getCorePrincipleTree(allPrinciples, config)
}

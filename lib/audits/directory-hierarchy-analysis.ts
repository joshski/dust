/**
 * Directory Hierarchy Analysis - Pure functions for analyzing directory structure.
 *
 * This module provides the functional core for directory hierarchy audits.
 * It analyzes a directory tree structure and identifies hierarchy issues.
 */

// --- Types ---

export interface DirectoryNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: DirectoryNode[]
}

export type IssueType =
  | 'concern-mixing'
  | 'missing-grouping'
  | 'depth-inconsistency'
  | 'naming-consistency'
  | 'singleton-directory'
  | 'orphaned-file'

export type MigrationComplexity = 'low' | 'medium' | 'high'

export interface Finding {
  type: IssueType
  affectedPaths: string[]
  description: string
  suggestedReorganization: string
  migrationComplexity: MigrationComplexity
}

// --- Constants ---

const EXCLUDED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  '.output',
  'out',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  'target',
  'vendor',
  '.venv',
  'venv',
  'env',
])

// --- Pure Functions ---

/**
 * Analyzes a directory tree and returns findings about hierarchy issues.
 */
export function analyzeDirectoryHierarchy(root: DirectoryNode): Finding[] {
  const findings: Finding[] = []

  // Filter out excluded directories
  const filteredRoot = filterExcludedDirectories(root)

  // Run all analysis functions
  findings.push(...detectConcernMixing(filteredRoot))
  findings.push(...detectMissingGroupings(filteredRoot))
  findings.push(...detectDepthInconsistencies(filteredRoot))
  findings.push(...detectNamingInconsistencies(filteredRoot))
  findings.push(...detectSingletonDirectories(filteredRoot))
  findings.push(...detectOrphanedFiles(filteredRoot))

  return findings
}

/**
 * Recursively filters out excluded directories from the tree.
 */
function filterExcludedDirectories(node: DirectoryNode): DirectoryNode {
  if (node.type === 'file') {
    return node
  }

  const filteredChildren = (node.children || [])
    .filter(child => {
      if (child.type === 'directory' && EXCLUDED_DIRECTORIES.has(child.name)) {
        return false
      }
      return true
    })
    .map(child => filterExcludedDirectories(child))

  return {
    ...node,
    children: filteredChildren,
  }
}

/**
 * Detects directories containing files that serve different purposes.
 */
function detectConcernMixing(root: DirectoryNode): Finding[] {
  const findings: Finding[] = []

  function traverse(node: DirectoryNode): void {
    if (node.type === 'file' || !node.children) {
      return
    }

    // Get files in this directory (not subdirectories)
    const files = node.children.filter(child => child.type === 'file')

    if (files.length < 2) {
      node.children.forEach(traverse)
      return
    }

    // Categorize files by extension
    const categories = new Map<string, string[]>()
    for (const file of files) {
      const ext = getFileExtension(file.name)
      const category = categorizeFile(file.name, ext)
      if (!categories.has(category)) {
        categories.set(category, [])
      }
      categories.get(category)?.push(file.path)
    }

    // If multiple categories exist, it might be concern mixing
    if (categories.size > 1) {
      const categoryNames = Array.from(categories.keys())

      // Special cases to ignore:
      // - Root directories often mix concerns legitimately
      // - Config directories with different config file types
      // - Test directories with test files and fixtures
      const isRootDir = node.path === root.path
      const isConfigDir = node.name === 'config' || node.name.includes('config')
      const isTestDir =
        node.name.endsWith('.test') ||
        node.name === '__tests__' ||
        node.name === 'test' ||
        node.name === 'tests'

      if (!isRootDir && !isConfigDir && !isTestDir) {
        const affectedPaths = Array.from(categories.values()).flat()
        findings.push({
          type: 'concern-mixing',
          affectedPaths,
          description: `Directory "${node.path}" mixes ${categoryNames.join(', ')} files`,
          suggestedReorganization: `Consider separating into subdirectories by concern: ${categoryNames.map(c => `"${c}"`).join(', ')}`,
          migrationComplexity: calculateComplexity(affectedPaths.length),
        })
      }
    }

    node.children.forEach(traverse)
  }

  traverse(root)
  return findings
}

/**
 * Detects related files scattered across multiple locations.
 */
function detectMissingGroupings(root: DirectoryNode): Finding[] {
  const findings: Finding[] = []

  // Collect files by category across the entire tree
  const filesByCategory = new Map<string, string[]>()

  function traverse(node: DirectoryNode): void {
    if (node.type === 'file') {
      const ext = getFileExtension(node.name)
      const category = categorizeFile(node.name, ext)
      if (!filesByCategory.has(category)) {
        filesByCategory.set(category, [])
      }
      filesByCategory.get(category)?.push(node.path)
    } else if (node.children) {
      node.children.forEach(traverse)
    }
  }

  traverse(root)

  // Look for categories scattered across multiple directories
  for (const [category, paths] of filesByCategory.entries()) {
    if (paths.length < 3) continue // Need at least 3 files to suggest grouping

    // Get unique parent directories
    const parentDirs = new Set(paths.map(p => getParentDir(p)))

    if (parentDirs.size > 2) {
      findings.push({
        type: 'missing-grouping',
        affectedPaths: paths,
        description: `${paths.length} ${category} files are scattered across ${parentDirs.size} directories`,
        suggestedReorganization: `Consider grouping ${category} files into a dedicated directory`,
        migrationComplexity: calculateComplexity(paths.length),
      })
    }
  }

  return findings
}

/**
 * Detects inconsistent directory depth relative to similar directories.
 */
function detectDepthInconsistencies(root: DirectoryNode): Finding[] {
  const findings: Finding[] = []

  // Group directories by their purpose/category
  const directoriesByPurpose = new Map<
    string,
    Array<{ path: string; depth: number }>
  >()

  function traverse(node: DirectoryNode, depth: number): void {
    if (node.type === 'directory') {
      const purpose = categorizeDirName(node.name)
      if (!directoriesByPurpose.has(purpose)) {
        directoriesByPurpose.set(purpose, [])
      }
      directoriesByPurpose.get(purpose)?.push({ path: node.path, depth })

      if (node.children) {
        node.children.forEach(child => traverse(child, depth + 1))
      }
    }
  }

  traverse(root, 0)

  // Check for depth inconsistencies within each purpose category
  for (const [purpose, dirs] of directoriesByPurpose.entries()) {
    if (dirs.length < 2) continue

    const depths = dirs.map(d => d.depth)
    const minDepth = Math.min(...depths)
    const maxDepth = Math.max(...depths)
    const depthDiff = maxDepth - minDepth

    // If there's a significant depth difference (>2 levels), flag it
    if (depthDiff > 2) {
      const deepDirs = dirs.filter(d => d.depth > minDepth + 1)
      findings.push({
        type: 'depth-inconsistency',
        affectedPaths: deepDirs.map(d => d.path),
        description: `${purpose} directories have inconsistent depths (range: ${minDepth}-${maxDepth})`,
        suggestedReorganization: `Consider flattening deeper ${purpose} directories to maintain consistent hierarchy`,
        migrationComplexity: calculateComplexity(deepDirs.length),
      })
    }
  }

  return findings
}

/**
 * Detects directory names that don't follow established patterns.
 */
function detectNamingInconsistencies(root: DirectoryNode): Finding[] {
  const findings: Finding[] = []

  // Collect all directory names and their naming styles
  const directoriesByStyle = new Map<string, string[]>()

  function traverse(node: DirectoryNode): void {
    if (node.type === 'directory') {
      // Skip root directory
      if (node.path !== root.path) {
        const style = detectNamingStyle(node.name)
        if (!directoriesByStyle.has(style)) {
          directoriesByStyle.set(style, [])
        }
        directoriesByStyle.get(style)?.push(node.path)
      }

      if (node.children) {
        node.children.forEach(traverse)
      }
    }
  }

  traverse(root)

  // If there are multiple naming styles used, identify outliers
  if (directoriesByStyle.size > 1) {
    const styles = Array.from(directoriesByStyle.entries())
    const sortedByCount = styles.toSorted((a, b) => b[1].length - a[1].length)
    const [dominantStyle, dominantPaths] = sortedByCount[0]

    // Flag minority styles as inconsistent
    for (let i = 1; i < sortedByCount.length; i++) {
      const [style, paths] = sortedByCount[i]
      // Only flag if it's a clear minority (less than 40% of dominant style) AND has fewer than 5 directories
      if (paths.length < dominantPaths.length * 0.4 && paths.length < 5) {
        findings.push({
          type: 'naming-consistency',
          affectedPaths: paths,
          description: `${paths.length} directories use ${style} naming while most use ${dominantStyle}`,
          suggestedReorganization: `Consider renaming to follow ${dominantStyle} naming convention`,
          migrationComplexity: calculateComplexity(paths.length),
        })
      }
    }
  }

  return findings
}

/**
 * Detects directories with only a single file or subdirectory.
 */
function detectSingletonDirectories(root: DirectoryNode): Finding[] {
  const findings: Finding[] = []

  function traverse(node: DirectoryNode): void {
    if (node.type === 'file' || !node.children) {
      return
    }

    // Check if this directory has only one child
    if (node.children.length === 1) {
      const child = node.children[0]

      // Skip if this is a root directory or has a semantic reason to exist
      const isRootDir = node.path === root.path
      const hasSemanticReason =
        node.name.startsWith('.') || node.name === 'src' || node.name === 'lib'

      if (!isRootDir && !hasSemanticReason) {
        findings.push({
          type: 'singleton-directory',
          affectedPaths: [node.path],
          description: `Directory "${node.path}" contains only one item: "${child.name}"`,
          suggestedReorganization: `Consider flattening by moving "${child.name}" up to parent directory`,
          migrationComplexity: 'low',
        })
      }

      // Continue traversing
      if (child.type === 'directory') {
        traverse(child)
      }
    } else {
      // Multiple children, traverse each
      node.children.forEach(child => {
        if (child.type === 'directory') {
          traverse(child)
        }
      })
    }
  }

  traverse(root)
  return findings
}

/**
 * Detects files at inappropriate directory levels.
 */
function detectOrphanedFiles(root: DirectoryNode): Finding[] {
  const findings: Finding[] = []

  function traverse(node: DirectoryNode): void {
    if (node.type === 'file' || !node.children) {
      return
    }

    // Get files and directories at this level
    const files = node.children.filter(child => child.type === 'file')
    const subdirs = node.children.filter(child => child.type === 'directory')

    // If there are files alongside many subdirectories, they might be orphaned
    if (files.length > 0 && subdirs.length > 3) {
      // Check if any subdirectory could logically contain these files
      const orphanedFiles = files.filter(f => {
        const ext = getFileExtension(f.name)
        const fileCat = categorizeFile(f.name, ext)
        const fileBaseName = f.name.replace(/\.[^.]+$/, '').toLowerCase()

        // Check if file matches any subdirectory purpose
        return subdirs.some(d => {
          const dirPurpose = categorizeDirName(d.name).toLowerCase()
          const dirNameLower = d.name.toLowerCase()

          // Match if:
          // 1. File category matches directory purpose (e.g., "utils.ts" -> "utils" dir)
          // 2. File base name contains directory name (e.g., "utils-helper.ts" -> "utils" dir)
          // 3. Directory purpose is contained in file category (e.g., "helper.ts" -> "helpers" dir)
          return (
            fileCat === dirPurpose ||
            fileBaseName.includes(dirNameLower) ||
            dirNameLower.includes(fileCat) ||
            (dirPurpose !== d.name.toLowerCase() && fileCat === dirPurpose)
          )
        })
      })

      if (orphanedFiles.length > 0) {
        findings.push({
          type: 'orphaned-file',
          affectedPaths: orphanedFiles.map(f => f.path),
          description: `${orphanedFiles.length} files in "${node.path}" could be grouped into existing subdirectories`,
          suggestedReorganization: `Consider moving files into appropriate subdirectories based on their purpose`,
          migrationComplexity: calculateComplexity(orphanedFiles.length),
        })
      }
    }

    // Continue traversing
    node.children.forEach(traverse)
  }

  traverse(root)
  return findings
}

// --- Helper Functions ---

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot === -1 ? '' : filename.slice(lastDot + 1)
}

function getParentDir(path: string): string {
  const lastSlash = path.lastIndexOf('/')
  return lastSlash === -1 ? '' : path.slice(0, lastSlash)
}

function categorizeFileByName(filename: string): string | null {
  const lower = filename.toLowerCase()

  // Special files
  if (
    lower.endsWith('.test.ts') ||
    lower.endsWith('.test.js') ||
    lower.endsWith('.spec.ts')
  ) {
    return 'test'
  }
  if (lower.includes('config') || lower.startsWith('.')) {
    return 'config'
  }
  if (
    lower === 'readme.md' ||
    lower === 'license' ||
    lower === 'changelog.md'
  ) {
    return 'documentation'
  }

  // Check filename content for categorization hints
  const baseName = filename.replace(/\.[^.]+$/, '').toLowerCase()
  if (baseName.includes('util')) return 'utility'
  if (baseName.includes('helper')) return 'helper'
  if (baseName.includes('service')) return 'service'
  if (baseName.includes('model')) return 'model'
  if (baseName.includes('component')) return 'component'

  return null
}

const EXTENSION_CATEGORIES: Record<string, string> = {
  ts: 'source',
  js: 'source',
  tsx: 'source',
  jsx: 'source',
  mjs: 'source',
  cjs: 'source',
  json: 'config',
  yaml: 'config',
  yml: 'config',
  toml: 'config',
  ini: 'config',
  md: 'documentation',
  txt: 'documentation',
  css: 'style',
  scss: 'style',
  sass: 'style',
  less: 'style',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  svg: 'image',
}

function categorizeFileByExtension(ext: string): string {
  return EXTENSION_CATEGORIES[ext] ?? 'other'
}

function categorizeFile(filename: string, ext: string): string {
  return categorizeFileByName(filename) ?? categorizeFileByExtension(ext)
}

const DIRECTORY_CATEGORY_PATTERNS: Array<
  [string | ((s: string) => boolean), string]
> = [
  [(s: string) => s.includes('test') || s === '__tests__', 'test'],
  [(s: string) => s.includes('config'), 'config'],
  [(s: string) => s.includes('doc') || s === 'docs', 'documentation'],
  [(s: string) => s.includes('util') || s === 'utils', 'utility'],
  [(s: string) => s.includes('helper'), 'helper'],
  [(s: string) => s.includes('component'), 'component'],
  [(s: string) => s.includes('service'), 'service'],
  [(s: string) => s.includes('model'), 'model'],
  [(s: string) => s.includes('view'), 'view'],
  [(s: string) => s.includes('controller'), 'controller'],
  [(s: string) => s === 'src' || s === 'lib', 'source'],
  [(s: string) => s.includes('style') || s === 'css', 'style'],
  [
    (s: string) => s.includes('image') || s === 'img' || s === 'assets',
    'asset',
  ],
]

function categorizeDirName(dirname: string): string {
  const lower = dirname.toLowerCase()

  for (const [pattern, category] of DIRECTORY_CATEGORY_PATTERNS) {
    if (
      typeof pattern === 'function' ? pattern(lower) : lower.includes(pattern)
    ) {
      return category
    }
  }

  return dirname
}

function detectNamingStyle(dirname: string): string {
  // Check for various naming conventions
  if (dirname.startsWith('.')) return 'hidden'
  if (dirname.includes('-')) return 'kebab-case'
  if (dirname.includes('_')) return 'snake_case'
  if (/^[A-Z]/.test(dirname) && /[A-Z]/.test(dirname.slice(1)))
    return 'PascalCase'
  if (/^[a-z]/.test(dirname) && /[A-Z]/.test(dirname)) return 'camelCase'
  if (/^[a-z]+$/.test(dirname)) return 'lowercase'

  return 'mixed'
}

function calculateComplexity(fileCount: number): MigrationComplexity {
  if (fileCount <= 3) return 'low'
  if (fileCount <= 10) return 'medium'
  return 'high'
}

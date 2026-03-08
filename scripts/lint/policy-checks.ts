import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { analyzePolicyViolations } from '../../lib/lint/policy-checker'

const INCLUDED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mts',
  '.cts',
  '.mjs',
  '.cjs',
])

function shouldIgnorePath(relativePath: string): boolean {
  const segments = relativePath.split('/')
  return segments.some(
    segment =>
      segment === 'node_modules' ||
      segment === 'dist' ||
      segment === 'coverage' ||
      segment === '.git'
  )
}

function hasIncludedExtension(relativePath: string): boolean {
  const dotIndex = relativePath.lastIndexOf('.')
  if (dotIndex === -1) return false
  const extension = relativePath.slice(dotIndex)
  return INCLUDED_EXTENSIONS.has(extension)
}

async function collectFiles(root: string): Promise<string[]> {
  const files: string[] = []
  for await (const entry of new Bun.Glob('**/*').scan(root)) {
    if (shouldIgnorePath(entry) || !hasIncludedExtension(entry)) {
      continue
    }
    files.push(entry)
  }
  files.sort((a, b) => a.localeCompare(b))
  return files
}

function formatDiagnostic(
  diagnostic: ReturnType<typeof analyzePolicyViolations>[number]
): string {
  return `${diagnostic.filePath}:${diagnostic.line}:${diagnostic.column} [${diagnostic.policy}] ${diagnostic.message}`
}

async function main(): Promise<number> {
  const root = process.cwd()
  const files = await collectFiles(root)
  const diagnostics: ReturnType<typeof analyzePolicyViolations> = []

  for (const relativePath of files) {
    const filePath = join(root, relativePath)
    const content = await readFile(filePath, 'utf8')
    diagnostics.push(...analyzePolicyViolations(filePath, content))
  }

  if (diagnostics.length === 0) {
    console.log('✓ custom policy checks')
    return 0
  }

  console.error(`✗ custom policy checks (${diagnostics.length} violation(s))`)
  for (const diagnostic of diagnostics) {
    console.error(formatDiagnostic(diagnostic))
  }
  return 1
}

const exitCode = await main()
process.exit(exitCode)

import { readFile, writeFile } from 'node:fs/promises'

const TOP_LEVEL_ORDER = [
  'name',
  'version',
  'description',
  'type',
  'bin',
  'exports',
  'files',
  'repository',
  'keywords',
  'author',
  'license',
  'scripts',
  'devDependencies',
]

const EXPORTS_ORDER = [
  './types',
  './logging',
  './agents',
  './artifacts',
  './audits',
  './filesystem',
  './filesystem/emulator',
  './istanbul/minimal-reporter',
  './biome',
  './validation',
]

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function reorderObject(
  sourceObject: Record<string, unknown>,
  preferredOrder: string[]
): Record<string, unknown> {
  const reordered: Record<string, unknown> = {}

  for (const key of preferredOrder) {
    if (Object.prototype.hasOwnProperty.call(sourceObject, key)) {
      reordered[key] = sourceObject[key]
    }
  }

  for (const key of Object.keys(sourceObject)) {
    if (!Object.prototype.hasOwnProperty.call(reordered, key)) {
      reordered[key] = sourceObject[key]
    }
  }

  return reordered
}

function normalizePackageJson(rawPackage: Record<string, unknown>): string {
  const normalized = reorderObject(rawPackage, TOP_LEVEL_ORDER)

  if (isObject(normalized.bin)) {
    normalized.bin = reorderObject(normalized.bin, ['dust'])
  }

  if (isObject(normalized.repository)) {
    normalized.repository = reorderObject(normalized.repository, [
      'type',
      'url',
    ])
  }

  if (isObject(normalized.scripts)) {
    normalized.scripts = reorderObject(normalized.scripts, [
      'build',
      'test',
      'test:coverage',
      'eval',
    ])
  }

  if (isObject(normalized.devDependencies)) {
    normalized.devDependencies = Object.fromEntries(
      Object.entries(normalized.devDependencies).sort(([a], [b]) =>
        a.localeCompare(b)
      )
    )
  }

  if (isObject(normalized.exports)) {
    const exportsMap = reorderObject(normalized.exports, EXPORTS_ORDER)

    for (const [key, value] of Object.entries(exportsMap)) {
      if (isObject(value)) {
        exportsMap[key] = reorderObject(value, ['import', 'types'])
      }
    }

    normalized.exports = exportsMap
  }

  return `${JSON.stringify(normalized, null, 2)}\n`
}

async function main(): Promise<void> {
  const packagePath = 'package.json'
  const currentContents = await readFile(packagePath, 'utf8')

  let parsedPackage: unknown
  try {
    parsedPackage = JSON.parse(currentContents)
  } catch {
    console.error('✗ package.json is not valid JSON')
    process.exit(1)
  }

  if (!isObject(parsedPackage)) {
    console.error('✗ package.json must contain a top-level object')
    process.exit(1)
  }

  const normalizedContents = normalizePackageJson(parsedPackage)
  const shouldWrite = process.argv.includes('--write')

  if (currentContents === normalizedContents) {
    console.log('✓ package.json format')
    return
  }

  if (shouldWrite) {
    await writeFile(packagePath, normalizedContents, 'utf8')
    console.log('✓ package.json format (updated)')
    return
  }

  console.error('✗ package.json format mismatch')
  console.error(
    'Run `bun run scripts/lint/check-package-json-format.ts --write` to apply canonical formatting.'
  )
  process.exit(1)
}

await main()

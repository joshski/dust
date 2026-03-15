/**
 * Checks Audit - Pure functions for detecting tech stacks and suggesting checks.
 *
 * This module provides the functional core for the checks-audit stock audit.
 * It detects the project's technology ecosystem, identifies configured checks,
 * parses CI configuration files, and suggests missing check categories.
 */

import { dedent } from '../cli/dedent'
import type { CheckConfig, DustSettings } from '../cli/types'

// --- Types ---

export type Ecosystem =
  | 'javascript'
  | 'python'
  | 'go'
  | 'rust'
  | 'ruby'
  | 'php'
  | 'elixir'

export interface TechStackDetection {
  ecosystem: Ecosystem
  indicators: string[]
  packageManager?: string
}

interface CheckCategory {
  category: string
  ecosystem: Ecosystem
  detection: string[]
  checkOptions: CheckOption[]
}

export interface CheckOption {
  name: string
  command: string
  description?: string
}

export interface CheckSuggestion {
  category: string
  ecosystem: Ecosystem
  reason: string
  suggestedCheck: CheckOption
  alternatives: CheckOption[]
  detectedIndicators: string[]
}

export interface CIFileContent {
  path: string
  content: string
}

// --- Detection Indicators ---

const ECOSYSTEM_INDICATORS: Record<Ecosystem, string[]> = {
  javascript: [
    'package.json',
    'bun.lock',
    'bun.lockb',
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    'tsconfig.json',
  ],
  python: [
    'pyproject.toml',
    'requirements.txt',
    'poetry.lock',
    'Pipfile.lock',
    'setup.py',
    'setup.cfg',
  ],
  go: ['go.mod', 'go.sum'],
  rust: ['Cargo.toml', 'Cargo.lock'],
  ruby: ['Gemfile', 'Gemfile.lock'],
  php: ['composer.json', 'composer.lock'],
  elixir: ['mix.exs', 'mix.lock'],
}

const PACKAGE_MANAGER_FILES: Record<
  string,
  { ecosystem: Ecosystem; manager: string }
> = {
  'bun.lock': { ecosystem: 'javascript', manager: 'bun' },
  'bun.lockb': { ecosystem: 'javascript', manager: 'bun' },
  'pnpm-lock.yaml': { ecosystem: 'javascript', manager: 'pnpm' },
  'package-lock.json': { ecosystem: 'javascript', manager: 'npm' },
  'yarn.lock': { ecosystem: 'javascript', manager: 'yarn' },
}

// --- Check Category Definitions ---

const CHECK_CATEGORIES: CheckCategory[] = [
  // JavaScript/TypeScript
  {
    category: 'linting',
    ecosystem: 'javascript',
    detection: [
      '.eslintrc',
      '.eslintrc.js',
      '.eslintrc.json',
      '.eslintrc.yml',
      '.eslintrc.yaml',
      'eslint.config.js',
      'eslint.config.mjs',
      'biome.json',
      'biome.jsonc',
    ],
    checkOptions: [
      {
        name: 'lint',
        command: 'eslint .',
        description: 'ESLint - standard JavaScript/TypeScript linting',
      },
      {
        name: 'lint',
        command: 'oxlint',
        description: 'Oxlint - fast, zero-config linting',
      },
      {
        name: 'lint',
        command: 'biome lint .',
        description: 'Biome - all-in-one linting and formatting',
      },
    ],
  },
  {
    category: 'formatting',
    ecosystem: 'javascript',
    detection: [
      '.prettierrc',
      '.prettierrc.js',
      '.prettierrc.json',
      '.prettierrc.yml',
      '.prettierrc.yaml',
      'prettier.config.js',
      'biome.json',
      'biome.jsonc',
    ],
    checkOptions: [
      {
        name: 'format',
        command: 'prettier --check .',
        description: 'Prettier - code formatter',
      },
      {
        name: 'format',
        command: 'oxfmt --check',
        description: 'Oxfmt - fast formatter',
      },
      {
        name: 'format',
        command: 'biome format --check .',
        description: 'Biome - all-in-one formatter',
      },
    ],
  },
  {
    category: 'type-checking',
    ecosystem: 'javascript',
    detection: ['tsconfig.json'],
    checkOptions: [
      {
        name: 'typecheck',
        command: 'tsc --noEmit',
        description: 'TypeScript compiler type checking',
      },
    ],
  },
  {
    category: 'build',
    ecosystem: 'javascript',
    detection: [
      'tsconfig.json',
      'webpack.config.js',
      'vite.config.ts',
      'vite.config.js',
      'rollup.config.js',
    ],
    checkOptions: [
      {
        name: 'build',
        command: 'npm run build',
        description: 'Build the project',
      },
      {
        name: 'build',
        command: 'bun run build',
        description: 'Build the project with Bun',
      },
    ],
  },
  {
    category: 'unit-tests',
    ecosystem: 'javascript',
    detection: [
      'vitest.config.ts',
      'vitest.config.js',
      'jest.config.js',
      'jest.config.ts',
      'jest.config.json',
    ],
    checkOptions: [
      {
        name: 'test',
        command: 'vitest run',
        description: 'Vitest - fast unit testing',
      },
      {
        name: 'test',
        command: 'jest',
        description: 'Jest - comprehensive testing',
      },
      { name: 'test', command: 'npm test', description: 'npm test script' },
      { name: 'test', command: 'bun test', description: 'Bun test runner' },
    ],
  },
  {
    category: 'unused-code',
    ecosystem: 'javascript',
    detection: ['knip.json', 'knip.jsonc', 'knip.ts'],
    checkOptions: [
      {
        name: 'unused-code',
        command: 'knip',
        description: 'Knip - find unused code, dependencies, and exports',
      },
    ],
  },

  // Python
  {
    category: 'linting',
    ecosystem: 'python',
    detection: [
      'ruff.toml',
      'pyproject.toml',
      '.flake8',
      'pylintrc',
      '.pylintrc',
    ],
    checkOptions: [
      {
        name: 'lint',
        command: 'ruff check .',
        description: 'Ruff - fast Python linting',
      },
      {
        name: 'lint',
        command: 'pylint .',
        description: 'Pylint - comprehensive linting',
      },
      {
        name: 'lint',
        command: 'flake8',
        description: 'Flake8 - style guide enforcement',
      },
    ],
  },
  {
    category: 'formatting',
    ecosystem: 'python',
    detection: ['ruff.toml', 'pyproject.toml'],
    checkOptions: [
      {
        name: 'format',
        command: 'ruff format --check .',
        description: 'Ruff formatter',
      },
      {
        name: 'format',
        command: 'black --check .',
        description: 'Black - code formatter',
      },
    ],
  },
  {
    category: 'type-checking',
    ecosystem: 'python',
    detection: [
      'pyproject.toml',
      'mypy.ini',
      '.mypy.ini',
      'pyrightconfig.json',
    ],
    checkOptions: [
      {
        name: 'typecheck',
        command: 'mypy .',
        description: 'Mypy - static type checking',
      },
      {
        name: 'typecheck',
        command: 'pyright',
        description: 'Pyright - fast type checking',
      },
    ],
  },
  {
    category: 'unit-tests',
    ecosystem: 'python',
    detection: ['pytest.ini', 'pyproject.toml', 'setup.cfg', 'conftest.py'],
    checkOptions: [
      {
        name: 'test',
        command: 'pytest',
        description: 'Pytest - testing framework',
      },
    ],
  },

  // Go
  {
    category: 'linting',
    ecosystem: 'go',
    detection: ['.golangci.yml', '.golangci.yaml', '.golangci.json'],
    checkOptions: [
      {
        name: 'lint',
        command: 'golangci-lint run',
        description: 'golangci-lint - comprehensive linting',
      },
    ],
  },
  {
    category: 'formatting',
    ecosystem: 'go',
    detection: [],
    checkOptions: [
      {
        name: 'format',
        command: 'gofmt -l .',
        description: 'gofmt - Go code formatter',
      },
    ],
  },
  {
    category: 'build',
    ecosystem: 'go',
    detection: ['go.mod'],
    checkOptions: [
      {
        name: 'build',
        command: 'go build ./...',
        description: 'Build all Go packages',
      },
    ],
  },
  {
    category: 'unit-tests',
    ecosystem: 'go',
    detection: ['go.mod'],
    checkOptions: [
      {
        name: 'test',
        command: 'go test ./...',
        description: 'Run all Go tests',
      },
    ],
  },
  {
    category: 'vetting',
    ecosystem: 'go',
    detection: [],
    checkOptions: [
      {
        name: 'vet',
        command: 'go vet ./...',
        description: 'go vet - examine code for bugs',
      },
    ],
  },

  // Rust
  {
    category: 'linting',
    ecosystem: 'rust',
    detection: ['Cargo.toml', 'clippy.toml'],
    checkOptions: [
      {
        name: 'lint',
        command: 'cargo clippy',
        description: 'Clippy - Rust linter',
      },
    ],
  },
  {
    category: 'formatting',
    ecosystem: 'rust',
    detection: ['Cargo.toml', 'rustfmt.toml', '.rustfmt.toml'],
    checkOptions: [
      {
        name: 'format',
        command: 'cargo fmt --check',
        description: 'rustfmt - Rust code formatter',
      },
    ],
  },
  {
    category: 'build',
    ecosystem: 'rust',
    detection: ['Cargo.toml'],
    checkOptions: [
      {
        name: 'build',
        command: 'cargo build',
        description: 'Build the Rust project',
      },
    ],
  },
  {
    category: 'unit-tests',
    ecosystem: 'rust',
    detection: ['Cargo.toml'],
    checkOptions: [
      { name: 'test', command: 'cargo test', description: 'Run Rust tests' },
    ],
  },
]

// --- CI Configuration Patterns ---

const CI_FILES = [
  '.github/workflows/*.yml',
  '.github/workflows/*.yaml',
  '.gitlab-ci.yml',
  '.circleci/config.yml',
  'Jenkinsfile',
]

// --- Pure Functions ---

/**
 * Detects tech stacks based on project files.
 */
export function detectTechStack(projectFiles: string[]): TechStackDetection[] {
  const fileSet = new Set(projectFiles)
  const detections: TechStackDetection[] = []
  const ecosystemsFound = new Map<Ecosystem, string[]>()

  // Detect ecosystems based on indicators
  for (const [ecosystem, indicators] of Object.entries(
    ECOSYSTEM_INDICATORS
  ) as [Ecosystem, string[]][]) {
    const foundIndicators = indicators.filter(indicator =>
      fileSet.has(indicator)
    )
    if (foundIndicators.length > 0) {
      ecosystemsFound.set(ecosystem, foundIndicators)
    }
  }

  // Build detection results with package manager info
  for (const [ecosystem, indicators] of ecosystemsFound) {
    const detection: TechStackDetection = {
      ecosystem,
      indicators,
    }

    // Add package manager if detected
    for (const file of projectFiles) {
      const managerInfo = PACKAGE_MANAGER_FILES[file]
      if (managerInfo && managerInfo.ecosystem === ecosystem) {
        detection.packageManager = managerInfo.manager
        break
      }
    }

    detections.push(detection)
  }

  return detections.toSorted((a, b) => a.ecosystem.localeCompare(b.ecosystem))
}

/**
 * Extracts check categories from existing dust settings.
 */
export function detectConfiguredChecks(settings: DustSettings): Set<string> {
  const configured = new Set<string>()

  if (!settings.checks) {
    return configured
  }

  for (const check of settings.checks) {
    // Normalize check names to categories
    const name = check.name.toLowerCase()

    // Map common check names to categories
    if (
      name.includes('lint') ||
      name.includes('eslint') ||
      name.includes('oxlint')
    ) {
      configured.add('linting')
    }
    if (
      name.includes('format') ||
      name.includes('prettier') ||
      name.includes('oxfmt')
    ) {
      configured.add('formatting')
    }
    if (name.includes('type') || name.includes('tsc')) {
      configured.add('type-checking')
    }
    if (name.includes('build') || name.includes('compile')) {
      configured.add('build')
    }
    if (
      name.includes('test') ||
      name.includes('vitest') ||
      name.includes('jest')
    ) {
      configured.add('unit-tests')
    }
    if (name.includes('unused') || name.includes('knip')) {
      configured.add('unused-code')
    }
    if (name.includes('vet')) {
      configured.add('vetting')
    }
  }

  return configured
}

/**
 * Parses CI configuration files to detect what checks run in CI.
 */
export function detectCIChecks(ciFiles: CIFileContent[]): Set<string> {
  const ciChecks = new Set<string>()

  for (const file of ciFiles) {
    const content = file.content.toLowerCase()

    // Detect common CI check patterns
    if (
      content.includes('eslint') ||
      content.includes('lint:') ||
      content.includes('npm run lint') ||
      content.includes('bun run lint')
    ) {
      ciChecks.add('linting')
    }
    if (
      content.includes('prettier') ||
      content.includes('format:') ||
      content.includes('--check')
    ) {
      ciChecks.add('formatting')
    }
    if (
      content.includes('tsc') ||
      content.includes('typecheck') ||
      content.includes('type-check')
    ) {
      ciChecks.add('type-checking')
    }
    if (
      content.includes('build:') ||
      content.includes('npm run build') ||
      content.includes('bun run build') ||
      content.includes('go build') ||
      content.includes('cargo build')
    ) {
      ciChecks.add('build')
    }
    if (
      content.includes('test:') ||
      content.includes('npm test') ||
      content.includes('bun test') ||
      content.includes('pytest') ||
      content.includes('go test') ||
      content.includes('cargo test')
    ) {
      ciChecks.add('unit-tests')
    }
    if (content.includes('knip') || content.includes('unused')) {
      ciChecks.add('unused-code')
    }
    if (content.includes('go vet')) {
      ciChecks.add('vetting')
    }
  }

  return ciChecks
}

/**
 * Suggests missing checks based on detected tech stack and configured checks.
 */
export function suggestChecks(
  techStack: TechStackDetection[],
  projectFiles: string[],
  configuredChecks: Set<string>,
  ciChecks: Set<string>
): CheckSuggestion[] {
  const suggestions: CheckSuggestion[] = []
  const fileSet = new Set(projectFiles)

  for (const stackEntry of techStack) {
    const ecosystemCategories = CHECK_CATEGORIES.filter(
      cat => cat.ecosystem === stackEntry.ecosystem
    )

    for (const category of ecosystemCategories) {
      // Skip if already configured
      if (configuredChecks.has(category.category)) {
        continue
      }

      // Check if this category's tools are present in the project
      const detectedIndicators = category.detection.filter(file =>
        fileSet.has(file)
      )

      // For some categories, always suggest if ecosystem is detected
      const alwaysSuggest =
        ['formatting', 'vetting'].includes(category.category) &&
        stackEntry.ecosystem === 'go'

      if (detectedIndicators.length === 0 && !alwaysSuggest) {
        continue
      }

      // Determine the reason for suggestion
      let reason: string
      if (ciChecks.has(category.category)) {
        reason = `Found in CI configuration but not in dust checks`
      } else if (detectedIndicators.length > 0) {
        reason = `Config files detected: ${detectedIndicators.join(', ')}`
      } else {
        reason = `Recommended for ${stackEntry.ecosystem} projects`
      }

      // Select the best check option based on detected files
      const suggestedCheck = selectBestCheckOption(
        category,
        fileSet,
        stackEntry.packageManager
      )
      const alternatives = category.checkOptions.filter(
        opt => opt.command !== suggestedCheck.command
      )

      suggestions.push({
        category: category.category,
        ecosystem: stackEntry.ecosystem,
        reason,
        suggestedCheck,
        alternatives,
        detectedIndicators,
      })
    }
  }

  return suggestions
}

/**
 * Selects the best check option based on detected files and package manager.
 */
function selectBestCheckOption(
  category: CheckCategory,
  projectFiles: Set<string>,
  packageManager?: string
): CheckOption {
  const options = category.checkOptions

  // For JavaScript builds, prefer package manager specific commands
  if (
    category.ecosystem === 'javascript' &&
    category.category === 'build' &&
    packageManager
  ) {
    const managerCommand = options.find(opt =>
      opt.command.includes(packageManager)
    )
    if (managerCommand) {
      return managerCommand
    }
  }

  // Prefer tools that have config files present
  for (const option of options) {
    if (
      option.command.includes('eslint') &&
      Array.from(projectFiles).some(f => f.includes('eslint'))
    ) {
      return option
    }
    if (
      option.command.includes('biome') &&
      Array.from(projectFiles).some(f => f.includes('biome'))
    ) {
      return option
    }
    if (
      option.command.includes('prettier') &&
      Array.from(projectFiles).some(f => f.includes('prettier'))
    ) {
      return option
    }
    if (option.command.includes('ruff') && projectFiles.has('ruff.toml')) {
      return option
    }
    if (
      option.command.includes('vitest') &&
      Array.from(projectFiles).some(f => f.includes('vitest'))
    ) {
      return option
    }
    if (
      option.command.includes('jest') &&
      Array.from(projectFiles).some(f => f.includes('jest'))
    ) {
      return option
    }
  }

  // Default to first option
  return options[0]
}

/**
 * Renders a check suggestion as an idea file content.
 */
export function renderCheckIdea(
  suggestion: CheckSuggestion,
  packageManager?: string
): string {
  const title = `Add ${capitalizeFirst(suggestion.category)} Check`
  const categoryName = suggestion.category.replace('-', ' ')

  // Adjust command for package manager
  let command = suggestion.suggestedCheck.command
  if (packageManager && suggestion.ecosystem === 'javascript') {
    if (command.startsWith('npm ')) {
      command = command.replace('npm ', `${packageManager} `)
    } else if (
      !command.includes(packageManager) &&
      !command.startsWith('bun') &&
      !command.startsWith('npm')
    ) {
      // For standalone tools, prefix with runner
      const runner =
        packageManager === 'bun'
          ? 'bunx'
          : packageManager === 'pnpm'
            ? 'pnpx'
            : 'npx'
      command = `${runner} ${command}`
    }
  }

  const checkConfig: CheckConfig = {
    name: suggestion.suggestedCheck.name,
    command,
  }

  let content = dedent`
    # ${title}

    Add a ${categoryName} check to the dust configuration.

    ## Detected Stack

  `

  // Add detected indicators
  if (suggestion.detectedIndicators.length > 0) {
    for (const indicator of suggestion.detectedIndicators) {
      content += `- ${indicator} present\n`
    }
  } else {
    content += `- ${capitalizeFirst(suggestion.ecosystem)} project detected\n`
  }

  content += dedent`

    ## Reason

    ${suggestion.reason}

    ## Suggested Check

    Add to \`.dust/config/settings.json\`:

    \`\`\`json
    ${JSON.stringify(checkConfig, null, 2)}
    \`\`\`

  `

  // Add alternatives if present
  if (suggestion.alternatives.length > 0) {
    content += `## Alternatives\n\n`
    for (const alt of suggestion.alternatives) {
      const altCommand = adjustCommandForPackageManager(
        alt.command,
        packageManager,
        suggestion.ecosystem
      )
      content += `- \`${altCommand}\`${alt.description ? ` - ${alt.description}` : ''}\n`
    }
  }

  return content
}

/**
 * Adjusts a command for the detected package manager.
 */
function adjustCommandForPackageManager(
  command: string,
  packageManager: string | undefined,
  ecosystem: Ecosystem
): string {
  if (!packageManager || ecosystem !== 'javascript') {
    return command
  }

  if (command.startsWith('npm ')) {
    return command.replace('npm ', `${packageManager} `)
  }

  return command
}

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// --- Stock Audit Template ---

/**
 * Returns the checks-audit stock audit template.
 */
export function checksAuditTemplate(): string {
  return dedent`
    # Checks Audit

    Analyze the project's technology ecosystem and suggest appropriate checks for \`.dust/config/settings.json\`.

    ## Scope

    This audit examines the project structure to identify:

    1. **Tech stack detection** - Identify languages, frameworks, and tools based on config files
    2. **Existing checks review** - Read \`.dust/config/settings.json\` to understand current coverage
    3. **CI configuration analysis** - Parse CI configs to find checks that run in CI but not locally
    4. **Gap identification** - Compare configured checks against what's appropriate for the detected stack

    ## Check Categories to Evaluate

    For each detected ecosystem, consider these categories:

    ### JavaScript/TypeScript
    - Linting (ESLint, oxlint, Biome)
    - Formatting (Prettier, oxfmt, Biome)
    - Type checking (tsc)
    - Build verification
    - Unit tests (Vitest, Jest)
    - Unused code detection (Knip)

    ### Python
    - Linting (Ruff, Pylint, Flake8)
    - Formatting (Ruff, Black)
    - Type checking (mypy, pyright)
    - Unit tests (pytest)

    ### Go
    - Linting (golangci-lint)
    - Formatting (gofmt)
    - Build verification
    - Unit tests
    - Vetting (go vet)

    ### Rust
    - Linting (Clippy)
    - Formatting (rustfmt)
    - Build verification
    - Unit tests

    ## Analysis Steps

    1. List all config files in the repository root to detect tech stack
    2. Read \`.dust/config/settings.json\` to identify configured checks
    3. Search for CI configuration files and parse them for check commands
    4. For each missing check category, create an idea file proposing it
    5. If CI has checks not in dust config, note the discrepancy

    ## Output

    Create separate idea files for each missing check category. Each idea should include:
    - The detected stack indicators
    - The suggested check command
    - Alternative tool options
    - Configuration snippet for settings.json

    When multiple ecosystems are detected, create separate ideas for each ecosystem's checks.

    ## Principles

    - [Batteries Included](../principles/batteries-included.md) - Dust should provide everything required for an agent to be productive
    - [Easy Adoption](../principles/easy-adoption.md) - Help users configure checks without deep research into each tool
    - [Stop the Line](../principles/stop-the-line.md) - Comprehensive checks catch problems at source
    - [Lint Everything](../principles/lint-everything.md) - Static analysis should cover as much as possible
    - [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md) - Tests are critical for agent confidence

    ## Blocked By

    (none)

    ## Definition of Done

    - [ ] Identified all tech stack indicators in the project
    - [ ] Reviewed existing checks in settings.json
    - [ ] Parsed CI configuration files for check commands
    - [ ] Created ideas for each missing check category
    - [ ] For multi-ecosystem projects, created separate ideas per ecosystem
    - [ ] Each idea includes suggested command and alternatives
  `
}

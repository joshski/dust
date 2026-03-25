/**
 * Checks Audit - Pure functions for detecting configured checks and suggesting improvements.
 *
 * This module provides the functional core for the checks-audit stock audit.
 * It identifies configured checks, parses CI configuration files, and suggests
 * missing check categories.
 *
 * Tech stack detection is imported from lib/tech-stack/.
 */

import { dedent } from '../cli/dedent'
import type { CheckConfig, DustSettings } from '../cli/types'
import type { Ecosystem, TechStackDetection } from '../tech-stack'
import { detectTechStack } from '../tech-stack'

// Re-export for backwards compatibility
export { detectTechStack }
export type { Ecosystem, TechStackDetection }

// --- Types ---

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

const CI_CHECK_PATTERNS: Record<string, string[]> = {
  linting: ['eslint', 'lint:', 'npm run lint', 'bun run lint'],
  formatting: ['prettier', 'format:', '--check'],
  'type-checking': ['tsc', 'typecheck', 'type-check'],
  build: [
    'build:',
    'npm run build',
    'bun run build',
    'go build',
    'cargo build',
  ],
  'unit-tests': [
    'test:',
    'npm test',
    'bun test',
    'pytest',
    'go test',
    'cargo test',
  ],
  'unused-code': ['knip', 'unused'],
  vetting: ['go vet'],
}

// --- Pure Functions ---

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
    for (const [category, patterns] of Object.entries(CI_CHECK_PATTERNS)) {
      if (patterns.some(pattern => content.includes(pattern))) {
        ciChecks.add(category)
      }
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
 *
 * This template is tech-stack agnostic. Agents should discover appropriate
 * checks by examining the project structure rather than receiving
 * ecosystem-specific tool prescriptions.
 */
export function checksAuditTemplate(): string {
  return dedent`
    # Checks Audit

    Analyze the project structure and suggest appropriate checks for \`.dust/config/settings.json\`.

    ## Scope

    This audit examines the project to identify gaps in check coverage:

    1. **Project structure analysis** - Examine config files to understand the technology ecosystem
    2. **Existing checks review** - Read \`.dust/config/settings.json\` to understand current coverage
    3. **CI configuration analysis** - Parse CI configs to find checks that run in CI but not locally
    4. **Gap identification** - Compare configured checks against what's appropriate for the detected stack

    ## Check Categories

    Consider these general categories when evaluating the project:

    - **Linting** - Static analysis for code quality and style
    - **Formatting** - Code formatting verification
    - **Type checking** - Static type verification (for typed languages)
    - **Build verification** - Ensuring the project builds successfully
    - **Unit tests** - Running the test suite
    - **Unused code detection** - Finding dead code, unused exports, or dependencies

    Discover the appropriate tools for each category by examining the project's config files,
    package manifests, and CI configuration. The right tools depend on the project's ecosystem.

    ## Analysis Steps

    1. List config files in the repository root to understand the tech stack
    2. Examine package manifests and tool configs to identify available check commands
    3. Read \`.dust/config/settings.json\` to identify configured checks
    4. Search for CI configuration files and parse them for check commands
    5. For each missing check category, create an idea file proposing it
    6. If CI has checks not in dust config, note the discrepancy

    ## Output

    Create separate idea files for each missing check category. Each idea should include:
    - The detected stack indicators
    - The suggested check command (discovered from project config)
    - Alternative tool options
    - Configuration snippet for settings.json

    When multiple ecosystems are detected, create separate ideas for each ecosystem's checks.

    ## Blocked By

    (none)

    ## Definition of Done

    - Analyzed project structure to identify tech stack
    - Reviewed existing checks in settings.json
    - Parsed CI configuration files for check commands
    - Created ideas for each missing check category
    - For multi-ecosystem projects, created separate ideas per ecosystem
    - Each idea includes suggested command and alternatives
    - No changes to files outside \`.dust/\`
  `
}

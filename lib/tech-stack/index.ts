/**
 * Tech Stack Detection - Pure functions for detecting project technology ecosystems.
 *
 * This module identifies the technology ecosystem(s) of a project based on
 * configuration files. It's extracted as a shared utility for use across
 * different parts of dust (audits, suggestions, etc.).
 */

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

// --- Detection Indicators ---

export const ECOSYSTEM_INDICATORS: Record<Ecosystem, string[]> = {
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

export const PACKAGE_MANAGER_FILES: Record<
  string,
  { ecosystem: Ecosystem; manager: string }
> = {
  'bun.lock': { ecosystem: 'javascript', manager: 'bun' },
  'bun.lockb': { ecosystem: 'javascript', manager: 'bun' },
  'pnpm-lock.yaml': { ecosystem: 'javascript', manager: 'pnpm' },
  'package-lock.json': { ecosystem: 'javascript', manager: 'npm' },
  'yarn.lock': { ecosystem: 'javascript', manager: 'yarn' },
}

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

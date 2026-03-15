import { describe, expect, test } from 'vitest'
import type { DustSettings } from '../cli/types'
import {
  checksAuditTemplate,
  detectCIChecks,
  detectConfiguredChecks,
  detectTechStack,
  renderCheckIdea,
  suggestChecks,
  type CIFileContent,
  type CheckSuggestion,
  type TechStackDetection,
} from './checks-audit'

describe('detectTechStack', () => {
  test('detects JavaScript ecosystem from package.json', () => {
    const files = ['package.json', 'src/index.ts']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('javascript')
    expect(result[0].indicators).toContain('package.json')
  })

  test('detects JavaScript ecosystem with bun package manager', () => {
    const files = ['package.json', 'bun.lock']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('javascript')
    expect(result[0].packageManager).toBe('bun')
  })

  test('detects JavaScript ecosystem with pnpm package manager', () => {
    const files = ['package.json', 'pnpm-lock.yaml']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].packageManager).toBe('pnpm')
  })

  test('detects JavaScript ecosystem with npm package manager', () => {
    const files = ['package.json', 'package-lock.json']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].packageManager).toBe('npm')
  })

  test('detects JavaScript ecosystem with yarn package manager', () => {
    const files = ['package.json', 'yarn.lock']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].packageManager).toBe('yarn')
  })

  test('detects TypeScript from tsconfig.json', () => {
    const files = ['tsconfig.json', 'src/index.ts']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('javascript')
    expect(result[0].indicators).toContain('tsconfig.json')
  })

  test('detects Python ecosystem from pyproject.toml', () => {
    const files = ['pyproject.toml', 'src/main.py']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('python')
    expect(result[0].indicators).toContain('pyproject.toml')
  })

  test('detects Python ecosystem from requirements.txt', () => {
    const files = ['requirements.txt']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('python')
  })

  test('detects Go ecosystem from go.mod', () => {
    const files = ['go.mod', 'go.sum', 'main.go']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('go')
    expect(result[0].indicators).toContain('go.mod')
    expect(result[0].indicators).toContain('go.sum')
  })

  test('detects Rust ecosystem from Cargo.toml', () => {
    const files = ['Cargo.toml', 'Cargo.lock', 'src/main.rs']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('rust')
    expect(result[0].indicators).toContain('Cargo.toml')
  })

  test('detects Ruby ecosystem from Gemfile', () => {
    const files = ['Gemfile', 'Gemfile.lock']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('ruby')
  })

  test('detects PHP ecosystem from composer.json', () => {
    const files = ['composer.json', 'composer.lock']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('php')
  })

  test('detects Elixir ecosystem from mix.exs', () => {
    const files = ['mix.exs', 'mix.lock']
    const result = detectTechStack(files)

    expect(result).toHaveLength(1)
    expect(result[0].ecosystem).toBe('elixir')
  })

  test('detects multiple ecosystems', () => {
    const files = ['package.json', 'bun.lock', 'requirements.txt']
    const result = detectTechStack(files)

    expect(result).toHaveLength(2)
    const ecosystems = result.map(r => r.ecosystem)
    expect(ecosystems).toContain('javascript')
    expect(ecosystems).toContain('python')
  })

  test('returns empty array when no ecosystem detected', () => {
    const files = ['README.md', 'LICENSE']
    const result = detectTechStack(files)

    expect(result).toHaveLength(0)
  })

  test('sorts results by ecosystem name', () => {
    const files = ['requirements.txt', 'go.mod', 'package.json']
    const result = detectTechStack(files)

    expect(result.map(r => r.ecosystem)).toEqual(['go', 'javascript', 'python'])
  })
})

describe('detectConfiguredChecks', () => {
  test('returns empty set when no checks configured', () => {
    const settings: DustSettings = { dustCommand: 'dust' }
    const result = detectConfiguredChecks(settings)

    expect(result.size).toBe(0)
  })

  test('returns empty set when checks array is empty', () => {
    const settings: DustSettings = { dustCommand: 'dust', checks: [] }
    const result = detectConfiguredChecks(settings)

    expect(result.size).toBe(0)
  })

  test('detects linting check from name containing lint', () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'lint', command: 'eslint .' }],
    }
    const result = detectConfiguredChecks(settings)

    expect(result.has('linting')).toBe(true)
  })

  test('detects linting check from eslint in name', () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'eslint check', command: 'eslint .' }],
    }
    const result = detectConfiguredChecks(settings)

    expect(result.has('linting')).toBe(true)
  })

  test('detects formatting check from name containing format', () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'format', command: 'prettier --check .' }],
    }
    const result = detectConfiguredChecks(settings)

    expect(result.has('formatting')).toBe(true)
  })

  test('detects type-checking from name containing type', () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'typecheck', command: 'tsc --noEmit' }],
    }
    const result = detectConfiguredChecks(settings)

    expect(result.has('type-checking')).toBe(true)
  })

  test('detects build check from name containing build', () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'build', command: 'npm run build' }],
    }
    const result = detectConfiguredChecks(settings)

    expect(result.has('build')).toBe(true)
  })

  test('detects unit-tests from name containing test', () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'test', command: 'vitest run' }],
    }
    const result = detectConfiguredChecks(settings)

    expect(result.has('unit-tests')).toBe(true)
  })

  test('detects unused-code from name containing unused', () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'unused code', command: 'knip' }],
    }
    const result = detectConfiguredChecks(settings)

    expect(result.has('unused-code')).toBe(true)
  })

  test('detects unused-code from name containing knip', () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'knip check', command: 'knip' }],
    }
    const result = detectConfiguredChecks(settings)

    expect(result.has('unused-code')).toBe(true)
  })

  test('detects vetting from name containing vet', () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [{ name: 'vet', command: 'go vet ./...' }],
    }
    const result = detectConfiguredChecks(settings)

    expect(result.has('vetting')).toBe(true)
  })

  test('detects multiple check categories', () => {
    const settings: DustSettings = {
      dustCommand: 'dust',
      checks: [
        { name: 'lint', command: 'eslint .' },
        { name: 'format', command: 'prettier --check .' },
        { name: 'test', command: 'vitest run' },
      ],
    }
    const result = detectConfiguredChecks(settings)

    expect(result.has('linting')).toBe(true)
    expect(result.has('formatting')).toBe(true)
    expect(result.has('unit-tests')).toBe(true)
  })
})

describe('detectCIChecks', () => {
  test('returns empty set when no CI files provided', () => {
    const result = detectCIChecks([])

    expect(result.size).toBe(0)
  })

  test('detects linting from eslint in CI config', () => {
    const ciFiles: CIFileContent[] = [
      { path: '.github/workflows/ci.yml', content: 'run: npm run eslint' },
    ]
    const result = detectCIChecks(ciFiles)

    expect(result.has('linting')).toBe(true)
  })

  test('detects linting from lint command in CI config', () => {
    const ciFiles: CIFileContent[] = [
      { path: '.github/workflows/ci.yml', content: 'run: npm run lint:check' },
    ]
    const result = detectCIChecks(ciFiles)

    expect(result.has('linting')).toBe(true)
  })

  test('detects formatting from prettier in CI config', () => {
    const ciFiles: CIFileContent[] = [
      { path: '.github/workflows/ci.yml', content: 'run: prettier --check .' },
    ]
    const result = detectCIChecks(ciFiles)

    expect(result.has('formatting')).toBe(true)
  })

  test('detects type-checking from tsc in CI config', () => {
    const ciFiles: CIFileContent[] = [
      { path: '.github/workflows/ci.yml', content: 'run: tsc --noEmit' },
    ]
    const result = detectCIChecks(ciFiles)

    expect(result.has('type-checking')).toBe(true)
  })

  test('detects build from npm run build in CI config', () => {
    const ciFiles: CIFileContent[] = [
      { path: '.github/workflows/ci.yml', content: 'run: npm run build' },
    ]
    const result = detectCIChecks(ciFiles)

    expect(result.has('build')).toBe(true)
  })

  test('detects unit-tests from npm test in CI config', () => {
    const ciFiles: CIFileContent[] = [
      { path: '.github/workflows/ci.yml', content: 'run: npm test' },
    ]
    const result = detectCIChecks(ciFiles)

    expect(result.has('unit-tests')).toBe(true)
  })

  test('detects unit-tests from pytest in CI config', () => {
    const ciFiles: CIFileContent[] = [
      { path: '.github/workflows/ci.yml', content: 'run: pytest' },
    ]
    const result = detectCIChecks(ciFiles)

    expect(result.has('unit-tests')).toBe(true)
  })

  test('detects unit-tests from go test in CI config', () => {
    const ciFiles: CIFileContent[] = [
      { path: '.github/workflows/ci.yml', content: 'run: go test ./...' },
    ]
    const result = detectCIChecks(ciFiles)

    expect(result.has('unit-tests')).toBe(true)
  })

  test('detects unit-tests from cargo test in CI config', () => {
    const ciFiles: CIFileContent[] = [
      { path: '.github/workflows/ci.yml', content: 'run: cargo test' },
    ]
    const result = detectCIChecks(ciFiles)

    expect(result.has('unit-tests')).toBe(true)
  })

  test('detects unused-code from knip in CI config', () => {
    const ciFiles: CIFileContent[] = [
      { path: '.github/workflows/ci.yml', content: 'run: npx knip' },
    ]
    const result = detectCIChecks(ciFiles)

    expect(result.has('unused-code')).toBe(true)
  })

  test('detects vetting from go vet in CI config', () => {
    const ciFiles: CIFileContent[] = [
      { path: '.github/workflows/ci.yml', content: 'run: go vet ./...' },
    ]
    const result = detectCIChecks(ciFiles)

    expect(result.has('vetting')).toBe(true)
  })

  test('detects multiple checks from a single CI file', () => {
    const ciFiles: CIFileContent[] = [
      {
        path: '.github/workflows/ci.yml',
        content: `
name: CI
jobs:
  lint:
    run: npm run lint
  test:
    run: npm test
  build:
    run: npm run build
`,
      },
    ]
    const result = detectCIChecks(ciFiles)

    expect(result.has('linting')).toBe(true)
    expect(result.has('unit-tests')).toBe(true)
    expect(result.has('build')).toBe(true)
  })

  test('aggregates checks from multiple CI files', () => {
    const ciFiles: CIFileContent[] = [
      { path: '.github/workflows/lint.yml', content: 'run: eslint .' },
      { path: '.github/workflows/test.yml', content: 'run: npm test' },
    ]
    const result = detectCIChecks(ciFiles)

    expect(result.has('linting')).toBe(true)
    expect(result.has('unit-tests')).toBe(true)
  })
})

describe('suggestChecks', () => {
  test('suggests linting for JavaScript project with eslint config', () => {
    const techStack: TechStackDetection[] = [
      {
        ecosystem: 'javascript',
        indicators: ['package.json', 'tsconfig.json'],
      },
    ]
    const projectFiles = ['package.json', 'tsconfig.json', '.eslintrc.json']
    const configuredChecks = new Set<string>()
    const ciChecks = new Set<string>()

    const suggestions = suggestChecks(
      techStack,
      projectFiles,
      configuredChecks,
      ciChecks
    )

    const lintSuggestion = suggestions.find(s => s.category === 'linting')
    expect(lintSuggestion).toBeDefined()
    expect(lintSuggestion?.ecosystem).toBe('javascript')
    expect(lintSuggestion?.suggestedCheck.command).toContain('eslint')
  })

  test('does not suggest linting when already configured', () => {
    const techStack: TechStackDetection[] = [
      { ecosystem: 'javascript', indicators: ['package.json'] },
    ]
    const projectFiles = ['package.json', '.eslintrc.json']
    const configuredChecks = new Set(['linting'])
    const ciChecks = new Set<string>()

    const suggestions = suggestChecks(
      techStack,
      projectFiles,
      configuredChecks,
      ciChecks
    )

    const lintSuggestion = suggestions.find(s => s.category === 'linting')
    expect(lintSuggestion).toBeUndefined()
  })

  test('suggests type-checking for TypeScript project', () => {
    const techStack: TechStackDetection[] = [
      { ecosystem: 'javascript', indicators: ['tsconfig.json'] },
    ]
    const projectFiles = ['package.json', 'tsconfig.json']
    const configuredChecks = new Set<string>()
    const ciChecks = new Set<string>()

    const suggestions = suggestChecks(
      techStack,
      projectFiles,
      configuredChecks,
      ciChecks
    )

    const typecheckSuggestion = suggestions.find(
      s => s.category === 'type-checking'
    )
    expect(typecheckSuggestion).toBeDefined()
    expect(typecheckSuggestion?.suggestedCheck.command).toContain('tsc')
  })

  test('suggests vitest when vitest config present', () => {
    const techStack: TechStackDetection[] = [
      { ecosystem: 'javascript', indicators: ['package.json'] },
    ]
    const projectFiles = ['package.json', 'vitest.config.ts']
    const configuredChecks = new Set<string>()
    const ciChecks = new Set<string>()

    const suggestions = suggestChecks(
      techStack,
      projectFiles,
      configuredChecks,
      ciChecks
    )

    const testSuggestion = suggestions.find(s => s.category === 'unit-tests')
    expect(testSuggestion).toBeDefined()
    expect(testSuggestion?.suggestedCheck.command).toContain('vitest')
  })

  test('suggests jest when jest config present', () => {
    const techStack: TechStackDetection[] = [
      { ecosystem: 'javascript', indicators: ['package.json'] },
    ]
    const projectFiles = ['package.json', 'jest.config.js']
    const configuredChecks = new Set<string>()
    const ciChecks = new Set<string>()

    const suggestions = suggestChecks(
      techStack,
      projectFiles,
      configuredChecks,
      ciChecks
    )

    const testSuggestion = suggestions.find(s => s.category === 'unit-tests')
    expect(testSuggestion).toBeDefined()
    expect(testSuggestion?.suggestedCheck.command).toContain('jest')
  })

  test('notes when check is in CI but not configured', () => {
    const techStack: TechStackDetection[] = [
      { ecosystem: 'javascript', indicators: ['package.json'] },
    ]
    const projectFiles = ['package.json', '.eslintrc.json']
    const configuredChecks = new Set<string>()
    const ciChecks = new Set(['linting'])

    const suggestions = suggestChecks(
      techStack,
      projectFiles,
      configuredChecks,
      ciChecks
    )

    const lintSuggestion = suggestions.find(s => s.category === 'linting')
    expect(lintSuggestion?.reason).toContain('Found in CI')
  })

  test('suggests formatting for Go projects', () => {
    const techStack: TechStackDetection[] = [
      { ecosystem: 'go', indicators: ['go.mod'] },
    ]
    const projectFiles = ['go.mod', 'go.sum']
    const configuredChecks = new Set<string>()
    const ciChecks = new Set<string>()

    const suggestions = suggestChecks(
      techStack,
      projectFiles,
      configuredChecks,
      ciChecks
    )

    const formatSuggestion = suggestions.find(s => s.category === 'formatting')
    expect(formatSuggestion).toBeDefined()
    expect(formatSuggestion?.suggestedCheck.command).toContain('gofmt')
  })

  test('suggests vetting for Go projects', () => {
    const techStack: TechStackDetection[] = [
      { ecosystem: 'go', indicators: ['go.mod'] },
    ]
    const projectFiles = ['go.mod']
    const configuredChecks = new Set<string>()
    const ciChecks = new Set<string>()

    const suggestions = suggestChecks(
      techStack,
      projectFiles,
      configuredChecks,
      ciChecks
    )

    const vetSuggestion = suggestions.find(s => s.category === 'vetting')
    expect(vetSuggestion).toBeDefined()
    expect(vetSuggestion?.suggestedCheck.command).toContain('go vet')
  })

  test('suggests Ruff for Python projects with ruff.toml', () => {
    const techStack: TechStackDetection[] = [
      { ecosystem: 'python', indicators: ['pyproject.toml'] },
    ]
    const projectFiles = ['pyproject.toml', 'ruff.toml']
    const configuredChecks = new Set<string>()
    const ciChecks = new Set<string>()

    const suggestions = suggestChecks(
      techStack,
      projectFiles,
      configuredChecks,
      ciChecks
    )

    const lintSuggestion = suggestions.find(s => s.category === 'linting')
    expect(lintSuggestion).toBeDefined()
    expect(lintSuggestion?.suggestedCheck.command).toContain('ruff')
  })

  test('suggests Clippy for Rust projects', () => {
    const techStack: TechStackDetection[] = [
      { ecosystem: 'rust', indicators: ['Cargo.toml'] },
    ]
    const projectFiles = ['Cargo.toml', 'Cargo.lock']
    const configuredChecks = new Set<string>()
    const ciChecks = new Set<string>()

    const suggestions = suggestChecks(
      techStack,
      projectFiles,
      configuredChecks,
      ciChecks
    )

    const lintSuggestion = suggestions.find(s => s.category === 'linting')
    expect(lintSuggestion).toBeDefined()
    expect(lintSuggestion?.suggestedCheck.command).toContain('clippy')
  })

  test('handles multi-ecosystem projects', () => {
    const techStack: TechStackDetection[] = [
      {
        ecosystem: 'javascript',
        indicators: ['package.json'],
        packageManager: 'npm',
      },
      { ecosystem: 'python', indicators: ['pyproject.toml'] },
    ]
    const projectFiles = [
      'package.json',
      'pyproject.toml',
      '.eslintrc.json',
      'ruff.toml',
    ]
    const configuredChecks = new Set<string>()
    const ciChecks = new Set<string>()

    const suggestions = suggestChecks(
      techStack,
      projectFiles,
      configuredChecks,
      ciChecks
    )

    const jsLinting = suggestions.find(
      s => s.category === 'linting' && s.ecosystem === 'javascript'
    )
    const pyLinting = suggestions.find(
      s => s.category === 'linting' && s.ecosystem === 'python'
    )

    expect(jsLinting).toBeDefined()
    expect(pyLinting).toBeDefined()
  })

  test('includes alternatives in suggestions', () => {
    const techStack: TechStackDetection[] = [
      { ecosystem: 'javascript', indicators: ['package.json'] },
    ]
    const projectFiles = ['package.json', '.eslintrc.json']
    const configuredChecks = new Set<string>()
    const ciChecks = new Set<string>()

    const suggestions = suggestChecks(
      techStack,
      projectFiles,
      configuredChecks,
      ciChecks
    )

    const lintSuggestion = suggestions.find(s => s.category === 'linting')
    expect(lintSuggestion?.alternatives.length).toBeGreaterThan(0)
  })

  test('selects bun build command when bun package manager detected', () => {
    const techStack: TechStackDetection[] = [
      {
        ecosystem: 'javascript',
        indicators: ['package.json', 'tsconfig.json'],
        packageManager: 'bun',
      },
    ]
    const projectFiles = ['package.json', 'tsconfig.json']
    const configuredChecks = new Set<string>()
    const ciChecks = new Set<string>()

    const suggestions = suggestChecks(
      techStack,
      projectFiles,
      configuredChecks,
      ciChecks
    )

    const buildSuggestion = suggestions.find(s => s.category === 'build')
    expect(buildSuggestion).toBeDefined()
    expect(buildSuggestion?.suggestedCheck.command).toContain('bun')
    // Verify the exact bun-specific command is returned (covers line 683-684)
    expect(buildSuggestion?.suggestedCheck.command).toBe('bun run build')
  })

  test('uses ecosystem recommendation for categories without config files', () => {
    // This tests the else branch for reason determination
    const techStack: TechStackDetection[] = [
      { ecosystem: 'go', indicators: ['go.mod'] },
    ]
    // Only go.mod - vetting is always suggested for go
    const projectFiles = ['go.mod']
    const configuredChecks = new Set<string>()
    const ciChecks = new Set<string>()

    const suggestions = suggestChecks(
      techStack,
      projectFiles,
      configuredChecks,
      ciChecks
    )

    // vetting should be suggested with ecosystem recommendation
    const vetSuggestion = suggestions.find(s => s.category === 'vetting')
    expect(vetSuggestion).toBeDefined()
    expect(vetSuggestion?.reason).toBe('Recommended for go projects')
  })

  test('falls back to default option when package manager command not found', () => {
    // Use yarn which doesn't have a specific build command in the options
    const techStack: TechStackDetection[] = [
      {
        ecosystem: 'javascript',
        indicators: ['package.json', 'tsconfig.json'],
        packageManager: 'yarn',
      },
    ]
    const projectFiles = ['package.json', 'tsconfig.json']
    const configuredChecks = new Set<string>()
    const ciChecks = new Set<string>()

    const suggestions = suggestChecks(
      techStack,
      projectFiles,
      configuredChecks,
      ciChecks
    )

    const buildSuggestion = suggestions.find(s => s.category === 'build')
    expect(buildSuggestion).toBeDefined()
    // Should fall back to the first option (npm run build) since yarn isn't in the commands
    expect(buildSuggestion?.suggestedCheck.command).toBe('npm run build')
  })

  test('selects biome when biome config present', () => {
    const techStack: TechStackDetection[] = [
      { ecosystem: 'javascript', indicators: ['package.json'] },
    ]
    const projectFiles = ['package.json', 'biome.json']
    const configuredChecks = new Set<string>()
    const ciChecks = new Set<string>()

    const suggestions = suggestChecks(
      techStack,
      projectFiles,
      configuredChecks,
      ciChecks
    )

    const lintSuggestion = suggestions.find(s => s.category === 'linting')
    expect(lintSuggestion).toBeDefined()
    expect(lintSuggestion?.suggestedCheck.command).toContain('biome')
  })

  test('selects prettier when prettier config present', () => {
    const techStack: TechStackDetection[] = [
      { ecosystem: 'javascript', indicators: ['package.json'] },
    ]
    const projectFiles = ['package.json', '.prettierrc']
    const configuredChecks = new Set<string>()
    const ciChecks = new Set<string>()

    const suggestions = suggestChecks(
      techStack,
      projectFiles,
      configuredChecks,
      ciChecks
    )

    const formatSuggestion = suggestions.find(s => s.category === 'formatting')
    expect(formatSuggestion).toBeDefined()
    expect(formatSuggestion?.suggestedCheck.command).toContain('prettier')
  })
})

describe('renderCheckIdea', () => {
  test('renders idea with title', () => {
    const suggestion: CheckSuggestion = {
      category: 'linting',
      ecosystem: 'javascript',
      reason: 'Config files detected: .eslintrc.json',
      suggestedCheck: { name: 'lint', command: 'eslint .' },
      alternatives: [],
      detectedIndicators: ['.eslintrc.json'],
    }

    const content = renderCheckIdea(suggestion)

    expect(content).toContain('# Add Linting Check')
  })

  test('renders detected stack indicators', () => {
    const suggestion: CheckSuggestion = {
      category: 'linting',
      ecosystem: 'javascript',
      reason: 'Config files detected: .eslintrc.json',
      suggestedCheck: { name: 'lint', command: 'eslint .' },
      alternatives: [],
      detectedIndicators: ['.eslintrc.json', 'eslint.config.js'],
    }

    const content = renderCheckIdea(suggestion)

    expect(content).toContain('.eslintrc.json present')
    expect(content).toContain('eslint.config.js present')
  })

  test('renders reason', () => {
    const suggestion: CheckSuggestion = {
      category: 'linting',
      ecosystem: 'javascript',
      reason: 'Found in CI configuration but not in dust checks',
      suggestedCheck: { name: 'lint', command: 'eslint .' },
      alternatives: [],
      detectedIndicators: [],
    }

    const content = renderCheckIdea(suggestion)

    expect(content).toContain(
      'Found in CI configuration but not in dust checks'
    )
  })

  test('renders JSON config snippet', () => {
    const suggestion: CheckSuggestion = {
      category: 'linting',
      ecosystem: 'javascript',
      reason: 'reason',
      suggestedCheck: { name: 'lint', command: 'eslint .' },
      alternatives: [],
      detectedIndicators: [],
    }

    const content = renderCheckIdea(suggestion)

    expect(content).toContain('"name": "lint"')
    expect(content).toContain('"command": "eslint ."')
  })

  test('adjusts command for bun package manager', () => {
    const suggestion: CheckSuggestion = {
      category: 'linting',
      ecosystem: 'javascript',
      reason: 'reason',
      suggestedCheck: { name: 'lint', command: 'npm run lint' },
      alternatives: [],
      detectedIndicators: [],
    }

    const content = renderCheckIdea(suggestion, 'bun')

    expect(content).toContain('"command": "bun run lint"')
  })

  test('renders alternatives section', () => {
    const suggestion: CheckSuggestion = {
      category: 'linting',
      ecosystem: 'javascript',
      reason: 'reason',
      suggestedCheck: { name: 'lint', command: 'eslint .' },
      alternatives: [
        { name: 'lint', command: 'oxlint', description: 'Fast linter' },
        { name: 'lint', command: 'biome lint .', description: 'All-in-one' },
      ],
      detectedIndicators: [],
    }

    const content = renderCheckIdea(suggestion)

    expect(content).toContain('## Alternatives')
    expect(content).toContain('`oxlint`')
    expect(content).toContain('Fast linter')
    expect(content).toContain('`biome lint .`')
  })

  test('omits alternatives section when none available', () => {
    const suggestion: CheckSuggestion = {
      category: 'type-checking',
      ecosystem: 'javascript',
      reason: 'reason',
      suggestedCheck: { name: 'typecheck', command: 'tsc --noEmit' },
      alternatives: [],
      detectedIndicators: [],
    }

    const content = renderCheckIdea(suggestion)

    expect(content).not.toContain('## Alternatives')
  })

  test('uses ecosystem name when no indicators detected', () => {
    const suggestion: CheckSuggestion = {
      category: 'formatting',
      ecosystem: 'go',
      reason: 'Recommended for go projects',
      suggestedCheck: { name: 'format', command: 'gofmt -l .' },
      alternatives: [],
      detectedIndicators: [],
    }

    const content = renderCheckIdea(suggestion)

    expect(content).toContain('Go project detected')
  })

  test('prefixes standalone tools with bunx for bun package manager', () => {
    const suggestion: CheckSuggestion = {
      category: 'linting',
      ecosystem: 'javascript',
      reason: 'reason',
      suggestedCheck: { name: 'lint', command: 'eslint .' },
      alternatives: [],
      detectedIndicators: [],
    }

    const content = renderCheckIdea(suggestion, 'bun')

    expect(content).toContain('"command": "bunx eslint ."')
  })

  test('prefixes standalone tools with pnpx for pnpm package manager', () => {
    const suggestion: CheckSuggestion = {
      category: 'linting',
      ecosystem: 'javascript',
      reason: 'reason',
      suggestedCheck: { name: 'lint', command: 'eslint .' },
      alternatives: [],
      detectedIndicators: [],
    }

    const content = renderCheckIdea(suggestion, 'pnpm')

    expect(content).toContain('"command": "pnpx eslint ."')
  })

  test('prefixes standalone tools with npx for npm package manager', () => {
    const suggestion: CheckSuggestion = {
      category: 'linting',
      ecosystem: 'javascript',
      reason: 'reason',
      suggestedCheck: { name: 'lint', command: 'eslint .' },
      alternatives: [],
      detectedIndicators: [],
    }

    const content = renderCheckIdea(suggestion, 'npm')

    expect(content).toContain('"command": "npx eslint ."')
  })

  test('does not prefix commands already containing package manager', () => {
    const suggestion: CheckSuggestion = {
      category: 'build',
      ecosystem: 'javascript',
      reason: 'reason',
      suggestedCheck: { name: 'build', command: 'bun run build' },
      alternatives: [],
      detectedIndicators: [],
    }

    const content = renderCheckIdea(suggestion, 'bun')

    expect(content).toContain('"command": "bun run build"')
    expect(content).not.toContain('bunx bun')
  })

  test('adjusts alternatives npm commands for package manager', () => {
    const suggestion: CheckSuggestion = {
      category: 'build',
      ecosystem: 'javascript',
      reason: 'reason',
      suggestedCheck: { name: 'build', command: 'bun run build' },
      alternatives: [{ name: 'build', command: 'npm run build' }],
      detectedIndicators: [],
    }

    const content = renderCheckIdea(suggestion, 'pnpm')

    // This covers adjustCommandForPackageManager lines 827-828
    expect(content).toContain('`pnpm run build`')
  })

  test('preserves non-npm alternatives in adjustCommandForPackageManager', () => {
    const suggestion: CheckSuggestion = {
      category: 'test',
      ecosystem: 'javascript',
      reason: 'reason',
      suggestedCheck: { name: 'test', command: 'vitest run' },
      alternatives: [{ name: 'test', command: 'jest' }],
      detectedIndicators: [],
    }

    const content = renderCheckIdea(suggestion, 'bun')

    // This covers adjustCommandForPackageManager line 831 (return command unchanged)
    expect(content).toContain('`jest`')
  })

  test('does not adjust non-javascript alternatives', () => {
    const suggestion: CheckSuggestion = {
      category: 'linting',
      ecosystem: 'python',
      reason: 'reason',
      suggestedCheck: { name: 'lint', command: 'ruff check .' },
      alternatives: [{ name: 'lint', command: 'pylint .' }],
      detectedIndicators: [],
    }

    const content = renderCheckIdea(suggestion, 'bun')

    expect(content).toContain('`pylint .`')
  })

  test('renders alternative without description', () => {
    const suggestion: CheckSuggestion = {
      category: 'linting',
      ecosystem: 'javascript',
      reason: 'reason',
      suggestedCheck: { name: 'lint', command: 'eslint .' },
      alternatives: [{ name: 'lint', command: 'oxlint' }],
      detectedIndicators: [],
    }

    const content = renderCheckIdea(suggestion)

    expect(content).toContain('- `oxlint`\n')
    expect(content).not.toContain('- `oxlint` - ')
  })
})

describe('checksAuditTemplate', () => {
  test('returns a valid audit template', () => {
    const template = checksAuditTemplate()

    expect(template).toContain('# Checks Audit')
    expect(template).toContain('## Scope')
    expect(template).toContain('## Definition of Done')
  })

  test('includes check categories to evaluate', () => {
    const template = checksAuditTemplate()

    expect(template).toContain('JavaScript/TypeScript')
    expect(template).toContain('Python')
    expect(template).toContain('Go')
    expect(template).toContain('Rust')
  })

  test('includes relevant principles', () => {
    const template = checksAuditTemplate()

    expect(template).toContain('Batteries Included')
    expect(template).toContain('Stop the Line')
    expect(template).toContain('Lint Everything')
  })

  test('includes analysis steps', () => {
    const template = checksAuditTemplate()

    expect(template).toContain('## Analysis Steps')
    expect(template).toContain('settings.json')
    expect(template).toContain('CI configuration')
  })
})

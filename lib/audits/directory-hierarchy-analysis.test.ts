import { describe, expect, test } from 'vitest'
import {
  analyzeDirectoryHierarchy,
  type DirectoryNode,
} from './directory-hierarchy-analysis'

describe('analyzeDirectoryHierarchy', () => {
  test('returns empty array for empty directory tree', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [],
    }

    const findings = analyzeDirectoryHierarchy(root)

    expect(findings).toEqual([])
  })

  test('filters out node_modules from analysis', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'node_modules',
          path: '/root/node_modules',
          type: 'directory',
          children: [
            {
              name: 'package',
              path: '/root/node_modules/package',
              type: 'directory',
              children: [],
            },
          ],
        },
        {
          name: 'src',
          path: '/root/src',
          type: 'directory',
          children: [],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    // Should not report issues about node_modules
    expect(
      findings.every(
        f => !f.affectedPaths.some(p => p.includes('node_modules'))
      )
    ).toBe(true)
  })

  test('filters out .git from analysis', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: '.git',
          path: '/root/.git',
          type: 'directory',
          children: [],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    expect(
      findings.every(f => !f.affectedPaths.some(p => p.includes('.git')))
    ).toBe(true)
  })

  test('filters out dist, build, coverage from analysis', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        { name: 'dist', path: '/root/dist', type: 'directory', children: [] },
        { name: 'build', path: '/root/build', type: 'directory', children: [] },
        {
          name: 'coverage',
          path: '/root/coverage',
          type: 'directory',
          children: [],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    expect(
      findings.every(
        f =>
          !f.affectedPaths.some(
            p =>
              p.includes('dist') ||
              p.includes('build') ||
              p.includes('coverage')
          )
      )
    ).toBe(true)
  })
})

describe('concern mixing detection', () => {
  test('detects directory mixing source and config files', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'lib',
          path: '/root/lib',
          type: 'directory',
          children: [
            { name: 'index.ts', path: '/root/lib/index.ts', type: 'file' },
            {
              name: 'config.json',
              path: '/root/lib/config.json',
              type: 'file',
            },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const concernMixing = findings.filter(f => f.type === 'concern-mixing')
    expect(concernMixing.length).toBeGreaterThan(0)
    expect(concernMixing[0].affectedPaths).toContain('/root/lib/index.ts')
    expect(concernMixing[0].affectedPaths).toContain('/root/lib/config.json')
    expect(concernMixing[0].description).toContain('lib')
    expect(concernMixing[0].migrationComplexity).toBe('low')
  })

  test('does not flag concern mixing in root directory', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        { name: 'index.ts', path: '/root/index.ts', type: 'file' },
        { name: 'package.json', path: '/root/package.json', type: 'file' },
        { name: 'README.md', path: '/root/README.md', type: 'file' },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const concernMixing = findings.filter(f => f.type === 'concern-mixing')
    expect(concernMixing.length).toBe(0)
  })

  test('does not flag concern mixing in config directories', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'config',
          path: '/root/config',
          type: 'directory',
          children: [
            { name: 'app.json', path: '/root/config/app.json', type: 'file' },
            {
              name: 'database.yml',
              path: '/root/config/database.yml',
              type: 'file',
            },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const concernMixing = findings.filter(f => f.type === 'concern-mixing')
    expect(concernMixing.length).toBe(0)
  })

  test('does not flag concern mixing in test directories', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: '__tests__',
          path: '/root/__tests__',
          type: 'directory',
          children: [
            {
              name: 'index.test.ts',
              path: '/root/__tests__/index.test.ts',
              type: 'file',
            },
            {
              name: 'fixtures.json',
              path: '/root/__tests__/fixtures.json',
              type: 'file',
            },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const concernMixing = findings.filter(f => f.type === 'concern-mixing')
    expect(concernMixing.length).toBe(0)
  })

  test('calculates medium complexity for 5-10 files', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'lib',
          path: '/root/lib',
          type: 'directory',
          children: [
            { name: 'a.ts', path: '/root/lib/a.ts', type: 'file' },
            { name: 'b.ts', path: '/root/lib/b.ts', type: 'file' },
            { name: 'c.ts', path: '/root/lib/c.ts', type: 'file' },
            { name: 'd.ts', path: '/root/lib/d.ts', type: 'file' },
            { name: 'e.ts', path: '/root/lib/e.ts', type: 'file' },
            {
              name: 'config.json',
              path: '/root/lib/config.json',
              type: 'file',
            },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const concernMixing = findings.filter(f => f.type === 'concern-mixing')
    expect(concernMixing[0].migrationComplexity).toBe('medium')
  })

  test('calculates high complexity for 11+ files', () => {
    const files = Array.from({ length: 11 }, (_, i) => ({
      name: `file${i}.ts`,
      path: `/root/lib/file${i}.ts`,
      type: 'file' as const,
    }))

    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'lib',
          path: '/root/lib',
          type: 'directory',
          children: [
            ...files,
            {
              name: 'config.json',
              path: '/root/lib/config.json',
              type: 'file',
            },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const concernMixing = findings.filter(f => f.type === 'concern-mixing')
    expect(concernMixing[0].migrationComplexity).toBe('high')
  })
})

describe('missing groupings detection', () => {
  test('detects test files scattered across multiple directories', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'src',
          path: '/root/src',
          type: 'directory',
          children: [
            { name: 'a.test.ts', path: '/root/src/a.test.ts', type: 'file' },
          ],
        },
        {
          name: 'lib',
          path: '/root/lib',
          type: 'directory',
          children: [
            { name: 'b.test.ts', path: '/root/lib/b.test.ts', type: 'file' },
          ],
        },
        {
          name: 'utils',
          path: '/root/utils',
          type: 'directory',
          children: [
            { name: 'c.test.ts', path: '/root/utils/c.test.ts', type: 'file' },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const missingGrouping = findings.filter(f => f.type === 'missing-grouping')
    expect(missingGrouping.length).toBeGreaterThan(0)
    expect(missingGrouping[0].affectedPaths).toHaveLength(3)
    expect(missingGrouping[0].description).toContain('test files')
    expect(missingGrouping[0].description).toContain('scattered')
    expect(missingGrouping[0].suggestedReorganization).toContain('grouping')
  })

  test('does not flag files in only 2 directories', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'src',
          path: '/root/src',
          type: 'directory',
          children: [
            { name: 'a.test.ts', path: '/root/src/a.test.ts', type: 'file' },
            { name: 'b.test.ts', path: '/root/src/b.test.ts', type: 'file' },
            { name: 'c.test.ts', path: '/root/src/c.test.ts', type: 'file' },
          ],
        },
        {
          name: 'lib',
          path: '/root/lib',
          type: 'directory',
          children: [
            { name: 'd.test.ts', path: '/root/lib/d.test.ts', type: 'file' },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const missingGrouping = findings.filter(f => f.type === 'missing-grouping')
    expect(missingGrouping.length).toBe(0)
  })

  test('requires at least 3 files to suggest grouping', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'src',
          path: '/root/src',
          type: 'directory',
          children: [
            { name: 'a.test.ts', path: '/root/src/a.test.ts', type: 'file' },
          ],
        },
        {
          name: 'lib',
          path: '/root/lib',
          type: 'directory',
          children: [
            { name: 'b.test.ts', path: '/root/lib/b.test.ts', type: 'file' },
          ],
        },
        {
          name: 'utils',
          path: '/root/utils',
          type: 'directory',
          children: [{ name: 'c.ts', path: '/root/utils/c.ts', type: 'file' }],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const missingGrouping = findings.filter(f => f.type === 'missing-grouping')
    expect(missingGrouping.length).toBe(0)
  })

  test('detects config files scattered across directories', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'a',
          path: '/root/a',
          type: 'directory',
          children: [
            { name: 'config.json', path: '/root/a/config.json', type: 'file' },
          ],
        },
        {
          name: 'b',
          path: '/root/b',
          type: 'directory',
          children: [
            {
              name: 'settings.yaml',
              path: '/root/b/settings.yaml',
              type: 'file',
            },
          ],
        },
        {
          name: 'c',
          path: '/root/c',
          type: 'directory',
          children: [
            { name: 'app.toml', path: '/root/c/app.toml', type: 'file' },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const missingGrouping = findings.filter(f => f.type === 'missing-grouping')
    expect(missingGrouping.length).toBeGreaterThan(0)
    expect(missingGrouping[0].affectedPaths).toHaveLength(3)
  })
})

describe('depth inconsistency detection', () => {
  test('detects inconsistent depth for same-purpose directories', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'components',
          path: '/root/components',
          type: 'directory',
          children: [],
        },
        {
          name: 'src',
          path: '/root/src',
          type: 'directory',
          children: [
            {
              name: 'ui',
              path: '/root/src/ui',
              type: 'directory',
              children: [
                {
                  name: 'shared',
                  path: '/root/src/ui/shared',
                  type: 'directory',
                  children: [
                    {
                      name: 'components',
                      path: '/root/src/ui/shared/components',
                      type: 'directory',
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const depthInconsistency = findings.filter(
      f => f.type === 'depth-inconsistency'
    )
    expect(depthInconsistency.length).toBeGreaterThan(0)
    expect(depthInconsistency[0].description).toContain('inconsistent depths')
  })

  test('does not flag depth inconsistencies less than 3 levels', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'utils',
          path: '/root/utils',
          type: 'directory',
          children: [],
        },
        {
          name: 'src',
          path: '/root/src',
          type: 'directory',
          children: [
            {
              name: 'utils',
              path: '/root/src/utils',
              type: 'directory',
              children: [],
            },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const depthInconsistency = findings.filter(
      f => f.type === 'depth-inconsistency'
    )
    expect(depthInconsistency.length).toBe(0)
  })

  test('only flags directories that are deeper than minimum', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'helpers',
          path: '/root/helpers',
          type: 'directory',
          children: [],
        },
        {
          name: 'a',
          path: '/root/a',
          type: 'directory',
          children: [
            {
              name: 'b',
              path: '/root/a/b',
              type: 'directory',
              children: [
                {
                  name: 'c',
                  path: '/root/a/b/c',
                  type: 'directory',
                  children: [
                    {
                      name: 'helpers',
                      path: '/root/a/b/c/helpers',
                      type: 'directory',
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const depthInconsistency = findings.filter(
      f => f.type === 'depth-inconsistency'
    )
    expect(depthInconsistency.length).toBeGreaterThan(0)
    // Should only include the deeper one
    expect(depthInconsistency[0].affectedPaths).toContain('/root/a/b/c/helpers')
    expect(depthInconsistency[0].affectedPaths).not.toContain('/root/helpers')
  })
})

describe('naming consistency detection', () => {
  test('detects naming style inconsistencies', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'my-utils',
          path: '/root/my-utils',
          type: 'directory',
          children: [],
        },
        {
          name: 'other-helpers',
          path: '/root/other-helpers',
          type: 'directory',
          children: [],
        },
        {
          name: 'more-tools',
          path: '/root/more-tools',
          type: 'directory',
          children: [],
        },
        {
          name: 'one_service',
          path: '/root/one_service',
          type: 'directory',
          children: [],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const namingInconsistency = findings.filter(
      f => f.type === 'naming-consistency'
    )
    expect(namingInconsistency.length).toBeGreaterThan(0)
    expect(namingInconsistency[0].affectedPaths).toContain('/root/one_service')
    expect(namingInconsistency[0].description).toContain('naming')
  })

  test('does not flag naming when all directories use same style', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'my-utils',
          path: '/root/my-utils',
          type: 'directory',
          children: [],
        },
        {
          name: 'other-helpers',
          path: '/root/other-helpers',
          type: 'directory',
          children: [],
        },
        {
          name: 'more-tools',
          path: '/root/more-tools',
          type: 'directory',
          children: [],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const namingInconsistency = findings.filter(
      f => f.type === 'naming-consistency'
    )
    expect(namingInconsistency.length).toBe(0)
  })

  test('only flags minority styles (less than 30% of dominant)', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        { name: 'utils', path: '/root/utils', type: 'directory', children: [] },
        {
          name: 'helpers',
          path: '/root/helpers',
          type: 'directory',
          children: [],
        },
        {
          name: 'services',
          path: '/root/services',
          type: 'directory',
          children: [],
        },
        {
          name: 'models',
          path: '/root/models',
          type: 'directory',
          children: [],
        },
        { name: 'views', path: '/root/views', type: 'directory', children: [] },
        {
          name: 'one-thing',
          path: '/root/one-thing',
          type: 'directory',
          children: [],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const namingInconsistency = findings.filter(
      f => f.type === 'naming-consistency'
    )
    // 5 lowercase vs 1 kebab-case, so 1 is 20% which is less than 30%
    expect(namingInconsistency.length).toBeGreaterThan(0)
    expect(namingInconsistency[0].affectedPaths).toHaveLength(1)
  })

  test('does not flag minority if it has 5+ directories', () => {
    const kebabDirs = Array.from({ length: 5 }, (_, i) => ({
      name: `dir-${i}`,
      path: `/root/dir-${i}`,
      type: 'directory' as const,
      children: [],
    }))

    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        ...Array.from({ length: 10 }, (_, i) => ({
          name: `dir${i}`,
          path: `/root/dir${i}`,
          type: 'directory' as const,
          children: [],
        })),
        ...kebabDirs,
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const namingInconsistency = findings.filter(
      f => f.type === 'naming-consistency'
    )
    // 5 kebab-case directories should not be flagged even though minority
    expect(namingInconsistency.length).toBe(0)
  })
})

describe('singleton directory detection', () => {
  test('detects directory with only one file', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'lonely',
          path: '/root/lonely',
          type: 'directory',
          children: [
            { name: 'single.ts', path: '/root/lonely/single.ts', type: 'file' },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const singleton = findings.filter(f => f.type === 'singleton-directory')
    expect(singleton.length).toBeGreaterThan(0)
    expect(singleton[0].affectedPaths).toContain('/root/lonely')
    expect(singleton[0].description).toContain('only one item')
    expect(singleton[0].migrationComplexity).toBe('low')
  })

  test('detects directory with only one subdirectory', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'wrapper',
          path: '/root/wrapper',
          type: 'directory',
          children: [
            {
              name: 'inner',
              path: '/root/wrapper/inner',
              type: 'directory',
              children: [
                {
                  name: 'file.ts',
                  path: '/root/wrapper/inner/file.ts',
                  type: 'file',
                },
              ],
            },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const singleton = findings.filter(f => f.type === 'singleton-directory')
    expect(singleton.length).toBeGreaterThan(0)
    expect(singleton[0].affectedPaths).toContain('/root/wrapper')
  })

  test('does not flag root directory as singleton', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [{ name: 'single.ts', path: '/root/single.ts', type: 'file' }],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const singleton = findings.filter(f => f.type === 'singleton-directory')
    expect(singleton.length).toBe(0)
  })

  test('does not flag semantic directories like src', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'src',
          path: '/root/src',
          type: 'directory',
          children: [
            { name: 'index.ts', path: '/root/src/index.ts', type: 'file' },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const singleton = findings.filter(f => f.type === 'singleton-directory')
    expect(singleton.length).toBe(0)
  })

  test('does not flag hidden directories', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: '.config',
          path: '/root/.config',
          type: 'directory',
          children: [
            {
              name: 'settings.json',
              path: '/root/.config/settings.json',
              type: 'file',
            },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const singleton = findings.filter(f => f.type === 'singleton-directory')
    expect(singleton.length).toBe(0)
  })

  test('does not flag lib directory', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'lib',
          path: '/root/lib',
          type: 'directory',
          children: [
            { name: 'index.ts', path: '/root/lib/index.ts', type: 'file' },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const singleton = findings.filter(f => f.type === 'singleton-directory')
    expect(singleton.length).toBe(0)
  })
})

describe('orphaned file detection', () => {
  test('detects files that could be grouped into subdirectories', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        { name: 'utils.ts', path: '/root/utils.ts', type: 'file' },
        { name: 'helpers.ts', path: '/root/helpers.ts', type: 'file' },
        {
          name: 'services',
          path: '/root/services',
          type: 'directory',
          children: [],
        },
        {
          name: 'models',
          path: '/root/models',
          type: 'directory',
          children: [],
        },
        { name: 'views', path: '/root/views', type: 'directory', children: [] },
        { name: 'utils', path: '/root/utils', type: 'directory', children: [] },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const orphaned = findings.filter(f => f.type === 'orphaned-file')
    expect(orphaned.length).toBeGreaterThan(0)
    expect(orphaned[0].affectedPaths).toContain('/root/utils.ts')
    expect(orphaned[0].description).toContain('could be grouped')
  })

  test('does not flag files if there are 3 or fewer subdirectories', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        { name: 'index.ts', path: '/root/index.ts', type: 'file' },
        { name: 'src', path: '/root/src', type: 'directory', children: [] },
        { name: 'lib', path: '/root/lib', type: 'directory', children: [] },
        { name: 'test', path: '/root/test', type: 'directory', children: [] },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const orphaned = findings.filter(f => f.type === 'orphaned-file')
    expect(orphaned.length).toBe(0)
  })

  test('does not flag files with no matching subdirectory purpose', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        { name: 'app.ts', path: '/root/app.ts', type: 'file' },
        { name: 'index.ts', path: '/root/index.ts', type: 'file' },
        {
          name: 'models',
          path: '/root/models',
          type: 'directory',
          children: [],
        },
        { name: 'views', path: '/root/views', type: 'directory', children: [] },
        {
          name: 'controllers',
          path: '/root/controllers',
          type: 'directory',
          children: [],
        },
        {
          name: 'services',
          path: '/root/services',
          type: 'directory',
          children: [],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const orphaned = findings.filter(f => f.type === 'orphaned-file')
    // app.ts and index.ts don't match any of the subdirectory names
    expect(orphaned.length).toBe(0)
  })

  test('flags files when category matches directory purpose', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        { name: 'model-data.ts', path: '/root/model-data.ts', type: 'file' },
        { name: 'a', path: '/root/a', type: 'directory', children: [] },
        { name: 'b', path: '/root/b', type: 'directory', children: [] },
        { name: 'c', path: '/root/c', type: 'directory', children: [] },
        {
          name: 'models',
          path: '/root/models',
          type: 'directory',
          children: [],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const orphaned = findings.filter(f => f.type === 'orphaned-file')
    expect(orphaned.length).toBeGreaterThan(0)
  })
})

describe('edge cases', () => {
  test('handles directory with no children array', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
    }

    const findings = analyzeDirectoryHierarchy(root)

    expect(findings).toEqual([])
  })

  test('handles deeply nested excluded directories', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'src',
          path: '/root/src',
          type: 'directory',
          children: [
            {
              name: 'node_modules',
              path: '/root/src/node_modules',
              type: 'directory',
              children: [
                {
                  name: 'package',
                  path: '/root/src/node_modules/package',
                  type: 'directory',
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    // Should not analyze node_modules at any depth
    expect(
      findings.every(
        f => !f.affectedPaths.some(p => p.includes('node_modules'))
      )
    ).toBe(true)
  })

  test('categorizes files with uncommon extensions', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'lib',
          path: '/root/lib',
          type: 'directory',
          children: [
            { name: 'data.xyz', path: '/root/lib/data.xyz', type: 'file' },
            { name: 'index.ts', path: '/root/lib/index.ts', type: 'file' },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    // Should still detect concern mixing with "other" category
    const concernMixing = findings.filter(f => f.type === 'concern-mixing')
    expect(concernMixing.length).toBeGreaterThan(0)
  })

  test('handles files with no extension', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'bin',
          path: '/root/bin',
          type: 'directory',
          children: [
            { name: 'script', path: '/root/bin/script', type: 'file' },
            { name: 'index.ts', path: '/root/bin/index.ts', type: 'file' },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    const concernMixing = findings.filter(f => f.type === 'concern-mixing')
    expect(concernMixing.length).toBeGreaterThan(0)
  })
})

describe('integration tests', () => {
  test('analyzes complex directory structure with multiple issues', () => {
    const root: DirectoryNode = {
      name: 'project',
      path: '/project',
      type: 'directory',
      children: [
        {
          name: 'src',
          path: '/project/src',
          type: 'directory',
          children: [
            { name: 'index.ts', path: '/project/src/index.ts', type: 'file' },
            {
              name: 'config.json',
              path: '/project/src/config.json',
              type: 'file',
            }, // concern mixing
          ],
        },
        {
          name: 'singleton',
          path: '/project/singleton',
          type: 'directory',
          children: [
            {
              name: 'only.ts',
              path: '/project/singleton/only.ts',
              type: 'file',
            }, // singleton
          ],
        },
        {
          name: 'utils',
          path: '/project/utils',
          type: 'directory',
          children: [
            {
              name: 'a.test.ts',
              path: '/project/utils/a.test.ts',
              type: 'file',
            },
          ],
        },
        {
          name: 'lib',
          path: '/project/lib',
          type: 'directory',
          children: [
            { name: 'b.test.ts', path: '/project/lib/b.test.ts', type: 'file' },
          ],
        },
        {
          name: 'services',
          path: '/project/services',
          type: 'directory',
          children: [
            {
              name: 'c.test.ts',
              path: '/project/services/c.test.ts',
              type: 'file',
            }, // missing grouping
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    // Should detect multiple issue types
    const issueTypes = new Set(findings.map(f => f.type))
    expect(issueTypes.has('concern-mixing')).toBe(true)
    expect(issueTypes.has('singleton-directory')).toBe(true)
    expect(issueTypes.has('missing-grouping')).toBe(true)
  })

  test('all findings include required fields', () => {
    const root: DirectoryNode = {
      name: 'root',
      path: '/root',
      type: 'directory',
      children: [
        {
          name: 'mixed',
          path: '/root/mixed',
          type: 'directory',
          children: [
            { name: 'a.ts', path: '/root/mixed/a.ts', type: 'file' },
            { name: 'b.json', path: '/root/mixed/b.json', type: 'file' },
          ],
        },
      ],
    }

    const findings = analyzeDirectoryHierarchy(root)

    for (const finding of findings) {
      expect(finding).toHaveProperty('type')
      expect(finding).toHaveProperty('affectedPaths')
      expect(finding).toHaveProperty('description')
      expect(finding).toHaveProperty('suggestedReorganization')
      expect(finding).toHaveProperty('migrationComplexity')
      expect(Array.isArray(finding.affectedPaths)).toBe(true)
      expect(finding.affectedPaths.length).toBeGreaterThan(0)
      expect(['low', 'medium', 'high']).toContain(finding.migrationComplexity)
    }
  })
})

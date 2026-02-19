import { createCoverageMap } from 'istanbul-lib-coverage'
import { createContext } from 'istanbul-lib-report'
import FileWriter from 'istanbul-lib-report/lib/file-writer'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import IncompleteCoverageReporter from './minimal-reporter.cjs'

function fullCoverageFile(path: string) {
  return {
    path,
    statementMap: {
      '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
    },
    fnMap: {
      '0': {
        name: 'test',
        decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
        loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      },
    },
    branchMap: {},
    s: { '0': 1 },
    f: { '0': 1 },
    b: {},
  }
}

function partialCoverageFile(path: string) {
  return {
    path,
    statementMap: {
      '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      '1': { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
    },
    fnMap: {},
    branchMap: {},
    s: { '0': 1, '1': 0 },
    f: {},
    b: {},
  }
}

function executeReporter(coverageMap: ReturnType<typeof createCoverageMap>) {
  const context = createContext({ coverageMap, dir: '/tmp/coverage' })
  const reporter = new IncompleteCoverageReporter()
  reporter.execute(context)
}

describe('IncompleteCoverageReporter', () => {
  beforeEach(() => {
    FileWriter.resetOutput()
    FileWriter.startCapture()
  })

  afterEach(() => {
    FileWriter.stopCapture()
    FileWriter.resetOutput()
  })

  it('outputs success message when all files have 100% coverage', () => {
    const coverageMap = createCoverageMap()
    coverageMap.addFileCoverage(fullCoverageFile('/src/a.ts'))
    coverageMap.addFileCoverage(fullCoverageFile('/src/b.ts'))

    executeReporter(coverageMap)

    expect(FileWriter.getOutput()).toContain('✔ 100% coverage!')
  })

  it('shows only files with less than 100% coverage', () => {
    const coverageMap = createCoverageMap()
    coverageMap.addFileCoverage(fullCoverageFile('/src/full.ts'))
    coverageMap.addFileCoverage(partialCoverageFile('/src/partial.ts'))

    executeReporter(coverageMap)

    const output = FileWriter.getOutput()
    expect(output).toContain('partial.ts')
    expect(output).not.toContain('full.ts')
  })

  it('reports singular file count', () => {
    const coverageMap = createCoverageMap()
    coverageMap.addFileCoverage(partialCoverageFile('/src/partial.ts'))

    executeReporter(coverageMap)

    expect(FileWriter.getOutput()).toContain('1 file has < 100% coverage:')
  })

  it('reports plural file count', () => {
    const coverageMap = createCoverageMap()
    coverageMap.addFileCoverage(partialCoverageFile('/src/a.ts'))
    coverageMap.addFileCoverage(partialCoverageFile('/src/b.ts'))

    executeReporter(coverageMap)

    expect(FileWriter.getOutput()).toContain('2 files have < 100% coverage:')
  })

  it('shows coverage percentages for incomplete metrics', () => {
    const coverageMap = createCoverageMap()
    coverageMap.addFileCoverage(partialCoverageFile('/src/partial.ts'))

    executeReporter(coverageMap)

    expect(FileWriter.getOutput()).toContain(
      'partial.ts (50% lines, 50% statements)'
    )
  })

  it('shows uncovered lines', () => {
    const coverageMap = createCoverageMap()
    coverageMap.addFileCoverage(partialCoverageFile('/src/partial.ts'))

    executeReporter(coverageMap)

    expect(FileWriter.getOutput()).toContain('- Line 2')
  })

  it('shows lines with uncovered branches', () => {
    const coverageMap = createCoverageMap()
    coverageMap.addFileCoverage({
      path: '/src/branch.ts',
      statementMap: {
        '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      },
      fnMap: {},
      branchMap: {
        '0': {
          loc: { start: { line: 3, column: 0 }, end: { line: 3, column: 20 } },
          type: 'if',
          locations: [],
        },
      },
      s: { '0': 1 },
      f: {},
      b: { '0': [1, 0] },
    })

    executeReporter(coverageMap)

    expect(FileWriter.getOutput()).toContain('- Line 3')
  })

  it('deduplicates a line that is both uncovered and has a branch gap', () => {
    const coverageMap = createCoverageMap()
    coverageMap.addFileCoverage({
      path: '/src/both.ts',
      statementMap: {
        '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
        '1': { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
      },
      fnMap: {},
      branchMap: {
        '0': {
          loc: { start: { line: 2, column: 0 }, end: { line: 2, column: 20 } },
          type: 'if',
          locations: [],
        },
      },
      s: { '0': 1, '1': 0 },
      f: {},
      b: { '0': [0, 0] },
    })

    executeReporter(coverageMap)

    const output = FileWriter.getOutput()
    expect(output.match(/Line 2/g)?.length).toBe(1)
  })

  it('shows uncovered line ranges', () => {
    const coverageMap = createCoverageMap()
    coverageMap.addFileCoverage({
      path: '/src/range.ts',
      statementMap: {
        '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
        '1': { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
        '2': { start: { line: 3, column: 0 }, end: { line: 3, column: 10 } },
        '3': { start: { line: 4, column: 0 }, end: { line: 4, column: 10 } },
      },
      fnMap: {},
      branchMap: {},
      s: { '0': 1, '1': 0, '2': 0, '3': 1 },
      f: {},
      b: {},
    })

    executeReporter(coverageMap)

    expect(FileWriter.getOutput()).toContain('- Lines 2-3')
  })
})

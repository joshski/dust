const { ReportBase } = require('istanbul-lib-report')

function isFull(metrics) {
  return (
    metrics.statements.pct === 100 &&
    metrics.branches.pct === 100 &&
    metrics.functions.pct === 100 &&
    metrics.lines.pct === 100
  )
}

function formatMetrics(metrics) {
  const parts = []
  if (metrics.lines.pct < 100) parts.push(`${metrics.lines.pct}% lines`)
  if (metrics.statements.pct < 100)
    parts.push(`${metrics.statements.pct}% statements`)
  if (metrics.branches.pct < 100)
    parts.push(`${metrics.branches.pct}% branches`)
  if (metrics.functions.pct < 100)
    parts.push(`${metrics.functions.pct}% functions`)
  return parts.join(', ')
}

function getGapLines(fileCoverage) {
  const gapLines = new Set()

  const lineCoverage = fileCoverage.getLineCoverage()
  for (const [lineStr, hits] of Object.entries(lineCoverage)) {
    if (hits === 0) gapLines.add(Number.parseInt(lineStr, 10))
  }

  const { branchMap, b } = fileCoverage
  for (const [id, branch] of Object.entries(branchMap)) {
    if (b[id].some(hits => hits === 0)) {
      gapLines.add(branch.loc.start.line)
    }
  }

  const sorted = [...gapLines].toSorted((x, y) => x - y)
  const ranges = []
  let rangeStart = null
  let rangeEnd = null

  for (const line of sorted) {
    if (rangeStart === null) {
      rangeStart = line
      rangeEnd = line
    } else if (line === rangeEnd + 1) {
      rangeEnd = line
    } else {
      ranges.push([rangeStart, rangeEnd])
      rangeStart = line
      rangeEnd = line
    }
  }

  if (rangeStart !== null) {
    ranges.push([rangeStart, rangeEnd])
  }

  return ranges.map(([start, end]) =>
    start === end ? `Line ${start}` : `Lines ${start}-${end}`
  )
}

class IncompleteCoverageReporter extends ReportBase {
  execute(context) {
    const incompleteFiles = []
    context.getTree().visit({
      onDetail(node) {
        const metrics = node.getCoverageSummary()
        if (!metrics.isEmpty() && !isFull(metrics)) {
          incompleteFiles.push({
            name: node.getQualifiedName(),
            metrics,
            fileCoverage: node.getFileCoverage(),
          })
        }
      },
    })

    if (incompleteFiles.length === 0) {
      const cw = context.writer.writeFile(null)
      cw.println('✔ 100% coverage!')
      cw.close()
      return
    }

    const cw = context.writer.writeFile(null)
    const count = incompleteFiles.length
    const label = count === 1 ? '1 file has' : `${count} files have`
    cw.println(`${label} < 100% coverage:`)

    for (const file of incompleteFiles) {
      cw.println('')
      cw.println(`${file.name} (${formatMetrics(file.metrics)})`)
      for (const line of getGapLines(file.fileCoverage)) {
        cw.println(`- ${line}`)
      }
    }

    cw.close()
  }
}

module.exports = IncompleteCoverageReporter

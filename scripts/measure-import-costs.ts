/**
 * Measures the time and memory cost of importing each dependency.
 *
 * Usage: bun scripts/measure-import-costs.ts
 *
 * Each package is imported in an isolated subprocess to get
 * clean measurements without cross-contamination. Memory is
 * measured as RSS delta against a baseline (empty) process.
 */

const packages = ['pg', '@electric-sql/pglite']

interface MeasureResult {
  package: string
  importTimeMs: number
  rssBytes: number
  diskBytes: number
  error?: string
}

async function runSubprocess(script: string): Promise<{
  stdout: string
  stderr: string
  exitCode: number
}> {
  const proc = Bun.spawn(['bun', '--eval', script], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  await proc.exited

  return { stdout, stderr, exitCode: proc.exitCode ?? 1 }
}

async function measureBaseline(): Promise<number> {
  const script = `
    console.log(JSON.stringify({ rss: process.memoryUsage().rss }));
  `
  const { stdout } = await runSubprocess(script)
  return JSON.parse(stdout.trim()).rss
}

async function measurePackage(
  packageName: string,
  baselineRss: number
): Promise<MeasureResult> {
  const script = `
    const start = performance.now();
    await import(${JSON.stringify(packageName)});
    const elapsed = performance.now() - start;
    const rss = process.memoryUsage().rss;
    console.log(JSON.stringify({ importTimeMs: elapsed, rss }));
  `

  const { stdout, stderr, exitCode } = await runSubprocess(script)

  if (exitCode !== 0) {
    return {
      package: packageName,
      importTimeMs: 0,
      rssBytes: 0,
      diskBytes: 0,
      error: stderr.trim().split('\n')[0],
    }
  }

  const data = JSON.parse(stdout.trim())
  const diskBytes = await measureDiskSize(packageName)

  return {
    package: packageName,
    importTimeMs: data.importTimeMs,
    rssBytes: Math.max(0, data.rss - baselineRss),
    diskBytes,
  }
}

async function measureDiskSize(packageName: string): Promise<number> {
  const proc = Bun.spawn(
    ['du', '-sb', `node_modules/${packageName}`],
    { stdout: 'pipe', stderr: 'pipe', cwd: import.meta.dir + '/..' }
  )
  const output = await new Response(proc.stdout).text()
  await proc.exited
  const match = output.match(/^(\d+)/)
  return match ? Number.parseInt(match[1], 10) : 0
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function median(values: number[]): number {
  const sorted = [...values].sort((first, second) => first - second)
  return sorted[Math.floor(sorted.length / 2)]
}

const iterations = 5

// Measure baseline RSS (empty bun process)
const baselineSamples: number[] = []
for (let index = 0; index < iterations; index++) {
  baselineSamples.push(await measureBaseline())
}
const baselineRss = median(baselineSamples)

const results: MeasureResult[] = []

for (const packageName of packages) {
  const samples: MeasureResult[] = []
  for (let index = 0; index < iterations; index++) {
    samples.push(await measurePackage(packageName, baselineRss))
  }

  const successful = samples.filter(sample => !sample.error)
  if (successful.length === 0) {
    results.push(samples[0])
    continue
  }

  results.push({
    package: packageName,
    importTimeMs: median(successful.map(sample => sample.importTimeMs)),
    rssBytes: median(successful.map(sample => sample.rssBytes)),
    diskBytes: successful[0].diskBytes,
  })
}

// Sort by import time descending
results.sort((first, second) => second.importTimeMs - first.importTimeMs)

console.log('')
console.log('Import Cost Results (median of 5 runs)')
console.log('='.repeat(68))
console.log('')

const nameWidth = Math.max(
  ...results.map(result => result.package.length),
  7
)

console.log(
  `${'Package'.padEnd(nameWidth)}  ${'Time'.padStart(10)}  ${'RSS delta'.padStart(12)}  ${'Disk'.padStart(10)}`
)
console.log('-'.repeat(nameWidth + 38))

for (const result of results) {
  if (result.error) {
    console.log(
      `${result.package.padEnd(nameWidth)}  ${'ERROR'.padStart(10)}  ${result.error}`
    )
  } else {
    const time = `${result.importTimeMs.toFixed(1)} ms`
    const rss = formatBytes(result.rssBytes)
    const disk = formatBytes(result.diskBytes)
    console.log(
      `${result.package.padEnd(nameWidth)}  ${time.padStart(10)}  ${rss.padStart(12)}  ${disk.padStart(10)}`
    )
  }
}

console.log('')
console.log(`Baseline RSS: ${formatBytes(baselineRss)}`)
console.log('')

declare module 'istanbul-lib-coverage' {
  interface CoverageMap {
    addFileCoverage(coverage: object): void
  }
  export function createCoverageMap(): CoverageMap
}

declare module 'istanbul-lib-report' {
  export function createContext(options: {
    coverageMap: object
    dir: string
  }): object
}

declare module 'istanbul-lib-report/lib/file-writer' {
  const FileWriter: {
    startCapture(): void
    stopCapture(): void
    getOutput(): string
    resetOutput(): void
  }
  export default FileWriter
}

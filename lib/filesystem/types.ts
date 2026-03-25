/**
 * Filesystem abstraction types used across the codebase.
 */

export interface WriteOptions {
  flag?: 'w' | 'wx' // 'w' = overwrite (default), 'wx' = exclusive create (fail if exists)
}

export interface FileReader {
  exists: (path: string) => boolean
  readFile: (path: string) => Promise<string>
}

export interface DirectoryReader {
  readdir: (path: string) => Promise<string[]>
  isDirectory: (path: string) => boolean
}

export interface ReadableFileSystem extends FileReader, DirectoryReader {}

export interface FileSystem extends ReadableFileSystem {
  writeFile: (
    path: string,
    content: string,
    options?: WriteOptions
  ) => Promise<void>
  mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>
  chmod: (path: string, mode: number) => Promise<void>
  getFileCreationTime: (path: string) => number
  rename: (oldPath: string, newPath: string) => Promise<void>
}

export interface GlobScanner {
  scan: (dir: string) => AsyncIterable<string>
}

/**
 * dust bucket asset upload - Upload a file to dustbucket
 *
 * Usage: dust bucket asset upload <file-path>
 *
 * Uploads a file to the dustbucket server and outputs the public URL.
 * Reuses the same authentication infrastructure as `dust bucket`.
 */

import { spawn as nodeSpawn } from 'node:child_process'
import { accessSync, statSync } from 'node:fs'
import { chmod, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { createServer as httpCreateServer } from 'node:http'
import { homedir } from 'node:os'
import { extname } from 'node:path'
import {
  type AuthDependencies,
  authenticate,
  getDustbucketHost,
  loadStoredToken,
  storeToken,
} from '../../bucket/auth'
import type { CommandDependencies, CommandResult } from '../types'
import { type AuthFileSystemDependencies, createAuthFileSystem } from './bucket'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.pdf',
  '.txt',
  '.json',
  '.csv',
  '.md',
  '.html',
  '.xml',
])

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.md': 'text/markdown',
  '.html': 'text/html',
  '.xml': 'application/xml',
}

export interface UploadDependencies {
  auth: AuthDependencies
  readFileBytes: (path: string) => Promise<Uint8Array>
  getFileSize: (path: string) => Promise<number>
  fileExists: (path: string) => Promise<boolean>
  uploadFile: (
    url: string,
    token: string,
    fileBytes: Uint8Array,
    contentType: string
  ) => Promise<{ url: string }>
}

/* v8 ignore start - thin wrappers around native functions */
function defaultCreateServer(handler: (request: Request) => Response): {
  port: number
  stop: () => void
} {
  let resolvedPort = 0
  const server = httpCreateServer(async (nodeRequest, nodeResponse) => {
    const url = new URL(
      nodeRequest.url ?? '/',
      `http://localhost:${resolvedPort}`
    )
    const request = new Request(url.toString(), {
      method: nodeRequest.method ?? 'GET',
    })
    const response = handler(request)
    const body = await response.text()
    nodeResponse.writeHead(response.status, {
      'Content-Type': response.headers.get('content-type') ?? 'text/plain',
    })
    nodeResponse.end(body)
  })
  server.listen(0, () => {
    const addr = server.address()
    if (addr && typeof addr === 'object') {
      resolvedPort = addr.port
    }
  })
  const addr = server.address()
  if (addr && typeof addr === 'object') {
    resolvedPort = addr.port
  }
  return { port: resolvedPort, stop: () => server.close() }
}

function defaultOpenBrowser(url: string): void {
  const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open'
  nodeSpawn(cmd, [url], { stdio: 'ignore', detached: true }).unref()
}

export function createDefaultUploadDependencies(): UploadDependencies {
  const authFileSystemDeps: AuthFileSystemDependencies = {
    accessSync,
    statSync,
    readFile,
    writeFile,
    mkdir,
    readdir,
    chmod,
    rename: (oldPath, newPath) =>
      import('node:fs/promises').then(mod => mod.rename(oldPath, newPath)),
  }
  const authFileSystem = createAuthFileSystem(authFileSystemDeps)

  return {
    auth: {
      createServer: defaultCreateServer,
      openBrowser: defaultOpenBrowser,
      getHomeDir: () => homedir(),
      fileSystem: authFileSystem,
    },
    readFileBytes: async (path: string) => {
      const buffer = await Bun.file(path).arrayBuffer()
      return new Uint8Array(buffer)
    },
    getFileSize: async (path: string) => {
      const file = Bun.file(path)
      return file.size
    },
    fileExists: async (path: string) => {
      const file = Bun.file(path)
      return file.exists()
    },
    uploadFile: async (
      url: string,
      token: string,
      fileBytes: Uint8Array,
      contentType: string
    ) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': contentType,
        },
        body: new Blob([fileBytes as unknown as ArrayBuffer]),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(
          `Upload failed (${response.status}): ${text || response.statusText}`
        )
      }
      const body = await response.json()
      if (typeof body.url !== 'string') {
        throw new Error('Server response missing URL')
      }
      return { url: body.url }
    },
  }
}
/* v8 ignore stop */

async function resolveToken(
  authDeps: AuthDependencies,
  context: CommandDependencies['context']
): Promise<string | null> {
  // 1. Environment variable
  const envToken = process.env.DUST_BUCKET_TOKEN
  if (envToken) {
    return envToken
  }

  // 2. Stored credential
  const stored = await loadStoredToken(
    authDeps.fileSystem,
    authDeps.getHomeDir()
  )
  if (stored) {
    return stored
  }

  // 3. Browser auth flow
  context.stdout('Opening browser to authenticate with dustbucket...')
  try {
    const token = await authenticate(authDeps)
    await storeToken(authDeps.fileSystem, authDeps.getHomeDir(), token)
    context.stdout('Authenticated successfully')
    return token
  } catch (error) {
    context.stderr(`Authentication failed: ${(error as Error).message}`)
    return null
  }
}

export function getContentType(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || 'application/octet-stream'
}

export function isAllowedExtension(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase()
  return ALLOWED_EXTENSIONS.has(ext)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function bucketAssetUpload(
  dependencies: CommandDependencies,
  uploadDeps: UploadDependencies = createDefaultUploadDependencies(),
  env: NodeJS.ProcessEnv = process.env
): Promise<CommandResult> {
  const { context } = dependencies
  const filePath = dependencies.arguments[0]

  if (!filePath) {
    context.stderr('Usage: dust bucket asset upload <file-path>')
    return { exitCode: 1 }
  }

  // Require repository context
  const repositoryId = env.DUST_REPOSITORY_ID
  if (!repositoryId) {
    context.stderr('Error: DUST_REPOSITORY_ID environment variable is not set.')
    context.stderr(
      'This command must be run within a repository context (via `dust bucket`).'
    )
    return { exitCode: 1 }
  }

  // Validate file exists
  const exists = await uploadDeps.fileExists(filePath)
  if (!exists) {
    context.stderr(`File not found: ${filePath}`)
    return { exitCode: 1 }
  }

  // Validate file extension
  if (!isAllowedExtension(filePath)) {
    const ext = extname(filePath).toLowerCase() || '(no extension)'
    const allowed = Array.from(ALLOWED_EXTENSIONS).join(', ')
    context.stderr(`Unsupported file type: ${ext}`)
    context.stderr(`Allowed types: ${allowed}`)
    return { exitCode: 1 }
  }

  // Validate file size
  const fileSize = await uploadDeps.getFileSize(filePath)
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    context.stderr(
      `File too large: ${formatFileSize(fileSize)} (max ${formatFileSize(MAX_FILE_SIZE_BYTES)})`
    )
    return { exitCode: 1 }
  }

  // Resolve auth token
  const token = await resolveToken(uploadDeps.auth, context)
  if (!token) {
    return { exitCode: 1 }
  }

  // Read file and upload
  const fileBytes = await uploadDeps.readFileBytes(filePath)
  const contentType = getContentType(filePath)
  const uploadUrl = `${getDustbucketHost()}/api/assets?repositoryId=${encodeURIComponent(repositoryId)}`

  try {
    const result = await uploadDeps.uploadFile(
      uploadUrl,
      token,
      fileBytes,
      contentType
    )
    context.stdout(result.url)
    return { exitCode: 0 }
  } catch (error) {
    context.stderr(`Upload failed: ${(error as Error).message}`)
    return { exitCode: 1 }
  }
}

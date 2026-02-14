import { join } from 'node:path'
import type { FileSystem } from '../cli/types'

const CREDENTIALS_DIR = '.dust'
const CREDENTIALS_FILE = 'credentials.json'
const AUTH_TIMEOUT_MS = 120_000
const DEFAULT_DUSTBUCKET_HOST = 'https://dustbucket.com'

export function getDustbucketHost(): string {
  return process.env.DUST_BUCKET_HOST || DEFAULT_DUSTBUCKET_HOST
}

export interface AuthDependencies {
  createServer: (handler: (request: Request) => Response) => {
    port: number
    stop: () => void
  }
  openBrowser: (url: string) => void
  getHomeDir: () => string
  fileSystem: FileSystem
  authTimeoutMs?: number
}

function credentialsPath(homeDir: string): string {
  return join(homeDir, CREDENTIALS_DIR, CREDENTIALS_FILE)
}

export async function loadStoredToken(
  fileSystem: FileSystem,
  homeDir: string
): Promise<string | null> {
  const path = credentialsPath(homeDir)
  try {
    const content = await fileSystem.readFile(path)
    const data = JSON.parse(content)
    return typeof data.token === 'string' ? data.token : null
  } catch {
    return null
  }
}

export async function storeToken(
  fileSystem: FileSystem,
  homeDir: string,
  token: string
): Promise<void> {
  const dirPath = join(homeDir, CREDENTIALS_DIR)
  await fileSystem.mkdir(dirPath, { recursive: true })
  await fileSystem.writeFile(
    credentialsPath(homeDir),
    JSON.stringify({ token })
  )
}

export async function clearToken(
  fileSystem: FileSystem,
  homeDir: string
): Promise<void> {
  const path = credentialsPath(homeDir)
  try {
    await fileSystem.writeFile(path, '{}')
  } catch {
    // If file doesn't exist, nothing to clear
  }
}

export async function authenticate(
  authDeps: AuthDependencies
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let serverHandle: { stop: () => void } | null = null

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (serverHandle) {
        serverHandle.stop()
        serverHandle = null
      }
    }

    const handler = (request: Request): Response => {
      const url = new URL(request.url)
      if (url.pathname === '/callback') {
        const token = url.searchParams.get('token')
        if (token) {
          cleanup()
          resolve(token)
          return new Response(
            '<html><body><p>Authentication successful! You can close this tab.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          )
        }
        return new Response('Missing token', { status: 400 })
      }
      return new Response('Not found', { status: 404 })
    }

    try {
      const server = authDeps.createServer(handler)
      serverHandle = server

      const dustbucketUrl = getDustbucketHost()
      const authUrl = `${dustbucketUrl}/auth/cli?port=${server.port}`
      authDeps.openBrowser(authUrl)

      timer = setTimeout(() => {
        cleanup()
        reject(new Error('Authentication timed out'))
      }, authDeps.authTimeoutMs ?? AUTH_TIMEOUT_MS)
    } catch (error) {
      cleanup()
      reject(error)
    }
  })
}

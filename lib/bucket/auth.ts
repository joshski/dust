import { join } from 'node:path'
import type { FileSystem } from '../filesystem/types'

const CREDENTIALS_DIR = '.dust'
const CREDENTIALS_FILE = 'credentials.json'
const AUTH_TIMEOUT_MS = 120_000
const DEFAULT_DUSTBUCKET_HOST = 'https://dustbucket.com'

export function getDustbucketHost(
  env: NodeJS.ProcessEnv = process.env
): string {
  return env.DUST_BUCKET_HOST || DEFAULT_DUSTBUCKET_HOST
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
  exchangeCode?: (code: string) => Promise<string>
  fetch?: typeof fetch
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
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null
    }
    throw error
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
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // If file doesn't exist, nothing to clear
      return
    }
    throw error
  }
}

/** Visible for testing */
export async function defaultExchangeCode(
  code: string,
  fetchFn: typeof fetch = fetch
): Promise<string> {
  const host = getDustbucketHost()
  const response = await fetchFn(`${host}/auth/cli/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`)
  }
  const body = await response.json()
  if (typeof body.token !== 'string') {
    throw new Error('Invalid token exchange response')
  }
  return body.token
}

export async function authenticate(
  authDeps: AuthDependencies
): Promise<string> {
  const exchange =
    authDeps.exchangeCode ??
    ((code: string) => defaultExchangeCode(code, authDeps.fetch))

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
        const code = url.searchParams.get('code')
        if (code) {
          cleanup()
          exchange(code).then(resolve, reject)
          return new Response(
            `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authorized</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #0a0a0a; color: #fafafa; }
    .card { text-align: center; padding: 2rem; border: 1px solid #333; border-radius: 8px; max-width: 400px; }
    h1 { font-size: 1.25rem; margin-bottom: 1rem; }
    p { color: #999; }
  </style>
</head>
<body>
  <div class="card">
    <svg width="64" height="64" viewBox="0 0 512 512" fill="#fafafa" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 1rem;">
      <path d="M392.566 159.4c-.649-79.601-31.851-134.481-80.25-141.944l-1.443-10.127a8.52 8.52 0 0 0-3.339-5.619 8.52 8.52 0 0 0-6.327-1.622l-92.99 13.287c-4.671.666-7.916 4.995-7.25 9.666l1.605 11.229c-.709.179-1.417.307-2.075.692-52.122 30.126-68.688 71.677-77.346 122.859-34.293 13.773-55.008 33.157-55.008 55.316 0 11.997 6.242 23.149 17.24 33.072-.12.922 42.712 207.763 42.712 207.763.06.273.128.555.213.828 10.64 33.678 63.146 57.203 127.693 57.203 66.963 0 118.308-23.107 127.906-58.031 0 0 42.832-206.841 42.712-207.763 10.998-9.922 17.24-21.074 17.24-33.072.001-21.34-19.264-40.083-51.293-53.737m-276.281 51.072a2180 2180 0 0 1-4.022 33.712c-17.326-9.606-27.043-20.545-27.043-31.048 0-11.989 12.723-24.541 34.933-35.044-1.374 10.452-2.612 21.219-3.868 32.38m88.849-158.254.658 4.637a8.52 8.52 0 0 0 3.339 5.619 8.5 8.5 0 0 0 5.123 1.708c.401 0 .811-.026 1.213-.085l92.99-13.287c4.671-.666 7.916-4.995 7.25-9.666l-.837-5.858c35.497 9.077 58.509 53.642 60.482 117.634-32.021-10.477-73.214-16.634-119.35-16.634-43.797 0-83.051 5.593-114.312 15.123 8.205-41.8 23.439-74.573 63.444-99.191m50.867 220.691c-52.891 0-97.217-8.735-127.505-21.1 1.819-13.645 3.339-26.778 4.756-39.425 1.648-14.704 3.228-28.555 5.149-41.653 29.724-10.341 70.208-17.368 117.6-17.368 100.641 0 170.781 31.5 170.781 59.773s-70.14 59.773-170.781 59.773"/>
    </svg>
    <h1>Your agent is connected!</h1>
    <p>You can close this tab.</p>
  </div>
</body>
</html>`,
            { headers: { 'Content-Type': 'text/html' } }
          )
        }
        return new Response('Missing code', { status: 400 })
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

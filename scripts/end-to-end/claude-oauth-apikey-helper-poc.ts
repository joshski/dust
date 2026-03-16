/**
 * POC: Use apiKeyHelper + host gateway while keeping CLAUDE_CODE_OAUTH_TOKEN
 * out of the container environment.
 *
 * Flow:
 * - Container runs `claude` with:
 *   - ANTHROPIC_BASE_URL=http://host.docker.internal:<port>
 *   - settings file containing `apiKeyHelper` command
 * - apiKeyHelper fetches a synthetic sidecar token from /token
 * - Host gateway accepts only that sidecar token, then injects the real
 *   CLAUDE_CODE_OAUTH_TOKEN upstream to api.anthropic.com.
 *
 * Run:
 *   bun scripts/end-to-end/claude-oauth-apikey-helper-poc.ts
 */

import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DOCKER_IMAGE = 'claude-oauth-poc'
const DOCKERFILE = `FROM node:20-bookworm
RUN npm -g install @anthropic-ai/claude-code
RUN useradd -m -s /bin/bash user
USER user
WORKDIR /workspace
`

interface CommandResult {
  code: number
  stdout: string
  stderr: string
}

interface GatewayStats {
  tokenHits: number
  proxied: number
  authFailures: number
  upstreamStatuses: number[]
}

function short(text: string, max = 260): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max)}...`
}

function maskToken(token: string): string {
  if (token.length <= 20) return `${token.slice(0, 6)}...`
  return `${token.slice(0, 13)}...${token.slice(-6)}`
}

function randomSidecarToken(): string {
  // Looks like a Claude API key format so Claude accepts helper output.
  return `sk-ant-api03-${Buffer.from(
    crypto.randomUUID().replaceAll('-', '') +
      crypto.randomUUID().replaceAll('-', '')
  )
    .toString('hex')
    .slice(0, 96)}`
}

function runCommand(
  command: string,
  commandArguments: string[],
  options: {
    env?: Record<string, string | undefined>
    cwd?: string
    stdin?: string
  } = {}
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, commandArguments, {
      cwd: options.cwd,
      env: options.env ? { ...process.env, ...options.env } : process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    proc.on('error', reject)
    proc.on('close', code => {
      resolve({ code: code ?? 1, stdout, stderr })
    })

    if (options.stdin) {
      proc.stdin.write(options.stdin)
    }
    proc.stdin.end()
  })
}

async function ensureDockerImage(image: string): Promise<void> {
  const inspect = await runCommand('docker', ['image', 'inspect', image])
  if (inspect.code === 0) return

  const build = await runCommand('docker', ['build', '-t', image, '-'], {
    stdin: DOCKERFILE,
  })
  if (build.code !== 0) {
    throw new Error(`docker build failed: ${short(build.stderr)}`)
  }
}

async function main() {
  const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN
  if (!oauthToken) {
    console.error('Missing required env var: CLAUDE_CODE_OAUTH_TOKEN')
    process.exit(1)
  }

  const dockerVersion = await runCommand('docker', ['--version'])
  if (dockerVersion.code !== 0) {
    console.error(`docker is not available: ${short(dockerVersion.stderr)}`)
    process.exit(1)
  }

  await ensureDockerImage(DOCKER_IMAGE)

  const sidecarToken = randomSidecarToken()
  const stats: GatewayStats = {
    tokenHits: 0,
    proxied: 0,
    authFailures: 0,
    upstreamStatuses: [],
  }

  const oauthBetaFlag = 'oauth-2025-04-20'
  const gateway = Bun.serve({
    port: 0,
    async fetch(request) {
      const url = new URL(request.url)

      if (url.pathname === '/token') {
        stats.tokenHits++
        return new Response(`${sidecarToken}\n`, {
          headers: { 'content-type': 'text/plain' },
        })
      }

      const auth = request.headers.get('authorization')
      const xApiKey = request.headers.get('x-api-key')
      if (auth !== `Bearer ${sidecarToken}` && xApiKey !== sidecarToken) {
        stats.authFailures++
        return new Response('invalid sidecar token', { status: 401 })
      }

      const upstreamUrl = `https://api.anthropic.com${url.pathname}${url.search}`
      const headers = new Headers()
      const headersToForward = [
        'accept',
        'content-type',
        'anthropic-version',
        'anthropic-beta',
        'anthropic-dangerous-direct-browser-access',
        'x-app',
        'user-agent',
      ]

      for (const name of headersToForward) {
        const value = request.headers.get(name)
        if (value) headers.set(name, value)
      }

      headers.set('authorization', `Bearer ${oauthToken}`)
      const anthropicBeta = headers.get('anthropic-beta')
      if (anthropicBeta) {
        const hasOauthFlag = anthropicBeta
          .split(',')
          .some(part => part.trim() === oauthBetaFlag)
        if (!hasOauthFlag) {
          headers.set('anthropic-beta', `${anthropicBeta},${oauthBetaFlag}`)
        }
      } else {
        headers.set('anthropic-beta', oauthBetaFlag)
      }

      const body =
        request.method === 'GET' || request.method === 'HEAD'
          ? undefined
          : Buffer.from(await request.arrayBuffer())

      const upstream = await fetch(upstreamUrl, {
        method: request.method,
        headers,
        body,
      })

      stats.proxied++
      stats.upstreamStatuses.push(upstream.status)

      const responseHeaders = new Headers()
      for (const [key, value] of upstream.headers) {
        const normalized = key.toLowerCase()
        if (
          normalized === 'transfer-encoding' ||
          normalized === 'content-encoding' ||
          normalized === 'content-length'
        ) {
          continue
        }
        responseHeaders.set(key, value)
      }

      return new Response(upstream.body, {
        status: upstream.status,
        headers: responseHeaders,
      })
    },
  })

  const tempDir = mkdtempSync(join(tmpdir(), 'claude-helper-poc-'))
  const settingsPath = join(tempDir, 'settings.json')
  writeFileSync(
    settingsPath,
    JSON.stringify(
      {
        apiKeyHelper: `curl -fsS --max-time 2 http://host.docker.internal:${gateway.port}/token | tr -d '\\n'`,
      },
      null,
      2
    )
  )

  try {
    const dockerRun = await runCommand('docker', [
      'run',
      '--rm',
      '-e',
      `ANTHROPIC_BASE_URL=http://host.docker.internal:${gateway.port}`,
      '-e',
      'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1',
      '-v',
      `${settingsPath}:/tmp/settings.json:ro`,
      DOCKER_IMAGE,
      'bash',
      '-lc',
      [
        'if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then',
        '  echo "oauth_env_present";',
        '  exit 91;',
        'fi;',
        'unset ANTHROPIC_AUTH_TOKEN ANTHROPIC_API_KEY;',
        'HOME=/home/user claude --settings /tmp/settings.json -p "Reply with exactly: helper-sidecar-ok" --dangerously-skip-permissions --max-turns 1',
      ].join(' '),
    ])

    const all200 =
      stats.upstreamStatuses.length > 0 &&
      stats.upstreamStatuses.every(status => status === 200)
    const gotExpectedReply = dockerRun.stdout.includes('helper-sidecar-ok')
    const authPathWorked =
      stats.tokenHits >= 1 &&
      stats.proxied >= 1 &&
      stats.authFailures === 0 &&
      all200

    const passed = dockerRun.code === 0 && authPathWorked && gotExpectedReply

    console.log('=== apiKeyHelper + OAuth Gateway POC ===')
    console.log(`host_oauth_token=${maskToken(oauthToken)}`)
    console.log(`docker_exit=${dockerRun.code}`)
    console.log(`gateway_token_hits=${stats.tokenHits}`)
    console.log(`gateway_proxied_requests=${stats.proxied}`)
    console.log(`gateway_auth_failures=${stats.authFailures}`)
    console.log(`gateway_statuses=${stats.upstreamStatuses.join(',')}`)
    console.log(`docker_stdout_bytes=${Buffer.byteLength(dockerRun.stdout)}`)
    console.log(`docker_stderr_bytes=${Buffer.byteLength(dockerRun.stderr)}`)
    if (dockerRun.stdout.trim()) {
      console.log(`docker_stdout_preview=${short(dockerRun.stdout)}`)
    }
    if (dockerRun.stderr.trim()) {
      console.log(`docker_stderr_preview=${short(dockerRun.stderr)}`)
    }

    if (passed) {
      console.log()
      console.log(
        'PASS: Container used apiKeyHelper + gateway while host retained CLAUDE_CODE_OAUTH_TOKEN.'
      )
      process.exit(0)
    }

    console.log()
    console.log('FAIL: POC conditions were not met.')
    process.exit(1)
  } finally {
    gateway.stop()
    rmSync(tempDir, { recursive: true, force: true })
  }
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Fatal: ${message}`)
  process.exit(1)
})

import type { spawn as nodeSpawn } from 'node:child_process'

type GitPullResult = { success: true } | { success: false; message: string }

export async function gitPull(
  cwd: string,
  spawn: typeof nodeSpawn
): Promise<GitPullResult> {
  return new Promise(resolve => {
    const proc = spawn('git', ['pull'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    })

    let stderr = ''
    proc.stderr?.on('data', data => {
      stderr += data.toString()
    })

    proc.on('close', code => {
      if (code === 0) {
        resolve({ success: true })
      } else {
        resolve({ success: false, message: stderr.trim() || 'git pull failed' })
      }
    })

    proc.on('error', error => {
      resolve({ success: false, message: error.message })
    })
  })
}

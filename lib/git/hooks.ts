/**
 * Git hooks management for dust
 *
 * Handles installation and verification of git pre-push hooks
 * that run `dust pre push` automatically before code leaves the machine.
 */

import { join } from 'node:path'
import type { DustSettings } from '../cli/types'
import { isErrorCode } from '../filesystem/error-codes'
import type { FileSystem } from '../filesystem/types'

const DUST_HOOK_START = '# BEGIN DUST HOOK'
const DUST_HOOK_END = '# END DUST HOOK'

interface HooksManager {
  isGitRepo: () => boolean
  isHookInstalled: () => Promise<boolean>
  installHook: () => Promise<void>
  getHookBinaryPath: () => Promise<string | null>
  updateHookBinaryPath: (newPath: string) => Promise<void>
}

function generateHookContent(dustCommand: string): string {
  return `${DUST_HOOK_START}
${dustCommand} pre push
if [ $? -ne 0 ]; then
  echo "dust pre-push check failed"
  exit 1
fi
${DUST_HOOK_END}`
}

function extractDustSection(content: string): string | null {
  const startIndex = content.indexOf(DUST_HOOK_START)
  const endIndex = content.indexOf(DUST_HOOK_END)
  if (startIndex === -1 || endIndex === -1) {
    return null
  }
  return content.substring(startIndex, endIndex + DUST_HOOK_END.length)
}

function removeDustSection(content: string): string {
  const startIndex = content.indexOf(DUST_HOOK_START)
  const endIndex = content.indexOf(DUST_HOOK_END)
  if (startIndex === -1 || endIndex === -1) {
    return content
  }
  const before = content.substring(0, startIndex)
  const after = content.substring(endIndex + DUST_HOOK_END.length)
  return (before + after).replace(/\n{3,}/g, '\n\n').trim()
}

export function createHooksManager(
  cwd: string,
  fileSystem: FileSystem,
  settings: DustSettings
): HooksManager {
  const gitDir = join(cwd, '.git')
  const hooksDir = join(gitDir, 'hooks')
  const prePushPath = join(hooksDir, 'pre-push')

  return {
    isGitRepo: () => fileSystem.exists(gitDir),

    isHookInstalled: async () => {
      try {
        const content = await fileSystem.readFile(prePushPath)
        return content.includes(DUST_HOOK_START)
      } catch (error) {
        if (isErrorCode(error, 'ENOENT')) {
          return false
        }
        throw error
      }
    },

    installHook: async () => {
      // Ensure hooks directory exists (mkdir with recursive is idempotent)
      await fileSystem.mkdir(hooksDir, { recursive: true })

      const hookContent = generateHookContent(settings.dustCommand)
      let finalContent: string

      // Try to read existing hook file - if it doesn't exist, we'll create a new one
      try {
        const existingContent = await fileSystem.readFile(prePushPath)
        if (existingContent.includes(DUST_HOOK_START)) {
          // Already installed, update it
          const withoutDust = removeDustSection(existingContent)
          finalContent = withoutDust
            ? `${withoutDust}\n\n${hookContent}\n`
            : `#!/bin/sh\n\n${hookContent}\n`
        } else {
          // Append to existing hook
          finalContent = `${existingContent.trimEnd()}\n\n${hookContent}\n`
        }
      } catch (error) {
        if (isErrorCode(error, 'ENOENT')) {
          // Create new hook file
          finalContent = `#!/bin/sh\n\n${hookContent}\n`
        } else {
          throw error
        }
      }

      await fileSystem.writeFile(prePushPath, finalContent)
      await fileSystem.chmod(prePushPath, 0o755)
    },

    getHookBinaryPath: async () => {
      try {
        const content = await fileSystem.readFile(prePushPath)
        const dustSection = extractDustSection(content)
        if (!dustSection) {
          return null
        }
        // Extract the command from the dust section
        const match = dustSection.match(/^(.+) pre push$/m)
        return match ? match[1] : null
      } catch (error) {
        if (isErrorCode(error, 'ENOENT')) {
          return null
        }
        throw error
      }
    },

    updateHookBinaryPath: async (newPath: string) => {
      let content: string
      try {
        content = await fileSystem.readFile(prePushPath)
      } catch (error) {
        if (isErrorCode(error, 'ENOENT')) {
          // No hook file exists, nothing to update
          return
        }
        throw error
      }
      const dustSection = extractDustSection(content)
      if (!dustSection) {
        return
      }
      const withoutDust = removeDustSection(content)
      const newHookContent = generateHookContent(newPath)
      const finalContent = withoutDust
        ? `${withoutDust}\n\n${newHookContent}\n`
        : `#!/bin/sh\n\n${newHookContent}\n`
      await fileSystem.writeFile(prePushPath, finalContent)
      await fileSystem.chmod(prePushPath, 0o755)
    },
  }
}

/**
 * Runtime selection logic for container execution.
 *
 * Selects the appropriate container runtime based on CLI flags.
 */

import { appleContainerRuntime } from './apple-container-runtime'
import { dockerRuntime } from './docker-runtime'
import type { ContainerRuntime } from './runtime'

interface RuntimeFlags {
  docker: boolean
  appleContainer: boolean
}

type RuntimeSelectionResult =
  | { success: true; runtime: ContainerRuntime | null; forceContainer: boolean }
  | { success: false; error: string }

/**
 * Select container runtime based on CLI flags.
 *
 * Returns:
 * - `{ success: true, runtime: ContainerRuntime, forceContainer: true }` when a runtime flag is set
 * - `{ success: true, runtime: null, forceContainer: false }` when no flags are set (use Dockerfile detection)
 * - `{ success: false, error: string }` when both flags are set (mutually exclusive)
 */
export function selectContainerRuntime(
  flags: RuntimeFlags
): RuntimeSelectionResult {
  if (flags.docker && flags.appleContainer) {
    return {
      success: false,
      error:
        'Cannot use both --docker and --apple-container. Choose one container runtime.',
    }
  }

  if (flags.appleContainer) {
    return {
      success: true,
      runtime: appleContainerRuntime,
      forceContainer: true,
    }
  }

  if (flags.docker) {
    return {
      success: true,
      runtime: dockerRuntime,
      forceContainer: true,
    }
  }

  // No container flags - will use Dockerfile detection with default (docker) runtime
  return {
    success: true,
    runtime: null,
    forceContainer: false,
  }
}

import type { CommandEventMessage } from './command-events'
import { createLogger } from './logging'

const log = createLogger('dust:command-events-transport')

export const DUST_PROXY_PORT = 'DUST_PROXY_PORT'

interface ProxyResponseLike {
  ok: boolean
  status: number
}

interface EventTransportDependencies {
  fetch: (
    input: string,
    init: {
      method: 'POST'
      headers: Record<string, string>
      body: string
    }
  ) => Promise<ProxyResponseLike>
  onError: (message: string) => void
}

function parseInteger(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

export function parseProxyPort(value: string | undefined): number | undefined {
  const parsed = parseInteger(value)
  if (parsed === undefined) return undefined
  return parsed >= 1 && parsed <= 65535 ? parsed : undefined
}

/**
 * Creates a message writer for command events.
 */
export function createCommandEventWriter(
  env: Record<string, string | undefined>,
  dependencies: EventTransportDependencies
): ((message: CommandEventMessage) => void) | undefined {
  const proxyPort = parseProxyPort(env[DUST_PROXY_PORT])
  if (proxyPort === undefined) {
    return undefined
  }

  const eventsUrl = `http://127.0.0.1:${proxyPort}/events`
  log(`event writer created, target=${eventsUrl}`)
  return (message: CommandEventMessage) => {
    log(`sending event: ${message.event.type}`)
    void dependencies
      .fetch(eventsUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          connection: 'close',
        },
        body: JSON.stringify(message),
      })
      .then(response => {
        if (!response.ok) {
          dependencies.onError(
            `Event proxy POST failed (${response.status}): ${eventsUrl}`
          )
        }
      })
      .catch(error => {
        const messageText =
          error instanceof Error ? error.message : String(error)
        dependencies.onError(
          `Event proxy POST failed (${messageText}): ${eventsUrl}`
        )
      })
  }
}

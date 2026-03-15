import type { AgentSessionEvent, EventMessage } from '../agent-events'

export type PostEventFn = (url: string, payload: EventMessage) => Promise<void>

export type SendAgentEventFn = (event: AgentSessionEvent) => void

export function createPostEvent(fetchFn: typeof fetch): PostEventFn {
  return async (url: string, payload: EventMessage): Promise<void> => {
    await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }
}

export function createWireEventSender(
  eventsUrl: string | undefined,
  sessionId: string,
  postEvent: PostEventFn,
  onError: (error: unknown) => void,
  getAgentSessionId?: () => string | undefined,
  repository = ''
): SendAgentEventFn {
  let sequence = 0

  return (event: AgentSessionEvent) => {
    if (!eventsUrl) return

    sequence++

    const payload: EventMessage = {
      sequence,
      timestamp: new Date().toISOString(),
      sessionId,
      repository,
      event,
    }

    const agentSessionId = getAgentSessionId?.()
    if (agentSessionId) {
      payload.agentSessionId = agentSessionId
    }

    postEvent(eventsUrl, payload).catch(onError)
  }
}

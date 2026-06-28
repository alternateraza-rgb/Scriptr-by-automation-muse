type TimingMark = {
  phase: string
  elapsedMs: number
  deltaMs: number
}

const createRequestId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const createRequestTimer = (functionName: string, incomingRequestId?: string | null) => {
  const requestId = incomingRequestId?.trim() || createRequestId()
  const start = Date.now()
  let lastMark = start
  const marks: TimingMark[] = []

  const mark = (phase: string, extra?: Record<string, unknown>) => {
    const now = Date.now()
    const entry = {
      phase,
      elapsedMs: now - start,
      deltaMs: now - lastMark,
    }
    marks.push(entry)
    lastMark = now
    console.info(`[timing:${functionName}]`, {
      requestId,
      ...entry,
      ...extra,
    })
  }

  const finish = (status: number, extra?: Record<string, unknown>) => {
    const totalMs = Date.now() - start
    console.info(`[timing:${functionName}:complete]`, {
      requestId,
      status,
      totalMs,
      marks,
      ...extra,
    })
    return { requestId, totalMs, marks }
  }

  return { requestId, mark, finish }
}

export const getRequestId = (req: Request) => req.headers.get('x-request-id') || req.headers.get('X-Request-Id')

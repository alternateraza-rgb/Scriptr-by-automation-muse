export function success(data, statusCode = 200) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      data: data ?? {},
    }),
  }
}

export function failure(message, statusCode = 500) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: false,
      error: typeof message === 'string' && message.trim() ? message : 'Unknown error',
    }),
  }
}

export function parseJsonBody(event) {
  try {
    return JSON.parse(event.body || '{}')
  } catch {
    throw new Error('Invalid JSON body.')
  }
}

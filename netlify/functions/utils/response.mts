export const success = (data: unknown, status = 200) =>
  Response.json(
    {
      success: true,
      data: data ?? {},
    },
    { status },
  )

const getFailureMessage = (message: unknown) => {
  if (typeof message === 'string' && message.trim()) {
    return message
  }

  if (message instanceof Error && message.message.trim()) {
    return message.message
  }

  if (message && typeof message === 'object') {
    const source = message as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown; error?: unknown }
    const parts = [source.message, source.details, source.hint, source.error]
      .filter((part): part is string => typeof part === 'string' && part.trim())
      .map((part) => part.trim())

    if (typeof source.code === 'string' && source.code.trim()) {
      parts.push(`code=${source.code.trim()}`)
    }

    if (parts.length) {
      return parts.join(' ')
    }
  }

  return 'Unknown error'
}

export const failure = (message: unknown, status = 500) =>
  Response.json(
    {
      success: false,
      error: getFailureMessage(message),
    },
    { status },
  )

export const parseJsonBody = async <T>(req: Request): Promise<T> => {
  try {
    return (await req.json()) as T
  } catch {
    throw new Error('Invalid JSON body.')
  }
}

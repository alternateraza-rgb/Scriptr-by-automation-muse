export const success = (data: unknown, status = 200) =>
  Response.json(
    {
      success: true,
      data: data ?? {},
    },
    { status },
  )

export const failure = (message: unknown, status = 500) =>
  Response.json(
    {
      success: false,
      error: typeof message === 'string' && message.trim() ? message : 'Unknown error',
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

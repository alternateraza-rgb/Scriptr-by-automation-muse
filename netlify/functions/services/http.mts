export const badRequest = (message: string) =>
  Response.json(
    {
      error: message,
    },
    { status: 400 },
  )

export const serverError = (message: string) =>
  Response.json(
    {
      error: message,
    },
    { status: 500 },
  )

export const parseJson = async <T>(req: Request): Promise<T> => {
  try {
    return (await req.json()) as T
  } catch {
    throw new Error('Invalid JSON body.')
  }
}

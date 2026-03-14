export async function callAiFunction<TResponse>(functionName: string, payload: unknown): Promise<TResponse> {
  const response = await fetch(`/.netlify/functions/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const contentType = (response.headers.get('content-type') || '').toLowerCase()
  const bodyText = await response.text()
  const isJsonResponse = contentType.includes('application/json')

  if (!isJsonResponse) {
    const preview = bodyText.replace(/\s+/g, ' ').trim().slice(0, 120)
    const message =
      response.status === 404 || preview.startsWith('<')
        ? `Function "${functionName}" returned HTML instead of JSON. This usually means the function route is unavailable in the current environment. Start local dev with "npm run dev" (Netlify Dev).`
        : `Function "${functionName}" returned a non-JSON response (status ${response.status}).`
    throw new Error(message)
  }

  let data: (TResponse & { error?: string }) | null = null
  try {
    data = JSON.parse(bodyText) as TResponse & { error?: string }
  } catch {
    throw new Error(`Function "${functionName}" returned invalid JSON.`)
  }

  if (!response.ok) {
    throw new Error(data.error || `Request to ${functionName} failed.`)
  }

  return data as TResponse
}

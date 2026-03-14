export async function callAI(endpoint, data = {}) {
  const res = await fetch(`/.netlify/functions/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  const text = await res.text()
  const normalized = text.trimStart().toLowerCase()

  if (normalized.startsWith('<!doctype') || normalized.startsWith('<html')) {
    throw new Error('Function route unavailable')
  }

  let parsed
  try {
    parsed = text ? JSON.parse(text) : {}
  } catch {
    throw new Error('Invalid JSON response from AI function')
  }

  if (!res.ok) {
    const message =
      parsed && typeof parsed === 'object' && typeof parsed.error === 'string'
        ? parsed.error
        : `Function request failed with status ${res.status}`
    throw new Error(message)
  }

  return parsed
}

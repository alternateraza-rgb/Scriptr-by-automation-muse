const ENDPOINT_ALIASES = {
  generateResearchedIdeas: ['generateIdeas'],
  generateIdeas: ['generateResearchedIdeas'],
}

const isHtml = (value) => {
  const normalized = value.trimStart().toLowerCase()
  return normalized.startsWith('<!doctype') || normalized.startsWith('<html')
}

const normalizeEndpoint = (value) => {
  const trimmed = String(value || '').trim().replace(/^\/+/, '')
  return trimmed.replace(/^\.netlify\/functions\/+/, '')
}

const getEndpointCandidates = (endpoint) => {
  const normalized = normalizeEndpoint(endpoint)
  const aliases = Array.isArray(ENDPOINT_ALIASES[normalized]) ? ENDPOINT_ALIASES[normalized] : []
  return [...new Set([normalized, ...aliases].filter(Boolean))]
}

const isRouteUnavailableResponse = (res, text) => {
  if (res.status === 404) {
    return true
  }
  if (res.status >= 500) {
    return false
  }
  const contentType = (res.headers.get('content-type') || '').toLowerCase()
  if (res.ok && contentType.includes('text/html') && isHtml(text || '')) {
    return true
  }
  return res.ok && isHtml(text || '')
}

const getErrorMessage = (res, parsed, text) => {
  if (parsed && typeof parsed === 'object' && typeof parsed.error === 'string') {
    return parsed.error
  }
  const fallback = `Function request failed with status ${res.status}`
  if (typeof text !== 'string') {
    return fallback
  }
  const trimmed = text.trim()
  if (!trimmed) {
    return fallback
  }
  if (isHtml(trimmed)) {
    return fallback
  }
  return trimmed.slice(0, 240)
}

const requestFunction = async (endpoint, data) => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let res
    try {
      res = await fetch(`/.netlify/functions/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
      })
    } catch (error) {
      if (attempt === 0) {
        continue
      }
      throw error
    }

    const text = await res.text()
    if (isRouteUnavailableResponse(res, text)) {
      return { routeUnavailable: true, data: null }
    }

    if (res.status >= 500 && attempt === 0) {
      continue
    }

    let parsed
    try {
      parsed = text ? JSON.parse(text) : {}
    } catch {
      if (!res.ok) {
        throw new Error(getErrorMessage(res, null, text))
      }
      throw new Error('Invalid JSON response from AI function')
    }

    if (!res.ok) {
      throw new Error(getErrorMessage(res, parsed, text))
    }

    return { routeUnavailable: false, data: parsed }
  }

  return { routeUnavailable: true, data: null }
}

export async function callAI(endpoint, data = {}) {
  const candidates = getEndpointCandidates(endpoint)
  let lastRouteUnavailable = false

  for (const candidate of candidates) {
    const result = await requestFunction(candidate, data)
    if (!result.routeUnavailable) {
      return result.data
    }
    lastRouteUnavailable = true
  }

  if (lastRouteUnavailable) {
    throw new Error('Function route unavailable')
  }

  throw new Error('Function request failed')
}

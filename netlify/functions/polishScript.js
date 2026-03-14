import { polishScript } from './services/scriptGenerationService.mts'
import { success, failure, parseJsonBody } from './utils/response.js'

export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }
    const body = parseJsonBody(event)
    const mode = typeof body.mode === 'string' ? body.mode : ''

    if (!body.script || !mode) {
      return failure('Missing required payload for script polish.', 400)
    }

    const data = await polishScript({
      script: String(body.script),
      mode: ['shorten', 'expand', 'retention', 'simplify', 'intensify'].includes(mode) ? mode : 'retention',
    })
    return success({
      polished_script: data.polished_script || '',
    })
  } catch (err) {
    return failure(err instanceof Error ? err.message : 'Script polish failed.')
  }
}

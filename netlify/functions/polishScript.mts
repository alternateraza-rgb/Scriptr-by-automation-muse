import { polishScript } from './services/scriptGenerationService.mts'
import { failure, parseJsonBody, success } from './utils/response.mts'

type PolishRequest = {
  script?: unknown
  mode?: unknown
}

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }
    const body = await parseJsonBody<PolishRequest>(req)
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

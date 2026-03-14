import { polishScript } from './services/scriptGenerationService.mts'
import { badRequest, parseJson, serverError } from './services/http.mts'
import type { ScriptPolishRequest } from './services/types.mts'

type Body = ScriptPolishRequest

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return badRequest('Method not allowed.')
  }

  try {
    const body = await parseJson<Body>(req)
    if (!body.script || !body.command?.trim()) {
      return badRequest('Missing required payload for script polish.')
    }

    const data = await polishScript(body)
    return Response.json(data)
  } catch (error) {
    return serverError(error instanceof Error ? error.message : 'Script polish failed.')
  }
}

import { callAiFunction } from './aiProviderService'
import type { ScriptPolishRequest, ScriptPolishResponse } from './types'

export async function polishScript(payload: ScriptPolishRequest): Promise<ScriptPolishResponse> {
  const data = await callAiFunction<Partial<ScriptPolishResponse>>('polishScript', payload)
  if (!data.polished_script || typeof data.polished_script !== 'string') {
    throw new Error('Script polish returned no script.')
  }

  return { polished_script: data.polished_script }
}

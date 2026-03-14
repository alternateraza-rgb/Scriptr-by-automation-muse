import { callAiFunction } from './aiProviderService'
import type { ScriptPolishRequest, ScriptPolishResponse } from './types'

export async function polishScript(payload: ScriptPolishRequest): Promise<ScriptPolishResponse> {
  return callAiFunction<ScriptPolishResponse>('polishScript', payload)
}

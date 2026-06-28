import { callAiFunction, type CallAiOptions } from './aiProviderService'
import type { ChannelContext, GeneratedScript, ScriptChatMessage } from './types'

type ScriptChatPayload = {
  messages: ScriptChatMessage[]
  channelContext?: ChannelContext
}

export async function sendScriptChatMessage(
  payload: ScriptChatPayload,
  options?: CallAiOptions,
): Promise<{ message: string }> {
  const data = await callAiFunction<{ message?: string }>('script-chat', payload, options)
  if (!data?.message) {
    throw new Error('Script chat returned an empty response.')
  }

  return { message: data.message }
}

export async function generateChatScript(payload: ScriptChatPayload, options?: CallAiOptions): Promise<GeneratedScript> {
  const data = await callAiFunction<Partial<GeneratedScript>>('generate-chat-script', payload, options)
  if (!data?.script) {
    throw new Error('Chat script generation returned incomplete data.')
  }

  return {
    script: {
      title: data.script.title || 'Untitled YouTube Script',
      sections: Array.isArray(data.script.sections) ? data.script.sections : [],
    },
  }
}

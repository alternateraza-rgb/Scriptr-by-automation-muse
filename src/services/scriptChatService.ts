import { callAiFunction } from './aiProviderService'
import type { ChannelContext, ChatMode, GeneratedScript, ScriptChatMessage } from './types'

type ScriptChatPayload = {
  messages: ScriptChatMessage[]
  channelContext?: ChannelContext
  mode?: ChatMode
}

export async function sendScriptChatMessage(payload: ScriptChatPayload): Promise<{ message: string }> {
  const data = await callAiFunction<{ message?: string }>('script-chat', payload)
  if (!data?.message) {
    throw new Error('Script chat returned an empty response.')
  }

  return { message: data.message }
}

export async function generateChatScript(payload: ScriptChatPayload): Promise<GeneratedScript> {
  const data = await callAiFunction<Partial<GeneratedScript>>('generate-chat-script', payload)
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

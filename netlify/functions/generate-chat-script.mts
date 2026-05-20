import { generateScriptFromChat } from './services/scriptChatService.mts'
import { failure, parseJsonBody, success } from './utils/response.mts'
import type { ChannelContext, ScriptChatMessage } from './services/types.mts'

type GenerateChatScriptRequest = {
  messages?: ScriptChatMessage[]
  channelContext?: ChannelContext
}

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }

    const body = await parseJsonBody<GenerateChatScriptRequest>(req)
    const data = await generateScriptFromChat({
      messages: Array.isArray(body.messages) ? body.messages : [],
      channelContext: body.channelContext,
    })

    return success(data)
  } catch (err) {
    return failure(err instanceof Error ? err.message : 'Chat script generation failed.')
  }
}

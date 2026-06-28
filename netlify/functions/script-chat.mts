import { continueScriptChat } from './services/scriptChatService.mts'
import { failure, parseJsonBody, success } from './utils/response.mts'
import type { ChannelContext, ChatMode, ScriptChatMessage } from './services/types.mts'

type ScriptChatRequest = {
  messages?: ScriptChatMessage[]
  channelContext?: ChannelContext
  mode?: ChatMode
}

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }

    const body = await parseJsonBody<ScriptChatRequest>(req)
    const data = await continueScriptChat({
      messages: Array.isArray(body.messages) ? body.messages : [],
      channelContext: body.channelContext,
      mode: body.mode,
    })

    return success(data)
  } catch (err) {
    return failure(err instanceof Error ? err.message : 'Script chat failed.')
  }
}

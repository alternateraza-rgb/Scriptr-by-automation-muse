import { callAiFunction } from './aiProviderService'
import type { ChannelContext, HookTitlePayload, VideoIdea } from './types'

export async function generateHooksAndTitles(
  channelContext: ChannelContext,
  selectedIdea: VideoIdea,
): Promise<HookTitlePayload> {
  return callAiFunction<HookTitlePayload>('generateHooks', { channelContext, selectedIdea })
}

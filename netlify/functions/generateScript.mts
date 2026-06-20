import { createInitialScriptGenerationProgress, toPublicScriptGenerationJob } from './services/scriptWriterService.mts'
import { createAuthedJobClient, insertScriptGenerationJob } from './services/scriptGenerationJobStore.mts'
import { failure, parseJsonBody, success } from './utils/response.mts'
import type { ChannelContext, OutlineSection, VideoIdea } from './services/types.mts'

type ScriptRequest = {
  channelContext?: ChannelContext
  selectedIdea?: VideoIdea
  selectedTitle?: string
  generatedOutline?: OutlineSection[]
  selectedOutline?: OutlineSection[]
  tone?: string
  videoLength?: string
}

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }
    const body = await parseJsonBody<ScriptRequest>(req)

    if (!body.channelContext || !body.selectedIdea?.title || !body.selectedTitle) {
      return failure('Missing required payload for script generation.', 400)
    }

    const requestPayload = {
      context: body.channelContext,
      selectedIdea: body.selectedIdea,
      selectedTitle: body.selectedTitle,
      generatedOutline: Array.isArray(body.generatedOutline) ? body.generatedOutline : Array.isArray(body.selectedOutline) ? body.selectedOutline : [],
      tone: body.tone,
      videoLength: body.videoLength,
    }

    const { supabase, userId } = await createAuthedJobClient(req)
    const job = await insertScriptGenerationJob(supabase, userId, requestPayload, createInitialScriptGenerationProgress())

    return success({ job: toPublicScriptGenerationJob(job) }, 202)
  } catch (err) {
    console.error('[generateScript] job creation failed', { err })
    return failure(err instanceof Error ? err.message : 'Script generation could not be started.')
  }
}

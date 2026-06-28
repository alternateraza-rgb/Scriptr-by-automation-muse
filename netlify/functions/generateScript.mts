import { createInitialScriptGenerationProgress, toPublicScriptGenerationJob } from './services/scriptWriterService.mts'
import { createAuthedJobClient, insertScriptGenerationJob } from './services/scriptGenerationJobStore.mts'
import { failure, parseJsonBody, success } from './utils/response.mts'
import { createRequestTimer, getRequestId } from './utils/requestTiming.mts'
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

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (error && typeof error === 'object') {
    const source = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    const parts = [source.message, source.details, source.hint]
      .filter((part): part is string => typeof part === 'string' && part.trim())
      .map((part) => part.trim())

    if (typeof source.code === 'string' && source.code.trim()) {
      parts.push(`code=${source.code.trim()}`)
    }

    if (parts.length) {
      return parts.join(' ')
    }
  }

  return ''
}

export default async (req: Request) => {
  const timer = createRequestTimer('generateScript', getRequestId(req))

  try {
    timer.mark('request_received', { method: req.method })

    if (req.method !== 'POST') {
      timer.finish(405)
      return failure('Method not allowed. Use POST.', 405)
    }

    const body = await parseJsonBody<ScriptRequest>(req)
    timer.mark('body_parsed')

    if (!body.channelContext || !body.selectedIdea?.title || !body.selectedTitle) {
      timer.finish(400)
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
    timer.mark('auth_complete', { userId })

    const job = await insertScriptGenerationJob(supabase, userId, requestPayload, createInitialScriptGenerationProgress())
    timer.mark('job_created', { jobId: job.id, status: job.status })
    timer.finish(202, { jobId: job.id })

    return success({ job: toPublicScriptGenerationJob(job) }, 202)
  } catch (err) {
    console.error('[generateScript] job creation failed', { err })
    const message = getErrorMessage(err) || 'Script generation could not be started.'
    timer.finish(503, { error: message })
    return failure(message, 503)
  }
}

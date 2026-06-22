import { createInitialScriptGenerationProgress, generateFullScript, toPublicScriptGenerationJob } from './services/scriptWriterService.mts'
import { createAuthedJobClient, insertScriptGenerationJob } from './services/scriptGenerationJobStore.mts'
import { failure, parseJsonBody, success } from './utils/response.mts'
import type { ChannelContext, GeneratedScript, OutlineSection, VideoIdea } from './services/types.mts'

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

const createCompletedInlineJob = (script: GeneratedScript) => {
  const sections = Array.isArray(script.script.sections) ? script.script.sections : []
  return {
    jobId: `inline-${Date.now()}`,
    status: 'completed' as const,
    currentStep: 'completed' as const,
    currentSectionIndex: sections.length,
    totalSections: sections.length,
    completedSections: sections.length,
    retryAfterMs: 0,
    error: null,
    script,
  }
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
    try {
      const job = await insertScriptGenerationJob(supabase, userId, requestPayload, createInitialScriptGenerationProgress())

      return success({ job: toPublicScriptGenerationJob(job) }, 202)
    } catch (jobError) {
      console.error('[generateScript] job insert failed; falling back to inline generation', { err: jobError })

      try {
        const script = await generateFullScript(requestPayload)
        return success({ job: createCompletedInlineJob(script), script })
      } catch (generationError) {
        console.error('[generateScript] inline fallback failed', { err: generationError })
        return failure(
          getErrorMessage(generationError) ||
            getErrorMessage(jobError) ||
            'Script generation could not be started.',
        )
      }
    }
  } catch (err) {
    console.error('[generateScript] job creation failed', { err })
    return failure(getErrorMessage(err) || 'Script generation could not be started.')
  }
}

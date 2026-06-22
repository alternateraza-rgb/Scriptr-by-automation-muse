import { createAuthedJobClient, getScriptGenerationJob, updateScriptGenerationJob } from './services/scriptGenerationJobStore.mts'
import { advanceScriptGenerationJob, toPublicScriptGenerationJob } from './services/scriptWriterService.mts'
import { failure, parseJsonBody, success } from './utils/response.mts'

type ScriptWorkerRequest = {
  jobId?: string
}

const MAX_WORKER_STEPS = 20
const MIN_STEP_DELAY_MS = 1000
const MAX_STEP_DELAY_MS = 5000

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getStepDelayMs = (retryAfterMs: number) => Math.min(MAX_STEP_DELAY_MS, Math.max(MIN_STEP_DELAY_MS, retryAfterMs || 0))

const isTerminalStatus = (status: string) => status === 'completed' || status === 'failed'

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }

    const body = await parseJsonBody<ScriptWorkerRequest>(req)
    const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : ''
    if (!jobId) {
      return failure('Missing script generation jobId.', 400)
    }

    const { supabase, userId } = await createAuthedJobClient(req)
    let job = await getScriptGenerationJob(supabase, userId, jobId)

    if (job.status === 'queued') {
      job = await updateScriptGenerationJob(supabase, userId, job.id, { status: 'generating' })
    }

    for (let stepCount = 0; stepCount < MAX_WORKER_STEPS && !isTerminalStatus(job.status); stepCount += 1) {
      const updates = await advanceScriptGenerationJob(job)
      job = Object.keys(updates).length ? await updateScriptGenerationJob(supabase, userId, job.id, updates) : await getScriptGenerationJob(supabase, userId, job.id)

      if (isTerminalStatus(job.status)) {
        break
      }

      const publicJob = toPublicScriptGenerationJob(job)
      if (publicJob.retryAfterMs > 0) {
        await delay(getStepDelayMs(publicJob.retryAfterMs))
      }
    }

    return success({ job: toPublicScriptGenerationJob(job) })
  } catch (err) {
    console.error('[generateScriptWorker] worker failed', { err })
    return failure(err instanceof Error ? err.message : 'Script generation worker failed.')
  }
}

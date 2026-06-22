import { enqueueScriptGenerationWorker } from './services/scriptGenerationWorkerClient.mts'
import { toPublicScriptGenerationJob } from './services/scriptWriterService.mts'
import { createAuthedJobClient, getScriptGenerationJob } from './services/scriptGenerationJobStore.mts'
import { failure, parseJsonBody, success } from './utils/response.mts'

type ScriptStatusRequest = {
  jobId?: string
}

const WORKER_STALE_MS = 120000

const shouldEnqueueWorker = (job: Awaited<ReturnType<typeof getScriptGenerationJob>>) => {
  if (job.status === 'completed' || job.status === 'failed') {
    return false
  }

  if (job.status === 'queued') {
    return true
  }

  const updatedAt = new Date(job.updated_at).getTime()
  return Number.isFinite(updatedAt) && Date.now() - updatedAt > WORKER_STALE_MS
}

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return failure('Method not allowed. Use POST.', 405)
    }

    const body = await parseJsonBody<ScriptStatusRequest>(req)
    const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : ''
    if (!jobId) {
      return failure('Missing script generation jobId.', 400)
    }

    const { supabase, userId } = await createAuthedJobClient(req)
    const job = await getScriptGenerationJob(supabase, userId, jobId)
    if (shouldEnqueueWorker(job)) {
      await enqueueScriptGenerationWorker(req, job.id)
    }

    return success({ job: toPublicScriptGenerationJob(job) })
  } catch (err) {
    console.error('[generateScriptStatus] status update failed', { err })
    return failure(err instanceof Error ? err.message : 'Script generation status could not be updated.')
  }
}

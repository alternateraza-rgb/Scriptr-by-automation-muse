import { advanceScriptGenerationJob, toPublicScriptGenerationJob } from './services/scriptWriterService.mts'
import { createAuthedJobClient, getScriptGenerationJob, updateScriptGenerationJob } from './services/scriptGenerationJobStore.mts'
import { failure, parseJsonBody, success } from './utils/response.mts'

type ScriptStatusRequest = {
  jobId?: string
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
    const updates = await advanceScriptGenerationJob(job)
    const updatedJob = Object.keys(updates).length ? await updateScriptGenerationJob(supabase, userId, job.id, updates) : job

    return success({ job: toPublicScriptGenerationJob(updatedJob) })
  } catch (err) {
    console.error('[generateScriptStatus] status update failed', { err })
    return failure(err instanceof Error ? err.message : 'Script generation status could not be updated.')
  }
}

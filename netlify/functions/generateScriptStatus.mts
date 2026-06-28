import { advanceScriptGenerationJob, toPublicScriptGenerationJob } from './services/scriptWriterService.mts'
import { createAuthedJobClient, getScriptGenerationJob, updateScriptGenerationJob } from './services/scriptGenerationJobStore.mts'
import { failure, parseJsonBody, success } from './utils/response.mts'
import { createRequestTimer, getRequestId } from './utils/requestTiming.mts'

type ScriptStatusRequest = {
  jobId?: string
}

export default async (req: Request) => {
  const timer = createRequestTimer('generateScriptStatus', getRequestId(req))

  try {
    timer.mark('request_received', { method: req.method })

    if (req.method !== 'POST') {
      timer.finish(405)
      return failure('Method not allowed. Use POST.', 405)
    }

    const body = await parseJsonBody<ScriptStatusRequest>(req)
    const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : ''
    timer.mark('body_parsed', { jobId: jobId || null })

    if (!jobId) {
      timer.finish(400)
      return failure('Missing script generation jobId.', 400)
    }

    const { supabase, userId } = await createAuthedJobClient(req)
    timer.mark('auth_complete', { userId })

    const job = await getScriptGenerationJob(supabase, userId, jobId)
    timer.mark('job_loaded', { jobId: job.id, status: job.status })

    const updates = await advanceScriptGenerationJob(job)
    timer.mark('step_advanced', {
      jobId: job.id,
      updateKeys: Object.keys(updates),
      nextStatus: updates.status || job.status,
    })

    const updatedJob = Object.keys(updates).length ? await updateScriptGenerationJob(supabase, userId, job.id, updates) : job
    timer.mark('job_persisted', { jobId: updatedJob.id, status: updatedJob.status })

    const publicJob = toPublicScriptGenerationJob(updatedJob)
    timer.finish(200, {
      jobId: publicJob.jobId,
      status: publicJob.status,
      currentStep: publicJob.currentStep,
      completedSections: publicJob.completedSections,
    })

    return success({ job: publicJob })
  } catch (err) {
    console.error('[generateScriptStatus] status update failed', { err })
    const message = err instanceof Error ? err.message : 'Script generation status could not be updated.'
    timer.finish(500, { error: message })
    return failure(message)
  }
}

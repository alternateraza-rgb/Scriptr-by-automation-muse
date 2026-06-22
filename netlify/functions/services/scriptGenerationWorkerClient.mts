const WORKER_FUNCTION_PATH = '/.netlify/functions/generateScriptWorker-background'

const getAuthorizationHeader = (req: Request) => req.headers.get('authorization') || req.headers.get('Authorization') || ''

export const enqueueScriptGenerationWorker = async (req: Request, jobId: string) => {
  const authorization = getAuthorizationHeader(req)
  if (!authorization) {
    console.error('[script-generation] worker enqueue skipped without authorization header', { jobId })
    return
  }

  try {
    const workerUrl = new URL(WORKER_FUNCTION_PATH, req.url)
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ jobId }),
    })

    if (!response.ok && response.status !== 202) {
      console.error('[script-generation] worker enqueue failed', { jobId, status: response.status })
    }
  } catch (error) {
    console.error('[script-generation] worker enqueue failed', { jobId, error })
  }
}

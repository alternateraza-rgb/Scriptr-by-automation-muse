import { callAI } from '../lib/callAI.js'

export async function callAiFunction<TResponse>(functionName: string, payload: unknown): Promise<TResponse> {
  const response = (await callAI(functionName, payload)) as {
    success?: boolean
    data?: TResponse
    error?: string
  }

  if (response?.success === false) {
    throw new Error(response.error || `Request to ${functionName} failed.`)
  }

  if (response?.success === true) {
    return (response.data ?? ({} as TResponse)) as TResponse
  }

  return response as unknown as TResponse
}

const getEnv = (name: string): string | undefined => {
  const netlifyEnv = (globalThis as { Netlify?: { env?: { get: (key: string) => string | undefined } } }).Netlify?.env
  return netlifyEnv?.get(name) || process.env[name]
}

const getEnvNumber = (name: string, fallback: number) => {
  const raw = getEnv(name)
  if (!raw) {
    return fallback
  }

  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** Netlify synchronous function wall-clock limit (10s free, 26s Pro). Override per deployment. */
export const FUNCTION_WALL_CLOCK_BUDGET_MS = getEnvNumber('NETLIFY_FUNCTION_TIMEOUT_MS', 26000)

/** Reserved time for auth, Supabase I/O, and JSON serialization inside one invocation. */
export const FUNCTION_OVERHEAD_BUDGET_MS = getEnvNumber('FUNCTION_OVERHEAD_BUDGET_MS', 4000)

const configuredStepTimeoutMs = getEnvNumber('SCRIPT_STEP_TIMEOUT_MS', 18000)
const derivedStepTimeoutMs = FUNCTION_WALL_CLOCK_BUDGET_MS - FUNCTION_OVERHEAD_BUDGET_MS

/** Per-step LLM timeout; capped so the full function stays under the gateway limit. */
export const SCRIPT_STEP_TIMEOUT_MS = Math.max(5000, Math.min(configuredStepTimeoutMs, derivedStepTimeoutMs))

import { createClient } from '@/lib/supabase/server'

export interface ErrorLogEntry {
  serviceName: string
  functionName: string
  errorMessage: string
  stack?: string
  metadata?: Record<string, unknown>
}

/**
 * Log an error to error_logs table. Non-blocking: failures are logged to console only.
 */
export async function logError(entry: ErrorLogEntry): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from('error_logs').insert({
      service_name: entry.serviceName,
      function_name: entry.functionName,
      error_message: entry.errorMessage,
      stack: entry.stack ?? null,
      metadata: entry.metadata ?? null,
    })
  } catch (e) {
    console.error('[logError] Failed to persist error:', e)
    console.error('[logError] Original:', entry)
  }
}

/**
 * Wrap a server action with error logging. Catches, logs, rethrows.
 */
export function withErrorLogging<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  serviceName: string,
  functionName: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? err.stack : undefined
      await logError({
        serviceName,
        functionName,
        errorMessage: message,
        stack,
        metadata: { args: args.length },
      })
      throw err
    }
  }) as T
}

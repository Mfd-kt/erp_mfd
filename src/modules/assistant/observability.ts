import type { SupabaseClient } from '@supabase/supabase-js'

export interface LogToolCallInput {
  runId?: string | null
  conversationId?: string | null
  userId: string
  toolName: string
  toolArguments: Record<string, unknown>
  status: 'started' | 'completed' | 'failed'
  toolResult?: unknown
  errorMessage?: string | null
}

export async function logToolCallStart(
  supabase: SupabaseClient,
  input: Omit<LogToolCallInput, 'status' | 'toolResult' | 'errorMessage'>
): Promise<string> {
  const { data, error } = await supabase
    .from('assistant_tool_calls')
    .insert({
      run_id: input.runId ?? null,
      conversation_id: input.conversationId ?? null,
      user_id: input.userId,
      tool_name: input.toolName,
      tool_arguments_json: input.toolArguments,
      status: 'started',
    })
    .select('id')
    .single()
  if (error) {
    console.error('logToolCallStart failed', error)
    return ''
  }
  return (data as { id: string })?.id ?? ''
}

function truncateForLog(val: unknown, maxLen = 5000): unknown {
  if (typeof val === 'string') return val.length > maxLen ? val.slice(0, maxLen) + '...' : val
  if (val && typeof val === 'object') {
    const str = JSON.stringify(val)
    return str.length > maxLen ? { _truncated: true, len: str.length, preview: str.slice(0, 500) } : val
  }
  return val
}

export async function logToolCallComplete(
  supabase: SupabaseClient,
  toolCallId: string,
  status: 'completed' | 'failed',
  toolResult?: unknown,
  errorMessage?: string | null
) {
  const update: Record<string, unknown> = {
    status,
    completed_at: new Date().toISOString(),
  }
  if (toolResult !== undefined) {
    update.tool_result_json = typeof toolResult === 'string'
      ? { raw: truncateForLog(toolResult) }
      : truncateForLog(toolResult)
  }
  if (errorMessage) update.error_message = String(errorMessage).slice(0, 500)

  await supabase.from('assistant_tool_calls').update(update).eq('id', toolCallId)
}

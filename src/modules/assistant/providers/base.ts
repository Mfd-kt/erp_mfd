import type { AssistantContext } from '../types'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ChatResult {
  content: string
  toolCalls?: ToolCall[]
}

export interface ExecuteToolOptions {
  runId?: string | null
  conversationId?: string | null
  userId: string
  onToolCall?: (name: string, args: Record<string, unknown>, result: unknown) => void
}

export interface AssistantProvider {
  readonly name: string
  chat(
    ctx: AssistantContext,
    messages: ChatMessage[],
    options?: {
      systemPrompt: string
      tools: ToolDefinition[]
      executeTool: (name: string, args: Record<string, unknown>) => Promise<string>
      executeToolOptions?: ExecuteToolOptions
    }
  ): Promise<ChatResult>
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

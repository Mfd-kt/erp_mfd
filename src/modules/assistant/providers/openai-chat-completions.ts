import OpenAI from 'openai'
import type { AssistantContext } from '../types'
import type { AssistantProvider } from './base'
import { toOpenAIChatTools } from '../tool-definitions'

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY manquant')
  return new OpenAI({ apiKey: key })
}

export const openaiChatCompletionsProvider: AssistantProvider = {
  name: 'openai-chat-completions',

  async chat(ctx, messages, options) {
    if (!options?.systemPrompt || !options?.executeTool) throw new Error('Options requises')

    const openaiTools = toOpenAIChatTools()

    const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: options.systemPrompt },
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
    ]

    const execOpts = options.executeToolOptions
    const maxRounds = 5
    let round = 0
    let currentMessages = apiMessages

    while (round < maxRounds) {
      const response = await getOpenAI().chat.completions.create({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        messages: currentMessages,
        tools: openaiTools,
        tool_choice: 'auto',
      })

      const choice = response.choices[0]
      if (!choice) throw new Error('Pas de réponse du modèle')
      const msg = choice.message

      if (!msg.tool_calls?.length) {
        return { content: msg.content ?? '' }
      }

      const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []
      for (const tc of msg.tool_calls) {
        const name = tc.function.name
        const args = JSON.parse(tc.function.arguments ?? '{}') as Record<string, unknown>
        let resultStr: string
        try {
          resultStr = await options.executeTool(name, args)
          execOpts?.onToolCall?.(name, args, resultStr)
        } catch (e) {
          resultStr = JSON.stringify({ error: e instanceof Error ? e.message : String(e) })
          execOpts?.onToolCall?.(name, args, { error: resultStr })
        }
        toolResults.push({ role: 'tool', tool_call_id: tc.id, content: resultStr })
      }
      currentMessages = [...currentMessages, msg, ...toolResults]
      round++
    }

    return { content: 'Réponse incomplète après plusieurs appels outils.' }
  },
}

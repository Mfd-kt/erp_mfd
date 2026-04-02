import type { ChannelAdapter } from './types'
import { slackAdapter } from './slack'
import { whatsappAdapter } from './whatsapp'

export const channelAdapters: Record<string, ChannelAdapter> = {
  slack: slackAdapter,
  whatsapp: whatsappAdapter,
}

export async function sendToChannel(
  channelType: 'slack' | 'whatsapp',
  config: unknown,
  options: { title: string; message: string; metadata?: Record<string, unknown> }
) {
  const adapter = channelAdapters[channelType]
  if (!adapter) return { success: false, error: `Canal inconnu: ${channelType}` }
  return adapter.send(config, options)
}

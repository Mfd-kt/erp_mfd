export type ChannelType = 'slack' | 'whatsapp'

export interface ChannelConfig {
  slack?: { webhook_url: string }
  whatsapp?: { phone?: string; api_key?: string }
}

export interface SendMessageOptions {
  title: string
  message: string
  metadata?: Record<string, unknown>
}

export interface ChannelAdapter {
  send(config: unknown, options: SendMessageOptions): Promise<{ success: boolean; error?: string }>
}

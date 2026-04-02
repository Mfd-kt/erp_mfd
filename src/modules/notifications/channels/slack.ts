import type { ChannelAdapter } from './types'

/**
 * Slack channel adapter - sends messages via Incoming Webhook.
 * Config: { webhook_url: string }
 */
export const slackAdapter: ChannelAdapter = {
  async send(config, options) {
    const cfg = config as { webhook_url?: string }
    const url = cfg?.webhook_url
    if (!url) return { success: false, error: 'webhook_url manquant' }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: options.title,
          blocks: [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `*${options.title}*\n${options.message}` },
            },
            ...(options.metadata && Object.keys(options.metadata).length > 0
              ? [{ type: 'context', elements: [{ type: 'mrkdwn', text: JSON.stringify(options.metadata) }] }]
              : []),
          ],
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        return { success: false, error: `Slack ${res.status}: ${text}` }
      }
      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Erreur Slack' }
    }
  },
}

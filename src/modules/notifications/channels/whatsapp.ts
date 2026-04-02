import type { ChannelAdapter } from './types'

/**
 * WhatsApp channel adapter - foundation for future integration.
 * Config: { phone?: string, api_key?: string }
 * Uses a placeholder for now - real integration would use Twilio, WhatsApp Business API, etc.
 */
export const whatsappAdapter: ChannelAdapter = {
  async send(config, options) {
    const cfg = config as { phone?: string; api_key?: string }
    if (!cfg?.phone || !cfg?.api_key) {
      return { success: false, error: 'Configuration WhatsApp incomplète (phone, api_key)' }
    }

    // Placeholder: log and return success for dev. Replace with real API call.
    // Example: Twilio, WhatsApp Cloud API, etc.
    if (process.env.NODE_ENV === 'development') {
      console.log('[WhatsApp] Would send:', { to: cfg.phone, title: options.title, message: options.message })
      return { success: true }
    }

    // Production: integrate with your WhatsApp provider
    return { success: false, error: 'Intégration WhatsApp non configurée' }
  },
}

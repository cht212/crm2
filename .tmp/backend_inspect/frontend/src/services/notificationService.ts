import { $api } from '@/utils/api'

export interface AppNotification {
  id: string
  type: string
  data: {
    title: string
    message: string
    promotion_title?: string
    quote_request_id?: number
    request_number?: string
    promotion_id?: number
    image_url?: string | null
  }
  read_at: string | null
  created_at: string
}

export const notificationService = {
  async list() {
    return await $api<{ notifications: AppNotification[] }>('notifications')
  },

  async listAll(page = 1, perPage = 10) {
    return await $api<{
      notifications: AppNotification[]
      totalNotifications: number
      per_page: number
      current_page: number
      last_page: number
    }>('notifications', {
      query: { page, perPage },
    })
  },

  async markRead(id: string) {
    return await $api(`notifications/${id}/read`, { method: 'POST' })
  },

  async markUnread(id: string) {
    return await $api(`notifications/${id}/unread`, { method: 'POST' })
  },

  async remove(id: string) {
    return await $api(`notifications/${id}`, { method: 'DELETE' })
  },
}

export interface NotificationItemOut {
  notification_id: string
  notification_type: string
  title: string
  message: string
  company_id?: number | null
  reference_type?: string | null
  reference_id?: number | null
  is_read?: boolean
  created_at?: string | null
}

export interface NotificationCountResult {
  unread_count: number
}

const ACCESS_TOKEN_KEY = 'mct_access_token'

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }
  return headers
}

export const notificationService = {
  async getNotifications(options?: {
    companyId?: number
    notificationType?: string
    limit?: number
  }): Promise<NotificationItemOut[]> {
    try {
      const params = new URLSearchParams()
      if (options?.companyId) params.append('company_id', String(options.companyId))
      if (options?.notificationType) params.append('notification_type', options.notificationType)
      if (options?.limit) params.append('limit', String(options.limit))

      const url = `/api/v1/notifications${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  },

  async getUnreadCount(companyId?: number): Promise<number> {
    try {
      const params = new URLSearchParams()
      if (companyId) params.append('company_id', String(companyId))

      const url = `/api/v1/notifications/count${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        return 0
      }

      const data: NotificationCountResult = await response.json()
      return data.unread_count || 0
    } catch {
      return 0
    }
  },
}

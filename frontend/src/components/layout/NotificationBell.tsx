import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Check,
  Clock,
  Building2,
  Calendar,
  AlertCircle,
  FileCheck2,
  Landmark,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  notificationService,
  type NotificationItemOut,
} from '@/services/notificationService'

interface DisplayNotification {
  id: string
  title: string
  description: string
  time: string
  unread: boolean
  type: string
  refType?: string | null
  refId?: number | null
  icon: React.ElementType
  iconColor: string
}

const READ_STORAGE_KEY = 'mct_read_notification_ids'

function getReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY)
    if (raw) {
      return new Set(JSON.parse(raw))
    }
  } catch {
    // ignore
  }
  return new Set()
}

function saveReadId(id: string) {
  if (typeof window === 'undefined') return
  try {
    const set = getReadIds()
    set.add(id)
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(set)))
  } catch {
    // ignore
  }
}

function saveAllReadIds(ids: string[]) {
  if (typeof window === 'undefined') return
  try {
    const set = getReadIds()
    ids.forEach((i) => set.add(i))
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(set)))
  } catch {
    // ignore
  }
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'Just now'
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHrs = Math.floor(diffMin / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    const diffDays = Math.floor(diffHrs / 24)
    return `${diffDays}d ago`
  } catch {
    return 'Recently'
  }
}

interface NotificationBellProps {
  className?: string
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<DisplayNotification[]>([])
  const [readIds, setReadIds] = React.useState<Set<string>>(() => getReadIds())
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const fetchLiveNotifications = React.useCallback(async () => {
    try {
      const items: NotificationItemOut[] = await notificationService.getNotifications({ limit: 50 })
      const readSet = getReadIds()

      const mapped: DisplayNotification[] = items.map((item) => {
        let IconComponent: React.ElementType = AlertCircle
        let iconColor = 'text-primary'

        if (item.notification_type === 'LOAN_PENDING_APPROVAL') {
          IconComponent = FileCheck2
          iconColor = 'text-amber-600'
        } else if (item.notification_type === 'LOAN_OVERDUE') {
          IconComponent = AlertCircle
          iconColor = 'text-red-600'
        } else if (item.notification_type === 'LOAN_DUE_TODAY') {
          IconComponent = Clock
          iconColor = 'text-amber-500'
        } else if (
          item.notification_type === 'LOAN_DUE_TOMORROW' ||
          item.notification_type === 'LOAN_DUE_SOON'
        ) {
          IconComponent = Calendar
          iconColor = 'text-blue-600'
        } else if (item.notification_type === 'LOAN_REPAYMENT_RECEIVED') {
          IconComponent = CheckCircle2
          iconColor = 'text-emerald-600'
        } else if (item.notification_type === 'LOAN_REPAYMENT_SENT') {
          IconComponent = Landmark
          iconColor = 'text-slate-600'
        } else if (item.notification_type === 'LOAN_FULLY_SETTLED') {
          IconComponent = CheckCircle2
          iconColor = 'text-emerald-600'
        } else {
          IconComponent = Building2
          iconColor = 'text-primary'
        }

        const isUnread = !readSet.has(item.notification_id)

        return {
          id: item.notification_id,
          title: item.title,
          description: item.message,
          time: formatRelativeTime(item.created_at),
          unread: isUnread,
          type: item.notification_type,
          refType: item.reference_type,
          refId: item.reference_id,
          icon: IconComponent,
          iconColor,
        }
      })

      setNotifications(mapped)
    } catch {
      // ignore
    }
  }, [])

  // Initial fetch and polling every 30s
  React.useEffect(() => {
    fetchLiveNotifications()
    const timer = setInterval(fetchLiveNotifications, 30000)
    return () => clearInterval(timer)
  }, [fetchLiveNotifications])

  // Refetch when dropdown opened
  React.useEffect(() => {
    if (isOpen) {
      fetchLiveNotifications()
    }
  }, [isOpen, fetchLiveNotifications])

  const unreadCount = notifications.filter((n) => n.unread).length

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id)
    saveAllReadIds(allIds)
    setReadIds(new Set([...readIds, ...allIds]))
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  const handleItemClick = (item: DisplayNotification) => {
    saveReadId(item.id)
    setReadIds((prev) => new Set([...prev, item.id]))
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
    )

    // If related to a loan, navigate to /loan
    if (item.refType === 'loan' || item.type.includes('LOAN')) {
      setIsOpen(false)
      navigate('/loan')
    }
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'relative h-10 w-10 rounded-full text-focus hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus cursor-pointer',
          isOpen && 'bg-surface'
        )}
        aria-label="Open notifications"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5 sm:h-5.5 sm:w-5.5 text-[#0B0F2B]" />
        {unreadCount > 0 && (
          <span
            className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-white animate-pulse"
            aria-hidden="true"
          />
        )}
      </Button>

      {/* Notification Dropdown Popover */}
      {isOpen && (
        <div
          role="region"
          aria-label="Notifications panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-stroke/30 shadow-2xl overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-stroke/20 bg-surface/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-focus">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-primary/10 text-primary rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs text-muted-fg hover:text-primary font-medium transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-stroke/10">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-fg">
                No active notifications
              </div>
            ) : (
              notifications.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      'flex items-start gap-3.5 px-5 py-3.5 text-left hover:bg-surface/60 transition-colors cursor-pointer',
                      item.unread && 'bg-primary/[0.03]'
                    )}
                  >
                    <div
                      className={cn(
                        'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                        item.unread
                          ? 'bg-primary/10'
                          : 'bg-muted/30'
                      )}
                    >
                      <Icon className={cn('h-4.5 w-4.5', item.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            'text-xs sm:text-sm font-semibold truncate',
                            item.unread ? 'text-focus' : 'text-muted-fg'
                          )}
                        >
                          {item.title}
                        </p>
                        <span className="text-[11px] text-muted-fg/80 shrink-0 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.time}
                        </span>
                      </div>
                      <p className="text-xs text-muted-fg mt-0.5 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 text-center border-t border-stroke/20 bg-surface/30">
            <span className="text-xs text-muted-fg font-medium">
              MCT Group Notification Center
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

import * as React from 'react'
import { Bell, Check, Clock, ShieldCheck, Building2, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NotificationItem {
  id: string
  title: string
  description: string
  time: string
  unread: boolean
  icon: React.ElementType
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'New Company Added',
    description: 'MCT South Branch was successfully registered in the system.',
    time: '10m ago',
    unread: true,
    icon: Building2,
  },
  {
    id: '2',
    title: 'Permissions Updated',
    description: 'Updated administrative permissions for 3 employee accounts.',
    time: '1h ago',
    unread: true,
    icon: ShieldCheck,
  },
  {
    id: '3',
    title: 'User Profile Synchronized',
    description: 'Jordan Smith credentials and company assignment updated.',
    time: '3h ago',
    unread: false,
    icon: UserCheck,
  },
]

interface NotificationBellProps {
  className?: string
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(INITIAL_NOTIFICATIONS)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

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
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  const markItemAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    )
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'relative h-10 w-10 rounded-full text-focus hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
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
                No new notifications
              </div>
            ) : (
              notifications.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.id}
                    onClick={() => markItemAsRead(item.id)}
                    className={cn(
                      'flex items-start gap-3.5 px-5 py-3.5 text-left hover:bg-surface/60 transition-colors cursor-pointer',
                      item.unread && 'bg-primary/[0.02]'
                    )}
                  >
                    <div
                      className={cn(
                        'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                        item.unread
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted/30 text-muted-fg'
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
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

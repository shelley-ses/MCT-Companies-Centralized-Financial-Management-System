import * as React from 'react'
import { NotificationBell } from '@/components/layout/NotificationBell'

export const TopHeader: React.FC = () => {
  return (
    <header className="h-14 sm:h-16 w-full bg-background border-b border-stroke/20 flex items-center justify-end px-6 sm:px-8 sticky top-0 z-30 select-none">
      <NotificationBell />
    </header>
  )
}

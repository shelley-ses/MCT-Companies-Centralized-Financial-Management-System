import * as React from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { MobileTopBar } from '@/components/layout/MobileTopBar'

interface AppShellProps {
  children?: React.ReactNode
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-surface">
      {/* Mobile Top Bar with Sheet Drawer (< lg) */}
      <MobileTopBar />

      {/* Desktop Persistent Sidebar (>= lg) */}
      <div className="hidden lg:flex shrink-0 h-screen sticky top-0">
        <AppSidebar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 min-h-[calc(100vh-4rem)] lg:min-h-screen p-4 sm:p-6 lg:p-8 bg-surface overflow-x-hidden">
        {children || <Outlet />}
      </main>
    </div>
  )
}

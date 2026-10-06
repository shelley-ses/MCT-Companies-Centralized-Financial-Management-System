import * as React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import logo2Url from '@/assets/LOGO2.png'
import mct2Url from '@/assets/MCT2.png'
import {
  MAIN_NAV_ITEMS,
  SECONDARY_NAV_ITEMS,
  type NavItem,
} from '@/components/layout/navItems'
import { NavUserBlock } from '@/components/layout/NavUserBlock'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

interface AppSidebarProps {
  onItemClick?: () => void
  className?: string
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  onItemClick,
  className,
}) => {
  const location = useLocation()
  // Sales collapsible group is expanded by default per specification and mockup
  const [isSalesOpen, setIsSalesOpen] = React.useState(true)

  // Determine if current route is within Sales
  const isSalesActive = location.pathname.startsWith('/sales')

  return (
    <aside
      className={cn(
        'flex flex-col justify-between w-64 lg:w-72 h-full bg-background border-r border-stroke/20 select-none overflow-y-auto',
        className
      )}
    >
      <div className="flex flex-col">
        {/* Logo Lockup using LOGO2.png and MCT2.png with Group of Companies */}
        <div className="px-6 pt-6 pb-6">
          <div className="flex items-center gap-3">
            <img
              src={logo2Url}
              alt="MCT Logo"
              className="h-11 w-auto object-contain shrink-0"
            />
            <div className="flex flex-col justify-center">
              <img
                src={mct2Url}
                alt="MCT"
                className="h-6 sm:h-6.5 w-auto object-contain"
              />
              <span className="text-[10px] sm:text-[11px] font-semibold text-muted-fg tracking-wider uppercase pl-0.5 mt-0.5">
                Group of Companies
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Main Navigation" className="flex flex-col">
          {/* Main items (Dashboard, Sales, Expense, Loan) */}
          <div className="px-4 space-y-1">
            {MAIN_NAV_ITEMS.map((item: NavItem) => {
              const Icon = item.icon

              // Collapsible Sales group with sub-items
              if (item.subItems && item.subItems.length > 0) {
                return (
                  <Collapsible
                    key={item.id}
                    open={isSalesOpen}
                    onOpenChange={setIsSalesOpen}
                    className="w-full space-y-1"
                  >
                    <CollapsibleTrigger
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3.5 py-3 text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                        isSalesActive
                          ? 'text-primary bg-primary/10'
                          : 'text-focus hover:bg-surface'
                      )}
                      aria-expanded={isSalesOpen}
                    >
                      <div className="flex items-center gap-3.5">
                        <Icon className="h-5 w-5 shrink-0" />
                        <span>{item.title}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 transition-transform duration-200 text-muted-fg',
                          isSalesOpen && 'rotate-180'
                        )}
                        aria-hidden="true"
                      />
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-1 pl-11 pt-0.5">
                      {item.subItems.map((subItem) => (
                        <NavLink
                          key={subItem.id}
                          to={subItem.href}
                          onClick={onItemClick}
                          className={({ isActive }) =>
                            cn(
                              'block rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                              isActive
                                ? 'text-primary font-bold'
                                : 'text-muted-fg hover:text-focus hover:bg-surface/60'
                            )
                          }
                        >
                          {subItem.title}
                        </NavLink>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )
              }

              // Standard NavLink Item
              return (
                <NavLink
                  key={item.id}
                  to={item.href}
                  onClick={onItemClick}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3.5 rounded-lg px-3.5 py-3 text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-focus hover:bg-surface'
                    )
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.title}</span>
                </NavLink>
              )
            })}
          </div>

          {/* Line separator after Loan (edge-to-edge divider per picture) */}
          <Separator className="my-5 bg-stroke/40" />

          {/* Secondary Nav Items (Employee, Settings) */}
          <div className="px-4 space-y-1">
            {SECONDARY_NAV_ITEMS.map((item: NavItem) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.id}
                  to={item.href}
                  onClick={onItemClick}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3.5 rounded-lg px-3.5 py-3 text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-focus hover:bg-surface'
                    )
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.title}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>
      </div>

      {/* User Info Block & Logout at bottom with edge-to-edge top divider per picture */}
      <div className="mt-auto">
        <Separator className="bg-stroke/40" />
        <div className="p-6">
          <NavUserBlock />
        </div>
      </div>
    </aside>
  )
}

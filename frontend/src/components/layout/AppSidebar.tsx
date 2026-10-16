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
import { useSession } from '@/hooks/useSession'
import { cn } from '@/lib/utils'

interface AppSidebarProps {
  onItemClick?: () => void
  className?: string
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  onItemClick,
  className,
}) => {
  const { user } = useSession()
  const location = useLocation()
  // Collapsible groups open state
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => ({
    sales: location.pathname.startsWith('/sales'),
    loan: location.pathname.startsWith('/loan') || true,
  }))

  // Auto-expand group if current path is within it
  React.useEffect(() => {
    const currentPath = location.pathname.toLowerCase()
    if (currentPath.startsWith('/sales')) {
      setOpenGroups((prev) => ({ ...prev, sales: true }))
    } else if (currentPath.startsWith('/loan')) {
      setOpenGroups((prev) => ({ ...prev, loan: true }))
    }
  }, [location.pathname])

  const userRole =
    user?.role === 'Finance'
      ? 'Finance'
      : user?.role === 'Company' || user?.role === 'Company Auditor'
      ? 'Company'
      : 'Admin'

  const filteredMainItems = React.useMemo(
    () =>
      MAIN_NAV_ITEMS.filter(
        (item) => !item.roles || item.roles.includes(userRole) || item.roles.includes(user?.role || '')
      ),
    [userRole, user?.role]
  )

  const filteredSecondaryItems = React.useMemo(
    () =>
      SECONDARY_NAV_ITEMS.filter(
        (item) => !item.roles || item.roles.includes(userRole) || item.roles.includes(user?.role || '')
      ),
    [userRole, user?.role]
  )

  return (
    <aside
      className={cn(
        'flex flex-col justify-between w-64 lg:w-72 h-full bg-background border-r border-stroke/20 select-none overflow-y-auto',
        className
      )}
    >
      <div className="flex flex-col">
        {/* Logo Lockup using LOGO2.png and MCT2.png with Group of Companies */}
        <div className="pl-6 pr-4 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <img
              src={logo2Url}
              alt="MCT Logo"
              className="h-10 sm:h-11 w-auto object-contain shrink-0"
            />
            <div className="flex flex-col justify-center items-start">
              <img
                src={mct2Url}
                alt="MCT"
                className="h-4.5 sm:h-5 w-auto object-contain object-left block"
              />
              <span className="text-[10px] font-medium text-muted-fg tracking-tight leading-tight mt-0.5 whitespace-nowrap">
                Group of Companies
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Main Navigation" className="flex flex-col mt-6 sm:mt-7">
          {/* GENERAL Section Header */}
          <div className="px-6 pb-2 text-[10.5px] font-semibold tracking-wider text-muted-fg/80 uppercase select-none">
            GENERAL
          </div>

          {/* Main items (Dashboard, Sales, Expense, Loan, Transaction) */}
          <div className="px-3.5 space-y-1">
            {filteredMainItems.map((item: NavItem) => {
              const Icon = item.icon

              // Collapsible navigation group with sub-items (e.g. Loan -> Borrower, Lender)
              if (item.subItems && item.subItems.length > 0) {
                const isGroupActive = location.pathname.startsWith(item.href)
                const isGroupOpen = openGroups[item.id] ?? true

                return (
                  <Collapsible
                    key={item.id}
                    open={isGroupOpen}
                    onOpenChange={(isOpen) =>
                      setOpenGroups((prev) => ({ ...prev, [item.id]: isOpen }))
                    }
                    className="w-full space-y-0.5"
                  >
                    <CollapsibleTrigger
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus cursor-pointer',
                        isGroupActive
                          ? 'text-primary bg-primary/10'
                          : 'text-focus hover:bg-surface'
                      )}
                      aria-expanded={isGroupOpen}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4.5 w-4.5 shrink-0" />
                        <span>{item.title}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 shrink-0 transition-transform duration-200 text-muted-fg',
                          isGroupOpen && 'rotate-180'
                        )}
                        aria-hidden="true"
                      />
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-0.5 pl-9 pt-0.5 pb-0.5">
                      {item.subItems
                        .filter(
                          (subItem) =>
                            !subItem.roles ||
                            subItem.roles.includes(userRole) ||
                            subItem.roles.includes(user?.role || '')
                        )
                        .map((subItem) => (
                        <NavLink
                          key={subItem.id}
                          to={subItem.href}
                          onClick={onItemClick}
                          className={({ isActive }) =>
                            cn(
                              'block rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                              isActive
                                ? 'text-primary font-semibold'
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
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-focus hover:bg-surface'
                    )
                  }
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span>{item.title}</span>
                </NavLink>
              )
            })}
          </div>

          {/* Line separator after Loan / Transaction (edge-to-edge divider per picture) */}
          <Separator className="my-3 sm:my-3.5 bg-stroke/40" />

          {/* OPERATIONS Section Header */}
          <div className="px-6 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-fg/80 uppercase select-none">
            OPERATIONS
          </div>

          {/* Secondary Nav Items (Employee, Activity Log for Admin, Settings for both) */}
          <div className="px-3.5 space-y-1">
            {filteredSecondaryItems.map((item: NavItem) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.id}
                  to={item.href}
                  onClick={onItemClick}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-focus hover:bg-surface'
                    )
                  }
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
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
        <div className="p-4 sm:p-4.5">
          <NavUserBlock />
        </div>
      </div>
    </aside>
  )
}

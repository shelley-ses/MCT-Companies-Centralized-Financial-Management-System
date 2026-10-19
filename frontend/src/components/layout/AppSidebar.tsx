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
  forceExpanded?: boolean
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  onItemClick,
  className,
  forceExpanded = false,
}) => {
  const { user } = useSession()
  const location = useLocation()
  const [isHovered, setIsHovered] = React.useState(false)
  const isExpanded = forceExpanded || isHovered

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
      : user?.role === 'Supervisor'
      ? 'Supervisor'
      : user?.role === 'Audit'
      ? 'Audit'
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
      onMouseEnter={() => !forceExpanded && setIsHovered(true)}
      onMouseLeave={() => !forceExpanded && setIsHovered(false)}
      className={cn(
        'flex flex-col justify-between h-full bg-background border-r border-stroke/20 select-none overflow-y-auto overflow-x-hidden transition-[width,box-shadow] duration-300 ease-in-out',
        forceExpanded
          ? 'w-full relative shadow-none'
          : isExpanded
          ? 'w-64 lg:w-72 shadow-2xl z-50 absolute left-0 top-0 bg-white dark:bg-slate-900'
          : 'w-[72px] relative shadow-none',
        className
      )}
    >
      <div className="flex flex-col">
        {/* Logo Lockup */}
        <div
          className={cn(
            'transition-all duration-300 pt-6 pb-2',
            isExpanded ? 'pl-6 pr-4' : 'px-3 flex justify-center'
          )}
        >
          <div className={cn('flex items-center', isExpanded ? 'gap-3' : 'justify-center')}>
            <img
              src={logo2Url}
              alt="MCT Logo"
              className={cn(
                'w-auto object-contain shrink-0 transition-all duration-300',
                isExpanded ? 'h-10 sm:h-11' : 'h-9 w-9'
              )}
            />
            {isExpanded && (
              <div className="flex flex-col justify-center items-start min-w-0 animate-in fade-in duration-200">
                <img
                  src={mct2Url}
                  alt="MCT"
                  className="h-4.5 sm:h-5 w-auto object-contain object-left block"
                />
                <span className="text-[10px] font-medium text-muted-fg tracking-tight leading-tight mt-0.5 whitespace-nowrap">
                  Group of Companies
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Main Navigation" className="flex flex-col mt-6 sm:mt-7">
          {/* GENERAL Section Header */}
          {isExpanded ? (
            <div className="px-6 pb-2 text-[10.5px] font-semibold tracking-wider text-muted-fg/80 uppercase select-none animate-in fade-in duration-200">
              GENERAL
            </div>
          ) : (
            <div className="w-8 h-px bg-stroke/40 mx-auto mb-2" />
          )}

          {/* Main items (Dashboard, Sales, Expense, Loan, Bills, Transaction) */}
          <div className={cn(isExpanded ? 'px-3.5 space-y-1' : 'px-2 space-y-1.5 flex flex-col items-center')}>
            {filteredMainItems.map((item: NavItem) => {
              const Icon = item.icon

              const roleSubItems = item.subItems?.filter(
                (subItem) =>
                  !subItem.roles ||
                  subItem.roles.includes(userRole) ||
                  subItem.roles.includes(user?.role || '')
              )

              // Collapsible navigation group with sub-items (e.g. Loan -> Borrower, Lender)
              if (roleSubItems && roleSubItems.length > 0) {
                if (!isExpanded) {
                  const targetHref = roleSubItems[0]?.href || item.href
                  const isGroupActive = location.pathname.startsWith(item.href)
                  return (
                    <NavLink
                      key={item.id}
                      to={targetHref}
                      onClick={onItemClick}
                      title={item.title}
                      className={cn(
                        'flex items-center justify-center rounded-xl w-10 h-10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                        isGroupActive
                          ? 'text-primary bg-primary/10'
                          : 'text-focus hover:bg-surface'
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                    </NavLink>
                  )
                }

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
                        <span className="truncate">{item.title}</span>
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
                      {roleSubItems.map((subItem) => (
                        <NavLink
                          key={subItem.id}
                          to={subItem.href}
                          onClick={onItemClick}
                          className={({ isActive }) =>
                            cn(
                              'block rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus truncate',
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
              if (!isExpanded) {
                return (
                  <NavLink
                    key={item.id}
                    to={item.href}
                    onClick={onItemClick}
                    title={item.title}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-center rounded-xl w-10 h-10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                        isActive
                          ? 'text-primary bg-primary/10'
                          : 'text-focus hover:bg-surface'
                      )
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                  </NavLink>
                )
              }

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
                  <span className="truncate">{item.title}</span>
                </NavLink>
              )
            })}
          </div>

          {/* Line separator */}
          <Separator className="my-3 sm:my-3.5 bg-stroke/40" />

          {/* OPERATIONS Section Header */}
          {isExpanded ? (
            <div className="px-6 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-fg/80 uppercase select-none animate-in fade-in duration-200">
              OPERATIONS
            </div>
          ) : (
            <div className="w-8 h-px bg-stroke/40 mx-auto mb-2" />
          )}

          {/* Secondary Nav Items */}
          <div className={cn(isExpanded ? 'px-3.5 space-y-1' : 'px-2 space-y-1.5 flex flex-col items-center')}>
            {filteredSecondaryItems.map((item: NavItem) => {
              const Icon = item.icon

              if (!isExpanded) {
                return (
                  <NavLink
                    key={item.id}
                    to={item.href}
                    onClick={onItemClick}
                    title={item.title}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-center rounded-xl w-10 h-10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                        isActive
                          ? 'text-primary bg-primary/10'
                          : 'text-focus hover:bg-surface'
                      )
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                  </NavLink>
                )
              }

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
                  <span className="truncate">{item.title}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>
      </div>

      {/* User Info Block & Logout at bottom */}
      <div className="mt-auto">
        <Separator className="bg-stroke/40" />
        <div className={cn('transition-all duration-300', isExpanded ? 'p-4 sm:p-4.5' : 'p-2')}>
          <NavUserBlock isCollapsed={!isExpanded} />
        </div>
      </div>
    </aside>
  )
}

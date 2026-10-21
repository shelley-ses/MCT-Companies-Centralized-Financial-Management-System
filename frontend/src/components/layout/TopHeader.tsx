import * as React from 'react'
import { Building2, ChevronDown, Check, Sparkles } from 'lucide-react'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { useCompany } from '@/context/CompanyContext'
import { isLendingEnabledCompany } from '@/config/companyFeatures'
import { cn } from '@/lib/utils'

export const TopHeader: React.FC = () => {
  const { activeCompany, setActiveCompany, isCompanyScoped, allCompanies } = useCompany()
  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  const isLending = isLendingEnabledCompany(activeCompany)

  return (
    <header className="h-14 sm:h-16 w-full bg-background border-b border-stroke/20 flex items-center justify-between px-6 sm:px-8 sticky top-0 z-30 select-none">
      {/* Left side: Company Selector (for central roles) or Company Badge (for company users) */}
      <div className="flex items-center gap-3">
        {isCompanyScoped ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-stroke/30 text-xs sm:text-sm font-semibold text-focus">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate max-w-[200px] sm:max-w-none">{activeCompany}</span>
            {isLending && (
              <span className="ml-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Lending Enabled
              </span>
            )}
          </div>
        ) : (
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface/80 border border-stroke/40 text-xs sm:text-sm font-semibold text-focus transition-all cursor-pointer shadow-xs"
              aria-label="Switch Active Company"
              aria-expanded={dropdownOpen}
            >
              <Building2 className="h-4 w-4 text-primary shrink-0" />
              <span className="text-muted-fg text-xs font-normal">Active Company:</span>
              <span className="truncate max-w-[150px] sm:max-w-[220px] font-semibold text-focus">
                {activeCompany}
              </span>
              {isLending && (
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles className="h-2.5 w-2.5" />
                  Lending
                </span>
              )}
              <ChevronDown
                className={cn('h-3.5 w-3.5 text-muted-fg transition-transform duration-150', dropdownOpen && 'rotate-180')}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-64 sm:w-72 bg-white dark:bg-slate-900 rounded-xl border border-stroke/30 shadow-xl py-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-fg">
                  Switch Active Company View
                </div>
                <div className="max-h-60 overflow-y-auto space-y-0.5 px-1.5">
                  {allCompanies.map((comp) => {
                    const isSelected = activeCompany === comp
                    const hasLending = isLendingEnabledCompany(comp)
                    return (
                      <button
                        key={comp}
                        type="button"
                        onClick={() => {
                          setActiveCompany(comp)
                          setDropdownOpen(false)
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer',
                          isSelected
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-focus hover:bg-surface'
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="truncate">{comp}</span>
                          {hasLending && (
                            <span className="shrink-0 text-[9px] font-bold uppercase px-1 py-0.2 rounded bg-emerald-100 text-emerald-800">
                              Lending
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary ml-2" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side: Notification Bell */}
      <div className="flex items-center gap-3">
        <NotificationBell />
      </div>
    </header>
  )
}

import * as React from 'react'
import {
  Building2,
  Clock,
  ChevronDown,
  Check,
  X,
} from 'lucide-react'
import {
  DateRangeFilter,
  type DateRange,
} from '@/components/employee/DateRangeFilter'
import { useSession } from '@/hooks/useSession'
import { cn } from '@/lib/utils'

export interface DashboardFilterState {
  dateRange: DateRange
  company: string
  period: string
}

interface DashboardHeaderProps {
  filters: DashboardFilterState
  onFiltersChange: (newFilters: DashboardFilterState) => void
  companies?: string[]
}

const DEFAULT_COMPANIES = [
  'All Companies',
  'MCT Kitchen',
  'MCT Hotel',
  'JK Cafe',
  'Annex Nine',
  'Merillon',
  'JK Printing',
  'Speedbox',
  'JK Property and Ventures',
  'Golden Sunburst Ventures',
]

const PERIOD_OPTIONS = [
  'Last 7 Days',
  'Last 30 Days',
  'This Month',
  'Last Quarter',
  'This Year',
]

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  filters,
  onFiltersChange,
  companies = DEFAULT_COMPANIES,
}) => {
  const { user } = useSession()
  const isAuditor = user?.role === 'Company Auditor'
  const assignedCompany = user?.assignedCompany || 'MCT Kitchen'

  const [openDropdown, setOpenDropdown] = React.useState<
    'company' | 'period' | null
  >(null)

  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCompanySelect = (comp: string) => {
    onFiltersChange({ ...filters, company: comp })
    setOpenDropdown(null)
  }

  const handlePeriodSelect = (period: string) => {
    onFiltersChange({ ...filters, period })
    setOpenDropdown(null)
  }

  const handleResetCompany = (e: React.MouseEvent) => {
    e.stopPropagation()
    onFiltersChange({ ...filters, company: 'All Companies' })
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4"
    >
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-focus">
          Financial Overview
        </h1>
        <p className="text-xs sm:text-sm text-muted-fg font-normal mt-0.5">
          {isAuditor
            ? `Audit transactions and verify financial records for ${assignedCompany}.`
            : "Here's the summary of what's happening with MCT Group of Companies."}
        </p>
      </div>

      {/* Uniform Filter Bar */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {/* 1. Date Filter (Identical to Employee tab/screen DateRangeFilter) */}
        <DateRangeFilter
          value={filters.dateRange}
          onChange={(newDateRange) => {
            onFiltersChange({ ...filters, dateRange: newDateRange })
          }}
        />

        {/* 2. Company Scope: Locked to assigned company for Auditor, full dropdown for Admin */}
        {isAuditor ? (
          <div className="inline-flex items-center gap-2 h-10 sm:h-11 px-4 rounded-full border border-stroke/60 bg-white text-focus text-xs sm:text-sm font-medium shadow-xs select-none">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold text-focus truncate max-w-[180px]">
              Assigned: {assignedCompany}
            </span>
          </div>
        ) : (
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() =>
                setOpenDropdown((prev) => (prev === 'company' ? null : 'company'))
              }
              className={cn(
                'inline-flex items-center gap-2 h-10 sm:h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                openDropdown === 'company' && 'ring-2 ring-focus/20 border-focus'
              )}
              aria-expanded={openDropdown === 'company'}
            >
              <Building2 className="h-4 w-4 text-muted-fg shrink-0" />
              <span className="font-medium text-focus/90 truncate max-w-[150px] sm:max-w-[180px]">
                {filters.company}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-fg shrink-0 ml-0.5" />
              {filters.company !== 'All Companies' && (
                <span
                  onClick={handleResetCompany}
                  className="p-0.5 rounded-full hover:bg-stroke/30 text-muted-fg hover:text-focus transition-colors"
                  title="Reset company filter"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </button>

          {openDropdown === 'company' && (
            <div className="absolute right-0 sm:right-auto sm:left-0 top-full mt-2 w-64 bg-white rounded-2xl border border-stroke/30 shadow-xl p-3 z-50 max-h-72 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-stroke/20 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-focus">
                  Filter By Company
                </span>
                {filters.company !== 'All Companies' && (
                  <button
                    type="button"
                    onClick={handleResetCompany}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {companies.map((comp) => {
                  const isSelected = filters.company === comp
                  return (
                    <button
                      key={comp}
                      type="button"
                      onClick={() => handleCompanySelect(comp)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-left',
                        isSelected
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-focus/80 hover:bg-surface'
                      )}
                    >
                      <span className="truncate">{comp}</span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

        {/* 3. Period / Scope Preset (Uniform pill styling matching DateRangeFilter) */}
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() =>
              setOpenDropdown((prev) => (prev === 'period' ? null : 'period'))
            }
            className={cn(
              'inline-flex items-center gap-2 h-10 sm:h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
              openDropdown === 'period' && 'ring-2 ring-focus/20 border-focus'
            )}
            aria-expanded={openDropdown === 'period'}
          >
            <Clock className="h-4 w-4 text-muted-fg shrink-0" />
            <span className="font-medium text-focus/90">
              {filters.period}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-fg shrink-0 ml-0.5" />
          </button>

          {openDropdown === 'period' && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-stroke/30 shadow-xl p-3 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
              <div className="pb-2 mb-1 border-b border-stroke/20 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-focus">
                  Time Period
                </span>
              </div>
              <div className="space-y-1">
                {PERIOD_OPTIONS.map((opt) => {
                  const isSelected = filters.period === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handlePeriodSelect(opt)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-left',
                        isSelected
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-focus/80 hover:bg-surface'
                      )}
                    >
                      <span>{opt}</span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import * as React from 'react'
import {
  Building2,
  ChevronDown,
  Check,
  X,
  Search,
} from 'lucide-react'
import {
  DateRangePicker,
  type DateRange,
} from '@/components/ui/DateRangePicker'
import { useSession } from '@/hooks/useSession'
import { cn } from '@/lib/utils'

export interface DashboardFilterState {
  dateRange: DateRange
  company: string
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

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  filters,
  onFiltersChange,
  companies = DEFAULT_COMPANIES,
}) => {
  const { user } = useSession()
  const isAuditor = user?.role === 'Company Auditor'
  const assignedCompany = user?.assignedCompany || 'MCT Kitchen'

  const [isOpen, setIsOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Handle outside click and escape key
  React.useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Focus search input on open
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearchQuery('')
    }
  }, [isOpen])

  const handleCompanySelect = (comp: string) => {
    onFiltersChange({ ...filters, company: comp })
    setIsOpen(false)
  }

  const handleResetCompany = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    onFiltersChange({ ...filters, company: 'All Companies' })
  }

  const filteredCompanies = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return companies
    return companies.filter((c) => c.toLowerCase().includes(q))
  }, [companies, searchQuery])

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
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

      {/* Uniform Filter Bar: Shared Date Picker + Company Scope */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {/* 1. Global Custom Date Picker (Single date or Custom range, no presets) */}
        <DateRangePicker
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
          <div ref={dropdownRef} className="relative inline-block">
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className={cn(
                'inline-flex items-center gap-2 h-10 sm:h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                isOpen && 'ring-2 ring-focus/20 border-focus'
              )}
              aria-expanded={isOpen}
              aria-haspopup="listbox"
            >
              <Building2 className="h-4 w-4 text-muted-fg shrink-0" />
              <span className="font-medium text-focus/90 truncate max-w-[150px] sm:max-w-[180px]">
                {filters.company}
              </span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-muted-fg shrink-0 ml-0.5 transition-transform duration-200',
                  isOpen && 'transform rotate-180'
                )}
              />
              {filters.company !== 'All Companies' && (
                <button
                  type="button"
                  onClick={handleResetCompany}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="p-1 rounded-full hover:bg-slate-200 text-muted-fg hover:text-focus transition-colors ml-0.5"
                  title="Reset to All Companies"
                  aria-label="Reset company filter"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </button>

            {isOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-stroke/30 shadow-2xl p-2.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150"
                role="listbox"
              >
                {/* Dropdown Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-stroke/20 px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-fg">
                    Filter By Company
                  </span>
                  {filters.company !== 'All Companies' && (
                    <button
                      type="button"
                      onClick={handleResetCompany}
                      className="text-xs text-primary hover:underline font-semibold"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>

                {/* Quick Search Input */}
                <div className="relative mb-2 px-1">
                  <Search className="w-3.5 h-3.5 text-muted-fg absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search company…"
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-stroke/40 bg-slate-50/70 text-xs text-focus placeholder:text-muted-fg/60 focus:outline-none focus:ring-1 focus:ring-focus focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg hover:text-focus p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Companies List */}
                <div className="space-y-0.5 max-h-60 overflow-y-auto pr-0.5">
                  {filteredCompanies.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted-fg">
                      No matching companies found
                    </div>
                  ) : (
                    filteredCompanies.map((comp) => {
                      const isSelected = filters.company === comp
                      return (
                        <button
                          key={comp}
                          type="button"
                          onClick={() => handleCompanySelect(comp)}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer',
                            isSelected
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-focus/80 hover:bg-slate-50 hover:text-focus'
                          )}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <span className="truncate">{comp}</span>
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

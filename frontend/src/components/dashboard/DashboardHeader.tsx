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
import { ALL_COMPANIES_LIST } from '@/context/CompanyContext'
import { isCompanyMatch } from '@/utils/companyUtils'
import { cn } from '@/lib/utils'

export interface DashboardFilterState {
  dateRange: DateRange
  company: string
}

interface DashboardHeaderProps {
  filters: DashboardFilterState
  onFiltersChange: (newFilters: DashboardFilterState) => void
  companies?: string[]
  isCompanyScoped?: boolean
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  filters,
  onFiltersChange,
  companies = ALL_COMPANIES_LIST,
  isCompanyScoped = false,
}) => {
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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      {/* Scope Subtitle */}
      <div className="min-w-0 shrink">
        <p className="text-xs sm:text-sm text-muted-fg font-normal truncate max-w-md xl:max-w-xl">
          {filters.company !== 'All Companies'
            ? `Viewing financial records and transactions for ${filters.company}.`
            : "Here's the consolidated financial summary across all MCT Group of Companies."}
        </p>
      </div>

      {/* Uniform Filter Bar: Shared Date Picker + Company Scope */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap sm:flex-nowrap self-start sm:self-auto max-w-full">
        {/* 1. Global Custom Date Picker (Single date or Custom range, no presets) */}
        <DateRangePicker
          value={filters.dateRange}
          onChange={(newDateRange) => {
            onFiltersChange({ ...filters, dateRange: newDateRange })
          }}
        />

        {/* 2. Company Scope: Dropdown for Finance/Audit/Admin, static assigned company pill for Supervisor */}
        {isCompanyScoped ? (
          <div className="inline-flex items-center gap-2 h-10 sm:h-11 px-3.5 sm:px-4 rounded-full border border-stroke/60 bg-slate-50 text-focus text-xs sm:text-sm font-medium shadow-xs shrink-0 whitespace-nowrap">
            <Building2 className="h-4 w-4 text-muted-fg shrink-0" />
            <span className="font-semibold text-focus/90 truncate max-w-[280px] sm:max-w-[360px]">
              {filters.company}
            </span>
          </div>
        ) : (
          <div ref={dropdownRef} className="relative inline-block shrink-0">
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className={cn(
                'inline-flex items-center gap-2 h-10 sm:h-11 px-3.5 sm:px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus shrink-0 whitespace-nowrap',
                isOpen && 'ring-2 ring-slate-100 border-slate-300'
              )}
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-label="Filter dashboard by company"
            >
              <Building2 className="h-4 w-4 text-muted-fg shrink-0" />
              <span className="font-medium text-focus/90 truncate max-w-[240px] sm:max-w-[360px]">
                {filters.company}
              </span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-muted-fg shrink-0 ml-0.5 transition-transform duration-200',
                  isOpen && 'transform rotate-180'
                )}
              />
              {filters.company !== 'All Companies' && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleResetCompany(e)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      handleResetCompany(e as unknown as React.MouseEvent)
                    }
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="p-1 rounded-full hover:bg-slate-200 text-muted-fg hover:text-focus transition-colors ml-0.5 cursor-pointer inline-flex items-center justify-center"
                  title="Reset to All Companies"
                  aria-label="Reset company filter"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </button>

            {isOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-stroke/30 shadow-2xl p-2.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150"
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
                      className="text-xs text-primary hover:underline font-semibold cursor-pointer"
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
                      const isSelected =
                        comp === 'All Companies'
                          ? filters.company === 'All Companies'
                          : filters.company !== 'All Companies' &&
                            (filters.company === comp || isCompanyMatch(filters.company, comp))
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

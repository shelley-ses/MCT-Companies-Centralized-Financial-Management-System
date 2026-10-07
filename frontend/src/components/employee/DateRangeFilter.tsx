import * as React from 'react'
import { Calendar as CalendarIcon, Check, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface DateRange {
  startDate: string | null // ISO YYYY-MM-DD
  endDate: string | null   // ISO YYYY-MM-DD
  label: string
}

interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

const PRESET_RANGES: { label: string; startDate: string | null; endDate: string | null }[] = [
  {
    label: '10/01/2026 - 10/05/2026',
    startDate: '2026-10-01',
    endDate: '2026-10-05',
  },
  {
    label: 'This Month (Oct 2026)',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  },
  {
    label: 'Last 7 Days',
    startDate: '2026-09-30',
    endDate: '2026-10-06',
  },
  {
    label: 'Last 30 Days',
    startDate: '2026-09-07',
    endDate: '2026-10-06',
  },
  {
    label: 'All Dates',
    startDate: null,
    endDate: null,
  },
]

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [customStart, setCustomStart] = React.useState(value.startDate || '2026-10-01')
  const [customEnd, setCustomEnd] = React.useState(value.endDate || '2026-10-05')
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  const handleSelectPreset = (preset: typeof PRESET_RANGES[number]) => {
    onChange({
      startDate: preset.startDate,
      endDate: preset.endDate,
      label: preset.label,
    })
    if (preset.startDate && preset.endDate) {
      setCustomStart(preset.startDate)
      setCustomEnd(preset.endDate)
    }
    setIsOpen(false)
  }

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) return
    const formatPart = (d: string) => {
      const parts = d.split('-')
      if (parts.length === 3) {
        return `${parts[1]}/${parts[2]}/${parts[0]}`
      }
      return d
    }
    const label = `${formatPart(customStart)} - ${formatPart(customEnd)}`
    onChange({
      startDate: customStart,
      endDate: customEnd,
      label,
    })
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange({
      startDate: null,
      endDate: null,
      label: 'All Dates',
    })
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Pill Trigger matching Image 4 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 h-10 sm:h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <CalendarIcon className="h-4 w-4 text-muted-fg shrink-0" />
        <span className="font-semibold text-focus/90">{value.label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-fg shrink-0 ml-0.5" />
        {value.startDate && (
          <span
            onClick={handleClear}
            className="p-0.5 rounded-full hover:bg-stroke/30 text-muted-fg hover:text-focus transition-colors"
            title="Reset date filter"
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-stroke/30 shadow-xl p-4 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-stroke/20">
            <span className="text-xs font-bold uppercase tracking-wider text-focus">
              Filter By Date
            </span>
            {value.startDate && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-primary hover:underline font-medium"
              >
                Clear Filter
              </button>
            )}
          </div>

          {/* Quick Presets */}
          <div className="py-2.5 space-y-1">
            <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block mb-1">
              Quick Ranges
            </span>
            {PRESET_RANGES.map((preset) => {
              const isSelected = value.label === preset.label
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-focus/80 hover:bg-surface'
                  }`}
                >
                  <span>{preset.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              )
            })}
          </div>

          {/* Custom Date Range Inputs */}
          <div className="pt-2.5 border-t border-stroke/20 space-y-2.5">
            <span className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider block">
              Custom Range
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-fg block mb-1">From</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full text-xs h-8 px-2 rounded-lg border border-stroke/50 bg-white text-focus focus:outline-none focus:ring-1 focus:ring-focus"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-fg block mb-1">To</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full text-xs h-8 px-2 rounded-lg border border-stroke/50 bg-white text-focus focus:outline-none focus:ring-1 focus:ring-focus"
                />
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleApplyCustom}
              className="w-full h-8 text-xs font-semibold bg-[#960C01] hover:bg-[#800a01] text-white rounded-lg mt-1"
            >
              Apply Range
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

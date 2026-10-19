import * as React from 'react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { BarChart3, Scale } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { formatPHP } from '@/lib/format'
import { cn } from '@/lib/utils'
import { normalizeDateToYYYYMMDD } from '@/utils/dateUtils'
import type { DashboardTransactionItem } from '@/services/dashboardService'

const PROFIT_COLOR = '#16A34A'
const LOSS_COLOR = '#DC2626'
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface ProfitLossMonthlyChartProps {
  transactions?: DashboardTransactionItem[]
  className?: string
}

interface MonthPoint {
  key: string // YYYY-MM
  label: string // e.g. "Oct 2026"
  income: number
  expenses: number
  profit: number
}

const formatAxis = (v: number) => {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1000) return `${sign}${Math.round(abs / 1000)}k`
  return `${v}`
}

// Every YYYY-MM from first to last (inclusive) so months with no activity still appear
const monthRange = (first: string, last: string): string[] => {
  const keys: string[] = []
  let [y, m] = first.split('-').map(Number)
  const [ly, lm] = last.split('-').map(Number)
  while (y < ly || (y === ly && m <= lm)) {
    keys.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return keys
}

export const ProfitLossMonthlyChart: React.FC<ProfitLossMonthlyChartProps> = ({
  transactions = [],
  className,
}) => {
  const { monthData, netTotal } = React.useMemo(() => {
    const sums: Record<string, { income: number; expenses: number }> = {}

    transactions.forEach((tx) => {
      const iso = normalizeDateToYYYYMMDD(tx.date)
      if (!/^\d{4}-\d{2}/.test(iso)) return
      const key = iso.slice(0, 7)
      if (!sums[key]) sums[key] = { income: 0, expenses: 0 }
      sums[key].income += tx.deposit || 0
      sums[key].expenses += tx.withdrawal || 0
    })

    const keys = Object.keys(sums).sort()
    if (keys.length === 0) return { monthData: [] as MonthPoint[], netTotal: 0 }

    const data: MonthPoint[] = monthRange(keys[0], keys[keys.length - 1]).map((key) => {
      const [y, m] = key.split('-')
      const income = sums[key]?.income || 0
      const expenses = sums[key]?.expenses || 0
      return {
        key,
        label: `${MONTH_LABELS[Number(m) - 1]} ${y}`,
        income,
        expenses,
        profit: income - expenses,
      }
    })

    return {
      monthData: data,
      netTotal: data.reduce((sum, d) => sum + d.profit, 0),
    }
  }, [transactions])

  const hasData = monthData.length > 0

  return (
    <Card
      className={cn(
        'bg-white rounded-[20px] border border-slate-200/80 p-5 shadow-xs flex flex-col transition-all hover:shadow-md',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-focus leading-tight">
              Monthly Profit / Loss
            </h3>
            <p className="text-xs text-muted-fg font-normal mt-0.5 line-clamp-1">
              Income minus expenses per month
            </p>
          </div>
        </div>

        {hasData && (
          <div className="text-right shrink-0">
            <span className="text-2xs sm:text-xs text-muted-fg font-medium block">
              {netTotal >= 0 ? 'Net profit' : 'Net loss'} for period
            </span>
            <span
              className={cn(
                'text-sm sm:text-base font-bold tabular-nums',
                netTotal >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'
              )}
            >
              {formatPHP(netTotal)}
            </span>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="h-48 sm:h-56 flex flex-col items-center justify-center text-center p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2.5">
            <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-xs sm:text-sm font-semibold text-focus">No profit / loss data</p>
          <p className="text-2xs sm:text-xs text-muted-fg mt-0.5 max-w-xs">
            No transactions found for the selected date range.
          </p>
        </div>
      ) : (
        <div className="h-56 sm:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthData} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: '#767B89', fontSize: 11, fontWeight: 500 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                tickFormatter={formatAxis}
                tick={{ fill: '#767B89', fontSize: 10 }}
              />
              <ReferenceLine y={0} stroke="#CBD5E1" />
              <Tooltip
                cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload as MonthPoint
                  const isProfit = item.profit >= 0
                  return (
                    <div className="bg-focus text-white px-3 py-2 rounded-xl shadow-lg border border-white/10 text-xs min-w-[160px]">
                      <p className="font-semibold text-white/90 mb-1">{item.label}</p>
                      <div className="flex justify-between gap-4 text-white/70">
                        <span>Income</span>
                        <span className="tabular-nums">{formatPHP(item.income)}</span>
                      </div>
                      <div className="flex justify-between gap-4 text-white/70">
                        <span>Expenses</span>
                        <span className="tabular-nums">{formatPHP(item.expenses)}</span>
                      </div>
                      <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-white/15 font-bold">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: isProfit ? PROFIT_COLOR : LOSS_COLOR }}
                          />
                          {isProfit ? 'Profit' : 'Loss'}
                        </span>
                        <span className="tabular-nums">{formatPHP(item.profit)}</span>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="profit" maxBarSize={48} radius={[4, 4, 4, 4]}>
                {monthData.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={entry.profit >= 0 ? PROFIT_COLOR : LOSS_COLOR}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      {hasData && (
        <div className="pt-3 mt-2 border-t border-slate-100 flex items-center gap-4 text-2xs sm:text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PROFIT_COLOR }} />
            <span className="text-muted-fg font-medium">Profit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LOSS_COLOR }} />
            <span className="text-muted-fg font-medium">Loss</span>
          </div>
        </div>
      )}
    </Card>
  )
}

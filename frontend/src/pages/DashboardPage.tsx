import * as React from 'react'
import {
  TrendingDown,
  TrendingUp,
  Landmark,
  AlertCircle,
} from 'lucide-react'
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner'
import {
  DashboardHeader,
  type DashboardFilterState,
} from '@/components/dashboard/DashboardHeader'
import { DashboardKpiCard } from '@/components/dashboard/DashboardKpiCard'
import {
  IncomeSummaryChart,
  ExpenseSummaryChart,
} from '@/components/dashboard/CategorySummaryChart'
import { RecentTransactionsCard } from '@/components/dashboard/RecentTransactionsCard'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import {
  dashboardService,
  type DashboardData,
} from '@/services/dashboardService'
import { useSession } from '@/hooks/useSession'
import { formatPHP } from '@/lib/format'
import { isDateInRange, normalizeDateToYYYYMMDD } from '@/utils/dateUtils'

export const DashboardPage: React.FC = () => {
  const { user } = useSession()
  const isAuditor = user?.role === 'Company Auditor'
  const assignedCompany = user?.assignedCompany || 'MCT Kitchen'

  const [filters, setFilters] = React.useState<DashboardFilterState>(() => ({
    dateRange: {
      startDate: '2026-10-01',
      endDate: '2026-10-05',
      label: '10/01/2026 - 10/05/2026',
    },
    company: isAuditor ? assignedCompany : 'All Companies',
  }))

  // Ensure Company Auditor is locked to their assigned company
  React.useEffect(() => {
    if (isAuditor && filters.company !== assignedCompany) {
      setFilters((prev) => ({ ...prev, company: assignedCompany }))
    }
  }, [isAuditor, assignedCompany, filters.company])

  const [loading, setLoading] = React.useState<boolean>(true)
  const [data, setData] = React.useState<DashboardData | null>(null)

  // Fetch initial dashboard data
  React.useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setLoading(true)
      try {
        const result = await dashboardService.getDashboardData({
          company: filters.company,
        })
        if (isMounted) {
          setData(result)
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [filters.company])

  // Filter transactions strictly on client side by company and date range, sorted latest first
  const filteredTransactions = React.useMemo(() => {
    if (!data?.recentTransactions) return []

    return data.recentTransactions
      .filter((tx) => {
        // 1. Company filter
        if (
          filters.company !== 'All Companies' &&
          tx.company !== filters.company
        ) {
          return false
        }

        // 2. Date range filter
        return isDateInRange(
          tx.date,
          filters.dateRange.startDate,
          filters.dateRange.endDate
        )
      })
      .sort((a, b) => {
        const dateA = normalizeDateToYYYYMMDD(a.date)
        const dateB = normalizeDateToYYYYMMDD(b.date)
        const cmp = dateB.localeCompare(dateA)
        if (cmp !== 0) return cmp
        return (b.createdAt || b.id).localeCompare(a.createdAt || a.id)
      })
  }, [data?.recentTransactions, filters.company, filters.dateRange])

  // Dynamic KPI calculations responding to filtered transactions
  const { totalExpenses, totalIncome, netIncome, overdueCount, dueSoonCount } =
    React.useMemo(() => {
      const expenses = filteredTransactions.reduce(
        (sum, tx) => sum + (tx.withdrawal || 0),
        0
      )
      const income = filteredTransactions.reduce(
        (sum, tx) => sum + (tx.deposit || 0),
        0
      )
      const net = income - expenses

      const overdue = filteredTransactions.filter(
        (tx) => tx.status === 'Overdue' || tx.auditStatus === 'Flagged'
      ).length
      const dueSoon = filteredTransactions.filter(
        (tx) => tx.status === 'Pending'
      ).length

      return {
        totalExpenses: expenses,
        totalIncome: income,
        netIncome: net,
        overdueCount: overdue,
        dueSoonCount: dueSoon,
      }
    }, [filteredTransactions])

  if (loading && !data) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-5 pb-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Visually hidden h1 for accessibility compliance */}
      <h1 className="sr-only">MCT Centralized Financial Dashboard</h1>

      {/* 1. Sleek Compact Welcome Greeting Banner */}
      <WelcomeBanner />

      {/* 2. Financial Overview Header & Global Custom Date Picker */}
      <DashboardHeader
        filters={filters}
        onFiltersChange={(newFilters) => setFilters(newFilters)}
      />

      {/* 3. KPI Cards (Admin and Company Auditor):
          1. Total Expenses
          2. Total Income
          3. Net Income (Income - Expenses)
          4. Overdue / Due Soon
          All values respond dynamically to the selected date range.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardKpiCard
          label="Total Expenses"
          value={formatPHP(totalExpenses)}
          icon={TrendingDown}
          subtext="Total withdrawals for period"
        />
        <DashboardKpiCard
          label="Total Income"
          value={formatPHP(totalIncome)}
          icon={TrendingUp}
          subtext="Total deposits for period"
        />
        <DashboardKpiCard
          label="Net Income (Income - Expenses)"
          value={formatPHP(netIncome)}
          icon={Landmark}
          subtext={netIncome >= 0 ? 'Positive net cashflow' : 'Negative net cashflow'}
        />
        <DashboardKpiCard
          label="Overdue / Due Soon"
          value={`${overdueCount} / ${dueSoonCount}`}
          icon={AlertCircle}
          subtext="Requires prompt review"
        />
      </div>

      {/* 4. Income and Expense Summary Charts:
          Two separate charts side by side (stacked on mobile):
          1. Income Summary
          2. Expense Summary
          Each chart has its independent Bar/Pie toggle, defaults to Bar,
          and breaks down by GCash, Maya, PayMongo, Panda, In-house with consistent colors.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <IncomeSummaryChart transactions={filteredTransactions} />
        <ExpenseSummaryChart transactions={filteredTransactions} />
      </div>

      {/* 5. Recent Transactions Table:
          Columns in order: Date, Cheque No., Particulars, Withdrawal, Deposit, Category
          Admin and Company Auditor view: Category is read-only badge.
          Updates when date range changes. Max 10 rows per page with working pagination.
      */}
      <RecentTransactionsCard
        companyName={filters.company}
        transactions={filteredTransactions}
      />
    </div>
  )
}

import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingDown,
  TrendingUp,
  Landmark,
  AlertCircle,
  Wallet,
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
import { ProfitLossMonthlyChart } from '@/components/dashboard/ProfitLossMonthlyChart'
import { RecentTransactionsCard } from '@/components/dashboard/RecentTransactionsCard'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import {
  dashboardService,
  type DashboardData,
} from '@/services/dashboardService'
import { pettyCashService } from '@/services/pettyCashService'
import { formatPHP } from '@/lib/format'
import { cn } from '@/lib/utils'
import { isDateInRange, normalizeDateToYYYYMMDD } from '@/utils/dateUtils'
import { useSession } from '@/hooks/useSession'

export const DashboardPage: React.FC = () => {
  const { user } = useSession()
  const isCompanyScoped =
    user?.role === 'Company' ||
    user?.role === 'Company Auditor' ||
    user?.role === 'Supervisor'
  const assignedCompany = user?.assignedCompany || 'MCT Kitchen'

  const [filters, setFilters] = React.useState<DashboardFilterState>(() => ({
    dateRange: {
      startDate: null,
      endDate: null,
      label: 'All Dates',
    },
    company: isCompanyScoped ? assignedCompany : 'All Companies',
  }))

  // Keep filters.company in sync if user profile loads after initial render
  React.useEffect(() => {
    if (isCompanyScoped && user?.assignedCompany) {
      setFilters((prev) => ({
        ...prev,
        company: user.assignedCompany || 'MCT Kitchen',
      }))
    }
  }, [isCompanyScoped, user?.assignedCompany])

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

  // Petty cash wallet(s) for the selected company; null when the backend is unavailable
  const [pettyCash, setPettyCash] = React.useState<{
    balance: number
    lowCount: number
    walletCount: number
  } | null>(null)

  React.useEffect(() => {
    let isMounted = true
    const company = isCompanyScoped ? assignedCompany : filters.company
    const request =
      company === 'All Companies'
        ? pettyCashService.getAllSummaries()
        : pettyCashService.getSummary(company).then((s) => [s])
    request
      .then((summaries) => {
        if (!isMounted) return
        setPettyCash({
          balance: summaries.reduce((sum, s) => sum + s.balance, 0),
          lowCount: summaries.filter((s) => s.isLow).length,
          walletCount: summaries.length,
        })
      })
      .catch(() => isMounted && setPettyCash(null))
    return () => {
      isMounted = false
    }
  }, [filters.company, isCompanyScoped, assignedCompany])

  const pettyCashSubtext = !pettyCash
    ? 'Unavailable right now'
    : pettyCash.lowCount === 0
    ? 'Available for small expenses'
    : pettyCash.walletCount > 1
    ? `${pettyCash.lowCount} of ${pettyCash.walletCount} wallets low — top up`
    : 'Low balance — top up'

  // Filter transactions strictly on client side by company and date range, sorted latest first
  const filteredTransactions = React.useMemo(() => {
    if (!data?.recentTransactions) return []

    const targetCompany = isCompanyScoped ? assignedCompany : filters.company

    return data.recentTransactions
      .filter((tx) => {
        // 1. Company filter
        if (
          targetCompany !== 'All Companies' &&
          (tx.company || '').toLowerCase().trim() !== targetCompany.toLowerCase().trim()
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
  }, [data?.recentTransactions, isCompanyScoped, assignedCompany, filters.company, filters.dateRange])

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
    <div className="space-y-5 pb-8 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* Visually hidden h1 for accessibility compliance */}
      <h1 className="sr-only">MCT Centralized Financial Dashboard</h1>

      {/* 1. Sleek Compact Welcome Greeting Banner */}
      <WelcomeBanner />

      {/* 2. Financial Overview Header & Global Custom Date Picker */}
      <DashboardHeader
        filters={filters}
        onFiltersChange={(newFilters) => setFilters(newFilters)}
        isCompanyScoped={isCompanyScoped}
      />

      {/* 3. KPI Cards (Admin and Company Auditor):
          1. Total Expenses
          2. Total Income
          3. Net Income (Income - Expenses)
          4. Overdue / Due Soon
          5. Petty Cash Balance (current wallet balance, not date-filtered)
          All other values respond dynamically to the selected date range.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
        <Link
          to="/petty-cash"
          className="block rounded-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Open petty cash"
        >
          <DashboardKpiCard
            label="Petty Cash Balance"
            value={pettyCash ? formatPHP(pettyCash.balance) : '—'}
            icon={Wallet}
            subtext={pettyCashSubtext}
            className={cn(
              'h-full',
              pettyCash && pettyCash.lowCount > 0 && 'border-amber-300 bg-amber-50/60'
            )}
            iconContainerClassName={
              pettyCash && pettyCash.lowCount > 0 ? 'bg-amber-100 text-amber-700' : undefined
            }
          />
        </Link>
      </div>

      {/* Monthly profit / loss (income - expenses), above the category summaries */}
      <ProfitLossMonthlyChart transactions={filteredTransactions} />

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

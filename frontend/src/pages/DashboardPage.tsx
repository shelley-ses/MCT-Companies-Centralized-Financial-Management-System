import * as React from 'react'
import { BarChart3, RotateCw, Landmark, AlertCircle } from 'lucide-react'
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner'
import {
  DashboardHeader,
  type DashboardFilterState,
} from '@/components/dashboard/DashboardHeader'
import { DashboardKpiCard } from '@/components/dashboard/DashboardKpiCard'
import { WeeklySalesChart } from '@/components/dashboard/WeeklySalesChart'
import { IncomePerCompanyChart } from '@/components/dashboard/IncomePerCompanyChart'
import { LoanTrendChart } from '@/components/dashboard/LoanTrendChart'
import { ExpensesDonutChart } from '@/components/dashboard/ExpensesDonutChart'
import { RecentTransactionsCard } from '@/components/dashboard/RecentTransactionsCard'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import {
  dashboardService,
  type DashboardData,
  type AuditStatus,
} from '@/services/dashboardService'
import { useSession } from '@/hooks/useSession'
import { formatPHP } from '@/lib/format'

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
    period: 'Last 30 Days',
  }))

  // Ensure Company Auditor is locked to their assigned company
  React.useEffect(() => {
    if (isAuditor && filters.company !== assignedCompany) {
      setFilters((prev) => ({ ...prev, company: assignedCompany }))
    }
  }, [isAuditor, assignedCompany, filters.company])

  const [loading, setLoading] = React.useState<boolean>(true)
  const [data, setData] = React.useState<DashboardData | null>(null)

  // Fetch dashboard data
  React.useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setLoading(true)
      try {
        const result = await dashboardService.getDashboardData({
          company: filters.company,
          dateRange: filters.dateRange.label,
          period: filters.period,
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
  }, [filters])

  if (loading && !data) {
    return <DashboardSkeleton />
  }

  const handleAuditUpdate = async (
    id: string,
    auditStatus: AuditStatus,
    notes?: string,
    auditorName?: string
  ) => {
    const updated = await dashboardService.updateTransactionAudit(
      id,
      auditStatus,
      notes,
      auditorName
    )
    if (updated && data) {
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          recentTransactions: prev.recentTransactions.map((tx) =>
            tx.id === id ? updated : tx
          ),
        }
      })
    }
  }

  return (
    <div className="space-y-5 pb-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Visually hidden h1 for accessibility compliance */}
      <h1 className="sr-only">MCT Centralized Financial Dashboard</h1>

      {/* 1. Sleek Compact Welcome Greeting Banner */}
      <WelcomeBanner />

      {/* 2. Financial Overview Header & Uniform Filter Bar */}
      <DashboardHeader
        filters={filters}
        onFiltersChange={(newFilters) => setFilters(newFilters)}
      />

      {/* 3. Top KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardKpiCard
          label="Total Sales"
          value={formatPHP(data?.kpis.totalSales ?? 120000)}
          icon={BarChart3}
          subtext="+8.4% vs last period"
        />
        <DashboardKpiCard
          label="Total Expense"
          value={formatPHP(data?.kpis.totalExpense ?? 120000)}
          icon={RotateCw}
          subtext="Controlled budget target"
        />
        <DashboardKpiCard
          label="Total Loan"
          value={formatPHP(data?.kpis.totalLoan ?? 120000)}
          icon={Landmark}
          subtext="18 active schedules"
        />
        <DashboardKpiCard
          label="Overdue / Due Soon"
          value={`${data?.kpis.overdueLoans ?? 3} / ${data?.kpis.dueSoon ?? 3}`}
          icon={AlertCircle}
          subtext="Requires prompt review"
        />
      </div>

      {/* 4. Core 2x2 Clean Diagrams Grid matching reference image layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Weekly Sales Trend (Smooth Spline Area Curve like SLA Compliance) */}
        <WeeklySalesChart data={data?.weeklySales} />

        {/* Card 2: Income per Company / Department Revenue Breakdown */}
        <IncomePerCompanyChart
          companyName={filters.company}
          data={data?.companyIncome}
        />

        {/* Card 3: Loan & Repayment Trends (Dual Smooth Spline Curves like Ticket Trends) */}
        <LoanTrendChart />

        {/* Card 4: Expense Distribution (Smooth Spline Curve like Customer Satisfaction) */}
        <ExpensesDonutChart />
      </div>

      {/* 5. Recent Transactions & Live Audit Records Table */}
      <RecentTransactionsCard
        companyName={filters.company}
        transactions={data?.recentTransactions}
        readOnly={!isAuditor}
        onAuditUpdate={handleAuditUpdate}
      />
    </div>
  )
}

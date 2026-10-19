import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Building2,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  WifiOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DashboardKpiCard } from '@/components/dashboard/DashboardKpiCard'
import { TopUpPettyCashModal } from '@/components/dashboard/TopUpPettyCashModal'
import { useSession } from '@/hooks/useSession'
import { formatPHP } from '@/lib/format'
import { cn } from '@/lib/utils'
import { loanService } from '@/services/loanService'
import {
  pettyCashService,
  type PettyCashLedgerEntry,
  type PettyCashSummary,
} from '@/services/pettyCashService'

const COMPANY_LIST = [
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

const ITEMS_PER_PAGE = 10

const todayIso = () => new Date().toISOString().slice(0, 10)
const monthStartIso = () => `${todayIso().slice(0, 8)}01`

export const PettyCashPage: React.FC = () => {
  const { user } = useSession()
  const userRole = (user?.role || '').toLowerCase()
  // Admin, Finance and Audit see every company's wallet. Finance and company users (Company,
  // Supervisor) can top up and change settings; Admin and auditors are view-only.
  const canManage = userRole === 'finance' || userRole === 'company' || userRole === 'supervisor'
  const isCompanyScoped =
    userRole === 'supervisor' || userRole === 'company' || userRole === 'company auditor'
  const assignedCompany = user?.assignedCompany || 'MCT Kitchen'

  const [companyList, setCompanyList] = React.useState<string[]>(COMPANY_LIST)
  const [selectedCompany, setSelectedCompany] = React.useState<string>(
    isCompanyScoped ? assignedCompany : 'All Companies'
  )
  const [startDate, setStartDate] = React.useState<string>(monthStartIso)
  const [endDate, setEndDate] = React.useState<string>(todayIso)

  const [summary, setSummary] = React.useState<PettyCashSummary | null>(null)
  const [allSummaries, setAllSummaries] = React.useState<PettyCashSummary[]>([])
  const [ledger, setLedger] = React.useState<PettyCashLedgerEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [currentPage, setCurrentPage] = React.useState(1)

  const [isTopUpOpen, setIsTopUpOpen] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<number | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [thresholdInput, setThresholdInput] = React.useState('')
  const [isSavingThreshold, setIsSavingThreshold] = React.useState(false)

  const isAllCompanies = selectedCompany === 'All Companies'
  const reload = () => setReloadKey((k) => k + 1)

  // Sync assigned company if scoped
  React.useEffect(() => {
    if (isCompanyScoped && user?.assignedCompany) {
      setSelectedCompany(user.assignedCompany)
    }
  }, [isCompanyScoped, user?.assignedCompany])

  // Load companies
  React.useEffect(() => {
    let mounted = true
    loanService.getCompanies().then((companies) => {
      if (mounted && companies.length > 0) {
        const names = companies.map((c) => c.company_name).filter(Boolean)
        // Wallets only exist for companies in the database, so don't mix in the static fallback list
        setCompanyList(Array.from(new Set(['All Companies', ...names])))
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  // Load wallet data
  React.useEffect(() => {
    let mounted = true
    const period = { startDate, endDate }

    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        if (isAllCompanies) {
          const summaries = await pettyCashService.getAllSummaries(period)
          if (!mounted) return
          setAllSummaries(summaries)
          setSummary(null)
          setLedger([])
        } else {
          const [walletSummary, entries] = await Promise.all([
            pettyCashService.getSummary(selectedCompany, period),
            pettyCashService.getLedger(selectedCompany, period),
          ])
          if (!mounted) return
          setSummary(walletSummary)
          setThresholdInput(String(walletSummary.lowBalanceThreshold))
          setLedger(entries)
        }
      } catch (err: any) {
        if (mounted) setLoadError(err?.message || 'Petty cash is unavailable right now.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [selectedCompany, isAllCompanies, startDate, endDate, reloadKey])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [selectedCompany, startDate, endDate])

  const totalPages = Math.max(1, Math.ceil(ledger.length / ITEMS_PER_PAGE))
  const pagedLedger = ledger.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const allTotals = React.useMemo(
    () => ({
      balance: allSummaries.reduce((sum, s) => sum + s.balance, 0),
      topUps: allSummaries.reduce((sum, s) => sum + s.periodTopUps, 0),
      spent: allSummaries.reduce((sum, s) => sum + s.periodSpent, 0),
      lowCount: allSummaries.filter((s) => s.isLow).length,
    }),
    [allSummaries]
  )

  const handleDeleteTopUp = async (entry: PettyCashLedgerEntry) => {
    if (!window.confirm(`Remove the ${formatPHP(entry.amountIn)} top-up from ${entry.date}?`)) return
    setActionError(null)
    setDeletingId(entry.recordId)
    try {
      await pettyCashService.deleteTopUp(entry.recordId)
      reload()
    } catch (err: any) {
      setActionError(err?.message || 'Failed to remove top-up.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSaveThreshold = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = parseFloat(thresholdInput)
    if (isNaN(value) || value < 0) {
      setActionError('Low-balance alert must be ₱0 or more.')
      return
    }
    setActionError(null)
    setIsSavingThreshold(true)
    try {
      const updated = await pettyCashService.updateThreshold(selectedCompany, value)
      setSummary((prev) => (prev ? { ...prev, ...updated, periodTopUps: prev.periodTopUps, periodSpent: prev.periodSpent } : updated))
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update the low-balance alert.')
    } finally {
      setIsSavingThreshold(false)
    }
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-300">
      {/* 1. Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-4xl font-bold text-focus tracking-tight">Petty Cash</h1>
          <p className="text-sm sm:text-base text-muted-fg font-normal mt-1">
            Top up company&rsquo;s petty cash wallet from sales
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap shrink-0">
          <label className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-stroke/60 bg-white text-xs font-medium shadow-xs">
            <Building2 className="h-3.5 w-3.5 text-muted-fg shrink-0" />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              disabled={isCompanyScoped}
              className="bg-transparent text-focus/90 font-medium focus:outline-none cursor-pointer disabled:cursor-default"
              aria-label="Company"
            >
              {(isCompanyScoped ? [assignedCompany] : companyList).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <div className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-stroke/60 bg-white text-xs shadow-xs">
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-focus/90 focus:outline-none"
              aria-label="Start date"
            />
            <span className="text-muted-fg">–</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-focus/90 focus:outline-none"
              aria-label="End date"
            />
          </div>
          {canManage && !isAllCompanies && (
            <Button
              type="button"
              onClick={() => setIsTopUpOpen(true)}
              disabled={!summary}
              className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Top Up from Sales</span>
            </Button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-900 flex items-center gap-2.5">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {loading ? (
        <div className="h-48 flex items-center justify-center text-muted-fg">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : isAllCompanies ? (
        /* 2a. All companies: one row per wallet */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardKpiCard label="Total Petty Cash" value={formatPHP(allTotals.balance)} icon={Wallet} subtext="Across all company wallets" />
            <DashboardKpiCard label="Topped Up" value={formatPHP(allTotals.topUps)} icon={ArrowDownLeft} subtext="Moved from sales this period" />
            <DashboardKpiCard label="Spent" value={formatPHP(allTotals.spent)} icon={ArrowUpRight} subtext="Petty cash expenses this period" />
            <DashboardKpiCard
              label="Low Wallets"
              value={String(allTotals.lowCount)}
              icon={AlertTriangle}
              subtext="Below their low-balance alert"
              className={allTotals.lowCount > 0 ? 'border-amber-300 bg-amber-50/60' : undefined}
            />
          </div>

          <Card className="bg-white rounded-[20px] border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-slate-50 text-muted-fg text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Company</th>
                    <th className="px-4 py-3 font-semibold text-right">Balance</th>
                    <th className="px-4 py-3 font-semibold text-right">Topped Up</th>
                    <th className="px-4 py-3 font-semibold text-right">Spent</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-fg">
                        No petty cash activity yet. Pick a company to top up its wallet.
                      </td>
                    </tr>
                  ) : (
                    allSummaries.map((s) => (
                      <tr
                        key={s.companyId}
                        onClick={() => setSelectedCompany(s.companyName)}
                        className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                      >
                        <td className="px-4 py-3 font-semibold text-focus">{s.companyName}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatPHP(s.balance)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatPHP(s.periodTopUps)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatPHP(s.periodSpent)}</td>
                        <td className="px-4 py-3">
                          <LowBalanceBadge isLow={s.isLow} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : summary ? (
        /* 2b. Single company wallet */
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DashboardKpiCard
              label="Current Balance"
              value={formatPHP(summary.balance)}
              icon={Wallet}
              subtext={summary.isLow ? `Low — below ${formatPHP(summary.lowBalanceThreshold)}` : 'Available petty cash'}
              className={summary.isLow ? 'border-amber-300 bg-amber-50/60' : undefined}
            />
            <DashboardKpiCard label="Topped Up" value={formatPHP(summary.periodTopUps)} icon={ArrowDownLeft} subtext="Moved from sales this period" />
            <DashboardKpiCard label="Spent" value={formatPHP(summary.periodSpent)} icon={ArrowUpRight} subtext="Petty cash expenses this period" />
          </div>

          {canManage && (
            <form onSubmit={handleSaveThreshold} className="flex items-center gap-2 flex-wrap text-xs text-muted-fg">
              <span className="font-medium">Warn me when petty cash falls below</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold">₱</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  className="pl-7 h-9 w-32 rounded-xl text-xs border-stroke/60 bg-white"
                  aria-label="Low-balance alert amount"
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                disabled={isSavingThreshold || Number(thresholdInput) === summary.lowBalanceThreshold}
                className="h-9 px-3 rounded-xl text-xs font-semibold border-stroke/50 bg-white text-focus hover:bg-surface cursor-pointer"
              >
                {isSavingThreshold ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
              </Button>
            </form>
          )}

          <Card className="bg-white rounded-[20px] border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm sm:text-base font-semibold text-focus">Petty Cash Ledger</h2>
              <p className="text-xs text-muted-fg mt-0.5">
                Top-ups and expenses paid with Petty Cash for {selectedCompany}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-slate-50 text-muted-fg text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Reference</th>
                    <th className="px-4 py-3 font-semibold text-right">In</th>
                    <th className="px-4 py-3 font-semibold text-right">Out</th>
                    <th className="px-4 py-3 font-semibold text-right">Balance</th>
                    {canManage && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {pagedLedger.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 8 : 7} className="px-4 py-10 text-center text-muted-fg">
                        No petty cash activity in this period.
                      </td>
                    </tr>
                  ) : (
                    pagedLedger.map((entry) => (
                      <tr key={entry.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 whitespace-nowrap tabular-nums">{entry.date}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border',
                              entry.type === 'topup'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            )}
                          >
                            {entry.type === 'topup' ? (
                              <ArrowDownLeft className="w-3 h-3" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            {entry.type === 'topup' ? 'Top-up' : 'Expense'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-focus">{entry.description || '—'}</div>
                          {entry.category && <div className="text-[11px] text-muted-fg">{entry.category}</div>}
                        </td>
                        <td className="px-4 py-3 text-muted-fg">{entry.referenceNo || '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-700 font-semibold">
                          {entry.amountIn > 0 ? formatPHP(entry.amountIn) : ''}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-focus font-semibold">
                          {entry.amountOut > 0 ? formatPHP(entry.amountOut) : ''}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">
                          {formatPHP(entry.runningBalance)}
                        </td>
                        {canManage && (
                          <td className="px-4 py-3 text-right">
                            {entry.type === 'topup' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTopUp(entry)}
                                disabled={deletingId === entry.recordId}
                                className="p-1.5 rounded-lg text-muted-fg hover:text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-50"
                                aria-label="Remove top-up"
                              >
                                {deletingId === entry.recordId ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {ledger.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-xs text-muted-fg">
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>

          <p className="text-xs text-muted-fg">
            To spend petty cash, add an expense on the{' '}
            <Link to="/expense" className="text-primary font-semibold hover:underline">
              Expense
            </Link>{' '}
            page with payment method &ldquo;Petty Cash&rdquo;.
          </p>
        </>
      ) : null}

      {!isAllCompanies && (
        <TopUpPettyCashModal
          open={isTopUpOpen}
          onOpenChange={setIsTopUpOpen}
          company={selectedCompany}
          currentBalance={summary?.balance}
          onSuccess={reload}
        />
      )}
    </div>
  )
}

const LowBalanceBadge: React.FC<{ isLow: boolean }> = ({ isLow }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border',
      isLow
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
    )}
  >
    {isLow && <AlertTriangle className="w-3 h-3" />}
    {isLow ? 'Low — top up' : 'OK'}
  </span>
)

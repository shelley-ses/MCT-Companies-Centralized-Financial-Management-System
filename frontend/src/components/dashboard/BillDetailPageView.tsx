import * as React from 'react'
import {
  CheckCircle2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  FileText,
  Coins,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { formatPHP } from '@/lib/format'
import {
  getBillPaymentOptions,
  type BillItem,
} from '@/services/billsService'
import { cn } from '@/lib/utils'

interface BillDetailPageViewProps {
  bill: BillItem
  onBack: () => void
  onPay: () => void
  onEdit: () => void
  onDelete: () => void
  onMarkAudit?: (status: 'Verified' | 'Flagged') => void
  isAudit: boolean
}

const LEDGER_ITEMS_PER_PAGE = 5

export const BillDetailPageView: React.FC<BillDetailPageViewProps> = ({
  bill,
  onBack,
  onPay,
  onEdit,
  onMarkAudit,
  isAudit,
}) => {
  const [ledgerStatusFilter, setLedgerStatusFilter] = React.useState<'All' | 'Paid' | 'Pending'>('All')
  const [ledgerPage, setLedgerPage] = React.useState<number>(1)

  React.useEffect(() => {
    setLedgerPage(1)
  }, [bill.id, ledgerStatusFilter])

  const options = getBillPaymentOptions(bill)
  const schedule = options.periods
  const nextPayable = options.nextPayable
  const dueDay = bill.dueDayOfMonth || parseInt(bill.dueDate?.slice(8, 10) || '15', 10) || 15

  const payments = bill.payments || []
  const totalPaidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0)

  const currentRemainingDue =
    bill.status === 'Paid'
      ? 0
      : nextPayable?.remainingAmount !== undefined
      ? nextPayable.remainingAmount
      : Math.max(0, bill.amount - (nextPayable?.paidAmount || 0))

  // Build unified ledger entries combining recorded payments and scheduled pending/overdue periods
  const ledgerRows = React.useMemo(() => {
    const rows: Array<{
      id: string
      date: string
      periodLabel?: string
      status: 'Paid' | 'Partially Paid' | 'Pending'
      amount: number
      method: string
      referenceNo: string
      notes: string
    }> = []

    const recordedPeriodKeys = new Set<string>()
    payments.forEach((p) => {
      if (p.periodKey) recordedPeriodKeys.add(p.periodKey)
      const matchedPeriod = schedule.find((sp) => sp.key === p.periodKey)
      const isPartial = Boolean(matchedPeriod?.partiallyPaid || (p.amount > 0 && p.amount < bill.amount))
      rows.push({
        id: p.id,
        date: p.paymentDate,
        periodLabel: matchedPeriod?.label || p.periodKey,
        status: isPartial ? 'Partially Paid' : 'Paid',
        amount: p.amount,
        method: p.paymentMethod || '—',
        referenceNo: p.refNo || '—',
        notes: p.notes || '—',
      })
    })

    // Add unpaid scheduled periods so "Pending" filter displays upcoming/unpaid schedule rows
    schedule.forEach((sp) => {
      if (!sp.paid && !recordedPeriodKeys.has(sp.key)) {
        rows.push({
          id: `sched-${sp.key}`,
          date: sp.periodDate || `${sp.key}-${String(dueDay).padStart(2, '0')}`,
          periodLabel: sp.label,
          status: 'Pending',
          amount: 0,
          method: '—',
          referenceNo: '—',
          notes: `Scheduled (${sp.label})`,
        })
      }
    })

    return rows
  }, [payments, schedule, bill.amount, dueDay])

  const filteredLedgerRows = React.useMemo(() => {
    if (ledgerStatusFilter === 'All') return ledgerRows
    if (ledgerStatusFilter === 'Paid') {
      return ledgerRows.filter((r) => r.status === 'Paid' || r.status === 'Partially Paid')
    }
    return ledgerRows.filter((r) => r.status === 'Pending')
  }, [ledgerRows, ledgerStatusFilter])

  const totalLedgerPages = Math.max(1, Math.ceil(filteredLedgerRows.length / LEDGER_ITEMS_PER_PAGE))
  const safeLedgerPage = Math.min(ledgerPage, totalLedgerPages)
  const paginatedLedger = filteredLedgerRows.slice(
    (safeLedgerPage - 1) * LEDGER_ITEMS_PER_PAGE,
    safeLedgerPage * LEDGER_ITEMS_PER_PAGE
  )

  return (
    <div className="space-y-5 pb-12 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* Top Action & Navigation Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="h-10 px-4 rounded-xl border-stroke/60 bg-white hover:bg-slate-50 text-focus font-semibold text-xs flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Bills</span>
          </Button>
        </div>
      </div>

      {/* Main Details Header (No container background, no status badge, buttons in same row as name) */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 px-1">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-focus tracking-tight">
            {bill.billerName}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-fg">
            <span>
              Schedule: <strong className="text-focus font-semibold">{bill.billingCycle}</strong>
            </span>
            <span>
              Due Day: <strong className="text-focus font-semibold">Day {dueDay}</strong>
            </span>
          </div>
        </div>

        {/* Action Buttons in the same row as the Biller Name */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!isAudit && (
            <>
              <Button
                type="button"
                onClick={onPay}
                className="h-10 px-4 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Coins className="h-4 w-4" />
                <span>Record Payment</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onEdit}
                className="h-10 px-4 rounded-xl border-stroke/60 bg-white hover:bg-slate-50 text-focus font-semibold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Terms</span>
              </Button>
            </>
          )}

          {isAudit && onMarkAudit && (
            <>
              <Button
                type="button"
                onClick={() => onMarkAudit('Verified')}
                className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Mark as Audited</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onMarkAudit('Flagged')}
                className="h-10 px-4 rounded-xl border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <AlertCircle className="h-4 w-4" />
                <span>Flag Discrepancy</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 6 Financial Overview KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-stroke/60 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-fg block">
            Bill Amount
          </span>
          <span className="text-base sm:text-lg font-extrabold text-focus tabular-nums mt-1 block">
            {formatPHP(bill.amount)}
          </span>
        </div>

        <div className="bg-white border border-stroke/60 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-fg block">
            Billing Cycle
          </span>
          <span className="text-base sm:text-lg font-extrabold text-focus tabular-nums mt-1 block">
            {bill.billingCycle}
          </span>
        </div>

        <div className="bg-white border border-stroke/60 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-fg block">
            Current Period Due
          </span>
          <span className="text-base sm:text-lg font-extrabold text-focus tabular-nums mt-1 block">
            {formatPHP(bill.amount)}
          </span>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-800 block">
            Amount Paid
          </span>
          <span className="text-base sm:text-lg font-extrabold text-emerald-700 tabular-nums mt-1 block">
            {formatPHP(totalPaidAmount)}
          </span>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-800 block">
            Remaining Balance
          </span>
          <span className="text-base sm:text-lg font-extrabold text-amber-700 tabular-nums mt-1 block">
            {formatPHP(currentRemainingDue)}
          </span>
        </div>

        <div className="bg-white border border-stroke/60 rounded-2xl p-4 shadow-2xs">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-fg block">
            Next Due Date
          </span>
          <span className="text-base sm:text-lg font-extrabold text-focus tabular-nums mt-1 block">
            {bill.dueDate}
          </span>
        </div>
      </div>

      {/* Split Section: Bill Agreement & Terms (Left) + Payment Schedule & History (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left 1 Column: Bill Agreement & Terms */}
        <div className="lg:col-span-1 bg-white border border-stroke/60 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="h-4 w-4 text-[#960C01]" />
            <h2 className="text-sm font-bold text-focus">Bill Agreement & Terms</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-muted-fg">Biller Name</span>
              <span className="font-bold text-focus text-right truncate max-w-[160px]">{bill.billerName}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-muted-fg">Assigned Company</span>
              <span className="font-semibold text-focus text-right truncate max-w-[160px]">{bill.company}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-muted-fg">Category</span>
              <span className="font-semibold text-focus">{bill.category}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-muted-fg">Account No.</span>
              <span className="font-mono font-semibold text-focus">{bill.accountNo || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-muted-fg">Payment Frequency</span>
              <span className="font-semibold text-focus">{bill.billingCycle}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-muted-fg">Due Day of Cycle</span>
              <span className="font-mono font-semibold text-focus">Day {dueDay}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-muted-fg">Scheduled Due Date</span>
              <span className="font-mono font-semibold text-focus">{bill.dueDate}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-muted-fg">Latest Settlement</span>
              <span className="font-mono font-semibold text-focus">{bill.lastPaidDate || 'None'}</span>
            </div>
            {bill.auditStatus && (
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span className="text-muted-fg">Audit Status</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-[10.5px] font-bold border',
                    bill.auditStatus === 'Verified'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  )}
                >
                  {bill.auditStatus} {bill.auditDate ? `(${bill.auditDate})` : ''}
                </span>
              </div>
            )}
          </div>

          <div className="pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-fg block mb-1.5">
              Remarks & Notes
            </span>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-focus min-h-[64px] whitespace-pre-wrap">
              {bill.notes || 'No additional remarks recorded for this bill.'}
            </div>
          </div>
        </div>

        {/* Right 3 Columns: Payment Schedule & History Table */}
        <div className="lg:col-span-3 bg-white border border-stroke/60 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-focus flex items-center gap-2">
                  <Coins className="h-4 w-4 text-emerald-600" />
                  <span>Payment Schedule & History</span>
                </h2>
                <p className="text-[11px] text-muted-fg mt-0.5">
                  Showing 5 records per page • Filter by Paid or Pending status
                </p>
              </div>

              {/* Status Filter Toggle (Paid / Pending) */}
              <div className="inline-flex items-center p-1 rounded-full bg-slate-100 border border-stroke/40 shadow-2xs self-start sm:self-auto">
                {(['All', 'Paid', 'Pending'] as const).map((statusOpt) => {
                  const isActive = ledgerStatusFilter === statusOpt
                  return (
                    <button
                      key={statusOpt}
                      type="button"
                      onClick={() => {
                        setLedgerStatusFilter(statusOpt)
                        setLedgerPage(1)
                      }}
                      className={cn(
                        'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none',
                        isActive
                          ? 'bg-[#960C01] text-white shadow-xs'
                          : 'text-muted-fg hover:text-focus'
                      )}
                    >
                      {statusOpt}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="text-[11px] font-bold uppercase text-muted-fg py-2.5 px-3">
                      Payment Date
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-muted-fg py-2.5 px-3 text-center">
                      Status
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-muted-fg py-2.5 px-3 text-right">
                      Amount Paid
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-muted-fg py-2.5 px-3">
                      Method
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-muted-fg py-2.5 px-3">
                      Reference No.
                    </TableHead>
                    <TableHead className="text-[11px] font-bold uppercase text-muted-fg py-2.5 px-3">
                      Remarks
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLedger.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-36 text-center text-xs text-muted-fg">
                        No payment records match your filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLedger.map((entry) => {
                      const badgeStyle =
                        entry.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : entry.status === 'Partially Paid'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'

                      return (
                        <TableRow key={entry.id} className="hover:bg-slate-50/60 border-b border-slate-100">
                          <TableCell className="py-3 px-3 font-mono text-xs font-semibold text-focus whitespace-nowrap">
                            {entry.date}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider',
                                badgeStyle
                              )}
                            >
                              {entry.status === 'Paid' && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                              {entry.status}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-3 text-right font-bold text-xs tabular-nums whitespace-nowrap">
                            {entry.amount > 0 ? (
                              <span className="text-emerald-700">{formatPHP(entry.amount)}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-xs text-focus whitespace-nowrap">
                            {entry.method || '—'}
                          </TableCell>
                          <TableCell className="py-3 px-3 font-mono text-xs text-muted-fg whitespace-nowrap">
                            {entry.referenceNo || '—'}
                          </TableCell>
                          <TableCell className="py-3 px-3 text-xs text-muted-fg max-w-[220px] truncate" title={entry.notes}>
                            {entry.notes || '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 5-Row Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-muted-fg">
            <div>
              Showing{' '}
              <span className="font-semibold text-focus">
                {filteredLedgerRows.length === 0
                  ? 0
                  : (safeLedgerPage - 1) * LEDGER_ITEMS_PER_PAGE + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-focus">
                {Math.min(safeLedgerPage * LEDGER_ITEMS_PER_PAGE, filteredLedgerRows.length)}
              </span>{' '}
              of <span className="font-semibold text-focus">{filteredLedgerRows.length}</span> entries
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safeLedgerPage <= 1}
                onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5 rounded-lg text-xs cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Prev
              </Button>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-focus font-semibold text-xs">
                Page {safeLedgerPage} of {totalLedgerPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safeLedgerPage >= totalLedgerPages}
                onClick={() => setLedgerPage((p) => Math.min(totalLedgerPages, p + 1))}
                className="h-8 px-2.5 rounded-lg text-xs cursor-pointer disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

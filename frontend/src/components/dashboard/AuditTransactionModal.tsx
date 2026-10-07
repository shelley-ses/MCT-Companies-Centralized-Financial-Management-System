import * as React from 'react'
import { FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { formatPHP } from '@/lib/format'
import { CATEGORY_COLORS } from '@/utils/categoryConstants'
import type { DashboardTransactionItem } from '@/services/dashboardService'

interface AuditTransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: DashboardTransactionItem | null
}

export const AuditTransactionModal: React.FC<AuditTransactionModalProps> = ({
  open,
  onOpenChange,
  transaction,
}) => {
  if (!transaction) return null

  const categoryColor = CATEGORY_COLORS[transaction.category] || '#475569'
  const netAmount = (transaction.deposit || 0) - (transaction.withdrawal || 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-[20px] p-5 sm:p-6 bg-white border border-stroke/30 shadow-2xl [&>button]:top-3.5 [&>button]:right-3.5 [&>button]:w-5 [&>button]:h-5 [&>button]:p-0.5 [&>button]:rounded-md [&>button>svg]:w-3 [&>button>svg]:h-3">
        {/* Header - REF and Type badges on same row as Transaction Details */}
        <DialogHeader className="text-left pb-3 border-b border-stroke/20 pr-7">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-[#0B0F2B] text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold text-focus leading-tight">
              Transaction Details
            </DialogTitle>
            <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
              <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-focus">
                {transaction.refNo || '—'}
              </span>
              <Badge
                variant={
                  transaction.type === 'Sales' || transaction.type === 'Income'
                    ? 'paid'
                    : 'expense'
                }
                className="px-2 py-0.5 text-[10px] font-medium rounded-full"
              >
                {transaction.type || '—'}
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-[11px] text-muted-fg font-normal mt-0.5">
            Complete read-only transaction record
          </DialogDescription>
        </DialogHeader>

        {/* Content Body */}
        <div className="space-y-3 pt-3">
          {/* Outflow vs Inflow Amount Summary Card */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] font-medium text-muted-fg block">
                Withdrawal (Outflow)
              </span>
              <span className="text-base sm:text-lg font-bold text-rose-600 tabular-nums">
                {transaction.withdrawal > 0
                  ? formatPHP(transaction.withdrawal)
                  : '—'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-medium text-muted-fg block">
                Deposit (Inflow)
              </span>
              <span className="text-base sm:text-lg font-bold text-emerald-600 tabular-nums">
                {transaction.deposit > 0
                  ? formatPHP(transaction.deposit)
                  : '—'}
              </span>
            </div>
          </div>

          {/* Key-Value Details */}
          <div className="space-y-1.5 text-xs">
            {/* 1. Date */}
            <div className="flex items-center justify-between gap-3 py-1.5 border-b border-stroke/10">
              <span className="text-[11px] font-medium text-muted-fg shrink-0">
                Transaction Date:
              </span>
              <span className="text-xs font-semibold text-focus text-right">
                {transaction.date || '—'}
              </span>
            </div>

            {/* 2. Cheque Number */}
            <div className="flex items-center justify-between gap-3 py-1.5 border-b border-stroke/10">
              <span className="text-[11px] font-medium text-muted-fg shrink-0">
                Cheque Number:
              </span>
              <span className="font-mono text-xs font-semibold text-focus text-right">
                {transaction.chequeNo || '—'}
              </span>
            </div>

            {/* 3. Particulars */}
            <div className="flex items-start justify-between gap-3 py-1.5 border-b border-stroke/10">
              <span className="text-[11px] font-medium text-muted-fg shrink-0">
                Particulars:
              </span>
              <span className="text-xs font-medium text-focus text-right max-w-[260px] line-clamp-2">
                {transaction.particulars || transaction.description || '—'}
              </span>
            </div>

            {/* 4. Category */}
            <div className="flex items-center justify-between gap-3 py-1.5 border-b border-stroke/10">
              <span className="text-[11px] font-medium text-muted-fg shrink-0">
                Category:
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold select-none"
                style={{
                  backgroundColor: `${categoryColor}15`,
                  color: categoryColor,
                  border: `1px solid ${categoryColor}35`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: categoryColor }}
                />
                {transaction.category || '—'}
              </span>
            </div>

            {/* 5. Company */}
            <div className="flex items-center justify-between gap-3 py-1.5 border-b border-stroke/10">
              <span className="text-[11px] font-medium text-muted-fg shrink-0">
                Company:
              </span>
              <span className="text-xs font-semibold text-focus text-right">
                {transaction.company || '—'}
              </span>
            </div>

            {/* 6. Payment Status */}
            <div className="flex items-center justify-between gap-3 py-1.5 border-b border-stroke/10">
              <span className="text-[11px] font-medium text-muted-fg shrink-0">
                Payment Status:
              </span>
              <span className="text-xs font-semibold text-focus text-right">
                {transaction.status || '—'}
              </span>
            </div>

            {/* 7. Net Amount */}
            <div className="flex items-center justify-between gap-3 py-1.5 border-b border-stroke/10">
              <span className="text-[11px] font-medium text-muted-fg shrink-0">
                Net Amount:
              </span>
              <span className="text-xs sm:text-sm font-bold text-focus text-right tabular-nums">
                {formatPHP(netAmount)}
              </span>
            </div>

            {/* 8. Created At (if present) */}
            {transaction.createdAt && (
              <div className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-[11px] font-medium text-muted-fg shrink-0">
                  Created At:
                </span>
                <span className="font-mono text-focus text-right text-[11px]">
                  {transaction.createdAt}
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

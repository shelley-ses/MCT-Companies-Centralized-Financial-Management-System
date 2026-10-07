import * as React from 'react'
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatPHP } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  AuditTransactionModal,
} from '@/components/dashboard/AuditTransactionModal'
import { useSession } from '@/hooks/useSession'
import type {
  DashboardTransactionItem,
  AuditStatus,
} from '@/services/dashboardService'

export type { DashboardTransactionItem as DashboardTransaction }

interface RecentTransactionsCardProps {
  className?: string
  companyName?: string
  transactions?: DashboardTransactionItem[]
  readOnly?: boolean
  onAuditUpdate?: (
    id: string,
    auditStatus: AuditStatus,
    notes?: string,
    auditorName?: string
  ) => Promise<void>
}

export const RecentTransactionsCard: React.FC<RecentTransactionsCardProps> = ({
  className,
  companyName = 'MCT Kitchen',
  transactions = [],
  readOnly,
  onAuditUpdate,
}) => {
  const { user } = useSession()
  const isAdmin = user?.role === 'Admin'
  const isReadOnly = readOnly ?? isAdmin
  const isAllCompanies = !companyName || companyName === 'All Companies'

  const [selectedTx, setSelectedTx] = React.useState<DashboardTransactionItem | null>(null)
  const [isModalOpen, setIsModalOpen] = React.useState(false)

  // Strictly filter records for this company (or all if All Companies)
  const companyTransactions = React.useMemo(() => {
    if (isAllCompanies) {
      return transactions
    }
    return transactions.filter((t) => t.company === companyName)
  }, [transactions, companyName, isAllCompanies])

  const verifiedCount = companyTransactions.filter((t) => t.auditStatus === 'Verified').length

  const handleOpenAudit = (tx: DashboardTransactionItem) => {
    setSelectedTx(tx)
    setIsModalOpen(true)
  }

  const handleSaveAudit = async (
    id: string,
    auditStatus: AuditStatus,
    notes?: string,
    auditorName?: string
  ) => {
    if (onAuditUpdate) {
      await onAuditUpdate(id, auditStatus, notes, auditorName)
    }
  }

  return (
    <Card
      className={cn(
        'bg-white rounded-[20px] border border-slate-200/80 p-5 shadow-xs transition-all hover:shadow-md overflow-hidden',
        className
      )}
    >
      {/* 1. Clean Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B0F2B] text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-focus leading-tight">
              Recent Transactions
            </h3>
            <p className="text-xs text-muted-fg font-normal mt-0.5">
              {isReadOnly
                ? `Transaction records overview for ${companyName}`
                : `Audit records for ${companyName}`}
            </p>
          </div>
        </div>

        <span className="text-xs text-muted-fg font-medium bg-slate-50 border border-slate-100 px-3 py-1 rounded-full tabular-nums">
          {companyTransactions.length} records
        </span>
      </div>

      {/* 2. Clean Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
              <TableHead className="px-5 py-3 text-xs font-semibold text-focus uppercase tracking-wider">
                Date
              </TableHead>
              {isAllCompanies && (
                <TableHead className="px-5 py-3 text-xs font-semibold text-focus uppercase tracking-wider">
                  Company
                </TableHead>
              )}
              <TableHead className="px-5 py-3 text-xs font-semibold text-focus uppercase tracking-wider">
                Type
              </TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-focus uppercase tracking-wider">
                Description
              </TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-focus uppercase tracking-wider">
                Amount
              </TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-focus uppercase tracking-wider text-right pr-5">
                Audit Status
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {companyTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAllCompanies ? 6 : 5} className="text-center py-8 text-xs text-muted-fg">
                  No transaction audit records found for {companyName}.
                </TableCell>
              </TableRow>
            ) : (
              companyTransactions.map((tx) => (
                <TableRow
                  key={tx.id}
                  onClick={() => handleOpenAudit(tx)}
                  title={isReadOnly ? 'Click to view transaction details' : 'Click to inspect & audit record'}
                  className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                >
                  {/* Date */}
                  <TableCell className="px-5 py-3 text-xs sm:text-sm font-medium text-focus whitespace-nowrap">
                    {tx.date}
                  </TableCell>

                  {/* Company (Shown when viewing All Companies) */}
                  {isAllCompanies && (
                    <TableCell className="px-5 py-3 text-xs sm:text-sm font-medium text-focus whitespace-nowrap">
                      {tx.company}
                    </TableCell>
                  )}

                  {/* Type */}
                  <TableCell className="px-5 py-3">
                    <Badge
                      variant={
                        tx.type === 'Sales' || tx.type === 'Income'
                          ? 'paid'
                          : 'expense'
                      }
                      className="px-2.5 py-0.5 text-xs font-medium rounded-full"
                    >
                      {tx.type}
                    </Badge>
                  </TableCell>

                  {/* Description */}
                  <TableCell className="px-5 py-3 text-xs sm:text-sm text-focus/80 whitespace-nowrap font-normal">
                    {tx.description}
                  </TableCell>

                  {/* Amount */}
                  <TableCell className="px-5 py-3 text-xs sm:text-sm font-medium text-focus tabular-nums whitespace-nowrap">
                    {formatPHP(tx.amount)}
                  </TableCell>

                  {/* Audit Status */}
                  <TableCell className="px-5 py-3 whitespace-nowrap text-right pr-5">
                    {tx.auditStatus === 'Verified' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Verified
                      </span>
                    ) : tx.auditStatus === 'Flagged' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-800 border border-red-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        Flagged
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Pending
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 3. Clean Footer */}
      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-2xs sm:text-xs text-muted-fg font-normal">
        <span>Showing audit records for {companyName}.</span>
        <span className="font-medium text-focus">
          {verifiedCount} of {companyTransactions.length} Verified
        </span>
      </div>

      {/* 4. Inspection Modal */}
      <AuditTransactionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        transaction={selectedTx}
        readOnly={isReadOnly}
        onSave={handleSaveAudit}
      />
    </Card>
  )
}

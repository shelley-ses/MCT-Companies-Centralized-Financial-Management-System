import * as React from 'react'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Check,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { formatPHP } from '@/lib/format'
import { cn } from '@/lib/utils'
import type {
  DashboardTransactionItem,
  AuditStatus,
} from '@/services/dashboardService'
import { useSession } from '@/hooks/useSession'

interface AuditTransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: DashboardTransactionItem | null
  readOnly?: boolean
  onSave?: (
    id: string,
    auditStatus: AuditStatus,
    notes?: string,
    auditorName?: string
  ) => Promise<void>
}

export const AuditTransactionModal: React.FC<AuditTransactionModalProps> = ({
  open,
  onOpenChange,
  transaction,
  readOnly = false,
  onSave,
}) => {
  const { user } = useSession()
  const [selectedStatus, setSelectedStatus] = React.useState<AuditStatus>('Pending Audit')
  const [notes, setNotes] = React.useState('')
  const [isSaving, setIsSaving] = React.useState(false)

  // Sync state when transaction changes
  React.useEffect(() => {
    if (transaction) {
      setSelectedStatus(transaction.auditStatus || 'Pending Audit')
      setNotes(transaction.auditNotes || '')
    }
  }, [transaction])

  if (!transaction) return null

  const handleSave = async () => {
    if (readOnly) {
      onOpenChange(false)
      return
    }
    setIsSaving(true)
    try {
      if (onSave) {
        await onSave(
          transaction.id,
          selectedStatus,
          notes.trim(),
          user?.fullName || 'Alex Cruz'
        )
      }
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] md:max-w-[820px] max-h-[90vh] overflow-y-auto rounded-[24px] p-6 sm:p-8 bg-white border border-stroke/30 shadow-2xl">
        {/* Header */}
        <DialogHeader className="text-left space-y-1 pb-4 border-b border-stroke/20">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-focus">
              {readOnly ? 'Transaction Details' : 'Audit Transaction'}
            </DialogTitle>
            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-surface border border-stroke/40 text-focus">
              {transaction.refNo}
            </span>
          </div>
          <DialogDescription className="text-sm text-muted-fg font-normal">
            {readOnly
              ? 'Read-only financial overview and auditor verification records'
              : 'Inspect transaction records and submit audit verification'}
          </DialogDescription>
        </DialogHeader>

        {/* Two-Column Landscape Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Left Column: Transaction & Financial Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-stroke/15">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-fg">
                Transaction Information
              </span>
              <Badge
                variant={
                  transaction.type === 'Sales' || transaction.type === 'Income'
                    ? 'paid'
                    : 'expense'
                }
                className="px-2.5 py-0.5 text-xs font-medium rounded-full"
              >
                {transaction.type}
              </Badge>
            </div>

            {/* Total Amount & Payment Status Card */}
            <div className="p-3.5 rounded-xl bg-surface/50 border border-stroke/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-muted-fg block">
                  Total Amount
                </span>
                <span className="text-2xl font-bold text-focus tabular-nums">
                  {formatPHP(transaction.amount)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-muted-fg block">
                  Payment Status
                </span>
                <span className="text-sm font-semibold text-focus">
                  {transaction.status}
                </span>
              </div>
            </div>

            {/* Aligned Key-Value Details */}
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-4 py-1 border-b border-stroke/10">
                <span className="font-medium text-muted-fg shrink-0">
                  Company:
                </span>
                <span className="font-semibold text-focus text-right">
                  {transaction.company}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-1 border-b border-stroke/10">
                <span className="font-medium text-muted-fg shrink-0">
                  Date:
                </span>
                <span className="font-semibold text-focus text-right">
                  {transaction.date}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-1 border-b border-stroke/10">
                <span className="font-medium text-muted-fg shrink-0">
                  Voucher / Cheque Ref:
                </span>
                <span className="font-mono font-medium text-focus text-right">
                  {transaction.chequeNo || '—'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-1 border-b border-stroke/10">
                <span className="font-medium text-muted-fg shrink-0">
                  Description:
                </span>
                <span className="font-medium text-focus text-right max-w-[200px] truncate" title={transaction.description}>
                  {transaction.description}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Audit Assessment & Findings */}
          <div className="space-y-4 md:border-l md:border-stroke/20 md:pl-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="pb-1 border-b border-stroke/15">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-fg">
                  Audit Assessment
                </span>
              </div>

              {/* Audit Status Decision */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-focus">
                  Audit Status
                </Label>
                {readOnly ? (
                  <div className="pt-0.5">
                    {transaction.auditStatus === 'Verified' ? (
                      <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Verified · Records Reconciled</span>
                      </div>
                    ) : transaction.auditStatus === 'Flagged' ? (
                      <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-50 text-red-800 border border-red-200 text-sm font-semibold">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Flagged · Discrepancy Noted</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-sm font-semibold">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Pending Audit · Awaiting Review</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {/* Verified */}
                    <button
                      type="button"
                      onClick={() => setSelectedStatus('Verified')}
                      className={cn(
                        'flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer',
                        selectedStatus === 'Verified'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                          : 'border-stroke/50 bg-white hover:bg-surface text-focus/80'
                      )}
                    >
                      <CheckCircle2
                        className={cn(
                          'w-4 h-4 mb-1',
                          selectedStatus === 'Verified' ? 'text-emerald-600' : 'text-muted-fg'
                        )}
                      />
                      <span className="text-xs font-semibold">Verified</span>
                    </button>

                    {/* Pending Audit */}
                    <button
                      type="button"
                      onClick={() => setSelectedStatus('Pending Audit')}
                      className={cn(
                        'flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer',
                        selectedStatus === 'Pending Audit'
                          ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                          : 'border-stroke/50 bg-white hover:bg-surface text-focus/80'
                      )}
                    >
                      <Clock
                        className={cn(
                          'w-4 h-4 mb-1',
                          selectedStatus === 'Pending Audit' ? 'text-amber-600' : 'text-muted-fg'
                        )}
                      />
                      <span className="text-xs font-semibold">Pending</span>
                    </button>

                    {/* Flagged */}
                    <button
                      type="button"
                      onClick={() => setSelectedStatus('Flagged')}
                      className={cn(
                        'flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer',
                        selectedStatus === 'Flagged'
                          ? 'border-[#960C01] bg-red-50 text-[#960C01] ring-2 ring-red-500/20'
                          : 'border-stroke/50 bg-white hover:bg-surface text-focus/80'
                      )}
                    >
                      <AlertTriangle
                        className={cn(
                          'w-4 h-4 mb-1',
                          selectedStatus === 'Flagged' ? 'text-[#960C01]' : 'text-muted-fg'
                        )}
                      />
                      <span className="text-xs font-semibold">Flagged</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Auditor Remarks / Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="audit-notes" className="text-sm font-semibold text-focus">
                  Auditor Notes / Findings
                </Label>
                {readOnly ? (
                  <div className="w-full rounded-xl border border-stroke/40 bg-slate-50/70 p-3 text-sm text-focus/90 min-h-[72px]">
                    {transaction.auditNotes ? (
                      <p className="whitespace-pre-wrap">{transaction.auditNotes}</p>
                    ) : (
                      <p className="text-muted-fg italic">No auditor notes recorded.</p>
                    )}
                  </div>
                ) : (
                  <textarea
                    id="audit-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add verification notes, receipt matching, or variance explanations…"
                    className="w-full rounded-xl border-[0.5px] border-stroke/60 p-3 text-sm text-focus focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus resize-none placeholder:text-muted-fg/60"
                  />
                )}
              </div>
            </div>

            {transaction.auditedBy && (
              <p className="text-xs text-muted-fg pt-1">
                Last reviewed by <strong className="text-focus">{transaction.auditedBy}</strong>{' '}
                {transaction.auditDate ? `on ${transaction.auditDate}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Modal Actions Footer: Close button for Admin read-only, Cancel & Save Changes for Auditor */}
        {readOnly ? (
          <div className="flex items-center justify-end pt-6 mt-6 border-t border-stroke/20">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-11 px-7 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-sm shadow-sm transition-all"
            >
              Close
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-stroke/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-11 px-7 rounded-xl border border-stroke/50 text-focus hover:bg-surface font-medium text-sm transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-11 px-7 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

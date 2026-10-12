import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle, Building2, Calendar, FileText } from 'lucide-react'
import { loanService, type LoanItem } from '@/services/loanService'
import { formatPHP } from '@/lib/format'

interface ApproveLoanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: LoanItem | null
  onSuccess: (approvedLoan: LoanItem) => void
}

export const ApproveLoanModal: React.FC<ApproveLoanModalProps> = ({
  open,
  onOpenChange,
  loan,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')

  if (!loan) return null

  const handleApprove = async () => {
    setIsSubmitting(true)
    setError('')
    try {
      const approved = await loanService.approveLoan(loan.id)
      onSuccess(approved)
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to approve loan request.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-[24px] p-6 sm:p-7 bg-white border border-stroke/30 shadow-2xl [&>button]:top-4 [&>button]:right-4">
        <DialogHeader className="text-left pb-3 border-b border-stroke/20 pr-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-focus leading-tight">
                Approve Loan Request
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-fg font-normal">
                Confirmation from <span className="font-semibold text-focus">{loan.lender}</span> (Lender)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-fg font-medium">Borrower Company:</span>
              <span className="font-bold text-focus">{loan.borrower}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-fg font-medium">Principal Amount:</span>
              <span className="font-bold text-emerald-600 text-sm tabular-nums">{formatPHP(loan.amount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-fg font-medium">Loan Date:</span>
              <span className="font-medium text-focus">{loan.date}</span>
            </div>
            {loan.dueDate && (
              <div className="flex justify-between items-center">
                <span className="text-muted-fg font-medium">Due Date:</span>
                <span className="font-medium text-focus">{loan.dueDate}</span>
              </div>
            )}
            {loan.interestRate !== undefined && loan.interestRate > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-fg font-medium">Interest Rate:</span>
                <span className="font-bold text-primary">{loan.interestRate}%</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-muted-fg block mb-0.5">Particulars / Purpose:</span>
              <p className="font-medium text-focus italic">{loan.particulars}</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            By approving this loan request, you acknowledge and authorize the transfer of financing from <strong>{loan.lender}</strong> to <strong>{loan.borrower}</strong>. Once approved, the borrower will no longer be able to edit or delete this loan.
          </p>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-stroke/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApprove}
              disabled={isSubmitting}
              className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Approving…' : 'Confirm & Approve'}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

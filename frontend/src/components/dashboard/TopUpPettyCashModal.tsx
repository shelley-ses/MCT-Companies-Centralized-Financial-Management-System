import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wallet, CheckCircle2, AlertCircle, Loader2, Building2 } from 'lucide-react'
import { formatPHP } from '@/lib/format'
import { pettyCashService } from '@/services/pettyCashService'

export interface TopUpPettyCashModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: string
  currentBalance?: number | null
  onSuccess?: () => void
}

const todayIso = () => new Date().toISOString().slice(0, 10)

export const TopUpPettyCashModal: React.FC<TopUpPettyCashModalProps> = ({
  open,
  onOpenChange,
  company,
  currentBalance,
  onSuccess,
}) => {
  const [amountInput, setAmountInput] = React.useState('')
  const [topUpDate, setTopUpDate] = React.useState(todayIso)
  const [referenceNo, setReferenceNo] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setAmountInput('')
      setTopUpDate(todayIso())
      setReferenceNo('')
      setNotes('')
      setError('')
      setSuccessBanner(null)
    }
  }, [open])

  const parsedAmount = parseFloat(amountInput) || 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!parsedAmount || parsedAmount < 1) {
      setError('Please enter a top-up amount of at least ₱1.00')
      return
    }
    if (!topUpDate || topUpDate > todayIso()) {
      setError('Top-up date cannot be in the future')
      return
    }

    try {
      setIsSubmitting(true)
      await pettyCashService.createTopUp({
        company,
        amount: parsedAmount,
        date: topUpDate,
        referenceNo: referenceNo.trim() || undefined,
        description: notes.trim() || undefined,
      })
      setSuccessBanner(`${formatPHP(parsedAmount)} moved from sales to petty cash.`)
      onSuccess?.()
      setTimeout(() => onOpenChange(false), 700)
    } catch (err: any) {
      setError(err?.message || 'Failed to top up petty cash. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-[24px] p-6 sm:p-8 bg-white border border-stroke/30 shadow-2xl [&>button]:top-5 [&>button]:right-5">
        <DialogHeader className="text-left pb-4 border-b border-stroke/20 pr-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#960C01] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-focus leading-tight">
                Top Up Petty Cash
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-fg font-normal">
                Move money from sales into the petty cash wallet
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs mt-1">
          <span className="flex items-center gap-1.5 font-bold text-focus text-sm">
            <Building2 className="w-3.5 h-3.5 text-muted-fg" />
            {company}
          </span>
          {currentBalance != null && (
            <div className="text-right">
              <div className="text-[11px] font-semibold text-muted-fg uppercase tracking-wider">
                Current Balance
              </div>
              <div className="font-bold text-focus text-sm tabular-nums">
                {formatPHP(currentBalance)}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successBanner && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successBanner}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="petty-topup-amount" className="text-xs font-semibold text-focus block">
                Amount (PHP) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-fg">
                  ₱
                </span>
                <Input
                  id="petty-topup-amount"
                  type="number"
                  step="0.01"
                  min="1"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="pl-8 h-10 sm:h-11 rounded-xl text-xs sm:text-sm font-semibold border-stroke/60 bg-white focus-visible:ring-2 focus-visible:ring-focus"
                  required
                />
              </div>
              {currentBalance != null && parsedAmount > 0 && (
                <p className="text-[11px] text-muted-fg">
                  New balance:{' '}
                  <span className="font-semibold text-focus">
                    {formatPHP(currentBalance + parsedAmount)}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="petty-topup-date" className="text-xs font-semibold text-focus block">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="petty-topup-date"
                type="date"
                max={todayIso()}
                value={topUpDate}
                onChange={(e) => setTopUpDate(e.target.value)}
                className="h-10 sm:h-11 rounded-xl text-xs sm:text-sm border-stroke/60 bg-white focus-visible:ring-2 focus-visible:ring-focus"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="petty-topup-ref" className="text-xs font-semibold text-focus block">
              Reference No. (Optional)
            </Label>
            <Input
              id="petty-topup-ref"
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. PCF-2026-001"
              className="h-10 sm:h-11 rounded-xl text-xs sm:text-sm border-stroke/60 bg-white focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="petty-topup-notes" className="text-xs font-semibold text-focus block">
              Notes (Optional)
            </Label>
            <Input
              id="petty-topup-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Weekly petty cash replenishment"
              className="h-10 sm:h-11 rounded-xl text-xs sm:text-sm border-stroke/60 bg-white focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>

          <div className="pt-3 border-t border-stroke/20 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl h-10 sm:h-11 px-5 text-xs sm:text-sm font-semibold border-stroke/50 bg-white text-focus hover:bg-surface cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl h-10 sm:h-11 px-6 text-xs sm:text-sm font-semibold bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white shadow-xs flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Top Up</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

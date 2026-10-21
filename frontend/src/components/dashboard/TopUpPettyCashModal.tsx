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
import {
  Wallet,
  Building2,
  AlertCircle,
  PlusCircle,
  Clock,
  ShieldCheck,
  Landmark,
} from 'lucide-react'
import { formatPHP } from '@/lib/format'
import { formatToYYYYMMDD } from '@/utils/dateUtils'
import { useSession } from '@/hooks/useSession'
import { cn } from '@/lib/utils'

export interface TopUpPettyCashModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: string
  currentBalance?: number | null
  companies?: string[]
  onSuccess?: (newRequest: PettyCashTopUpRecord) => void
}

export interface PettyCashTopUpRecord {
  id: string
  recordId: number
  companyName: string
  date: string
  type: 'topup' | 'request'
  description: string
  referenceNo?: string
  bankSource: string
  amountRequested: number
  amountIn: number
  amountOut: number
  runningBalance: number
  status: 'Approved' | 'Pending Finance Approval' | 'Rejected'
  requestedBy: string
  approvedBy?: string
  approvedAt?: string
}

export const CORPORATE_BANK_ACCOUNTS = [
  {
    id: 'bdo-01',
    bankName: 'BDO Unibank',
    accountName: 'MCT Holdings Corp.',
    accountNumber: '0012-3456-7890',
    type: 'Corporate Checking',
  },
  {
    id: 'bpi-01',
    bankName: 'Bank of the Philippine Islands (BPI)',
    accountName: 'MCT Operating Account',
    accountNumber: '0987-6543-2100',
    type: 'Commercial Operating',
  },
  {
    id: 'mb-01',
    bankName: 'Metrobank',
    accountName: 'MCT Central Treasury',
    accountNumber: '0554-1234-9876',
    type: 'Central Treasury',
  },
  {
    id: 'ub-01',
    bankName: 'UnionBank of the Philippines',
    accountName: 'MCT Digital Treasury',
    accountNumber: '1029-3847-5610',
    type: 'Digital Treasury',
  },
  {
    id: 'sb-01',
    bankName: 'Security Bank',
    accountName: 'MCT Commercial Operating',
    accountNumber: '0321-6549-8712',
    type: 'Corporate Commercial',
  },
  {
    id: 'sales-dep',
    bankName: 'Corporate Sales Depository',
    accountName: 'Daily Sales Remittance Bank Account',
    accountNumber: '5521-8890-4412',
    type: 'Sales Remittance Depository',
  },
]

const todayIso = () => formatToYYYYMMDD(new Date())

export const TopUpPettyCashModal: React.FC<TopUpPettyCashModalProps> = ({
  open,
  onOpenChange,
  company,
  currentBalance = 0,
  companies = [],
  onSuccess,
}) => {
  const { user } = useSession()
  const userRole = (user?.role || '').toLowerCase()
  const isFinanceOrAdmin = userRole === 'finance' || userRole === 'admin'
  const isSupervisor = userRole === 'supervisor'
  const isCompanyScoped = isSupervisor || userRole === 'company' || userRole === 'company auditor'

  const [requestingCompany, setRequestingCompany] = React.useState(company)
  const [selectedBank, setSelectedBank] = React.useState(CORPORATE_BANK_ACCOUNTS[0].id)
  const [amountInput, setAmountInput] = React.useState('')
  const [requestDate, setRequestDate] = React.useState(todayIso)
  const [particulars, setParticulars] = React.useState('')
  const [referenceNo, setReferenceNo] = React.useState('')
  const [directApprove, setDirectApprove] = React.useState(isFinanceOrAdmin)
  const [error, setError] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Reset form on open
  React.useEffect(() => {
    if (open) {
      const initialComp = company && company !== 'All Companies' ? company : (user?.assignedCompany || 'MCT Kitchen')
      setRequestingCompany(initialComp)
      setSelectedBank(CORPORATE_BANK_ACCOUNTS[0].id)
      setAmountInput('')
      setRequestDate(todayIso())
      setParticulars('')
      setReferenceNo(`PC-REQ-${Math.floor(1000 + Math.random() * 9000)}`)
      setDirectApprove(isFinanceOrAdmin)
      setError('')
      setIsSubmitting(false)
    }
  }, [open, company, user?.assignedCompany, isFinanceOrAdmin])

  const parsedAmount = parseFloat(amountInput) || 0
  const chosenBankObj = CORPORATE_BANK_ACCOUNTS.find((b) => b.id === selectedBank) || CORPORATE_BANK_ACCOUNTS[0]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!parsedAmount || parsedAmount < 1) {
      setError('Please enter a valid top-up amount of at least ₱1.00')
      return
    }

    if (!requestDate || requestDate > todayIso()) {
      setError('Date cannot be in the future (maximum date is today).')
      return
    }

    if (!particulars.trim()) {
      setError('Please provide particulars / reason for the petty cash top up.')
      return
    }

    setIsSubmitting(true)

    try {
      const willApproveImmediately = isFinanceOrAdmin && directApprove
      // Supervisors do not choose bank account; bank is designated by Finance upon review
      const bankLabel = isFinanceOrAdmin
        ? `${chosenBankObj.bankName} (${chosenBankObj.accountNumber})`
        : 'Bank Account (Finance Designated)'

      const newRecord: PettyCashTopUpRecord = {
        id: `pc-${Date.now()}`,
        recordId: Date.now(),
        companyName: requestingCompany,
        date: requestDate,
        type: willApproveImmediately ? 'topup' : 'request',
        description: particulars.trim(),
        referenceNo: referenceNo.trim() || undefined,
        bankSource: bankLabel,
        amountRequested: parsedAmount,
        // Validation: If not yet approved, amountIn is 0 (unreceived)
        amountIn: willApproveImmediately ? parsedAmount : 0,
        amountOut: 0,
        runningBalance: (currentBalance || 0) + (willApproveImmediately ? parsedAmount : 0),
        status: willApproveImmediately ? 'Approved' : 'Pending Finance Approval',
        requestedBy: user?.fullName || user?.email || (userRole === 'supervisor' ? 'Supervisor' : 'Finance'),
        approvedBy: willApproveImmediately ? (user?.fullName || user?.email || 'Finance') : undefined,
        approvedAt: willApproveImmediately ? new Date().toISOString() : undefined,
      }

      onSuccess?.(newRecord)
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to submit petty cash request.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Wide modal with compact vertical height */}
      <DialogContent className="sm:max-w-[740px] lg:max-w-[780px] rounded-[24px] p-6 sm:p-7 bg-white border border-stroke/30 shadow-2xl [&>button]:top-5 [&>button]:right-5">
        <DialogHeader className="text-left pb-3 border-b border-stroke/20 pr-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#960C01] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-focus leading-tight">
                Request Petty Cash Top Up
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-fg font-normal mt-0.5">
                {isFinanceOrAdmin
                  ? 'Disburse replenishment funds from corporate bank accounts into petty cash fund.'
                  : 'Submit petty cash replenishment request. Finance will review and disburse from the corporate bank.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Request Type (Left) & Requesting Company (Right) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-focus block">Request Type</Label>
              <div className="h-9 px-3 rounded-xl border border-stroke/40 bg-slate-50 text-focus text-xs font-medium flex items-center justify-between shadow-2xs select-none">
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-[#960C01] shrink-0" />
                  <span className="font-semibold text-focus">Petty Cash Top Up</span>
                </div>
                <span className="text-[10.5px] text-[#960C01] font-semibold px-2 py-0.5 rounded-full bg-[#960C01]/10 border border-[#960C01]/20 shrink-0">
                  Automatic
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-focus block">
                Requesting Company <span className="text-red-500">*</span>
              </Label>
              {isCompanyScoped ? (
                <div className="h-9 px-3 rounded-xl border border-stroke/40 bg-slate-50 text-focus text-xs font-medium flex items-center gap-2 shadow-2xs">
                  <Building2 className="w-3.5 h-3.5 text-muted-fg shrink-0" />
                  <span className="truncate font-semibold">{requestingCompany}</span>
                </div>
              ) : (
                <select
                  value={requestingCompany}
                  onChange={(e) => setRequestingCompany(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-stroke/60 bg-white text-xs font-medium text-focus focus:outline-none focus:ring-2 focus:ring-focus"
                >
                  {(companies.length > 0 ? companies.filter((c) => c !== 'All Companies') : [
                    'MCT Kitchen',
                    'MCT Hotel',
                    'JK Cafe',
                    'Annex Nine',
                    'Merillon',
                    'JK Printing',
                    'Speedbox',
                    'JK Property and Ventures',
                    'Golden Sunburst Ventures',
                    'FilCap Prime Holdings Corp.',
                  ]).map((comp) => (
                    <option key={comp} value={comp}>
                      {comp}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Row 2: Top Up Amount (Left) & Request Date (Right) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-focus block">
                  Top Up Amount (₱) <span className="text-red-500">*</span>
                </Label>
                {parsedAmount > 0 && (
                  <span className="text-[11px] text-primary font-semibold">
                    {formatPHP(parsedAmount)}
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-focus text-xs">
                  ₱
                </span>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="0.00"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="pl-7 h-9 text-xs font-semibold rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-focus block">
                Request Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={requestDate}
                max={todayIso()}
                onChange={(e) => setRequestDate(e.target.value)}
                className="h-9 text-xs rounded-xl cursor-pointer"
                required
              />
            </div>
          </div>

          {/* Row 3: Source Bank Account (Visible ONLY to Finance / Admin) OR Reference No */}
          {isFinanceOrAdmin ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-focus block">
                  Source Bank Account <span className="text-red-500">*</span>
                </Label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-stroke/60 bg-white text-xs font-medium text-focus focus:outline-none focus:ring-2 focus:ring-focus truncate"
                >
                  {CORPORATE_BANK_ACCOUNTS.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.bankName} — {bank.accountNumber} ({bank.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-focus block">
                  Reference / Voucher No.
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. PC-TOPUP-2026-001"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>
          ) : (
            /* For Supervisors: Source Bank Account options are removed. Reference No + Finance Routing Pill */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-focus block">
                  Reference / Voucher No.
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. PC-REQ-2026-001"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-focus block">Funding Source</Label>
                <div className="h-9 px-3 rounded-xl border border-stroke/40 bg-slate-50 text-muted-fg text-xs font-medium flex items-center gap-2 select-none truncate">
                  <Landmark className="w-3.5 h-3.5 text-muted-fg shrink-0" />
                  <span className="truncate">Designated by Finance upon review</span>
                </div>
              </div>
            </div>
          )}

          {/* Row 4: Particulars / Purpose (Full Width) */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-focus block">
              Particulars / Purpose <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              placeholder="e.g. Weekly operational petty cash buffer, kitchen consumables, minor supplies"
              value={particulars}
              onChange={(e) => setParticulars(e.target.value)}
              className="h-9 text-xs rounded-xl"
              required
            />
          </div>

          {/* Finance Action Toggle (If user is Finance / Admin) OR Supervisor Notice */}
          {isFinanceOrAdmin ? (
            <div className="p-3 rounded-xl bg-slate-50 border border-stroke/40 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-focus block">
                  Finance Action
                </Label>
                <p className="text-[11px] text-muted-fg">
                  {directApprove
                    ? 'Disburse from selected bank and credit to petty cash fund immediately.'
                    : 'Save request as Pending Finance Approval.'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setDirectApprove(true)}
                  className={cn(
                    'flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold transition-all',
                    directApprove
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 shadow-xs'
                      : 'border-stroke/60 bg-white text-muted-fg hover:bg-slate-100'
                  )}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Approve & Disburse</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDirectApprove(false)}
                  className={cn(
                    'flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold transition-all',
                    !directApprove
                      ? 'bg-amber-500/10 border-amber-500 text-amber-700 shadow-xs'
                      : 'border-stroke/60 bg-white text-muted-fg hover:bg-slate-100'
                  )}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Save as Pending</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/60 text-xs text-amber-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Request will be sent to Finance. The petty cash will be disbursed from the bank ONLY IF FINANCE APPROVES.
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stroke/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 rounded-xl text-xs font-semibold border-stroke/60 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-9 px-5 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-xs shadow-xs flex items-center gap-2"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>
                {isFinanceOrAdmin && directApprove
                  ? 'Approve & Credit Petty Cash'
                  : 'Submit Request to Finance'}
              </span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export const RequestPettyCashModal = TopUpPettyCashModal

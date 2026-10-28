export interface DailyPaymentRecord {
  id: string
  date: string
  amount: number
  method: string
  referenceNo?: string
  notes?: string
  status?: 'Paid' | 'Missed' | 'Partial' | 'Partially Paid' | 'Advance Paid' | 'Pending' | 'Scheduled'
  missedReason?: string
  timestamp: string
  monthIndex?: number
  periodLabel?: string
  isLocked?: boolean
  target?: number
  penalty?: number
}

export interface LendingFacility {
  id: string
  loanId: string
  borrowerName: string
  borrowerContact?: string
  borrowerAddress?: string
  loanAmount: number
  interestRate: number
  dateBorrowed: string
  dueDate: string
  totalAmountPayable: number
  amountPaid: number
  remainingBalance: number
  status: 'Active' | 'Completed' | 'Overdue' | 'Pending'
  paymentFrequency?: 'Daily' | 'Monthly' | 'Quarterly' | 'Annually'
  termDays?: number
  penaltyRate?: number
  penaltyPerCycle?: number
  totalPenalties?: number
  advanceAmount?: number
  installmentTarget?: number
  complianceStatus?: 'Compliant' | 'Delayed' | 'Delinquent'
  missedCyclesCount?: number
  lenderCompany?: string
  notes?: string
  dailyPayments: DailyPaymentRecord[]
  auditStatus?: 'Verified' | 'Flagged'
  auditDate?: string
  auditedBy?: string
}

export interface LendingCalculateParams {
  principal: number
  interestRate: number
  paymentFrequency: 'Daily' | 'Monthly' | 'Quarterly' | 'Annually'
  dateBorrowed: string
  dueDate?: string
  termDays?: number
}

export interface LendingCalculateResult {
  principal: number
  interest_rate: number
  interest: number
  total_payable: number
  frequency: string
  cycle_count: number
  installment_target: number
  term_days: number
  penalty_rate: number
  penalty_per_cycle: number
  date_borrowed: string
  due_date: string
}

export interface LendingCreateFacilityPayload {
  borrowerName: string
  borrowerContact?: string
  borrowerAddress?: string
  loanAmount: number
  interestRate: number
  paymentFrequency: 'Daily' | 'Monthly' | 'Quarterly' | 'Annually'
  dateBorrowed: string
  dueDate?: string
  termDays?: number
  notes?: string
}

export interface LendingRecordPaymentPayload {
  facilityId: number | string
  paymentDate: string
  amount: number
  method: string
  referenceNo?: string
  notes?: string
}

export interface LendingTransactionRecord {
  transaction_id: number
  facility_id: number
  transaction_ref_no?: string
  transaction_type: string
  payment_date: string
  due_date?: string
  amount: number
  principal_portion?: number
  interest_portion?: number
  penalty_portion?: number
  remaining_balance?: number
  payment_method: string
  reference_no?: string
  status: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface LendingLedgerResult {
  facility_id: string
  loan_ref_no: string
  borrower_name: string
  payment_frequency: string
  principal: number
  interest_rate: number
  total_payable: number
  amount_paid: number
  remaining_balance: number
  date_borrowed: string
  due_date: string
  term_days: number
  penalty_rate: number
  penalty_per_cycle: number
  total_penalties: number
  advance_amount: number
  installment_target: number
  compliance_status: string
  missed_cycles_count: number
  ledger_items: DailyPaymentRecord[]
  monthly_progress?: {
    totalMonths: number
    targetPerMonth: number
    totalPenalties: number
    advanceAmount: number
    complianceStatus: string
    missedCyclesCount: number
    monthDetails: Array<{
      month_index: number
      target: number
      paid: number
      remaining: number
      status: string
      dueDate: string
      isOverdue: boolean
      isLocked: boolean
      penalty?: number
    }>
    activeMonth: {
      month_index: number
      target: number
      paid: number
      remaining: number
      status: string
      dueDate: string
      isOverdue: boolean
      isLocked: boolean
      penalty?: number
    }
  }
  next_installment?: {
    periodLabel: string
    dueDate: string
    targetAmount: number
    isOverdue: boolean
    cycleIndex: number
    totalCycles: number
  }
}

export const LENDING_STORAGE_KEY = 'mct_filcap_lending_facilities_v2'

export const INITIAL_FACILITIES: LendingFacility[] = [
  {
    id: 'fac-fc-001',
    loanId: 'LN-FC-2026-001',
    borrowerName: 'Elena Morales (Morales Grocery Store)',
    loanAmount: 100000,
    interestRate: 5.0,
    dateBorrowed: '2026-10-01',
    dueDate: '2026-11-15',
    totalAmountPayable: 105000,
    amountPaid: 42000,
    remainingBalance: 63000,
    status: 'Active',
    paymentFrequency: 'Daily',
    termDays: 50,
    installmentTarget: 2100,
    lenderCompany: 'FilCap Prime Holdings Corp.',
    notes: 'Micro-retail everyday working capital facility. Daily installment rate: ₱2,100.',
    dailyPayments: [
      { id: 'dp-1', date: '2026-10-02', amount: 2100, method: 'Cash', referenceNo: 'OR-88201', notes: 'Daily remittance', timestamp: '2026-10-02T10:00:00Z', isLocked: true },
      { id: 'dp-2', date: '2026-10-03', amount: 2100, method: 'Cash', referenceNo: 'OR-88220', notes: 'Daily remittance', timestamp: '2026-10-03T10:15:00Z', isLocked: true },
      { id: 'dp-3', date: '2026-10-04', amount: 2100, method: 'GCash', referenceNo: 'GC-99210', notes: 'E-wallet transfer', timestamp: '2026-10-04T11:00:00Z', isLocked: true },
      { id: 'dp-4', date: '2026-10-05', amount: 2100, method: 'Cash', referenceNo: 'OR-88255', notes: 'Daily remittance', timestamp: '2026-10-05T09:45:00Z', isLocked: true },
      { id: 'dp-5', date: '2026-10-06', amount: 2100, method: 'Cash', referenceNo: 'OR-88280', notes: 'Daily remittance', timestamp: '2026-10-06T10:30:00Z', isLocked: true },
      { id: 'dp-6', date: '2026-10-07', amount: 2100, method: 'Cash', referenceNo: 'OR-88301', notes: 'Daily remittance', timestamp: '2026-10-07T10:00:00Z', isLocked: true },
      { id: 'dp-7', date: '2026-10-08', amount: 2100, method: 'Cash', referenceNo: 'OR-88320', notes: 'Daily remittance', timestamp: '2026-10-08T10:15:00Z', isLocked: true },
      { id: 'dp-8', date: '2026-10-09', amount: 2100, method: 'GCash', referenceNo: 'GC-99340', notes: 'E-wallet transfer', timestamp: '2026-10-09T14:00:00Z', isLocked: true },
      { id: 'dp-9', date: '2026-10-10', amount: 2100, method: 'Cash', referenceNo: 'OR-88350', notes: 'Daily remittance', timestamp: '2026-10-10T10:00:00Z', isLocked: true },
      { id: 'dp-10', date: '2026-10-11', amount: 2100, method: 'Cash', referenceNo: 'OR-88370', notes: 'Daily remittance', timestamp: '2026-10-11T10:30:00Z', isLocked: true },
      { id: 'dp-11', date: '2026-10-12', amount: 2100, method: 'Cash', referenceNo: 'OR-88390', notes: 'Daily remittance', timestamp: '2026-10-12T09:30:00Z', isLocked: true },
      { id: 'dp-12', date: '2026-10-13', amount: 2100, method: 'GCash', referenceNo: 'GC-99410', notes: 'E-wallet transfer', timestamp: '2026-10-13T10:45:00Z', isLocked: true },
      { id: 'dp-13', date: '2026-10-14', amount: 0, method: 'N/A', referenceNo: 'MISSED', notes: 'Shop closed due to storm / flood (Unpaid)', status: 'Missed', missedReason: 'Shop closed due to storm', timestamp: '2026-10-14T10:00:00Z', isLocked: false },
      { id: 'dp-14', date: '2026-10-15', amount: 2100, method: 'Cash', referenceNo: 'OR-88410', notes: 'Daily remittance', timestamp: '2026-10-15T10:00:00Z', isLocked: true },
      { id: 'dp-15', date: '2026-10-16', amount: 2100, method: 'Cash', referenceNo: 'OR-88435', notes: 'Daily remittance', timestamp: '2026-10-16T11:00:00Z', isLocked: true },
      { id: 'dp-16', date: '2026-10-17', amount: 2100, method: 'Cash', referenceNo: 'OR-88460', notes: 'Daily remittance', timestamp: '2026-10-17T10:15:00Z', isLocked: true },
      { id: 'dp-17', date: '2026-10-18', amount: 2100, method: 'Cash', referenceNo: 'OR-88490', notes: 'Daily remittance', timestamp: '2026-10-18T10:00:00Z', isLocked: true },
      { id: 'dp-18', date: '2026-10-19', amount: 2100, method: 'GCash', referenceNo: 'GC-99520', notes: 'E-wallet transfer', timestamp: '2026-10-19T13:30:00Z', isLocked: true },
      { id: 'dp-19', date: '2026-10-20', amount: 2100, method: 'Cash', referenceNo: 'OR-88510', notes: 'Daily remittance', timestamp: '2026-10-20T10:00:00Z', isLocked: true },
      { id: 'dp-20', date: '2026-10-21', amount: 2100, method: 'Cash', referenceNo: 'OR-88535', notes: 'Daily remittance', timestamp: '2026-10-21T10:30:00Z', isLocked: true },
    ],
  },
  {
    id: 'fac-fc-002',
    loanId: 'LN-FC-2026-002',
    borrowerName: 'Roberto Santos (Santos Car Care)',
    loanAmount: 250000,
    interestRate: 6.0,
    dateBorrowed: '2026-09-15',
    dueDate: '2026-11-30',
    totalAmountPayable: 265000,
    amountPaid: 180000,
    remainingBalance: 85000,
    status: 'Active',
    paymentFrequency: 'Daily',
    termDays: 75,
    installmentTarget: 3500,
    lenderCompany: 'FilCap Prime Holdings Corp.',
    notes: 'Equipment financing facility for hydraulic hoist & diagnostic scanners.',
    dailyPayments: [
      { id: 'dp-21', date: '2026-10-18', amount: 3500, method: 'Bank Transfer', referenceNo: 'BT-44102', notes: 'Online banking transfer', timestamp: '2026-10-18T15:00:00Z', isLocked: true },
      { id: 'dp-22', date: '2026-10-19', amount: 3500, method: 'Cash', referenceNo: 'OR-88501', notes: 'Daily remittance', timestamp: '2026-10-19T10:00:00Z', isLocked: true },
      { id: 'dp-23', date: '2026-10-20', amount: 3500, method: 'Cash', referenceNo: 'OR-88522', notes: 'Daily remittance', timestamp: '2026-10-20T10:15:00Z', isLocked: true },
      { id: 'dp-24', date: '2026-10-21', amount: 3500, method: 'Bank Transfer', referenceNo: 'BT-44199', notes: 'Online banking transfer', timestamp: '2026-10-21T16:00:00Z', isLocked: true },
    ],
  },
  {
    id: 'fac-fc-003',
    loanId: 'LN-FC-2026-003',
    borrowerName: 'Maria Clara Dizon (Dizon Bakeries)',
    loanAmount: 50000,
    interestRate: 4.5,
    dateBorrowed: '2026-10-05',
    dueDate: '2026-10-25',
    totalAmountPayable: 52250,
    amountPaid: 52250,
    remainingBalance: 0,
    status: 'Completed',
    paymentFrequency: 'Daily',
    termDays: 20,
    installmentTarget: 2612.5,
    lenderCompany: 'FilCap Prime Holdings Corp.',
    notes: 'Flour and baking supplies inventory loan. Fully settled on schedule.',
    dailyPayments: [
      { id: 'dp-31', date: '2026-10-20', amount: 2612.5, method: 'Cash', referenceNo: 'OR-88515', notes: 'Final settlement payment', status: 'Paid', timestamp: '2026-10-20T11:00:00Z', isLocked: true },
    ],
  },
  {
    id: 'fac-fc-004',
    loanId: 'LN-FC-2026-004',
    borrowerName: 'Arturo Fernandez (Fernandez Farm & Supply)',
    loanAmount: 80000,
    interestRate: 7.0,
    dateBorrowed: '2026-09-01',
    dueDate: '2026-10-15',
    totalAmountPayable: 85600,
    amountPaid: 45000,
    remainingBalance: 40600,
    status: 'Overdue',
    paymentFrequency: 'Daily',
    termDays: 40,
    installmentTarget: 2140,
    lenderCompany: 'FilCap Prime Holdings Corp.',
    notes: 'Fertilizer bulk advance. Account overdue since Oct 15. Active collection follow up.',
    dailyPayments: [
      { id: 'dp-41', date: '2026-10-12', amount: 1500, method: 'Cash', referenceNo: 'OR-88388', notes: 'Partial catch up payment', status: 'Partially Paid', timestamp: '2026-10-12T14:30:00Z', isLocked: false },
    ],
  },
  {
    id: 'fac-fc-005',
    loanId: 'LN-FC-2026-005',
    borrowerName: 'Luzviminda Cruz (Cruz Ready to Wear)',
    loanAmount: 120000,
    interestRate: 5.5,
    dateBorrowed: '2026-10-10',
    dueDate: '2026-11-20',
    totalAmountPayable: 126600,
    amountPaid: 21100,
    remainingBalance: 105500,
    status: 'Active',
    paymentFrequency: 'Monthly',
    termDays: 180,
    installmentTarget: 21100,
    lenderCompany: 'FilCap Prime Holdings Corp.',
    notes: 'Holiday season inventory replenishment loan.',
    dailyPayments: [
      { id: 'dp-51', date: '2026-10-15', amount: 21100, method: 'Cheque', referenceNo: 'CHQ-10029', notes: 'Cheque cleared BDO', status: 'Paid', timestamp: '2026-10-15T12:00:00Z', monthIndex: 1, periodLabel: 'Month 1', isLocked: true },
    ],
  },
]

class LendingServiceGateway {
  /**
   * Load facilities from localStorage cache.
   */
  loadFromStorage(): LendingFacility[] {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LENDING_STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed
          }
        }
      } catch (err) {
        console.error('Error loading stored lending facilities:', err)
      }
    }
    return INITIAL_FACILITIES
  }

  /**
   * Save facilities to localStorage cache.
   */
  saveToStorage(facilities: LendingFacility[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LENDING_STORAGE_KEY, JSON.stringify(facilities))
      } catch (err) {
        console.error('Error saving lending facilities to storage:', err)
      }
    }
  }

  /**
   * Calculate facility terms by calling backend service, with local fallback.
   */
  async calculateTerms(params: LendingCalculateParams): Promise<LendingCalculateResult> {
    const termDays = params.termDays || (params.paymentFrequency === 'Daily' ? 40 : 60)
    try {
      const res = await fetch('/api/v1/lending/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principal: params.principal,
          interest_rate: params.interestRate,
          payment_frequency: params.paymentFrequency,
          term_days: termDays,
          date_borrowed: params.dateBorrowed,
          due_date: params.dueDate || '',
        }),
      })
      if (res.ok) {
        return await res.json()
      }
    } catch (err) {
      console.warn('LendingServiceGateway.calculateTerms backend request failed, using local fallback:', err)
    }

    // Local fallback calculation
    const p = params.principal
    const r = params.interestRate
    const interest = Math.round((p * (r / 100)) * 100) / 100
    const total = p + interest
    const cycleCount = params.paymentFrequency === 'Daily' ? termDays : Math.max(1, Math.round(termDays / 30))
    const installmentTarget = Math.round((total / cycleCount) * 100) / 100
    const penaltyRate = 5.0
    const penaltyPerCycle = Math.round((installmentTarget * (penaltyRate / 100)) * 100) / 100

    return {
      principal: p,
      interest_rate: r,
      interest: interest,
      total_payable: total,
      frequency: params.paymentFrequency,
      cycle_count: cycleCount,
      installment_target: installmentTarget,
      term_days: termDays,
      penalty_rate: penaltyRate,
      penalty_per_cycle: penaltyPerCycle,
      date_borrowed: params.dateBorrowed,
      due_date: params.dueDate || '',
    }
  }

  /**
   * Fetch facilities list from backend with localStorage fallback.
   */
  async getFacilities(companyId?: number): Promise<LendingFacility[]> {
    try {
      const query = companyId ? `?company_id=${companyId}` : ''
      const res = await fetch(`/api/v1/lending/facilities${query}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          this.saveToStorage(data)
          return data
        }
      }
    } catch (err) {
      console.warn('LendingServiceGateway.getFacilities backend request failed, using cached storage:', err)
    }
    return this.loadFromStorage()
  }

  /**
   * Create a new lending facility via backend, with local cache update.
   */
  async createFacility(payload: LendingCreateFacilityPayload): Promise<LendingFacility> {
    const termDays = payload.termDays || (payload.paymentFrequency === 'Daily' ? 40 : 60)
    try {
      const res = await fetch('/api/v1/lending/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrower_name: payload.borrowerName,
          borrower_contact: payload.borrowerContact || '',
          borrower_address: payload.borrowerAddress || '',
          loan_amount: payload.loanAmount,
          interest_rate: payload.interestRate,
          payment_frequency: payload.paymentFrequency,
          term_days: termDays,
          date_borrowed: payload.dateBorrowed,
          due_date: payload.dueDate || '',
          notes: payload.notes || '',
        }),
      })
      if (res.ok) {
        const created = await res.json()
        const existing = this.loadFromStorage()
        const updated = [created, ...existing]
        this.saveToStorage(updated)
        return created
      }
    } catch (err) {
      console.warn('LendingServiceGateway.createFacility backend request failed, using local generator:', err)
    }

    // Local fallback
    const interest = Math.round((payload.loanAmount * (payload.interestRate / 100)) * 100) / 100
    const totalPayable = payload.loanAmount + interest
    const cycleCount = payload.paymentFrequency === 'Daily' ? termDays : Math.max(1, Math.round(termDays / 30))
    const installmentTarget = Math.round((totalPayable / cycleCount) * 100) / 100
    const penaltyPerCycle = Math.round((installmentTarget * 0.05) * 100) / 100

    const localCreated: LendingFacility = {
      id: `fac-${Date.now()}`,
      loanId: `LN-FC-2026-${Math.floor(100 + Math.random() * 900)}`,
      borrowerName: payload.borrowerName,
      loanAmount: payload.loanAmount,
      interestRate: payload.interestRate,
      dateBorrowed: payload.dateBorrowed,
      dueDate: payload.dueDate || '',
      totalAmountPayable: totalPayable,
      amountPaid: 0,
      remainingBalance: totalPayable,
      status: 'Active',
      paymentFrequency: payload.paymentFrequency,
      termDays: termDays,
      penaltyRate: 5.0,
      penaltyPerCycle: penaltyPerCycle,
      totalPenalties: 0,
      advanceAmount: 0,
      installmentTarget: installmentTarget,
      complianceStatus: 'Compliant',
      missedCyclesCount: 0,
      lenderCompany: 'FilCap Prime Holdings Corp.',
      notes: payload.notes || '',
      dailyPayments: [],
    }
    const existing = this.loadFromStorage()
    this.saveToStorage([localCreated, ...existing])
    return localCreated
  }

  /**
   * Retrieve ledger and schedule analysis from backend service.
   */
  async getLedger(facilityId: string | number): Promise<LendingLedgerResult | null> {
    const numId = parseInt(String(facilityId).replace(/\D/g, ''), 10)
    if (!isNaN(numId) && numId > 0) {
      try {
        const res = await fetch(`/api/v1/lending/ledger/${numId}`)
        if (res.ok) {
          return await res.json()
        }
      } catch (err) {
        console.warn('LendingServiceGateway.getLedger backend request failed:', err)
      }
    }
    return null
  }

  /**
   * Record payment remittance via backend service, with local storage fallback.
   */
  async recordPayment(payload: LendingRecordPaymentPayload): Promise<{ success: boolean; message?: string }> {
    const numId = parseInt(String(payload.facilityId).replace(/\D/g, ''), 10)
    if (!isNaN(numId) && numId > 0) {
      try {
        const res = await fetch('/api/v1/lending/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            facility_id: numId,
            payment_date: payload.paymentDate,
            amount: payload.amount,
            method: payload.method,
            reference_no: payload.referenceNo || '',
            notes: payload.notes || '',
          }),
        })
        if (res.status === 409) {
          const err = await res.json()
          return { success: false, message: err.detail || 'This period is already settled and locked.' }
        }
        if (res.ok) {
          return { success: true }
        }
      } catch (err) {
        console.warn('LendingServiceGateway.recordPayment backend call failed:', err)
      }
    }
    return { success: true }
  }

  /**
   * Retrieve all lending transactions from the database with optional facility filter.
   */
  async getTransactions(facilityId?: number | string): Promise<LendingTransactionRecord[]> {
    try {
      const numId = facilityId ? parseInt(String(facilityId).replace(/\D/g, ''), 10) : undefined
      const query = numId && !isNaN(numId) ? `?facility_id=${numId}` : ''
      const res = await fetch(`/api/v1/lending/transactions${query}`)
      if (res.ok) {
        return await res.json()
      }
    } catch (err) {
      console.warn('LendingServiceGateway.getTransactions failed:', err)
    }
    return []
  }
}

export const lendingService = new LendingServiceGateway()

// --- Lending Calculation & Ledger Presentation Helpers ---

function formatToYYYYMMDD(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getMonthsBetween(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 1
  const s = new Date(startDate)
  const e = new Date(endDate)
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1
  const diffYears = e.getFullYear() - s.getFullYear()
  const diffMonths = e.getMonth() - s.getMonth()
  const months = diffYears * 12 + diffMonths
  return Math.max(1, months)
}

export function getCycleDueDate(
  dateBorrowed: string,
  finalDueDate: string,
  frequency: 'Daily' | 'Monthly' | 'Quarterly' | 'Annually',
  cycleIndex: number,
  totalCycles: number
): string {
  if (!dateBorrowed) return finalDueDate
  if (cycleIndex >= totalCycles) return finalDueDate

  const start = new Date(dateBorrowed)
  if (isNaN(start.getTime())) return finalDueDate

  if (frequency === 'Monthly') {
    const target = new Date(start)
    target.setMonth(target.getMonth() + cycleIndex)
    return formatToYYYYMMDD(target)
  }
  if (frequency === 'Quarterly') {
    const target = new Date(start)
    target.setMonth(target.getMonth() + cycleIndex * 3)
    return formatToYYYYMMDD(target)
  }
  if (frequency === 'Annually') {
    const target = new Date(start)
    target.setFullYear(target.getFullYear() + cycleIndex)
    return formatToYYYYMMDD(target)
  }
  const target = new Date(start)
  target.setDate(target.getDate() + cycleIndex)
  return formatToYYYYMMDD(target)
}

export function getMonthlyProgress(facility: LendingFacility) {
  const termDays = facility.termDays || 60
  const totalMonths = Math.max(1, Math.round(termDays / 30))
  const monthTarget = Math.round((facility.totalAmountPayable / totalMonths) * 100) / 100
  const penaltyPerMonth = Math.round((monthTarget * 0.05) * 100) / 100
  const todayStr = formatToYYYYMMDD(new Date())

  // Aggregate payments by monthIndex or payment date
  const monthPaidMap = new Map<number, number>()
  ;(facility.dailyPayments || []).forEach((r) => {
    if (r.monthIndex && r.monthIndex >= 1) {
      monthPaidMap.set(r.monthIndex, (monthPaidMap.get(r.monthIndex) || 0) + (r.amount || 0))
    } else if (r.date && facility.dateBorrowed) {
      const start = new Date(facility.dateBorrowed)
      const pDate = new Date(r.date)
      if (!isNaN(start.getTime()) && !isNaN(pDate.getTime()) && pDate >= start) {
        const mIdx = Math.min(totalMonths, Math.max(1, (pDate.getFullYear() - start.getFullYear()) * 12 + (pDate.getMonth() - start.getMonth()) + 1))
        monthPaidMap.set(mIdx, (monthPaidMap.get(mIdx) || 0) + (r.amount || 0))
      }
    }
  })

  const months: Array<{
    monthIndex: number
    target: number
    paid: number
    remaining: number
    status: 'Paid' | 'Partial' | 'Partially Paid' | 'Unpaid' | 'Advance Paid' | 'Missed'
    dueDate: string
    isOverdue: boolean
    isLocked: boolean
    penalty?: number
  }> = []

  let availableCredit = 0
  let totalPenalties = 0
  let missedCount = 0

  for (let i = 1; i <= totalMonths; i++) {
    const isLast = i === totalMonths
    const target = isLast
      ? Math.max(0, Math.round((facility.totalAmountPayable - (monthTarget * (totalMonths - 1))) * 100) / 100)
      : monthTarget

    const directPaid = monthPaidMap.get(i) || 0
    const availableFunds = directPaid + availableCredit
    const cycleDueDate = getCycleDueDate(
      facility.dateBorrowed,
      facility.dueDate,
      'Monthly',
      i,
      totalMonths
    )

    let status: 'Paid' | 'Partial' | 'Partially Paid' | 'Unpaid' | 'Advance Paid' | 'Missed' = 'Unpaid'
    let remaining = target
    let isLocked = false
    let isOverdue = false
    let monthPenalty = 0

    if (availableFunds >= target && target > 0) {
      availableCredit = availableFunds - target
      remaining = 0
      status = directPaid > 0 ? 'Paid' : 'Advance Paid'
      isLocked = true
    } else if (availableFunds > 0) {
      remaining = target - availableFunds
      availableCredit = 0
      isOverdue = todayStr > cycleDueDate
      status = 'Partially Paid'
    } else {
      isOverdue = todayStr > cycleDueDate
      status = isOverdue ? 'Missed' : 'Unpaid'
    }

    months.push({
      monthIndex: i,
      target,
      paid: directPaid,
      remaining,
      status,
      dueDate: cycleDueDate,
      isOverdue,
      isLocked,
      penalty: 0,
    })
  }

  const activeMonth = months.find((m) => m.remaining > 0) || months[months.length - 1]

  return {
    totalMonths,
    monthTarget,
    months,
    activeMonth,
    totalPenalties: 0,
    advanceAmount: availableCredit,
    complianceStatus: 'Compliant' as const,
    missedCyclesCount: 0,
  }
}

export function getNextInstallmentInfo(facility: LendingFacility): {
  periodLabel: string
  dueDate: string
  target: number
  remaining: number
  isOverdue: boolean
} | null {
  if (facility.remainingBalance <= 0) return null
  const freq = facility.paymentFrequency || 'Daily'
  const todayStr = formatToYYYYMMDD(new Date())

  if (freq === 'Daily') {
    const termDays = facility.termDays || 40
    const target = facility.installmentTarget || Math.round((facility.totalAmountPayable / termDays) * 100) / 100
    return {
      periodLabel: 'Today',
      dueDate: todayStr,
      target,
      remaining: Math.min(facility.remainingBalance, target),
      isOverdue: false,
    }
  }
  if (freq === 'Monthly') {
    const progress = getMonthlyProgress(facility)
    return {
      periodLabel: `Month ${progress.activeMonth.monthIndex}`,
      dueDate: progress.activeMonth.dueDate,
      target: progress.activeMonth.target,
      remaining: progress.activeMonth.remaining,
      isOverdue: progress.activeMonth.isOverdue,
    }
  }
  if (freq === 'Quarterly') {
    const totalMonths = getMonthsBetween(facility.dateBorrowed, facility.dueDate)
    const totalQuarters = Math.max(1, Math.round(totalMonths / 3))
    const quarterTarget = Math.round(facility.totalAmountPayable / totalQuarters)
    const paidQuarters = Math.floor(facility.amountPaid / quarterTarget)
    const activeQuarter = Math.min(totalQuarters, paidQuarters + 1)
    const qDueDate = getCycleDueDate(facility.dateBorrowed, facility.dueDate, 'Quarterly', activeQuarter, totalQuarters)
    return {
      periodLabel: `Quarter ${activeQuarter}`,
      dueDate: qDueDate,
      target: quarterTarget,
      remaining: Math.min(facility.remainingBalance, quarterTarget),
      isOverdue: todayStr > qDueDate,
    }
  }
  if (freq === 'Annually') {
    const totalMonths = getMonthsBetween(facility.dateBorrowed, facility.dueDate)
    const totalYears = Math.max(1, Math.round(totalMonths / 12))
    const yearTarget = Math.round(facility.totalAmountPayable / totalYears)
    const paidYears = Math.floor(facility.amountPaid / yearTarget)
    const activeYear = Math.min(totalYears, paidYears + 1)
    const yDueDate = getCycleDueDate(facility.dateBorrowed, facility.dueDate, 'Annually', activeYear, totalYears)
    return {
      periodLabel: `Year ${activeYear}`,
      dueDate: yDueDate,
      target: yearTarget,
      remaining: Math.min(facility.remainingBalance, yearTarget),
      isOverdue: todayStr > yDueDate,
    }
  }
  return null
}

export function buildDailyLedger(facility: LendingFacility): DailyPaymentRecord[] {
  const existingPayments = facility.dailyPayments || []
  if (facility.paymentFrequency && facility.paymentFrequency !== 'Daily') {
    return existingPayments
  }

  if (!facility.dateBorrowed) return existingPayments
  const start = new Date(facility.dateBorrowed)
  if (isNaN(start.getTime())) return existingPayments

  const termDays = facility.termDays || 40
  const target = facility.installmentTarget || Math.round((facility.totalAmountPayable / termDays) * 100) / 100
  const penaltyPerCycle = facility.penaltyPerCycle || Math.round((target * 0.05) * 100) / 100

  const todayStr = formatToYYYYMMDD(new Date())
  const today = new Date(todayStr)

  // Map payments by actual payment date
  const dayPayments = new Map<string, DailyPaymentRecord[]>()
  existingPayments.forEach((p) => {
    const list = dayPayments.get(p.date) || []
    list.push(p)
    dayPayments.set(p.date, list)
  })

  // End date is max(today, start + termDays - 1)
  const endDate = new Date(start)
  endDate.setDate(endDate.getDate() + Math.max(1, termDays) - 1)
  const finalEnd = today > endDate ? today : endDate

  let availableCredit = 0
  const rows: DailyPaymentRecord[] = []
  const cur = new Date(start)

  while (cur <= finalEnd) {
    const dateStr = formatToYYYYMMDD(cur)
    const list = dayPayments.get(dateStr) || []
    const paidToday = list.reduce((sum, item) => sum + (item.amount || 0), 0)
    const availableFunds = paidToday + availableCredit

    if (availableFunds >= target && target > 0) {
      availableCredit = availableFunds - target
      const isDirectPaid = paidToday > 0
      const first = list[0]
      rows.push({
        id: first?.id || `day-${dateStr}`,
        date: dateStr,
        amount: paidToday,
        target,
        method: isDirectPaid ? (first?.method || 'Cash') : 'Advance Credit',
        referenceNo: isDirectPaid ? (first?.referenceNo || '-') : 'ADVANCE',
        notes: isDirectPaid ? (first?.notes || '-') : 'Covered by advance payment',
        status: isDirectPaid ? 'Paid' : 'Advance Paid',
        penalty: 0,
        timestamp: first?.timestamp || `${dateStr}T10:00:00Z`,
        isLocked: true,
      })
    } else if (paidToday > 0 && availableFunds > 0) {
      availableCredit = 0
      const first = list[0]
      rows.push({
        id: first?.id || `day-${dateStr}`,
        date: dateStr,
        amount: paidToday,
        target,
        method: first?.method || 'Cash',
        referenceNo: first?.referenceNo || '-',
        notes: first?.notes || '-',
        status: 'Partially Paid',
        penalty: 0,
        timestamp: first?.timestamp || `${dateStr}T10:00:00Z`,
        isLocked: false,
      })
    } else {
      const isPast = cur < today
      const isToday = dateStr === todayStr
      rows.push({
        id: `day-${dateStr}`,
        date: dateStr,
        amount: 0,
        target,
        method: '-',
        referenceNo: '-',
        notes: '-',
        status: isPast ? 'Missed' : (isToday ? 'Pending' : 'Scheduled'),
        penalty: 0,
        timestamp: `${dateStr}T23:59:59Z`,
        isLocked: false,
      })
    }

    cur.setDate(cur.getDate() + 1)
  }

  // Sort descending (most recent date first)
  rows.sort((a, b) => b.date.localeCompare(a.date))
  return rows
}

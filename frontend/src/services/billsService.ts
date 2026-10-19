export interface BillPaymentRecord {
  id: string
  periodKey?: string
  paymentDate: string
  amount: number
  paymentMethod: string
  refNo?: string
  notes?: string
  createdAt: string
}

export type BillCategory =
  | 'Electricity'
  | 'Water'
  | 'Internet & Telecom'
  | 'Rent & Lease'
  | 'Software & Cloud'
  | 'Janitorial & Security'
  | 'Government & Taxes'
  | 'Insurance'
  | 'Others'

export type BillStatus = 'Unpaid' | 'Paid' | 'Overdue' | 'Due Soon'
export type BillRecurring = 'Daily' | 'Monthly' | 'Yearly'

export interface BillItem {
  id: string
  billerName: string
  company: string
  category: BillCategory | string
  accountNo: string
  amount: number
  dueDate: string // YYYY-MM-DD
  dueDayOfMonth?: number // e.g. 15 for 15th of the month
  billingCycle: BillRecurring
  reminderDaysBefore: number // e.g. 3 days before
  status: BillStatus
  notes?: string
  lastPaidDate?: string
  lastPaymentMethod?: string
  payments?: BillPaymentRecord[]
  createdAt: string
  updatedAt: string
}

export interface NewBillInput {
  billerName: string
  company: string
  category: string
  accountNo?: string
  amount: number
  dueDate: string
  dueDayOfMonth?: number
  billingCycle?: BillRecurring
  reminderDaysBefore?: number
  notes?: string
}

export interface UpdateBillInput {
  billerName?: string
  company?: string
  category?: string
  accountNo?: string
  amount?: number
  dueDate?: string
  dueDayOfMonth?: number
  billingCycle?: BillRecurring
  reminderDaysBefore?: number
  status?: BillStatus
  notes?: string
}

export interface BillStats {
  totalMonthlyAmount: number
  totalBillsCount: number
  paidAmount: number
  paidCount: number
  unpaidAmount: number
  unpaidCount: number
  overdueCount: number
  overdueAmount: number
  dueSoonCount: number
  dueSoonAmount: number
}

export interface BillReminder {
  bill: BillItem
  type: 'overdue' | 'due_today' | 'due_soon'
  daysDiff: number
  message: string
}

export interface BillPaymentPeriod {
  key: string
  label: string
  paid: boolean
  paymentDate?: string
  periodDate?: string
  isFuture?: boolean
}

export const BILL_CATEGORIES: readonly BillCategory[] = [
  'Electricity',
  'Water',
  'Internet & Telecom',
  'Rent & Lease',
  'Software & Cloud',
  'Janitorial & Security',
  'Government & Taxes',
  'Insurance',
  'Others',
]

const BILLS_STORAGE_KEY = 'mct_bills_records_v1'

const INITIAL_BILLS: BillItem[] = [
  {
    id: 'bill-1',
    billerName: 'Meralco Commercial Power',
    company: 'MCT Kitchen',
    category: 'Electricity',
    accountNo: '0192-8837-192',
    amount: 28450,
    dueDate: '2026-10-25',
    dueDayOfMonth: 25,
    billingCycle: 'Monthly',
    reminderDaysBefore: 5,
    status: 'Unpaid',
    notes: 'Main kitchen cold storage and baking ovens commercial electricity',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'bill-2',
    billerName: 'Manila Water Commercial',
    company: 'MCT Hotel',
    category: 'Water',
    accountNo: '8821-4920-11',
    amount: 14800,
    dueDate: '2026-10-22',
    dueDayOfMonth: 22,
    billingCycle: 'Monthly',
    reminderDaysBefore: 3,
    status: 'Due Soon',
    notes: 'Hotel guest rooms and laundry facility utility consumption',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'bill-3',
    billerName: 'PLDT Enterprise Fiber 500Mbps',
    company: 'MCT Kitchen',
    category: 'Internet & Telecom',
    accountNo: '0029-4829-10',
    amount: 6500,
    dueDate: '2026-10-20',
    dueDayOfMonth: 20,
    billingCycle: 'Monthly',
    reminderDaysBefore: 3,
    status: 'Due Soon',
    notes: 'Primary leased line for point-of-sale and kitchen inventory system',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'bill-4',
    billerName: 'Prime Real Estate Lease',
    company: 'JK Cafe',
    category: 'Rent & Lease',
    accountNo: 'LEASE-JKC-2026',
    amount: 45000,
    dueDate: '2026-10-30',
    dueDayOfMonth: 30,
    billingCycle: 'Monthly',
    reminderDaysBefore: 7,
    status: 'Unpaid',
    notes: 'Commercial ground floor retail space rental fee',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'bill-5',
    billerName: 'Globe Business Postpaid Fleet',
    company: 'Speedbox',
    category: 'Internet & Telecom',
    accountNo: '9920-1102-48',
    amount: 7200,
    dueDate: '2026-10-12',
    dueDayOfMonth: 12,
    billingCycle: 'Monthly',
    reminderDaysBefore: 3,
    status: 'Overdue',
    notes: 'Driver dispatch communication and logistics GPS tracking SIMs',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'bill-6',
    billerName: 'Grand Shield Security & Janitorial',
    company: 'Merillon',
    category: 'Janitorial & Security',
    accountNo: 'SEC-MER-994',
    amount: 18500,
    dueDate: '2026-10-15',
    dueDayOfMonth: 15,
    billingCycle: 'Monthly',
    reminderDaysBefore: 5,
    status: 'Paid',
    notes: '24/7 security guard post and building sanitization',
    lastPaidDate: '2026-10-14',
    lastPaymentMethod: 'Bank Transfer',
    payments: [
      {
        id: 'pay-1',
        paymentDate: '2026-10-14',
        amount: 18500,
        paymentMethod: 'Bank Transfer',
        refNo: 'BDO-TRX-99201',
        notes: 'Paid in full via BDO online transfer',
        createdAt: '2026-10-14T10:00:00Z',
      },
    ],
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-14T10:00:00Z',
  },
  {
    id: 'bill-7',
    billerName: 'Cloud Financial Software Suite',
    company: 'MCT Kitchen',
    category: 'Software & Cloud',
    accountNo: 'SUB-MCT-ERP-01',
    amount: 5200,
    dueDate: '2026-10-08',
    dueDayOfMonth: 8,
    billingCycle: 'Monthly',
    reminderDaysBefore: 3,
    status: 'Paid',
    notes: 'Enterprise accounting, payroll, and cloud backup license',
    lastPaidDate: '2026-10-07',
    lastPaymentMethod: 'Cash',
    payments: [
      {
        id: 'pay-2',
        paymentDate: '2026-10-07',
        amount: 5200,
        paymentMethod: 'Cash',
        refNo: 'OR-882910',
        notes: 'Direct vendor collection',
        createdAt: '2026-10-07T09:30:00Z',
      },
    ],
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-07T09:30:00Z',
  },
  {
    id: 'bill-8',
    billerName: 'Commercial Fire & Asset Insurance',
    company: 'Annex Nine',
    category: 'Insurance',
    accountNo: 'INS-A9-2026',
    amount: 9800,
    dueDate: '2026-10-28',
    dueDayOfMonth: 28,
    billingCycle: 'Monthly',
    reminderDaysBefore: 7,
    status: 'Unpaid',
    notes: 'Facility property damage and comprehensive business liability insurance',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
]

function getStoredBills(): BillItem[] {
  if (typeof window === 'undefined') return INITIAL_BILLS
  try {
    const raw = localStorage.getItem(BILLS_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(INITIAL_BILLS))
      return INITIAL_BILLS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_BILLS
  } catch (err) {
    console.warn('Failed to load bills from localStorage:', err)
    return INITIAL_BILLS
  }
}

function saveBills(bills: BillItem[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(bills))
  } catch (err) {
    console.error('Failed to save bills to localStorage:', err)
  }
}

function normalizeRecurring(value: string | undefined): BillRecurring {
  if (value === 'Daily' || value === 'Yearly') return value
  return 'Monthly'
}

function getPeriodKey(dateStr: string, recurring: BillRecurring): string {
  if (recurring === 'Daily') return dateStr
  if (recurring === 'Yearly') return dateStr.slice(0, 4)
  return dateStr.slice(0, 7)
}

function getPaymentPeriodKey(payment: BillPaymentRecord, recurring: BillRecurring): string {
  return payment.periodKey || getPeriodKey(payment.paymentDate, recurring)
}

function getCurrentDueDate(
  bill: BillItem,
  todayStr: string
): string {
  const recurring = normalizeRecurring(bill.billingCycle)
  if (recurring === 'Daily') return todayStr

  const baseDate = new Date(`${bill.dueDate}T00:00:00`)
  const today = new Date(`${todayStr}T00:00:00`)
  const year = today.getFullYear()
  const month = recurring === 'Yearly' ? baseDate.getMonth() : today.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  const day = Math.min(baseDate.getDate(), lastDay)
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getBillPaymentPeriods(
  bill: BillItem,
  referenceDate = new Date()
): BillPaymentPeriod[] {
  const recurring = normalizeRecurring(bill.billingCycle)
  const periods: BillPaymentPeriod[] = []
  const count = recurring === 'Daily' ? 7 : recurring === 'Yearly' ? 5 : 12
  const referenceDateStr = referenceDate.toISOString().slice(0, 10)

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const periodDate = new Date(referenceDate)
    if (recurring === 'Daily') periodDate.setDate(periodDate.getDate() - offset)
    else if (recurring === 'Yearly') periodDate.setFullYear(periodDate.getFullYear() - offset)
    else periodDate.setMonth(periodDate.getMonth() - offset)

    const periodDateStr = periodDate.toISOString().slice(0, 10)
    const key = getPeriodKey(periodDateStr, recurring)
    const payment = (bill.payments || []).find(
      (item) => getPaymentPeriodKey(item, recurring) === key
    )

    periods.push({
      key,
      label:
        recurring === 'Daily'
          ? periodDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : recurring === 'Yearly'
          ? periodDate.toLocaleDateString(undefined, { year: 'numeric' })
          : periodDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
      paid: Boolean(payment),
      paymentDate: payment?.paymentDate,
      periodDate: periodDateStr,
      isFuture: periodDateStr > referenceDateStr,
    })
  }

  return periods
}

function getInitialPeriodDate(bill: BillItem, recurring: BillRecurring): Date {
  const dates = [
    bill.dueDate,
    bill.createdAt?.slice(0, 10),
    ...(bill.payments || []).map((payment) => payment.paymentDate),
  ].filter(Boolean) as string[]
  const earliest = dates.sort()[0] || bill.dueDate
  const date = new Date(`${earliest}T00:00:00`)
  const base = new Date(`${bill.dueDate}T00:00:00`)

  if (recurring === 'Daily') return date
  if (recurring === 'Yearly') return new Date(date.getFullYear(), base.getMonth(), base.getDate())
  return new Date(date.getFullYear(), date.getMonth(), base.getDate())
}

export function getBillPaymentOptions(
  bill: BillItem,
  referenceDate = new Date()
): { periods: BillPaymentPeriod[]; nextPayable: BillPaymentPeriod } {
  const recurring = normalizeRecurring(bill.billingCycle)
  const todayStr = referenceDate.toISOString().slice(0, 10)
  const startDate = getInitialPeriodDate(bill, recurring)
  const periods: BillPaymentPeriod[] = []
  const totalPeriods = recurring === 'Daily' ? 61 : recurring === 'Yearly' ? 11 : 37

  for (let index = 0; index < totalPeriods; index += 1) {
    let periodDate: Date
    if (recurring === 'Daily') {
      periodDate = new Date(startDate)
      periodDate.setDate(startDate.getDate() + index)
    } else if (recurring === 'Yearly') {
      periodDate = new Date(startDate)
      periodDate.setFullYear(startDate.getFullYear() + index)
    } else {
      const targetMonth = startDate.getMonth() + index
      const lastDay = new Date(startDate.getFullYear(), targetMonth + 1, 0).getDate()
      periodDate = new Date(
        startDate.getFullYear(),
        targetMonth,
        Math.min(startDate.getDate(), lastDay)
      )
    }

    const periodDateStr = periodDate.toISOString().slice(0, 10)
    const key = getPeriodKey(periodDateStr, recurring)
    const payment = (bill.payments || []).find(
      (item) => getPaymentPeriodKey(item, recurring) === key
    )
    periods.push({
      key,
      label:
        recurring === 'Daily'
          ? periodDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
          : recurring === 'Yearly'
          ? periodDate.toLocaleDateString(undefined, { year: 'numeric' })
          : periodDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      paid: Boolean(payment),
      paymentDate: payment?.paymentDate,
      periodDate: periodDateStr,
      isFuture: periodDateStr > todayStr,
    })
  }

  const nextPayable =
    periods.find((period) => !period.paid && !period.isFuture) ||
    periods.find((period) => !period.paid)

  if (!nextPayable) {
    throw new Error('No unpaid billing period is available for this bill.')
  }

  return {
    periods,
    nextPayable,
  }
}

function calculateBillStatus(bill: BillItem, todayStr: string): BillStatus {
  const nextPayable = getBillPaymentOptions(bill, new Date(`${todayStr}T00:00:00`)).nextPayable
  const due = nextPayable.periodDate || getCurrentDueDate(bill, todayStr)
  if (!due) return 'Unpaid'

  if (due < todayStr) {
    return 'Overdue'
  }

  // Calculate day difference
  const dueDateObj = new Date(due + 'T00:00:00')
  const todayObj = new Date(todayStr + 'T00:00:00')
  const diffTime = dueDateObj.getTime() - todayObj.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays >= 0 && diffDays <= (bill.reminderDaysBefore || 5)) {
    return 'Due Soon'
  }

  return 'Unpaid'
}

export const billsService = {
  async getBills(companyFilter?: string): Promise<BillItem[]> {
    const allBills = getStoredBills().map((bill) => ({
      ...bill,
      billingCycle: normalizeRecurring(bill.billingCycle),
    }))
    const today = new Date().toISOString().split('T')[0] || '2026-10-19'

    // Dynamically evaluate statuses based on current date
    const updated = allBills.map((bill) => {
      const currentStatus = calculateBillStatus(bill, today)
      return {
        ...bill,
        dueDate: getCurrentDueDate(bill, today),
        status: currentStatus,
      }
    })

    if (!companyFilter || companyFilter === 'All Companies') {
      return updated
    }
    return updated.filter(
      (b) => b.company.trim().toLowerCase() === companyFilter.trim().toLowerCase()
    )
  },

  async getBillById(id: string): Promise<BillItem | null> {
    const bills = getStoredBills()
    return bills.find((b) => b.id === id) || null
  },

  async createBill(input: NewBillInput): Promise<BillItem> {
    const bills = getStoredBills()
    const nowIso = new Date().toISOString()
    const today = nowIso.split('T')[0]

    let dueDay = input.dueDayOfMonth
    if (!dueDay && input.dueDate) {
      dueDay = parseInt(input.dueDate.split('-')[2], 10) || 1
    }

    const newBill: BillItem = {
      id: `bill-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      billerName: input.billerName.trim(),
      company: input.company.trim(),
      category: input.category.trim() || 'Others',
      accountNo: (input.accountNo || '').trim(),
      amount: Number(input.amount) || 0,
      dueDate: input.dueDate,
      dueDayOfMonth: dueDay,
      billingCycle: normalizeRecurring(input.billingCycle),
      reminderDaysBefore: input.reminderDaysBefore ?? 5,
      status: 'Unpaid',
      notes: (input.notes || '').trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    newBill.status = calculateBillStatus(newBill, today)

    const updated = [newBill, ...bills]
    saveBills(updated)
    return newBill
  },

  async updateBill(id: string, input: UpdateBillInput): Promise<BillItem> {
    const bills = getStoredBills()
    const index = bills.findIndex((b) => b.id === id)
    if (index === -1) {
      throw new Error('Bill not found')
    }

    const existing = bills[index]
    const nowIso = new Date().toISOString()
    const today = nowIso.split('T')[0]

    let dueDay = input.dueDayOfMonth ?? existing.dueDayOfMonth
    if (input.dueDate && !input.dueDayOfMonth) {
      dueDay = parseInt(input.dueDate.split('-')[2], 10) || existing.dueDayOfMonth
    }

    const updatedBill: BillItem = {
      ...existing,
      ...input,
      billerName: input.billerName !== undefined ? input.billerName.trim() : existing.billerName,
      company: input.company !== undefined ? input.company.trim() : existing.company,
      category: input.category !== undefined ? input.category.trim() : existing.category,
      accountNo: input.accountNo !== undefined ? input.accountNo.trim() : existing.accountNo,
      amount: input.amount !== undefined ? Number(input.amount) : existing.amount,
      dueDate: input.dueDate !== undefined ? input.dueDate : existing.dueDate,
      dueDayOfMonth: dueDay,
      reminderDaysBefore:
        input.reminderDaysBefore !== undefined ? input.reminderDaysBefore : existing.reminderDaysBefore,
      notes: input.notes !== undefined ? input.notes.trim() : existing.notes,
      updatedAt: nowIso,
    }

    if (input.status) {
      updatedBill.status = input.status
    } else {
      updatedBill.status = calculateBillStatus(updatedBill, today)
    }

    bills[index] = updatedBill
    saveBills(bills)
    return updatedBill
  },

  async deleteBill(id: string): Promise<boolean> {
    const bills = getStoredBills()
    const filtered = bills.filter((b) => b.id !== id)
    saveBills(filtered)
    return true
  },

  async recordPayment(
    id: string,
    payment: {
      amount: number
      paymentDate: string
      periodKey?: string
      paymentMethod: string
      refNo?: string
      notes?: string
    }
  ): Promise<BillItem> {
    const bills = getStoredBills()
    const index = bills.findIndex((b) => b.id === id)
    if (index === -1) {
      throw new Error('Bill record not found')
    }

    const bill = bills[index]
    const nowIso = new Date().toISOString()
    const paymentPeriod = getBillPaymentOptions(bill).nextPayable
    if (payment.periodKey && payment.periodKey !== paymentPeriod.key) {
      throw new Error(
        `Please settle ${paymentPeriod.label} before recording payment for another billing period.`
      )
    }

    const newPaymentRecord: BillPaymentRecord = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      periodKey: payment.periodKey || paymentPeriod.key,
      paymentDate: payment.paymentDate,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      refNo: payment.refNo,
      notes: payment.notes,
      createdAt: nowIso,
    }

    const existingPayments = bill.payments || []
    const today = nowIso.split('T')[0] || '2026-10-19'
    const updatedPayments = [newPaymentRecord, ...existingPayments]
    const latestPayment = [...updatedPayments].sort((a, b) =>
      b.paymentDate.localeCompare(a.paymentDate)
    )[0]
    const updatedBill: BillItem = {
      ...bill,
      status: 'Unpaid',
      lastPaidDate: latestPayment?.paymentDate,
      lastPaymentMethod: latestPayment?.paymentMethod,
      payments: updatedPayments,
      updatedAt: nowIso,
    }
    updatedBill.status = calculateBillStatus(updatedBill, today)

    bills[index] = updatedBill
    saveBills(bills)
    return updatedBill
  },

  async markAsUnpaid(id: string): Promise<BillItem> {
    const bills = getStoredBills()
    const index = bills.findIndex((b) => b.id === id)
    if (index === -1) {
      throw new Error('Bill not found')
    }

    const bill = bills[index]
    const today = new Date().toISOString().split('T')[0] || '2026-10-19'
    const recurring = normalizeRecurring(bill.billingCycle)
    const currentPeriod = getPeriodKey(today, recurring)
    const updatedPayments = (bill.payments || []).filter(
      (payment) => getPaymentPeriodKey(payment, recurring) !== currentPeriod
    )
    const latestPayment = [...updatedPayments].sort((a, b) =>
      b.paymentDate.localeCompare(a.paymentDate)
    )[0]
    const updatedBill: BillItem = {
      ...bill,
      payments: updatedPayments,
      status: 'Unpaid',
      lastPaidDate: latestPayment?.paymentDate,
      lastPaymentMethod: latestPayment?.paymentMethod,
      updatedAt: new Date().toISOString(),
    }
    updatedBill.status = calculateBillStatus(updatedBill, today)

    bills[index] = updatedBill
    saveBills(bills)
    return updatedBill
  },

  async markAsPaid(id: string, paymentMethod = 'Bank Transfer'): Promise<BillItem> {
    const bills = getStoredBills()
    const index = bills.findIndex((b) => b.id === id)
    if (index === -1) {
      throw new Error('Bill not found')
    }
    const bill = bills[index]
    const today = new Date().toISOString().split('T')[0] || '2026-10-19'
    return this.recordPayment(id, {
      paymentDate: today,
      amount: bill.amount,
      periodKey: getBillPaymentOptions(bill).nextPayable.key,
      paymentMethod,
      notes: 'Marked as paid',
    })
  },

  getStats(bills: BillItem[]): BillStats {
    let totalMonthlyAmount = 0
    let paidAmount = 0
    let paidCount = 0
    let unpaidAmount = 0
    let unpaidCount = 0
    let overdueCount = 0
    let overdueAmount = 0
    let dueSoonCount = 0
    let dueSoonAmount = 0

    bills.forEach((b) => {
      totalMonthlyAmount += b.amount
      if (b.status === 'Paid') {
        paidAmount += b.amount
        paidCount += 1
      } else {
        unpaidAmount += b.amount
        unpaidCount += 1

        if (b.status === 'Overdue') {
          overdueCount += 1
          overdueAmount += b.amount
        } else if (b.status === 'Due Soon') {
          dueSoonCount += 1
          dueSoonAmount += b.amount
        }
      }
    })

    return {
      totalMonthlyAmount,
      totalBillsCount: bills.length,
      paidAmount,
      paidCount,
      unpaidAmount,
      unpaidCount,
      overdueCount,
      overdueAmount,
      dueSoonCount,
      dueSoonAmount,
    }
  },

  getReminders(bills: BillItem[], todayStr: string = new Date().toISOString().split('T')[0] || '2026-10-19'): BillReminder[] {
    const reminders: BillReminder[] = []
    const todayObj = new Date(todayStr + 'T00:00:00')

    bills.forEach((b) => {
      const dueDate = getBillPaymentOptions(b, new Date(`${todayStr}T00:00:00`)).nextPayable
      if (!dueDate) return

      const dueDateValue = dueDate.periodDate || getCurrentDueDate(b, todayStr)
      const dueDateObj = new Date(dueDateValue + 'T00:00:00')
      const diffTime = dueDateObj.getTime() - todayObj.getTime()
      const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (daysDiff < 0) {
        reminders.push({
          bill: b,
          type: 'overdue',
          daysDiff: Math.abs(daysDiff),
          message: `${b.billerName} (${b.company}) was due on ${dueDateValue} (${Math.abs(daysDiff)} day${
            Math.abs(daysDiff) > 1 ? 's' : ''
          } overdue)`,
        })
      } else if (daysDiff === 0) {
        reminders.push({
          bill: b,
          type: 'due_today',
          daysDiff: 0,
          message: `${b.billerName} (${b.company}) is due TODAY!`,
        })
      } else if (daysDiff <= (b.reminderDaysBefore || 5)) {
        reminders.push({
          bill: b,
          type: 'due_soon',
          daysDiff,
          message: `${b.billerName} (${b.company}) is due in ${daysDiff} day${
            daysDiff > 1 ? 's' : ''
          } (${dueDateValue})`,
        })
      }
    })

    // Sort: overdue first, then due today, then due soon
    return reminders.sort((a, b) => {
      if (a.type === 'overdue' && b.type !== 'overdue') return -1
      if (a.type !== 'overdue' && b.type === 'overdue') return 1
      return a.daysDiff - b.daysDiff
    })
  },
}

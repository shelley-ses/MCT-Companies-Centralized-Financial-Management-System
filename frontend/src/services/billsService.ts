export interface BillPaymentRecord {
  id: string
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

export interface BillItem {
  id: string
  billerName: string
  company: string
  category: BillCategory | string
  accountNo: string
  amount: number
  dueDate: string // YYYY-MM-DD
  dueDayOfMonth?: number // e.g. 15 for 15th of the month
  billingCycle: 'Monthly' | 'Quarterly' | 'Annually'
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
  billingCycle?: 'Monthly' | 'Quarterly' | 'Annually'
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
  billingCycle?: 'Monthly' | 'Quarterly' | 'Annually'
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

function calculateBillStatus(bill: BillItem, todayStr: string = '2026-10-19'): BillStatus {
  if (bill.status === 'Paid') return 'Paid'

  const due = bill.dueDate
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
    const allBills = getStoredBills()
    const today = new Date().toISOString().split('T')[0] || '2026-10-19'

    // Dynamically evaluate statuses based on current date
    const updated = allBills.map((bill) => {
      const currentStatus = calculateBillStatus(bill, today)
      return { ...bill, status: currentStatus }
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
      billingCycle: input.billingCycle || 'Monthly',
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

    const newPaymentRecord: BillPaymentRecord = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      paymentDate: payment.paymentDate,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      refNo: payment.refNo,
      notes: payment.notes,
      createdAt: nowIso,
    }

    const existingPayments = bill.payments || []
    const updatedBill: BillItem = {
      ...bill,
      status: 'Paid',
      lastPaidDate: payment.paymentDate,
      lastPaymentMethod: payment.paymentMethod,
      payments: [newPaymentRecord, ...existingPayments],
      updatedAt: nowIso,
    }

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
    const updatedBill: BillItem = {
      ...bill,
      status: 'Unpaid',
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

  getReminders(bills: BillItem[], todayStr: string = '2026-10-19'): BillReminder[] {
    const reminders: BillReminder[] = []
    const todayObj = new Date(todayStr + 'T00:00:00')

    bills.forEach((b) => {
      if (b.status === 'Paid') return

      const dueDateObj = new Date(b.dueDate + 'T00:00:00')
      const diffTime = dueDateObj.getTime() - todayObj.getTime()
      const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (daysDiff < 0) {
        reminders.push({
          bill: b,
          type: 'overdue',
          daysDiff: Math.abs(daysDiff),
          message: `${b.billerName} (${b.company}) was due on ${b.dueDate} (${Math.abs(daysDiff)} day${
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
          } (${b.dueDate})`,
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

import { isCompanyMatch } from '@/utils/companyUtils'

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

type BackendBill = {
  bill_id: number
  company_id?: number
  company?: string
  bill_name: string
  category?: string
  account_no?: string
  amount: number | string
  recurring: 'daily' | 'monthly' | 'yearly'
  due_date: string
  next_period_date?: string
  due_date_reminder: number
  notes?: string
  status: 'unpaid' | 'paid' | 'overdue' | 'due soon' | 'partially paid'
  payments?: Array<{
    bill_payment_id: number
    period_key: string
    payment_date: string
    amount: number | string
    payment_method: string
    reference_no?: string
    notes?: string
    created_at?: string
  }>
  created_at?: string
  updated_at?: string
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

export type BillStatus = 'Unpaid' | 'Paid' | 'Overdue' | 'Due Soon' | 'Partially Paid'
export type BillRecurring = 'Daily' | 'Monthly' | 'Yearly'

export interface BillItem {
  id: string
  billerName: string
  company: string
  category?: string
  accountNo?: string
  amount: number
  dueDate: string // YYYY-MM-DD
  dueDayOfMonth?: number // e.g. 15 for 15th of the month
  initialDueDate?: string
  billingCycle: BillRecurring
  reminderDaysBefore: number // e.g. 3 days before
  status: BillStatus
  notes?: string
  lastPaidDate?: string
  lastPaymentMethod?: string
  payments?: BillPaymentRecord[]
  createdAt: string
  updatedAt: string
  auditStatus?: 'Verified' | 'Pending Audit' | 'Flagged'
  auditDate?: string
  auditedBy?: string
}

export interface NewBillInput {
  billerName: string
  company: string
  category?: string
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
  partiallyPaid?: boolean
  paidAmount?: number
  remainingAmount?: number
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
  // --- Seeded MCT Hotel Bills (Scenarios & Diverse Categories) ---
  {
    id: 'bill-htl-1',
    billerName: 'Meralco Commercial High-Tension Facility',
    company: 'MCT Hotel',
    category: 'Electricity',
    accountNo: '0188-4429-102',
    amount: 142500,
    dueDate: '2026-10-25',
    dueDayOfMonth: 25,
    billingCycle: 'Monthly',
    reminderDaysBefore: 5,
    status: 'Unpaid',
    notes: 'Main hotel building high-voltage substation, central chiller cooling towers, and elevator power',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'bill-htl-2',
    billerName: 'PLDT Enterprise Dedicated Leased Line 1Gbps',
    company: 'MCT Hotel',
    category: 'Internet & Telecom',
    accountNo: 'PLDT-HTL-99201',
    amount: 18500,
    dueDate: '2026-10-14',
    dueDayOfMonth: 14,
    billingCycle: 'Monthly',
    reminderDaysBefore: 3,
    status: 'Overdue',
    notes: 'High-speed fiber connectivity for guest Wi-Fi, banquet live streaming, and front-desk POS network',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'bill-htl-3',
    billerName: 'Grand Shield Hotel Security & Valet Force',
    company: 'MCT Hotel',
    category: 'Janitorial & Security',
    accountNo: 'SEC-HTL-4481',
    amount: 56000,
    dueDate: '2026-10-05',
    dueDayOfMonth: 5,
    billingCycle: 'Monthly',
    reminderDaysBefore: 5,
    status: 'Paid',
    notes: '24/7 lobby security post, perimeter surveillance, and VIP guest valet parking attendants',
    lastPaidDate: '2026-10-04',
    lastPaymentMethod: 'Bank Transfer',
    payments: [
      {
        id: 'pay-htl-sec-1',
        periodKey: '2026-10',
        paymentDate: '2026-10-04',
        amount: 56000,
        paymentMethod: 'Bank Transfer',
        refNo: 'BDO-SEC-88190',
        notes: 'Settled in full for October 2026 billing cycle',
        createdAt: '2026-10-04T09:30:00Z',
      },
    ],
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-04T09:30:00Z',
  },
  {
    id: 'bill-htl-4',
    billerName: 'Oracle Hospitality Opera Cloud PMS License',
    company: 'MCT Hotel',
    category: 'Software & Cloud',
    accountNo: 'OPERA-MCT-7882',
    amount: 34200,
    dueDate: '2026-10-18',
    dueDayOfMonth: 18,
    billingCycle: 'Monthly',
    reminderDaysBefore: 5,
    status: 'Paid',
    notes: 'Central reservations, guest check-in/out, and room inventory management platform (Advance Paid)',
    lastPaidDate: '2026-10-18',
    lastPaymentMethod: 'Bank Transfer',
    payments: [
      {
        id: 'pay-htl-pms-1',
        periodKey: '2026-10',
        paymentDate: '2026-10-10',
        amount: 34200,
        paymentMethod: 'Bank Transfer',
        refNo: 'BDO-OP-1001',
        notes: 'October 2026 PMS settlement',
        createdAt: '2026-10-10T11:00:00Z',
      },
      {
        id: 'pay-htl-pms-2',
        periodKey: '2026-11',
        paymentDate: '2026-10-15',
        amount: 34200,
        paymentMethod: 'Bank Transfer',
        refNo: 'BDO-OP-1002',
        notes: 'Advance settlement for November 2026',
        createdAt: '2026-10-15T14:30:00Z',
      },
      {
        id: 'pay-htl-pms-3',
        periodKey: '2026-12',
        paymentDate: '2026-10-18',
        amount: 34200,
        paymentMethod: 'Bank Transfer',
        refNo: 'BDO-OP-1003',
        notes: 'Advance settlement for December 2026',
        createdAt: '2026-10-18T16:00:00Z',
      },
    ],
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-18T16:00:00Z',
  },
  {
    id: 'bill-htl-5',
    billerName: 'Ayala Land Commercial Ground Lease',
    company: 'MCT Hotel',
    category: 'Rent & Lease',
    accountNo: 'LEASE-HTL-AYALA-01',
    amount: 185000,
    dueDate: '2026-01-15',
    initialDueDate: '2026-01-15',
    dueDayOfMonth: 15,
    billingCycle: 'Monthly',
    reminderDaysBefore: 7,
    status: 'Overdue',
    notes: 'Prime commercial hotel grounds and exterior parking facility monthly land lease (Jan 2026 paid, Feb-Oct backlog)',
    lastPaidDate: '2026-01-14',
    lastPaymentMethod: 'Cheque',
    payments: [
      {
        id: 'pay-htl-lease-1',
        periodKey: '2026-01',
        paymentDate: '2026-01-14',
        amount: 185000,
        paymentMethod: 'Cheque',
        refNo: 'CHQ-AYALA-0199',
        notes: 'January 2026 lease settled; February through October unpaid',
        createdAt: '2026-01-14T10:00:00Z',
      },
    ],
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-14T10:00:00Z',
  },
  {
    id: 'bill-htl-6',
    billerName: 'Malayan Comprehensive Hotel & Asset Insurance',
    company: 'MCT Hotel',
    category: 'Insurance',
    accountNo: 'INS-MCT-HTL-2026',
    amount: 72500,
    dueDate: '2026-11-15',
    initialDueDate: '2026-11-15',
    dueDayOfMonth: 15,
    billingCycle: 'Yearly',
    reminderDaysBefore: 15,
    status: 'Unpaid',
    notes: 'Annual commercial liability, fire safety coverage, and guest accidental injury insurance policy',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'bill-htl-7',
    billerName: 'City Treasury - Hotel Operations & Tourism Tax',
    company: 'MCT Hotel',
    category: 'Government & Taxes',
    accountNo: 'LGU-TAX-HTL-8820',
    amount: 22000,
    dueDate: '2026-10-20',
    dueDayOfMonth: 20,
    billingCycle: 'Monthly',
    reminderDaysBefore: 3,
    status: 'Due Soon',
    notes: 'Monthly local government hotel guest occupancy tax and environmental tourism levy',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'bill-htl-8',
    billerName: 'PureClean Industrial Laundry & Bedding Logistics',
    company: 'MCT Hotel',
    category: 'Others',
    accountNo: 'LAUNDRY-DAILY-992',
    amount: 3800,
    dueDate: '2026-10-19',
    initialDueDate: '2026-10-19',
    billingCycle: 'Daily',
    reminderDaysBefore: 0,
    status: 'Due Soon',
    notes: 'Daily fresh bed sheet sanitization, towel pressing, and banquet table linen turnaround service',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'bill-htl-9',
    billerName: 'Otis Elevator Philippines Preventive Service',
    company: 'MCT Hotel',
    category: 'Janitorial & Security',
    accountNo: 'OTIS-SVC-HTL-551',
    amount: 19500,
    dueDate: '2026-10-12',
    dueDayOfMonth: 12,
    billingCycle: 'Monthly',
    reminderDaysBefore: 5,
    status: 'Paid',
    notes: 'Monthly safety compliance inspection, hydraulic maintenance, and emergency hotline coverage',
    lastPaidDate: '2026-10-11',
    lastPaymentMethod: 'Bank Transfer',
    payments: [
      {
        id: 'pay-htl-otis-1',
        periodKey: '2026-09',
        paymentDate: '2026-09-11',
        amount: 19500,
        paymentMethod: 'Bank Transfer',
        refNo: 'TRX-OTIS-09',
        notes: 'September safety inspection and certification',
        createdAt: '2026-09-11T10:00:00Z',
      },
      {
        id: 'pay-htl-otis-2',
        periodKey: '2026-10',
        paymentDate: '2026-10-11',
        amount: 19500,
        paymentMethod: 'Bank Transfer',
        refNo: 'TRX-OTIS-10',
        notes: 'October regular preventive maintenance',
        createdAt: '2026-10-11T10:00:00Z',
      },
    ],
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-10-11T10:00:00Z',
  },
  {
    id: 'bill-htl-10',
    billerName: 'SiteMinder Global OTA Channel Distribution',
    company: 'MCT Hotel',
    category: 'Software & Cloud',
    accountNo: 'SM-CH-HTL-109',
    amount: 12800,
    dueDate: '2026-10-31',
    dueDayOfMonth: 31,
    billingCycle: 'Monthly',
    reminderDaysBefore: 7,
    status: 'Unpaid',
    notes: 'Real-time synchronization engine across Agoda, Booking.com, Expedia, and direct hotel bookings',
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
    if (Array.isArray(parsed) && parsed.length > 0) {
      const existingIds = new Set(parsed.map((b: BillItem) => b.id))
      const missingInitial = INITIAL_BILLS.filter((b) => !existingIds.has(b.id))
      if (missingInitial.length > 0) {
        const merged = [...parsed, ...missingInitial]
        localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(merged))
        return merged
      }
      return parsed
    }
    return INITIAL_BILLS
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

function backendHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ? sessionStorage.getItem('mct_access_token') : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function mapBackendBill(data: BackendBill): BillItem {
  const recurring =
    data.recurring === 'daily' ? 'Daily' : data.recurring === 'yearly' ? 'Yearly' : 'Monthly'
  const payments = (data.payments || []).map((payment) => ({
    id: String(payment.bill_payment_id),
    periodKey: payment.period_key,
    paymentDate: payment.payment_date,
    amount: Number(payment.amount),
    paymentMethod: payment.payment_method,
    refNo: payment.reference_no,
    notes: payment.notes,
    createdAt: payment.created_at || payment.payment_date,
  }))
  const latestPayment = payments[0]
  return {
    id: String(data.bill_id),
    billerName: data.bill_name,
    company: data.company || '',
    category: data.category,
    accountNo: data.account_no || '',
    amount: Number(data.amount),
    dueDate: data.next_period_date || data.due_date,
    dueDayOfMonth: Number((data.next_period_date || data.due_date).slice(8, 10)),
    initialDueDate: data.due_date,
    billingCycle: recurring,
    reminderDaysBefore: data.due_date_reminder,
    status:
      data.status === 'paid'
        ? 'Paid'
        : data.status === 'overdue'
        ? 'Overdue'
        : data.status === 'due soon'
        ? 'Due Soon'
        : 'Unpaid',
    notes: data.notes || '',
    lastPaidDate: latestPayment?.paymentDate,
    lastPaymentMethod: latestPayment?.paymentMethod,
    payments,
    createdAt: data.created_at || new Date().toISOString(),
    updatedAt: data.updated_at || new Date().toISOString(),
  }
}

async function getBackendError(response: Response): Promise<Error> {
  const body = await response.json().catch(() => ({}))
  return new Error(
    typeof body.detail === 'string' ? body.detail : `Bills request failed (${response.status}).`
  )
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

  const baseDate = new Date(`${bill.initialDueDate || bill.dueDate}T00:00:00`)
  const today = new Date(`${todayStr}T00:00:00`)
  const year = today.getFullYear()
  const month = recurring === 'Yearly' ? baseDate.getMonth() : today.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  const day = Math.min(baseDate.getDate() || 1, lastDay)
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getInitialPeriodDate(bill: BillItem, recurring: BillRecurring): Date {
  const paymentDates: string[] = []
  for (const p of bill.payments || []) {
    if (p.paymentDate) paymentDates.push(p.paymentDate)
    if (p.periodKey) {
      if (recurring === 'Monthly' && /^\d{4}-\d{2}$/.test(p.periodKey)) {
        paymentDates.push(`${p.periodKey}-01`)
      } else if (recurring === 'Yearly' && /^\d{4}$/.test(p.periodKey)) {
        paymentDates.push(`${p.periodKey}-01-01`)
      } else if (recurring === 'Daily' && /^\d{4}-\d{2}-\d{2}$/.test(p.periodKey)) {
        paymentDates.push(p.periodKey)
      }
    }
  }

  const candidateDates = [
    bill.initialDueDate,
    bill.dueDate,
    bill.createdAt?.slice(0, 10),
    ...paymentDates,
  ].filter(Boolean) as string[]

  const earliest = candidateDates.sort()[0] || bill.dueDate
  let date = new Date(`${earliest}T00:00:00`)
  const baseDateStr = bill.initialDueDate || bill.dueDate
  const base = new Date(`${baseDateStr}T00:00:00`)
  const day = !isNaN(base.getDate()) ? base.getDate() : 1

  // Clamp starting date to 2025 onwards
  if (date.getFullYear() < 2025) {
    date = new Date(2025, 0, Math.min(day, 28))
  }

  if (recurring === 'Daily') return date
  if (recurring === 'Yearly') return new Date(date.getFullYear(), base.getMonth() || 0, day)
  return new Date(date.getFullYear(), date.getMonth(), day)
}

export function getBillPaymentOptions(
  bill: BillItem,
  referenceDate = new Date()
): { periods: BillPaymentPeriod[]; nextPayable: BillPaymentPeriod } {
  const recurring = normalizeRecurring(bill.billingCycle)
  const todayStr = referenceDate.toISOString().slice(0, 10)
  const currentPeriodKey = getPeriodKey(todayStr, recurring)
  const startDate = getInitialPeriodDate(bill, recurring)
  const periods: BillPaymentPeriod[] = []

  // Collect all paid period keys to ensure none are truncated
  const paidPeriodKeys = new Set(
    (bill.payments || []).map((p) => getPaymentPeriodKey(p, recurring))
  )

  const minFutureCount = recurring === 'Daily' ? 14 : recurring === 'Yearly' ? 5 : 12
  let futureCount = 0
  let index = 0
  const maxIterations = recurring === 'Daily' ? 366 : recurring === 'Yearly' ? 25 : 84

  while (index < maxIterations) {
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
    const isFuture = key > currentPeriodKey

    // Only include periods from 2025 onwards
    if (periodDateStr >= '2025-01-01' || key >= '2025-01') {
      const paymentsForPeriod = (bill.payments || []).filter(
        (item) => getPaymentPeriodKey(item, recurring) === key
      )
      const paidAmount = paymentsForPeriod.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0
      )
      const isPaid = paidAmount >= (bill.amount - 0.009)
      const isPartiallyPaid = !isPaid && paidAmount > 0
      const remainingAmount = isPaid ? 0 : Math.max(0, bill.amount - paidAmount)
      const latestPayment = paymentsForPeriod.sort((a, b) =>
        (b.paymentDate || '').localeCompare(a.paymentDate || '')
      )[0]

      periods.push({
        key,
        label:
          recurring === 'Daily'
            ? periodDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : recurring === 'Yearly'
            ? periodDate.toLocaleDateString(undefined, { year: 'numeric' })
            : periodDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
        paid: isPaid,
        partiallyPaid: isPartiallyPaid,
        paidAmount,
        remainingAmount,
        paymentDate: latestPayment?.paymentDate,
        periodDate: periodDateStr,
        isFuture,
      })
    }

    if (isFuture) {
      futureCount += 1
      const hasUnprocessedPaidFuture = Array.from(paidPeriodKeys).some((paidKey) => paidKey > key)
      if (futureCount >= minFutureCount && !hasUnprocessedPaidFuture) {
        break
      }
    }

    index += 1
  }

  // Next required period:
  // 1. The oldest unpaid or partially paid past or current period (chronological backlog settlement)
  // 2. If all past & current are fully paid, the earliest unpaid future period (advance payment)
  const oldestUnpaidPastOrCurrent = periods.find(
    (period) => !period.paid && !period.isFuture
  )
  const nextAdvancePeriod = periods.find(
    (period) => !period.paid && period.isFuture
  )

  const nextPayable =
    oldestUnpaidPastOrCurrent ||
    nextAdvancePeriod ||
    periods[periods.length - 1]

  if (!nextPayable) {
    throw new Error('No billing period is available for this bill.')
  }

  return {
    periods,
    nextPayable,
  }
}

export function getBillPaymentPeriods(
  bill: BillItem,
  referenceDate = new Date()
): BillPaymentPeriod[] {
  return getBillPaymentOptions(bill, referenceDate).periods
}

function calculateBillStatus(bill: BillItem, todayStr: string): BillStatus {
  const options = getBillPaymentOptions(bill, new Date(`${todayStr}T00:00:00`))
  
  // Identify if there is any unpaid period up to the current billing period
  const oldestUnpaidPastOrCurrent = options.periods.find(
    (p) => !p.paid && !p.isFuture
  )

  // If all past and current periods are paid, the bill obligation is fulfilled
  if (!oldestUnpaidPastOrCurrent) {
    return 'Paid'
  }

  if (oldestUnpaidPastOrCurrent.partiallyPaid) {
    return 'Partially Paid'
  }

  const due = oldestUnpaidPastOrCurrent.periodDate || bill.dueDate
  if (due < todayStr) {
    return 'Overdue'
  }

  // Calculate day difference for current period
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
    try {
      const query = companyFilter && companyFilter !== 'All Companies'
        ? `?company_name=${encodeURIComponent(companyFilter)}`
        : ''
      const response = await fetch(`/api/v1/bills${query}`, { headers: backendHeaders() })
      if (response.ok) {
        const mapped = (await response.json()).map(mapBackendBill)
        saveBills(mapped)
        return mapped
      }
    } catch (error) {
      console.warn('Backend GET /bills failed; using local bill storage.', error)
    }

    const allBills = getStoredBills().map((bill) => ({
      ...bill,
      billingCycle: normalizeRecurring(bill.billingCycle),
    }))
    const today = new Date().toISOString().split('T')[0] || '2026-10-19'

    // Dynamically evaluate statuses based on current date
    const updated = allBills.map((bill) => {
      const currentStatus = calculateBillStatus(bill, today)
      const options = getBillPaymentOptions(bill, new Date(`${today}T00:00:00`))
      return {
        ...bill,
        initialDueDate: bill.initialDueDate || bill.dueDate,
        dueDate: options.nextPayable.periodDate || bill.dueDate,
        status: currentStatus,
      }
    })

    if (!companyFilter || companyFilter === 'All Companies') {
      return updated
    }
    return updated.filter((b) => isCompanyMatch(b.company, companyFilter))
  },

  async getBillById(id: string): Promise<BillItem | null> {
    const bills = getStoredBills()
    return bills.find((b) => b.id === id) || null
  },

  async createBill(input: NewBillInput): Promise<BillItem> {
    try {
      const response = await fetch('/api/v1/bills', {
        method: 'POST',
        headers: backendHeaders(),
        body: JSON.stringify({
          company: input.company,
          bill_name: input.billerName,
          amount: input.amount,
          recurring: (input.billingCycle || 'Monthly').toLowerCase(),
          due_date: input.dueDate,
          due_date_reminder: input.reminderDaysBefore ?? 5,
          notes: input.notes || null,
        }),
      })
      if (response.ok) return mapBackendBill(await response.json())
      throw await getBackendError(response)
    } catch (error: any) {
      if (error?.message && !error.message.includes('fetch')) throw error
      console.warn('Backend POST /bills failed; creating local bill.', error)
    }

    const bills = getStoredBills()
    const isDuplicate = bills.some(
      (b) =>
        b.company.toLowerCase() === input.company.trim().toLowerCase() &&
        b.billerName.trim().toLowerCase() === input.billerName.trim().toLowerCase()
    )
    if (isDuplicate) {
      throw new Error(
        `A bill with provider name "${input.billerName.trim()}" already exists for ${input.company}. Duplicate biller names are not allowed.`
      )
    }

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
    try {
      const payload: Record<string, unknown> = {}
      if (input.billerName !== undefined) payload.bill_name = input.billerName
      if (input.company !== undefined) payload.company = input.company
      if (input.amount !== undefined) payload.amount = input.amount
      if (input.billingCycle !== undefined) payload.recurring = input.billingCycle.toLowerCase()
      if (input.dueDate !== undefined) payload.due_date = input.dueDate
      if (input.reminderDaysBefore !== undefined) payload.due_date_reminder = input.reminderDaysBefore
      if (input.notes !== undefined) payload.notes = input.notes

      const response = await fetch(`/api/v1/bills/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: backendHeaders(),
        body: JSON.stringify(payload),
      })
      if (response.ok) return mapBackendBill(await response.json())
      throw await getBackendError(response)
    } catch (error: any) {
      if (error?.message && !error.message.includes('fetch')) throw error
      console.warn('Backend PATCH /bills failed; updating local bill.', error)
    }

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
    try {
      const response = await fetch(`/api/v1/bills/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: backendHeaders(),
      })
      if (response.ok) return true
      throw await getBackendError(response)
    } catch (error: any) {
      if (error?.message && !error.message.includes('fetch')) throw error
      console.warn('Backend DELETE /bills failed; deleting local bill.', error)
    }

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
    try {
      const response = await fetch(`/api/v1/bills/${encodeURIComponent(id)}/payments`, {
        method: 'POST',
        headers: backendHeaders(),
        body: JSON.stringify({
          period_key: payment.periodKey,
          payment_date: payment.paymentDate,
          amount: payment.amount,
          payment_method: payment.paymentMethod,
          reference_no: payment.refNo || null,
          notes: payment.notes || null,
        }),
      })
      if (response.ok) return mapBackendBill(await response.json())
      throw await getBackendError(response)
    } catch (error: any) {
      if (error?.message && !error.message.includes('fetch')) throw error
      console.warn('Backend POST /bills/payment failed; recording local payment.', error)
    }

    const bills = getStoredBills()
    const index = bills.findIndex((b) => b.id === id)
    if (index === -1) {
      throw new Error('Bill record not found')
    }

    const bill = bills[index]
    const nowIso = new Date().toISOString()
    const paymentPeriod = getBillPaymentOptions(bill).nextPayable
    const targetPeriodKey = payment.periodKey || paymentPeriod.key

    const existingPayments = bill.payments || []
    const existingPeriodPayment = existingPayments.find((p) => p.periodKey === targetPeriodKey)
    const alreadyPaid = existingPeriodPayment ? existingPeriodPayment.amount : 0
    const remaining = Math.max(0, bill.amount - alreadyPaid)
    if (payment.amount > remaining + 0.01) {
      throw new Error(`Amount paid cannot be greater than the Monthly Bill Amount or remaining balance (${remaining}).`)
    }

    const newPaymentRecord: BillPaymentRecord = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      periodKey: targetPeriodKey,
      paymentDate: payment.paymentDate,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      refNo: payment.refNo,
      notes: payment.notes,
      createdAt: nowIso,
    }

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
    try {
      const response = await fetch(`/api/v1/bills/${encodeURIComponent(id)}/latest-payment`, {
        method: 'DELETE',
        headers: backendHeaders(),
      })
      if (response.ok) return mapBackendBill(await response.json())
      throw await getBackendError(response)
    } catch (error: any) {
      if (error?.message && !error.message.includes('fetch')) throw error
      console.warn('Backend DELETE /bills/latest-payment failed; updating local bill.', error)
    }

    const bills = getStoredBills()
    const index = bills.findIndex((b) => b.id === id)
    if (index === -1) {
      throw new Error('Bill not found')
    }

    const bill = bills[index]
    const today = new Date().toISOString().split('T')[0] || '2026-10-19'
    const payments = bill.payments || []
    if (payments.length === 0) return bill

    // Remove the latest recorded payment
    const sorted = [...payments].sort((a, b) =>
      (b.createdAt || b.paymentDate).localeCompare(a.createdAt || a.paymentDate)
    )
    const latestPaymentId = sorted[0].id
    const updatedPayments = payments.filter((payment) => payment.id !== latestPaymentId)
    const latestPayment = [...updatedPayments].sort((a, b) =>
      (b.createdAt || b.paymentDate).localeCompare(a.createdAt || a.paymentDate)
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

  exportCsv(bills: BillItem[], filename = 'monthly_bills_report.csv') {
    const headers = [
      'Biller Name',
      'Company',
      'Category',
      'Account No',
      'Amount',
      'Due Date',
      'Billing Cycle',
      'Status',
      'Notes',
    ]

    const rows = bills.map((b) => [
      `"${(b.billerName || '').replace(/"/g, '""')}"`,
      `"${(b.company || '').replace(/"/g, '""')}"`,
      `"${(b.category || '').replace(/"/g, '""')}"`,
      `"${(b.accountNo || '').replace(/"/g, '""')}"`,
      b.amount,
      b.dueDate,
      b.billingCycle,
      b.status,
      `"${(b.notes || '').replace(/"/g, '""')}"`,
    ])

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },
}

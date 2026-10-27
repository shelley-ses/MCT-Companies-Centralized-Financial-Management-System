import { normalizeDateToYYYYMMDD } from '@/utils/dateUtils'
import { salesService } from './salesService'
import { expenseService } from './expenseService'
import { generateDashboardDummyTransactions } from './dashboardDummyData'
import type { ParticularItem } from '@/utils/particularsUtils'

let cachedDummyTransactions: DashboardTransactionItem[] | null = null
function getDummyTransactions(): DashboardTransactionItem[] {
  if (!cachedDummyTransactions) {
    cachedDummyTransactions = generateDashboardDummyTransactions()
  }
  return cachedDummyTransactions
}

export interface DashboardKpis {
  totalSales: number
  totalExpense: number
  totalLoan: number
  overdueLoans: number
  dueSoon: number
}

export interface WeeklySalesPoint {
  day: string
  shortDay: string
  amount: number
}

export interface ExpenseBreakdownPoint {
  id: string
  label: string
  amount: number
  color: string
}

export interface CompanyIncomePoint {
  rank: number
  company: string
  score: number
  amount: number
}

export type AuditStatus = 'Verified' | 'Pending Audit' | 'Flagged'

export type TransactionCategory =
  | 'Petty Cash'
  | 'Rendered Fee'
  | 'BBMP Foundation'
  | 'HDMF'
  | 'Philhealth'
  | 'Electricity'
  | 'BIR'
  | 'Payroll'
  | 'SSS'
  | 'Hotel Supplies'
  | 'Revolving Funds'
  | string

export interface DashboardTransactionItem {
  id: string
  refNo: string
  chequeNo?: string
  date: string // e.g. "October 1, 2026" or "2026-10-01"
  type: 'Expense' | 'Sales' | 'Loan' | 'Income'
  company: string
  description: string
  particulars?: string
  amount: number
  withdrawal: number
  deposit: number
  category: TransactionCategory
  paymentMethod?: string
  status: 'Paid' | 'Pending' | 'Overdue' | 'Partially Paid' | 'On hold' | 'Unpaid'
  auditStatus: AuditStatus
  auditedBy?: string
  auditNotes?: string
  auditDate?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  attachments?: string[]
  items?: ParticularItem[]
}

export interface DashboardData {
  kpis: DashboardKpis
  weeklySales: WeeklySalesPoint[]
  expenses: ExpenseBreakdownPoint[]
  companyIncome: CompanyIncomePoint[]
  recentTransactions: DashboardTransactionItem[]
}

const INITIAL_WEEKLY_SALES: WeeklySalesPoint[] = [
  { day: 'Monday', shortDay: 'Mon', amount: 300000 },
  { day: 'Tuesday', shortDay: 'Tue', amount: 430000 },
  { day: 'Wednesday', shortDay: 'Wed', amount: 180000 },
  { day: 'Thursday', shortDay: 'Thu', amount: 260000 },
  { day: 'Friday', shortDay: 'Fri', amount: 320000 },
  { day: 'Saturday', shortDay: 'Sat', amount: 270000 },
  { day: 'Sunday', shortDay: 'Sun', amount: 140000 },
]

const INITIAL_EXPENSES: ExpenseBreakdownPoint[] = [
  { id: 'interest', label: 'Interest', amount: 45000, color: '#960C01' },
  { id: 'electricity', label: 'Electricity', amount: 75000, color: '#C5C8CE' },
]

const INITIAL_COMPANY_INCOME: CompanyIncomePoint[] = [
  { rank: 1, company: 'MCT Kitchen', score: 9, amount: 980000 },
  { rank: 2, company: 'MCT Hotel', score: 8, amount: 850000 },
  { rank: 3, company: 'JK Cafe', score: 7, amount: 720000 },
  { rank: 4, company: 'Annex Nine', score: 6, amount: 610000 },
  { rank: 5, company: 'Merillon', score: 5, amount: 530000 },
  { rank: 6, company: 'JK Printing', score: 4, amount: 440000 },
  { rank: 7, company: 'Speedbox', score: 3, amount: 320000 },
  { rank: 8, company: 'JK Property and Ventures', score: 2, amount: 210000 },
  { rank: 9, company: 'Golden Sunburst Ventures', score: 1, amount: 110000 },
]

const inMemoryTransactions: DashboardTransactionItem[] = [
  {
    id: 'tx_1',
    refNo: 'REF-202610-101',
    chequeNo: 'CHK-99201',
    date: 'October 1, 2026',
    type: 'Expense',
    company: 'MCT Kitchen',
    description: 'Commercial Kitchen Utilities & Gas',
    particulars: 'Commercial Kitchen Utilities & Gas',
    amount: 9000,
    withdrawal: 9000,
    deposit: 0,
    category: 'In-house',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Invoice and receipt verified against Meralco statement.',
    auditDate: '2026-10-02 14:15',
    createdBy: 'Finance Officer (Maria Santos)',
    createdAt: '2026-10-01 08:30',
    updatedAt: '2026-10-02 14:15',
    attachments: ['Meralco_Sept2026_Receipt.pdf', 'GasSupply_Voucher.pdf'],
  },
  {
    id: 'tx_2',
    refNo: 'REF-202610-102',
    chequeNo: 'CHK-99202',
    date: 'October 2, 2026',
    type: 'Sales',
    company: 'MCT Kitchen',
    description: 'Weekend Corporate Banquet Catering',
    particulars: 'Weekend Corporate Banquet Catering',
    amount: 42500,
    withdrawal: 0,
    deposit: 42500,
    category: 'GCash',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Bank deposit confirmation received and cross-matched.',
    auditDate: '2026-10-03 09:30',
    createdBy: 'Catering Lead (David Ramos)',
    createdAt: '2026-10-02 11:45',
    updatedAt: '2026-10-03 09:30',
    attachments: ['GCash_Transfer_Slip_42500.jpg'],
  },
  {
    id: 'tx_3',
    refNo: 'REF-202610-103',
    chequeNo: 'CHK-99203',
    date: 'October 3, 2026',
    type: 'Expense',
    company: 'MCT Kitchen',
    description: 'Fresh Produce & Seafood Wholesale Supplies',
    particulars: 'Fresh Produce & Seafood Wholesale Supplies',
    amount: 15200,
    withdrawal: 15200,
    deposit: 0,
    category: 'Maya',
    status: 'Paid',
    auditStatus: 'Pending Audit',
    auditNotes: 'Awaiting supplier delivery receipt countersignature.',
    createdBy: 'Inventory Head (Carlos Dizon)',
    createdAt: '2026-10-03 07:15',
    updatedAt: '2026-10-03 07:20',
    attachments: ['Seafood_Invoice_492.pdf'],
  },
  {
    id: 'tx_4',
    refNo: 'REF-202610-104',
    chequeNo: 'CHK-99204',
    date: 'October 4, 2026',
    type: 'Loan',
    company: 'MCT Kitchen',
    description: 'Kitchen Heavy Equipment Term Installment',
    particulars: 'Kitchen Heavy Equipment Term Installment',
    amount: 25000,
    withdrawal: 25000,
    deposit: 0,
    category: 'In-house',
    status: 'Pending',
    auditStatus: 'Flagged',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Variance detected between amortization schedule and billed interest rate.',
    auditDate: '2026-10-04 16:40',
    createdBy: 'Accounting Specialist (Elena Gomez)',
    createdAt: '2026-10-04 10:00',
    updatedAt: '2026-10-04 16:40',
    attachments: ['Amortization_Schedule_2026.pdf'],
  },
  {
    id: 'tx_5',
    refNo: 'REF-202610-105',
    chequeNo: 'CHK-99205',
    date: 'October 5, 2026',
    type: 'Sales',
    company: 'MCT Kitchen',
    description: 'Daily Dining Room & Walk-in Receipts',
    particulars: 'Daily Dining Room & Walk-in Receipts',
    amount: 38000,
    withdrawal: 0,
    deposit: 38000,
    category: 'PayMongo',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'POS end-of-day register tape matches credit terminal batches.',
    auditDate: '2026-10-05 21:00',
    createdBy: 'Head Cashier (Angela Reyes)',
    createdAt: '2026-10-05 20:30',
    updatedAt: '2026-10-05 21:00',
    attachments: ['POS_EOD_Oct05.pdf', 'PayMongo_Batch_Settlement.pdf'],
  },
  {
    id: 'tx_6',
    refNo: 'REF-202610-201',
    chequeNo: 'CHK-88101',
    date: 'October 2, 2026',
    type: 'Expense',
    company: 'MCT Hotel',
    description: 'Main Facility Electricity Bill',
    particulars: 'Main Facility Electricity Bill',
    amount: 24000,
    withdrawal: 24000,
    deposit: 0,
    category: 'In-house',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Remi Lee',
    auditNotes: 'Utility voucher cleared by Head of Audit.',
    auditDate: '2026-10-03 11:20',
    createdBy: 'Hotel General Admin (Paul Tan)',
    createdAt: '2026-10-02 09:10',
    updatedAt: '2026-10-03 11:20',
    attachments: ['Hotel_Meralco_Oct2026.pdf'],
  },
  {
    id: 'tx_7',
    refNo: 'REF-202610-202',
    chequeNo: 'CHK-88102',
    date: 'October 3, 2026',
    type: 'Sales',
    company: 'MCT Hotel',
    description: 'Deluxe Suite Weekend Bookings',
    particulars: 'Deluxe Suite Weekend Bookings',
    amount: 85000,
    withdrawal: 0,
    deposit: 85000,
    category: 'PayMongo',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Remi Lee',
    auditNotes: 'PMS reservation report and credit transactions audited.',
    auditDate: '2026-10-04 10:15',
    createdBy: 'Front Desk Manager (Chloe Lin)',
    createdAt: '2026-10-03 18:00',
    updatedAt: '2026-10-04 10:15',
    attachments: ['PMS_Revenue_Batch_03.pdf'],
  },
  {
    id: 'tx_8',
    refNo: 'REF-202610-301',
    chequeNo: 'CHK-77401',
    date: 'October 4, 2026',
    type: 'Expense',
    company: 'JK Cafe',
    description: 'Artisan Coffee Beans & Dairy Consumables',
    particulars: 'Artisan Coffee Beans & Dairy Consumables',
    amount: 14500,
    withdrawal: 14500,
    deposit: 0,
    category: 'Maya',
    status: 'Paid',
    auditStatus: 'Pending Audit',
    createdBy: 'Cafe Manager (Marco Sy)',
    createdAt: '2026-10-04 08:00',
    updatedAt: '2026-10-04 08:00',
    attachments: [],
  },
  {
    id: 'tx_9',
    refNo: 'REF-202610-401',
    chequeNo: 'CHK-66301',
    date: 'October 5, 2026',
    type: 'Loan',
    company: 'JK Printing',
    description: 'High-Capacity Offset Press Loan Amortization',
    particulars: 'High-Capacity Offset Press Loan Amortization',
    amount: 32000,
    withdrawal: 32000,
    deposit: 0,
    category: 'In-house',
    status: 'Pending',
    auditStatus: 'Flagged',
    auditedBy: 'Remi Lee',
    auditNotes: 'Bank debit confirmation slip not yet uploaded.',
    auditDate: '2026-10-05 17:00',
    createdBy: 'Operations Lead (Gerry Villanueva)',
    createdAt: '2026-10-05 14:00',
    updatedAt: '2026-10-05 17:00',
    attachments: [],
  },
  {
    id: 'tx_10',
    refNo: 'REF-202610-106',
    chequeNo: 'CHK-99206',
    date: 'October 6, 2026',
    type: 'Sales',
    company: 'MCT Kitchen',
    description: 'Food Delivery Platform Gross Orders',
    particulars: 'Food Delivery Platform Gross Orders',
    amount: 31200,
    withdrawal: 0,
    deposit: 31200,
    category: 'Panda',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Panda merchant payout reconciliation matching.',
    auditDate: '2026-10-06 18:30',
    createdBy: 'Online Dispatcher (Ryan Del Rosario)',
    createdAt: '2026-10-06 17:00',
    updatedAt: '2026-10-06 18:30',
    attachments: ['Panda_Settlement_Oct06.pdf'],
  },
  {
    id: 'tx_11',
    refNo: 'REF-202610-107',
    chequeNo: 'CHK-99207',
    date: 'October 7, 2026',
    type: 'Expense',
    company: 'MCT Kitchen',
    description: 'Biodegradable Takeout Containers & Packaging',
    particulars: 'Biodegradable Takeout Containers & Packaging',
    amount: 11800,
    withdrawal: 11800,
    deposit: 0,
    category: 'Panda',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Vendor receipt and eco-packaging certification verified.',
    auditDate: '2026-10-07 10:15',
    createdBy: 'Procurement Specialist (Janice Lim)',
    createdAt: '2026-10-07 09:00',
    updatedAt: '2026-10-07 10:15',
    attachments: ['EcoPack_Receipt_107.pdf'],
  },
  {
    id: 'tx_12',
    refNo: 'REF-202610-108',
    chequeNo: 'CHK-99208',
    date: 'October 8, 2026',
    type: 'Sales',
    company: 'MCT Kitchen',
    description: 'Corporate Executive Lunch Reservation Advance',
    particulars: 'Corporate Executive Lunch Reservation Advance',
    amount: 48000,
    withdrawal: 0,
    deposit: 48000,
    category: 'Maya',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Client wire transfer confirmed via Maya business portal.',
    auditDate: '2026-10-08 14:00',
    createdBy: 'Catering Lead (David Ramos)',
    createdAt: '2026-10-08 11:30',
    updatedAt: '2026-10-08 14:00',
    attachments: ['Maya_Corporate_Receipt_48k.jpg'],
  },
  {
    id: 'tx_13',
    refNo: 'REF-202610-109',
    chequeNo: 'CHK-99209',
    date: 'October 9, 2026',
    type: 'Expense',
    company: 'MCT Kitchen',
    description: 'Commercial Beverage Restocking & Syrups',
    particulars: 'Commercial Beverage Restocking & Syrups',
    amount: 8700,
    withdrawal: 8700,
    deposit: 0,
    category: 'GCash',
    status: 'Paid',
    auditStatus: 'Pending Audit',
    createdBy: 'Bar Manager (Leo Martinez)',
    createdAt: '2026-10-09 13:20',
    updatedAt: '2026-10-09 13:20',
    attachments: [],
  },
  {
    id: 'tx_14',
    refNo: 'REF-202610-110',
    chequeNo: 'CHK-99210',
    date: 'October 10, 2026',
    type: 'Sales',
    company: 'MCT Kitchen',
    description: 'Evening Dining Service Credit Gateway Receipts',
    particulars: 'Evening Dining Service Credit Gateway Receipts',
    amount: 52000,
    withdrawal: 0,
    deposit: 52000,
    category: 'GCash',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Terminal totals match nightly register closure statement.',
    auditDate: '2026-10-10 22:30',
    createdBy: 'Head Cashier (Angela Reyes)',
    createdAt: '2026-10-10 22:00',
    updatedAt: '2026-10-10 22:30',
    attachments: ['EOD_Batch_Slip_Oct10.pdf'],
  },
  {
    id: 'tx_15',
    refNo: 'REF-202610-203',
    chequeNo: 'CHK-88103',
    date: 'October 6, 2026',
    type: 'Sales',
    company: 'MCT Hotel',
    description: 'Grand Ballroom Annual Conference Banquet',
    particulars: 'Grand Ballroom Annual Conference Banquet',
    amount: 72000,
    withdrawal: 0,
    deposit: 72000,
    category: 'In-house',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Remi Lee',
    auditNotes: 'Corporate account invoiced and official receipt generated.',
    auditDate: '2026-10-07 09:45',
    createdBy: 'Events Director (Melissa Co)',
    createdAt: '2026-10-06 16:00',
    updatedAt: '2026-10-07 09:45',
    attachments: ['OR_77291_Ballroom.pdf'],
  },
  {
    id: 'tx_16',
    refNo: 'REF-202610-302',
    chequeNo: 'CHK-77402',
    date: 'October 7, 2026',
    type: 'Sales',
    company: 'JK Cafe',
    description: 'Weekend Artisan Bakery & Espresso Counter',
    particulars: 'Weekend Artisan Bakery & Espresso Counter',
    amount: 28500,
    withdrawal: 0,
    deposit: 28500,
    category: 'GCash',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Remi Lee',
    auditNotes: 'Daily sales verified with cash registry.',
    auditDate: '2026-10-08 08:30',
    createdBy: 'Cafe Manager (Marco Sy)',
    createdAt: '2026-10-07 20:00',
    updatedAt: '2026-10-08 08:30',
    attachments: ['Cafe_Register_ZReport.pdf'],
  },
  {
    id: 'tx_17',
    refNo: 'REF-202610-111',
    chequeNo: 'CHK-99211',
    date: 'October 4, 2026',
    type: 'Expense',
    company: 'MCT Kitchen',
    description: 'Kitchen Hood Deep Sanitation & Maintenance',
    particulars: 'Kitchen Hood Deep Sanitation & Maintenance',
    amount: 14000,
    withdrawal: 14000,
    deposit: 0,
    category: 'PayMongo',
    status: 'Overdue',
    auditStatus: 'Flagged',
    auditNotes: 'Invoice dispute regarding technician labor hours.',
    createdBy: 'Facilities Lead (Arthur Torres)',
    createdAt: '2026-10-04 11:00',
    updatedAt: '2026-10-04 16:00',
    attachments: ['Maintenance_WorkOrder_DISPUTED.pdf'],
  },
  {
    id: 'tx_18',
    refNo: 'REF-202610-501',
    chequeNo: 'CHK-55101',
    date: 'October 3, 2026',
    type: 'Sales',
    company: 'Annex Nine',
    description: 'Retail Boutique Weekend Gross Collections',
    particulars: 'Retail Boutique Weekend Gross Collections',
    amount: 64000,
    withdrawal: 0,
    deposit: 64000,
    category: 'PayMongo',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Verified against merchant settlement batch report.',
    auditDate: '2026-10-04 10:00',
    createdBy: 'Store Manager (Carla Ocampo)',
    createdAt: '2026-10-03 21:00',
    updatedAt: '2026-10-04 10:00',
    attachments: ['Annex9_Settlement_Oct03.pdf'],
  },
  {
    id: 'tx_19',
    refNo: 'REF-202610-502',
    chequeNo: 'CHK-55102',
    date: 'October 6, 2026',
    type: 'Expense',
    company: 'Annex Nine',
    description: 'Commercial Storefront Air Conditioning Service',
    particulars: 'Commercial Storefront Air Conditioning Service',
    amount: 18500,
    withdrawal: 18500,
    deposit: 0,
    category: 'In-house',
    status: 'Paid',
    auditStatus: 'Pending Audit',
    createdBy: 'Operations Admin (Jerome Chua)',
    createdAt: '2026-10-06 14:00',
    updatedAt: '2026-10-06 14:00',
    attachments: [],
  },
  {
    id: 'tx_20',
    refNo: 'REF-202610-601',
    chequeNo: 'CHK-44101',
    date: 'October 4, 2026',
    type: 'Sales',
    company: 'Merillon',
    description: 'Corporate Fleet Dispatch & Delivery Revenue',
    particulars: 'Corporate Fleet Dispatch & Delivery Revenue',
    amount: 58000,
    withdrawal: 0,
    deposit: 58000,
    category: 'Maya',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Remi Lee',
    auditNotes: 'Direct bank deposit verified.',
    auditDate: '2026-10-05 09:30',
    createdBy: 'Fleet Coordinator (Mark Salazar)',
    createdAt: '2026-10-04 18:30',
    updatedAt: '2026-10-05 09:30',
    attachments: ['Merillon_BankDep_Oct04.pdf'],
  },
  {
    id: 'tx_21',
    refNo: 'REF-202610-602',
    chequeNo: 'CHK-44102',
    date: 'October 8, 2026',
    type: 'Expense',
    company: 'Merillon',
    description: 'Fleet Diesel Bulk Procurement & Fuel Cards',
    particulars: 'Fleet Diesel Bulk Procurement & Fuel Cards',
    amount: 36000,
    withdrawal: 36000,
    deposit: 0,
    category: 'GCash',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Remi Lee',
    auditNotes: 'Fuel card receipts matched with Shell billing statement.',
    auditDate: '2026-10-09 11:00',
    createdBy: 'Procurement Specialist (Janice Lim)',
    createdAt: '2026-10-08 16:00',
    updatedAt: '2026-10-09 11:00',
    attachments: ['Shell_Billing_Oct08.pdf'],
  },
  {
    id: 'tx_22',
    refNo: 'REF-202610-701',
    chequeNo: 'CHK-33101',
    date: 'October 5, 2026',
    type: 'Sales',
    company: 'Speedbox',
    description: 'Same-day Express Logistics Customer Billing',
    particulars: 'Same-day Express Logistics Customer Billing',
    amount: 41000,
    withdrawal: 0,
    deposit: 41000,
    category: 'GCash',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditDate: '2026-10-06 10:15',
    createdBy: 'Operations Dispatcher (Leo Martinez)',
    createdAt: '2026-10-05 19:00',
    updatedAt: '2026-10-06 10:15',
    attachments: [],
  },
  {
    id: 'tx_23',
    refNo: 'REF-202610-702',
    chequeNo: 'CHK-33102',
    date: 'October 7, 2026',
    type: 'Expense',
    company: 'Speedbox',
    description: 'Rider Incentive Bonuses & Telecommunications Plan',
    particulars: 'Rider Incentive Bonuses & Telecommunications Plan',
    amount: 19500,
    withdrawal: 19500,
    deposit: 0,
    category: 'Maya',
    status: 'Paid',
    auditStatus: 'Pending Audit',
    createdBy: 'HR Specialist (Rowena Tan)',
    createdAt: '2026-10-07 13:00',
    updatedAt: '2026-10-07 13:00',
    attachments: [],
  },
  {
    id: 'tx_24',
    refNo: 'REF-202610-801',
    chequeNo: 'CHK-22101',
    date: 'October 2, 2026',
    type: 'Sales',
    company: 'JK Property and Ventures',
    description: 'Commercial Plaza Floor 2 Monthly Rental Inflow',
    particulars: 'Commercial Plaza Floor 2 Monthly Rental Inflow',
    amount: 95000,
    withdrawal: 0,
    deposit: 95000,
    category: 'In-house',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Tenant lease payment receipt official ledger checked.',
    auditDate: '2026-10-03 15:30',
    createdBy: 'Property Manager (Eduardo Go)',
    createdAt: '2026-10-02 11:00',
    updatedAt: '2026-10-03 15:30',
    attachments: ['Tenant_OR_PlazaFloor2.pdf'],
  },
  {
    id: 'tx_25',
    refNo: 'REF-202610-802',
    chequeNo: 'CHK-22102',
    date: 'October 7, 2026',
    type: 'Expense',
    company: 'JK Property and Ventures',
    description: 'Building Fire & Safety System Periodic Certification',
    particulars: 'Building Fire & Safety System Periodic Certification',
    amount: 28000,
    withdrawal: 28000,
    deposit: 0,
    category: 'In-house',
    status: 'Pending',
    auditStatus: 'Flagged',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Inspection permit certificate copy required before disbursement.',
    auditDate: '2026-10-07 17:00',
    createdBy: 'Maintenance Head (Arturo Diaz)',
    createdAt: '2026-10-07 14:00',
    updatedAt: '2026-10-07 17:00',
    attachments: [],
  },
  {
    id: 'tx_26',
    refNo: 'REF-202610-901',
    chequeNo: 'CHK-11101',
    date: 'October 5, 2026',
    type: 'Sales',
    company: 'Golden Sunburst Ventures',
    description: 'Organic Farming Harvest Distribution Wholesale',
    particulars: 'Organic Farming Harvest Distribution Wholesale',
    amount: 54000,
    withdrawal: 0,
    deposit: 54000,
    category: 'GCash',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Remi Lee',
    auditDate: '2026-10-06 11:20',
    createdBy: 'Farm Operations Head (Nestor Puno)',
    createdAt: '2026-10-05 16:00',
    updatedAt: '2026-10-06 11:20',
    attachments: [],
  },
  {
    id: 'tx_27',
    refNo: 'REF-202610-902',
    chequeNo: 'CHK-11102',
    date: 'October 9, 2026',
    type: 'Expense',
    company: 'Golden Sunburst Ventures',
    description: 'Cold Storage Refrigeration Upgrades & Parts',
    particulars: 'Cold Storage Refrigeration Upgrades & Parts',
    amount: 22000,
    withdrawal: 22000,
    deposit: 0,
    category: 'Maya',
    status: 'Paid',
    auditStatus: 'Pending Audit',
    createdBy: 'Facility Lead (Arthur Torres)',
    createdAt: '2026-10-09 10:30',
    updatedAt: '2026-10-09 10:30',
    attachments: [],
  },
]

const dashboardCache = new Map<string, { data: DashboardData; timestamp: number }>()
const DASHBOARD_CACHE_TTL = 20000

export const dashboardService = {
  invalidateCache(): void {
    dashboardCache.clear()
  },

  async getDashboardData(filters?: {
    company?: string
  }): Promise<DashboardData> {
    const cacheKey = filters?.company || 'All Companies'
    const cached = dashboardCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < DASHBOARD_CACHE_TTL) {
      return cached.data
    }

    const isCompanySpecific = filters?.company && filters.company !== 'All Companies'
    const targetComp = filters?.company?.toLowerCase().trim()

    // 1. Real sales and expenses from the database (starts at 0 if no records entered yet)
    let realTransactions: DashboardTransactionItem[] = []
    try {
      const companyFilter = isCompanySpecific ? filters!.company : undefined
      const [sales, expenses] = await Promise.all([
        salesService.getSales(companyFilter),
        expenseService.getExpenses({ company: companyFilter }),
      ])
      realTransactions = [
        ...sales.map((s) => salesService.toDashboardTransaction(s)),
        ...expenses.map((e) => expenseService.toDashboardTransaction(e)),
      ]
      if (isCompanySpecific) {
        realTransactions = realTransactions.filter(
          (t) => t.company?.toLowerCase().trim() === targetComp
        )
      }
    } catch {
      // Backend not available or empty
    }

    // 2. 18-month rich dummy transactions exclusively for the dashboard
    let dummyTransactions = getDummyTransactions()
    if (isCompanySpecific) {
      dummyTransactions = dummyTransactions.filter(
        (t) => t.company?.toLowerCase().trim() === targetComp
      )
    }

    // Combine real and dummy transactions (real user transactions prioritized)
    let transactions: DashboardTransactionItem[] = [
      ...realTransactions,
      ...dummyTransactions,
    ]

    // Consolidated KPI Totals (or filtered by company if chosen)
    const totalSales =
      transactions
        .filter((t) => t.type === 'Sales' || t.type === 'Income')
        .reduce((sum, t) => sum + (t.deposit || t.amount || 0), 0) ||
      (isCompanySpecific ? 85000 : 1350000)

    const totalExpense =
      transactions
        .filter((t) => t.type === 'Expense')
        .reduce((sum, t) => sum + (t.withdrawal || t.amount || 0), 0) ||
      (isCompanySpecific ? 24000 : 335000)

    const totalLoan =
      transactions
        .filter((t) => t.type === 'Loan')
        .reduce((sum, t) => sum + (t.amount || t.withdrawal || 0), 0) ||
      (isCompanySpecific ? 25000 : 120000)

    const overdueLoans = transactions.filter(
      (t) =>
        t.type === 'Loan' &&
        (t.status === 'Overdue' || t.auditStatus === 'Flagged')
    ).length

    const dueSoon = transactions.filter(
      (t) => t.type === 'Loan' && t.status === 'Pending'
    ).length

    // Sort transactions latest first
    transactions.sort((a, b) => {
      const dateA = normalizeDateToYYYYMMDD(a.date)
      const dateB = normalizeDateToYYYYMMDD(b.date)
      const cmp = dateB.localeCompare(dateA)
      if (cmp !== 0) return cmp
      return (b.createdAt || b.id).localeCompare(a.createdAt || a.id)
    })

    const result: DashboardData = {
      kpis: {
        totalSales,
        totalExpense,
        totalLoan,
        overdueLoans: Math.max(overdueLoans, 2),
        dueSoon: Math.max(dueSoon, 3),
      },
      weeklySales: INITIAL_WEEKLY_SALES,
      expenses: INITIAL_EXPENSES,
      companyIncome: INITIAL_COMPANY_INCOME,
      recentTransactions: transactions,
    }
    dashboardCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  },

  async updateTransactionCategory(
    id: string,
    category: TransactionCategory
  ): Promise<DashboardTransactionItem | null> {
    const index = inMemoryTransactions.findIndex((t) => t.id === id)
    if (index === -1) return null

    inMemoryTransactions[index] = {
      ...inMemoryTransactions[index],
      category,
    }

    return inMemoryTransactions[index]
  },

  async updateTransactionAudit(
    id: string,
    auditStatus: AuditStatus,
    notes?: string,
    auditorName = 'Alex Cruz'
  ): Promise<DashboardTransactionItem | null> {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const index = inMemoryTransactions.findIndex((t) => t.id === id)
    if (index === -1) return null

    inMemoryTransactions[index] = {
      ...inMemoryTransactions[index],
      auditStatus,
      auditNotes: notes ?? inMemoryTransactions[index].auditNotes,
      auditedBy: auditorName,
      auditDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    }

    return inMemoryTransactions[index]
  },
}

import type { DashboardTransactionItem } from './dashboardService'
import { normalizeDateToYYYYMMDD } from '@/utils/dateUtils'
import { type ParticularItem, parseParticulars } from '@/utils/particularsUtils'

export interface SalesItem {
  id: string
  refNo: string
  chequeNo?: string
  date: string // e.g. "10/01/26"
  rawDate: string // e.g. "2026-10-01"
  particulars: string
  withdrawal: number
  deposit: number
  netAmount: number
  category: string       // user-configurable category (from DB Category table)
  paymentMethod?: string // payment method: GCash, Cash, Cheque, Bank Transfer, etc.
  company: string
  items?: ParticularItem[]
  status: 'Paid' | 'Pending' | 'Overdue'
  auditStatus: 'Verified' | 'Pending Audit' | 'Flagged'
  auditedBy?: string
  auditNotes?: string
  auditDate?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  type: 'Sales'
}

export interface NewSalesInput {
  date: string
  chequeNo?: string
  particulars: string
  amount: number
  category?: string        // optional sales category (e.g. Sales Revenue, Catering)
  paymentMethod?: string  // payment method (GCash, Cash, etc.)
  company: string
  status: 'Paid' | 'Pending'
  items?: ParticularItem[]
}

export const INITIAL_SALES: SalesItem[] = [
  {
    id: 'sale_1',
    refNo: 'REF-202610-8892',
    chequeNo: 'CHQ-8892',
    date: '10/01/26',
    rawDate: '2026-10-01',
    particulars: 'Office Supplies Catering Contract',
    withdrawal: 0,
    deposit: 12450,
    netAmount: 12450,
    category: 'Cheque',
    company: 'MCT Kitchen',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Cheque deposit slip verified and cleared with depository bank.',
    auditDate: '2026-10-02 11:00',
    createdBy: 'Finance Officer (Maria Santos)',
    createdAt: '2026-10-01 08:30',
    updatedAt: '2026-10-02 11:00',
    type: 'Sales',
  },
  {
    id: 'sale_2',
    refNo: 'REF-202610-8893',
    chequeNo: '',
    date: '10/01/26',
    rawDate: '2026-10-01',
    particulars: 'Freight Services In-House Logistics Delivery',
    withdrawal: 0,
    deposit: 8900,
    netAmount: 8900,
    category: 'Bank Transfer',
    company: 'MCT Kitchen',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Direct fund transfer receipt reconciled.',
    auditDate: '2026-10-02 14:00',
    createdBy: 'Catering Lead (David Ramos)',
    createdAt: '2026-10-01 10:15',
    updatedAt: '2026-10-02 14:00',
    type: 'Sales',
  },
  {
    id: 'sale_3',
    refNo: 'REF-202610-8894',
    chequeNo: '',
    date: '10/01/26',
    rawDate: '2026-10-01',
    particulars: 'Mobile Top-up & Beverage Service Walk-in',
    withdrawal: 0,
    deposit: 5000,
    netAmount: 5000,
    category: 'Cash',
    company: 'MCT Kitchen',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Daily register cash deposit counted and balanced.',
    auditDate: '2026-10-01 18:30',
    createdBy: 'Head Cashier (Angela Reyes)',
    createdAt: '2026-10-01 17:45',
    updatedAt: '2026-10-01 18:30',
    type: 'Sales',
  },
  {
    id: 'sale_4',
    refNo: 'REF-202610-8895',
    chequeNo: 'CHQ-8895',
    date: '10/01/26',
    rawDate: '2026-10-01',
    particulars: 'Warehouse Lease Cold Storage Space Access',
    withdrawal: 0,
    deposit: 45000,
    netAmount: 45000,
    category: 'Cheque',
    company: 'MCT Kitchen',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'PDC cheque cleared and verified with statement.',
    auditDate: '2026-10-02 09:30',
    createdBy: 'Property Admin (Elena Gomez)',
    createdAt: '2026-10-01 09:00',
    updatedAt: '2026-10-02 09:30',
    type: 'Sales',
  },
  {
    id: 'sale_5',
    refNo: 'REF-202610-8896',
    chequeNo: '',
    date: '10/01/26',
    rawDate: '2026-10-01',
    particulars: 'Point-of-Sale Counter Dine-in Receipts',
    withdrawal: 0,
    deposit: 3200,
    netAmount: 3200,
    category: 'Bank Transfer',
    company: 'MCT Kitchen',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Online settlement batch reconciled.',
    auditDate: '2026-10-01 22:00',
    createdBy: 'Head Cashier (Angela Reyes)',
    createdAt: '2026-10-01 21:30',
    updatedAt: '2026-10-01 22:00',
    type: 'Sales',
  },
  {
    id: 'sale_6',
    refNo: 'REF-202610-102',
    chequeNo: 'CHK-99202',
    date: '10/02/26',
    rawDate: '2026-10-02',
    particulars: 'Weekend Corporate Banquet Catering',
    withdrawal: 0,
    deposit: 42500,
    netAmount: 42500,
    category: 'GCash',
    company: 'MCT Kitchen',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'GCash e-wallet batch confirmation slip cross-checked.',
    auditDate: '2026-10-03 09:30',
    createdBy: 'Catering Lead (David Ramos)',
    createdAt: '2026-10-02 11:45',
    updatedAt: '2026-10-03 09:30',
    type: 'Sales',
  },
  {
    id: 'sale_7',
    refNo: 'REF-202610-103',
    chequeNo: '',
    date: '10/03/26',
    rawDate: '2026-10-03',
    particulars: 'Executive Event Pre-Order Advance Booking',
    withdrawal: 0,
    deposit: 22000,
    netAmount: 22000,
    category: 'Maya',
    company: 'MCT Kitchen',
    status: 'Pending',
    auditStatus: 'Pending Audit',
    auditNotes: 'Awaiting client fund release confirmation.',
    createdBy: 'Event Planner (Chloe Lin)',
    createdAt: '2026-10-03 14:00',
    updatedAt: '2026-10-03 14:00',
    type: 'Sales',
  },
  {
    id: 'sale_8',
    refNo: 'REF-202610-105',
    chequeNo: 'CHK-99205',
    date: '10/05/26',
    rawDate: '2026-10-05',
    particulars: 'Daily Dining Room & Walk-in Receipts',
    withdrawal: 0,
    deposit: 38000,
    netAmount: 38000,
    category: 'PayMongo',
    company: 'MCT Kitchen',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'POS tape matches terminal settlements.',
    auditDate: '2026-10-05 21:00',
    createdBy: 'Head Cashier (Angela Reyes)',
    createdAt: '2026-10-05 20:30',
    updatedAt: '2026-10-05 21:00',
    type: 'Sales',
  },
  {
    id: 'sale_9',
    refNo: 'REF-202610-106',
    chequeNo: 'CHK-99206',
    date: '10/06/26',
    rawDate: '2026-10-06',
    particulars: 'Food Delivery Platform Gross Orders',
    withdrawal: 0,
    deposit: 31200,
    netAmount: 31200,
    category: 'Panda',
    company: 'MCT Kitchen',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditNotes: 'Panda merchant batch statement matched.',
    auditDate: '2026-10-06 18:30',
    createdBy: 'Online Dispatcher (Ryan Del Rosario)',
    createdAt: '2026-10-06 17:00',
    updatedAt: '2026-10-06 18:30',
    type: 'Sales',
  },
  {
    id: 'sale_10',
    refNo: 'REF-202610-108',
    chequeNo: 'CHK-99208',
    date: '10/08/26',
    rawDate: '2026-10-08',
    particulars: 'Corporate Executive Lunch Reservation Advance',
    withdrawal: 0,
    deposit: 48000,
    netAmount: 48000,
    category: 'Maya',
    company: 'MCT Kitchen',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditDate: '2026-10-08 14:00',
    createdBy: 'Catering Lead (David Ramos)',
    createdAt: '2026-10-08 11:30',
    updatedAt: '2026-10-08 14:00',
    type: 'Sales',
  },
  {
    id: 'sale_11',
    refNo: 'REF-202610-109',
    chequeNo: '',
    date: '10/09/26',
    rawDate: '2026-10-09',
    particulars: 'Private Function Hall Weekend Booking Balance',
    withdrawal: 0,
    deposit: 35000,
    netAmount: 35000,
    category: 'In-house',
    company: 'MCT Kitchen',
    status: 'Pending',
    auditStatus: 'Pending Audit',
    auditNotes: 'Client payment due on function check-in.',
    createdBy: 'Events Lead (Melissa Co)',
    createdAt: '2026-10-09 15:00',
    updatedAt: '2026-10-09 15:00',
    type: 'Sales',
  },
  {
    id: 'sale_12',
    refNo: 'REF-202610-110',
    chequeNo: 'CHK-99210',
    date: '10/10/26',
    rawDate: '2026-10-10',
    particulars: 'Evening Dining Service Credit Gateway Receipts',
    withdrawal: 0,
    deposit: 52000,
    netAmount: 52000,
    category: 'GCash',
    company: 'MCT Kitchen',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Alex Cruz',
    auditDate: '2026-10-10 22:30',
    createdBy: 'Head Cashier (Angela Reyes)',
    createdAt: '2026-10-10 22:00',
    updatedAt: '2026-10-10 22:30',
    type: 'Sales',
  },
  // MCT Hotel Sales
  {
    id: 'sale_13',
    refNo: 'REF-202610-201',
    chequeNo: '',
    date: '10/02/26',
    rawDate: '2026-10-02',
    particulars: 'Executive Suite Accommodations & Weekend Packages',
    withdrawal: 0,
    deposit: 68000,
    netAmount: 68000,
    category: 'GCash',
    company: 'MCT Hotel',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Admin Audit Team',
    auditDate: '2026-10-03 10:00',
    createdBy: 'Hotel Front Office',
    createdAt: '2026-10-02 12:00',
    updatedAt: '2026-10-03 10:00',
    type: 'Sales',
  },
  {
    id: 'sale_14',
    refNo: 'REF-202610-202',
    chequeNo: 'CHQ-7721',
    date: '10/04/26',
    rawDate: '2026-10-04',
    particulars: 'Conference Hall Corporate Summit Reservation Deposit',
    withdrawal: 0,
    deposit: 95000,
    netAmount: 95000,
    category: 'Cheque',
    company: 'MCT Hotel',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Admin Audit Team',
    auditDate: '2026-10-05 11:30',
    createdBy: 'Banquet & Events Sales',
    createdAt: '2026-10-04 15:00',
    updatedAt: '2026-10-05 11:30',
    type: 'Sales',
  },
  {
    id: 'sale_15',
    refNo: 'REF-202610-203',
    chequeNo: '',
    date: '10/06/26',
    rawDate: '2026-10-06',
    particulars: 'Poolside Lounge & Room Service Guest Settlements',
    withdrawal: 0,
    deposit: 24500,
    netAmount: 24500,
    category: 'PayMongo',
    company: 'MCT Hotel',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Admin Audit Team',
    auditDate: '2026-10-07 09:00',
    createdBy: 'Night Auditor',
    createdAt: '2026-10-06 23:00',
    updatedAt: '2026-10-07 09:00',
    type: 'Sales',
  },
  // JK Cafe Sales
  {
    id: 'sale_16',
    refNo: 'REF-202610-301',
    chequeNo: '',
    date: '10/01/26',
    rawDate: '2026-10-01',
    particulars: 'Specialty Espresso & Artisan Pastry Counter Inflows',
    withdrawal: 0,
    deposit: 18500,
    netAmount: 18500,
    category: 'Maya',
    company: 'JK Cafe',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Admin Audit Team',
    auditDate: '2026-10-02 08:30',
    createdBy: 'Head Barista',
    createdAt: '2026-10-01 20:00',
    updatedAt: '2026-10-02 08:30',
    type: 'Sales',
  },
  {
    id: 'sale_17',
    refNo: 'REF-202610-302',
    chequeNo: '',
    date: '10/03/26',
    rawDate: '2026-10-03',
    particulars: 'Corporate Breakfast Catering Bulk Order Delivery',
    withdrawal: 0,
    deposit: 32000,
    netAmount: 32000,
    category: 'Bank Transfer',
    company: 'JK Cafe',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Admin Audit Team',
    auditDate: '2026-10-04 14:00',
    createdBy: 'Cafe Manager',
    createdAt: '2026-10-03 11:00',
    updatedAt: '2026-10-04 14:00',
    type: 'Sales',
  },
  {
    id: 'sale_18',
    refNo: 'REF-202610-303',
    chequeNo: 'CHQ-5512',
    date: '10/07/26',
    rawDate: '2026-10-07',
    particulars: 'Roasted Coffee Beans Wholesale Commercial Supply',
    withdrawal: 0,
    deposit: 45000,
    netAmount: 45000,
    category: 'Cheque',
    company: 'JK Cafe',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Admin Audit Team',
    auditDate: '2026-10-08 10:15',
    createdBy: 'Wholesale Lead',
    createdAt: '2026-10-07 14:30',
    updatedAt: '2026-10-08 10:15',
    type: 'Sales',
  },
  // Annex Nine Sales
  {
    id: 'sale_19',
    refNo: 'REF-202610-401',
    chequeNo: 'CHQ-3310',
    date: '10/01/26',
    rawDate: '2026-10-01',
    particulars: 'Commercial Retail Store Front Monthly Space Lease',
    withdrawal: 0,
    deposit: 85000,
    netAmount: 85000,
    category: 'Cheque',
    company: 'Annex Nine',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Admin Audit Team',
    auditDate: '2026-10-02 11:00',
    createdBy: 'Property Manager',
    createdAt: '2026-10-01 10:00',
    updatedAt: '2026-10-02 11:00',
    type: 'Sales',
  },
  {
    id: 'sale_20',
    refNo: 'REF-202610-402',
    chequeNo: '',
    date: '10/05/26',
    rawDate: '2026-10-05',
    particulars: 'Common Area Maintenance & Facility Operations Dues',
    withdrawal: 0,
    deposit: 28000,
    netAmount: 28000,
    category: 'Bank Transfer',
    company: 'Annex Nine',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Admin Audit Team',
    auditDate: '2026-10-06 09:30',
    createdBy: 'Billing Officer',
    createdAt: '2026-10-05 16:00',
    updatedAt: '2026-10-06 09:30',
    type: 'Sales',
  },
  // Merillon Sales
  {
    id: 'sale_21',
    refNo: 'REF-202610-501',
    chequeNo: 'CHQ-9918',
    date: '10/03/26',
    rawDate: '2026-10-03',
    particulars: 'Grand Ballroom Premium Wedding Reception Booking',
    withdrawal: 0,
    deposit: 140000,
    netAmount: 140000,
    category: 'Cheque',
    company: 'Merillon',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Admin Audit Team',
    auditDate: '2026-10-04 16:00',
    createdBy: 'Events Director',
    createdAt: '2026-10-03 14:00',
    updatedAt: '2026-10-04 16:00',
    type: 'Sales',
  },
  {
    id: 'sale_22',
    refNo: 'REF-202610-502',
    chequeNo: '',
    date: '10/08/26',
    rawDate: '2026-10-08',
    particulars: 'Corporate Year-End Gala Function Advance Deposit',
    withdrawal: 0,
    deposit: 75000,
    netAmount: 75000,
    category: 'Bank Transfer',
    company: 'Merillon',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Admin Audit Team',
    auditDate: '2026-10-09 11:00',
    createdBy: 'Sales Specialist',
    createdAt: '2026-10-08 17:00',
    updatedAt: '2026-10-09 11:00',
    type: 'Sales',
  },
  // JK Printing Sales
  {
    id: 'sale_23',
    refNo: 'REF-202610-601',
    chequeNo: 'CHQ-4420',
    date: '10/02/26',
    rawDate: '2026-10-02',
    particulars: 'Marketing Collaterals & Catalogs High-Volume Printing',
    withdrawal: 0,
    deposit: 52000,
    netAmount: 52000,
    category: 'Cheque',
    company: 'JK Printing',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Admin Audit Team',
    auditDate: '2026-10-03 15:00',
    createdBy: 'Press Supervisor',
    createdAt: '2026-10-02 16:30',
    updatedAt: '2026-10-03 15:00',
    type: 'Sales',
  },
  {
    id: 'sale_24',
    refNo: 'REF-202610-602',
    chequeNo: '',
    date: '10/07/26',
    rawDate: '2026-10-07',
    particulars: 'Product Packaging Boxes Custom Die-Cut Batch Run',
    withdrawal: 0,
    deposit: 38500,
    netAmount: 38500,
    category: 'PayMongo',
    company: 'JK Printing',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Admin Audit Team',
    auditDate: '2026-10-08 12:00',
    createdBy: 'Production Lead',
    createdAt: '2026-10-07 18:00',
    updatedAt: '2026-10-08 12:00',
    type: 'Sales',
  },
  // Speedbox Sales
  {
    id: 'sale_25',
    refNo: 'REF-202610-701',
    chequeNo: '',
    date: '10/04/26',
    rawDate: '2026-10-04',
    particulars: 'Express Commercial Courier & Dedicated Van Dispatch',
    withdrawal: 0,
    deposit: 62000,
    netAmount: 62000,
    category: 'Bank Transfer',
    company: 'Speedbox',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Admin Audit Team',
    auditDate: '2026-10-05 13:00',
    createdBy: 'Fleet Controller',
    createdAt: '2026-10-04 19:00',
    updatedAt: '2026-10-05 13:00',
    type: 'Sales',
  },
  {
    id: 'sale_26',
    refNo: 'REF-202610-702',
    chequeNo: '',
    date: '10/09/26',
    rawDate: '2026-10-09',
    particulars: 'Nationwide E-Commerce Parcels Fulfillment Delivery',
    withdrawal: 0,
    deposit: 41200,
    netAmount: 41200,
    category: 'GCash',
    company: 'Speedbox',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Admin Audit Team',
    auditDate: '2026-10-10 10:00',
    createdBy: 'Logistics Supervisor',
    createdAt: '2026-10-09 21:00',
    updatedAt: '2026-10-10 10:00',
    type: 'Sales',
  },
  // JK Property and Ventures Sales
  {
    id: 'sale_27',
    refNo: 'REF-202610-801',
    chequeNo: 'CHQ-6601',
    date: '10/01/26',
    rawDate: '2026-10-01',
    particulars: 'Office Suite Corporate Tenant Quarterly Rental Inflow',
    withdrawal: 0,
    deposit: 110000,
    netAmount: 110000,
    category: 'Cheque',
    company: 'JK Property and Ventures',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Admin Audit Team',
    auditDate: '2026-10-02 14:00',
    createdBy: 'Leasing Executive',
    createdAt: '2026-10-01 11:00',
    updatedAt: '2026-10-02 14:00',
    type: 'Sales',
  },
  {
    id: 'sale_28',
    refNo: 'REF-202610-802',
    chequeNo: '',
    date: '10/06/26',
    rawDate: '2026-10-06',
    particulars: 'Condominium Towers Parking Slots Annual Lease Dues',
    withdrawal: 0,
    deposit: 22000,
    netAmount: 22000,
    category: 'Bank Transfer',
    company: 'JK Property and Ventures',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Admin Audit Team',
    auditDate: '2026-10-07 15:30',
    createdBy: 'Property Officer',
    createdAt: '2026-10-06 14:00',
    updatedAt: '2026-10-07 15:30',
    type: 'Sales',
  },
  // Golden Sunburst Ventures Sales
  {
    id: 'sale_29',
    refNo: 'REF-202610-901',
    chequeNo: 'CHQ-8822',
    date: '10/05/26',
    rawDate: '2026-10-05',
    particulars: 'Agricultural Produce Wholesale Distribution Deal',
    withdrawal: 0,
    deposit: 98000,
    netAmount: 98000,
    category: 'Cheque',
    company: 'Golden Sunburst Ventures',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Admin Audit Team',
    auditDate: '2026-10-06 16:30',
    createdBy: 'Trade Coordinator',
    createdAt: '2026-10-05 13:00',
    updatedAt: '2026-10-06 16:30',
    type: 'Sales',
  },
  {
    id: 'sale_30',
    refNo: 'REF-202610-902',
    chequeNo: '',
    date: '10/08/26',
    rawDate: '2026-10-08',
    particulars: 'Organic Produce Consignment Batch Settlement',
    withdrawal: 0,
    deposit: 46000,
    netAmount: 46000,
    category: 'Maya',
    company: 'Golden Sunburst Ventures',
    status: 'Paid',
    auditStatus: 'Verified',
    auditedBy: 'Admin Audit Team',
    auditDate: '2026-10-09 17:00',
    createdBy: 'Distribution Agent',
    createdAt: '2026-10-08 15:30',
    updatedAt: '2026-10-09 17:00',
    type: 'Sales',
  },
]

let inMemorySales: SalesItem[] = []

function mapBackendSaleToItem(b: any): SalesItem {
  const rawDate = b.transaction_date || (b.created_at ? b.created_at.split('T')[0] : '2026-10-01')
  const [year, month, day] = rawDate.split('-')
  const displayDate = month && day ? `${month}/${day}/${year?.slice(2) || '26'}` : rawDate
  const amt = Number(b.amount) || 0
  
  let chequeNo = b.cheque_no || b.chequeNo || b.reference_no || ''
  let particulars = b.particulars || b.description || 'Sales Entry'
  if (!chequeNo && particulars.includes('[Cheque:')) {
    const parts = particulars.split('[Cheque:')
    particulars = parts[0].trim()
    chequeNo = parts[1].replace(']', '').trim()
  }

  const parsedItems = parseParticulars(particulars, null, amt)

  return {
    id: String(b.sales_id),
    refNo: chequeNo || `REF-${b.sales_id}`,
    chequeNo: chequeNo || undefined,
    date: displayDate,
    rawDate: rawDate,
    particulars: particulars || 'Sales Entry',
    withdrawal: 0,
    deposit: amt,
    netAmount: amt,
    category: b.category_name || 'None',
    paymentMethod: b.payment_method || undefined,
    company: b.company_name || 'MCT Kitchen',
    items: parsedItems,
    status: 'Paid',
    auditStatus: 'Verified',
    createdBy: 'Company Auditor',
    createdAt: b.created_at || new Date().toISOString(),
    type: 'Sales',
  }
}

const salesCache = new Map<string, { data: SalesItem[]; timestamp: number }>()
const SALES_CACHE_TTL = 30000

export const salesService = {
  invalidateCache(): void {
    salesCache.clear()
  },

  async getSales(company?: string): Promise<SalesItem[]> {
    const cacheKey = company || 'All Companies'
    const cached = salesCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < SALES_CACHE_TTL) {
      return cached.data
    }

    try {
      const url =
        company && company !== 'All Companies'
          ? `/api/v1/sales?company_name=${encodeURIComponent(company)}`
          : '/api/v1/sales'

      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('mct_access_token')
          : null

      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const apiSales = data.map(mapBackendSaleToItem)
          const sorted = apiSales.sort((a, b) => {
            const dateA = a.rawDate || normalizeDateToYYYYMMDD(a.date)
            const dateB = b.rawDate || normalizeDateToYYYYMMDD(b.date)
            const cmp = dateB.localeCompare(dateA)
            if (cmp !== 0) return cmp
            return Number(b.id) - Number(a.id)
          })
          salesCache.set(cacheKey, { data: sorted, timestamp: Date.now() })
          return sorted
        }
      }
    } catch (err) {
      console.warn('Backend /sales fetch error, using local fallback:', err)
    }

    const list =
      !company || company === 'All Companies'
        ? [...inMemorySales]
        : inMemorySales.filter((s) => s.company === company)

    return list.sort((a, b) => {
      const dateA = a.rawDate || normalizeDateToYYYYMMDD(a.date)
      const dateB = b.rawDate || normalizeDateToYYYYMMDD(b.date)
      const cmp = dateB.localeCompare(dateA)
      if (cmp !== 0) return cmp
      return (b.createdAt || b.id).localeCompare(a.createdAt || a.id)
    })
  },

  async addSale(input: NewSalesInput): Promise<SalesItem> {
    const payload = {
      company: input.company,
      transaction_date: input.date,
      amount: input.amount,
      particulars: input.particulars,
      description: input.particulars,
      category: input.category && input.category !== 'None' ? input.category : null,
      payment_method: input.paymentMethod || null,
      chequeNo: input.chequeNo || undefined,
    }

    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('mct_access_token')
          : null

      const res = await fetch('/api/v1/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const created = await res.json()
        const newItem = mapBackendSaleToItem(created)
        if (input.items && input.items.length > 0) {
          newItem.items = input.items
        }
        inMemorySales = [newItem, ...inMemorySales]
        return newItem
      } else {
        const errData = await res.json().catch(() => ({}))
        const errorMsg =
          errData.detail ||
          (typeof errData === 'string' ? errData : 'Failed to record sales entry.')
        throw new Error(errorMsg)
      }
    } catch (err: any) {
      console.warn('Backend POST /sales failed, creating local record:', err)
      // If network error occurred, create local fallback item
      const id = `sale_${Date.now()}`
      const refNo = `REF-${input.date.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`
      const [year, month, day] = input.date.split('-')
      const displayDate = `${month}/${day}/${year?.slice(2) || '26'}`

      const newItem: SalesItem = {
        id,
        refNo,
        chequeNo: input.chequeNo || '',
        date: displayDate,
        rawDate: input.date,
        particulars: input.particulars,
        withdrawal: 0,
        deposit: input.amount,
        netAmount: input.amount,
        category: input.category || 'None',
        paymentMethod: input.paymentMethod,
        company: input.company,
        items: input.items || parseParticulars(input.particulars, null, input.amount),
        status: input.status,
        auditStatus: 'Verified',
        createdBy: 'Company Auditor',
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        type: 'Sales',
      }

      inMemorySales = [newItem, ...inMemorySales]
      return newItem
    }
  },

  async updateSale(
    id: string,
    input: Partial<NewSalesInput>
  ): Promise<SalesItem> {
    const payload: Record<string, any> = {}
    if (input.date) payload.transaction_date = input.date
    if (input.amount !== undefined) payload.amount = input.amount
    if (input.particulars) payload.particulars = input.particulars
    if (input.category !== undefined) {
      payload.category = input.category === 'None' ? null : input.category
    }
    if (input.paymentMethod !== undefined) payload.payment_method = input.paymentMethod || null
    if (input.chequeNo !== undefined) payload.chequeNo = input.chequeNo

    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('mct_access_token')
          : null

      const res = await fetch(`/api/v1/sales/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const updated = await res.json()
        const mapped = mapBackendSaleToItem(updated)
        inMemorySales = inMemorySales.map((s) => (s.id === id ? mapped : s))
        return mapped
      }
    } catch (err) {
      console.warn('Backend update sale failed, updating locally:', err)
    }

    // Local update fallback
    inMemorySales = inMemorySales.map((s) => {
      if (s.id !== id) return s
      const amt = input.amount !== undefined ? input.amount : s.deposit
      const [year, month, day] = (input.date || s.rawDate || '').split('-')
      const displayDate = month && day ? `${month}/${day}/${year?.slice(2) || '26'}` : s.date
      return {
        ...s,
        date: input.date ? displayDate : s.date,
        rawDate: input.date || s.rawDate,
        particulars: input.particulars || s.particulars,
        chequeNo: input.chequeNo !== undefined ? input.chequeNo : s.chequeNo,
        category: input.category || s.category,
        deposit: amt,
        netAmount: amt,
        updatedAt: new Date().toISOString(),
      }
    })
    return inMemorySales.find((s) => s.id === id)!
  },

  async deleteSale(id: string): Promise<boolean> {
    try {
      const token =
        typeof window !== 'undefined'
          ? sessionStorage.getItem('mct_access_token')
          : null

      const res = await fetch(`/api/v1/sales/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (res.ok) {
        inMemorySales = inMemorySales.filter((s) => s.id !== id)
        return true
      }
    } catch (err) {
      console.warn('Backend delete sale failed, deleting locally:', err)
    }

    inMemorySales = inMemorySales.filter((s) => s.id !== id)
    return true
  },

  async updateSaleAuditStatus(
    id: string,
    auditStatus: 'Verified' | 'Pending Audit' | 'Flagged',
    auditedBy?: string
  ): Promise<SalesItem | null> {
    const today = new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    })
    inMemorySales = inMemorySales.map((s) => {
      if (s.id !== id) return s
      return {
        ...s,
        auditStatus,
        auditedBy: auditStatus === 'Verified' ? (auditedBy || 'Admin') : undefined,
        auditDate: auditStatus === 'Verified' ? today : undefined,
        updatedAt: new Date().toISOString(),
      }
    })
    return inMemorySales.find((s) => s.id === id) || null
  },

  exportCsv(items: SalesItem[], filename = 'sales_report.csv') {
    const headers = [
      'Date',
      'Ref No',
      'Cheque No',
      'Particulars',
      'Withdrawal',
      'Deposit',
      'Net Amount',
      'Payment Method',
      'Company',
    ]

    const rows = items.map((s) => [
      s.date,
      s.refNo,
      s.chequeNo || '—',
      `"${s.particulars.replace(/"/g, '""')}"`,
      s.withdrawal,
      s.deposit,
      s.netAmount,
      s.paymentMethod || 'Cash',
      s.company,
    ])

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  exportPdf(items: SalesItem[], company = 'MCT Kitchen') {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const totalDeposit = items.reduce((sum, s) => sum + (s.deposit || 0), 0)
    const totalWithdrawal = items.reduce((sum, s) => sum + (s.withdrawal || 0), 0)
    const netTotal = totalDeposit - totalWithdrawal

    const rowsHtml =
      items.length === 0
        ? `<tr><td colspan="8" style="padding: 24px; text-align: center; color: #64748B; font-size: 12px; font-style: italic;">No sales transactions recorded for this selection.</td></tr>`
        : items
            .map(
              (s) => `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${s.date}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">${s.chequeNo || '—'}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${s.particulars}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #dc2626;">${s.withdrawal > 0 ? `₱${s.withdrawal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #16a34a; font-weight: 600;">${s.deposit > 0 ? `₱${s.deposit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${s.paymentMethod || 'Cash'}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: 700;">₱${s.netAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${s.status}</td>
      </tr>
    `
            )
            .join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sales Summary Report - ${company}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0F172A; padding: 24px; }
            h1 { font-size: 20px; font-weight: 700; margin: 0 0 4px 0; color: #960C01; }
            p { font-size: 12px; color: #64748B; margin: 0 0 16px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { background-color: #F8FAFC; text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; border-bottom: 2px solid #CBD5E1; }
            .summary { margin-top: 20px; padding: 12px 16px; background-color: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0; display: flex; justify-content: space-between; font-size: 12px; }
            @media print {
              body { padding: 10px; }
              @page { size: landscape; margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <h1>MCT Group of Companies</h1>
          <p>Sales Summary Report for <strong>${company}</strong> · Generated on ${new Date().toLocaleDateString('en-PH', { dateStyle: 'full' })}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Cheque No.</th>
                <th>Particulars</th>
                <th style="text-align: right;">Withdrawal</th>
                <th style="text-align: right;">Deposit</th>
                <th>Payment Method</th>
                <th style="text-align: right;">Net Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="summary">
            <div><strong>Total Records:</strong> ${items.length}</div>
            <div><strong>Total Sales (Inflows):</strong> ₱${totalDeposit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
            <div><strong>Net Total:</strong> ₱${netTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  },

  // Map a SalesItem to DashboardTransactionItem so it can be viewed in AuditTransactionModal
  toDashboardTransaction(sale: SalesItem): DashboardTransactionItem {
    return {
      id: sale.id,
      refNo: sale.refNo,
      chequeNo: sale.chequeNo,
      date: sale.date,
      type: 'Sales',
      company: sale.company,
      description: sale.particulars,
      particulars: sale.particulars,
      amount: sale.deposit,
      withdrawal: sale.withdrawal,
      deposit: sale.deposit,
      category: (sale.category || 'General') as any,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      auditStatus: sale.auditStatus,
      auditedBy: sale.auditedBy,
      auditNotes: sale.auditNotes,
      auditDate: sale.auditDate,
      createdBy: sale.createdBy,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
      attachments: [],
      items: sale.items || parseParticulars(sale.particulars, null, sale.deposit),
    }
  },
}

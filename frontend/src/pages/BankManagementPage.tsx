import * as React from 'react'
import {
  Download,
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  CreditCard,
  Building2,
  Eye,
  EyeOff,
  Pencil,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  History,
  Landmark,
  Plus,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  DateRangePicker,
  type DateRange,
} from '@/components/ui/DateRangePicker'
import { useSession } from '@/hooks/useSession'
import { formatPHP } from '@/lib/format'
import { cn } from '@/lib/utils'

// Data model for bank transactions matching screenshot columns
export interface BankTransaction {
  id: string
  date: string // MM/DD/YY or YYYY-MM-DD
  chequeNo?: string
  particulars: string
  withdrawal?: number
  deposit?: number
  category: string // Cheque | Bank Transfer | Cash | Online Payment | Point-of-Sale
  netAmount: number
  timestamp?: string
}

// Data model for corporate bank accounts
export interface BankAccount {
  id: string
  bankName: string // e.g. 'CHINABANK', 'BDO UNIBANK', 'BPI', 'METROBANK', etc.
  accountName: string // e.g. 'Bagong Bansa May Pagasa Movement', 'JK Property Commercial'
  accountNumber: string // e.g. '0042-8819-2041'
  companyName: string
  cardLabel?: string // Canonical tab label matching screenshot
  accountType: 'Checking' | 'Savings' | 'Payroll' | 'Time Deposit'
  branch: string
  currentBalance: number
  startingBalance: number
  colorTheme: 'red' | 'grey'
  transactions: BankTransaction[]
  createdAt: string
  notes?: string
}

export function getAccountCardLabel(acc: BankAccount): string {
  if (acc.cardLabel) return acc.cardLabel
  const name = acc.companyName.trim()
  const lower = name.toLowerCase()
  if (lower.includes('jk property')) return 'JK Property'
  if (lower.includes('hotel')) return 'Hotel'
  if (lower.includes('kitchen')) return 'Kitchen'
  if (lower.includes('medsys')) return 'MedSys'
  if (lower.includes('speedfire')) return 'Speedfire'
  if (lower.includes('college')) return 'College Foundation'
  if (lower.includes('trading')) return 'Trading Corp.'
  if (lower.includes('filcap') || lower.includes('filcam')) return 'Filcam Prime'
  if (lower.includes('jupiter')) return 'Golden Jupiter'
  if (lower.includes('bookworld')) return 'Bookworld Systems Solutions & Technologies'
  return name
}

const STORAGE_KEY = 'mct_bank_management_accounts_v5'
const ITEMS_PER_PAGE = 8

// Initial 14 bank accounts matching user's layout and exact companies shown in screenshot
const INITIAL_ACCOUNTS: BankAccount[] = [
  // 1. Hero Default Selected: Bagong Bansa May Pagasa Movement (Chinabank)
  {
    id: 'bnk-cb-001',
    bankName: 'CHINABANK',
    accountName: 'Bagong Bansa May Pagasa Movement',
    accountNumber: '1088-2940-8892',
    companyName: 'Bagong Bansa May Pagasa Movement',
    accountType: 'Checking',
    branch: 'Quezon Avenue Main Branch, Quezon City',
    startingBalance: 1000000,
    currentBalance: 1000000,
    colorTheme: 'red',
    createdAt: '2026-01-10',
    notes: 'Operating settlement account for community livelihood programs and initiatives.',
    transactions: [
      {
        id: 'tx-cb-01',
        date: '10/01/26',
        chequeNo: 'CHQ-8892',
        particulars: 'Office Supplies',
        withdrawal: 12450,
        category: 'Cheque',
        netAmount: 12450,
      },
      {
        id: 'tx-cb-02',
        date: '10/01/26',
        chequeNo: '—',
        particulars: 'Freight Services',
        withdrawal: 8900,
        category: 'Bank Transfer',
        netAmount: 8900,
      },
      {
        id: 'tx-cb-03',
        date: '10/01/26',
        chequeNo: '—',
        particulars: 'Mobile Top-up',
        withdrawal: 5000,
        category: 'Cash',
        netAmount: 5000,
      },
      {
        id: 'tx-cb-04',
        date: '10/01/26',
        chequeNo: 'CHQ-8895',
        particulars: 'Warehouse Lease',
        withdrawal: 45000,
        category: 'Cheque',
        netAmount: 45000,
      },
      {
        id: 'tx-cb-05',
        date: '10/01/26',
        chequeNo: '—',
        particulars: 'Point-of-Sale',
        deposit: 180000,
        category: 'Bank Transfer',
        netAmount: 180000,
      },
      {
        id: 'tx-cb-06',
        date: '10/02/26',
        chequeNo: 'CHQ-8898',
        particulars: 'Logistics Fleet Fuel & Tolls',
        withdrawal: 16500,
        category: 'Cheque',
        netAmount: 16500,
      },
      {
        id: 'tx-cb-07',
        date: '10/03/26',
        chequeNo: '—',
        particulars: 'Institutional Grant Remittance',
        deposit: 250000,
        category: 'Bank Transfer',
        netAmount: 250000,
      },
    ],
  },

  // ---------------- RED CARDS STACK ----------------
  // 2. JK Property
  {
    id: 'bnk-jk-002',
    bankName: 'UNIONBANK',
    accountName: 'JK Property and Ventures Commercial',
    accountNumber: '1099-4412-8801',
    companyName: 'JK Property and Ventures',
    accountType: 'Checking',
    branch: 'Ortigas Corporate Center, Pasig',
    startingBalance: 3650000,
    currentBalance: 3650000,
    colorTheme: 'red',
    createdAt: '2026-01-15',
    notes: 'Commercial mall leasing and tenant escrow collections pool.',
    transactions: [
      {
        id: 'tx-jk-01',
        date: '10/01/26',
        chequeNo: '—',
        particulars: 'Tenant Stall #12 Rent Settlement',
        deposit: 45000,
        category: 'Bank Transfer',
        netAmount: 45000,
      },
      {
        id: 'tx-jk-02',
        date: '10/02/26',
        chequeNo: 'CHQ-4401',
        particulars: 'Plaza Janitorial & Facility Security',
        withdrawal: 32000,
        category: 'Cheque',
        netAmount: 32000,
      },
      {
        id: 'tx-jk-03',
        date: '10/03/26',
        chequeNo: '—',
        particulars: 'Meralco Commercial Plaza Electricity',
        withdrawal: 88500,
        category: 'Bank Transfer',
        netAmount: 88500,
      },
    ],
  },
  // 3. Hotel
  {
    id: 'bnk-ht-003',
    bankName: 'BPI',
    accountName: 'MCT Hotel & Suites Operations',
    accountNumber: '0821-4490-1123',
    companyName: 'MCT Hotel',
    accountType: 'Checking',
    branch: 'Commonwealth Ave., Quezon City',
    startingBalance: 3890000,
    currentBalance: 3890000,
    colorTheme: 'red',
    createdAt: '2026-01-20',
    notes: 'Front desk merchant terminal settlement and hospitality reservations.',
    transactions: [
      {
        id: 'tx-ht-01',
        date: '10/01/26',
        chequeNo: '—',
        particulars: 'Weekend Room Bookings Merchant Batch',
        deposit: 215000,
        category: 'Bank Transfer',
        netAmount: 215000,
      },
      {
        id: 'tx-ht-02',
        date: '10/02/26',
        chequeNo: 'CHQ-5512',
        particulars: 'Linen & Laundry Supplies Vendor',
        withdrawal: 28400,
        category: 'Cheque',
        netAmount: 28400,
      },
    ],
  },
  // 4. Kitchen
  {
    id: 'bnk-kt-004',
    bankName: 'BDO UNIBANK',
    accountName: 'MCT Kitchen Operations Corp.',
    accountNumber: '0042-8819-2041',
    companyName: 'MCT Kitchen',
    accountType: 'Checking',
    branch: 'Fairview Regalado Branch, Quezon City',
    startingBalance: 2450000,
    currentBalance: 2450000,
    colorTheme: 'red',
    createdAt: '2026-01-25',
    notes: 'Main commercial kitchen and commissary supply accounts.',
    transactions: [
      {
        id: 'tx-kt-01',
        date: '10/01/26',
        chequeNo: '—',
        particulars: 'Daily Commissary Sales Settlement',
        deposit: 125000,
        category: 'Bank Transfer',
        netAmount: 125000,
      },
      {
        id: 'tx-kt-02',
        date: '10/02/26',
        chequeNo: 'CHQ-7721',
        particulars: 'Fresh Meat & Produce Wholesaler',
        withdrawal: 64200,
        category: 'Cheque',
        netAmount: 64200,
      },
    ],
  },
  // 5. MedSys
  {
    id: 'bnk-ms-005',
    bankName: 'METROBANK',
    accountName: 'MedSys Clinical Healthcare Corp.',
    accountNumber: '2190-8831-5501',
    companyName: 'MedSys',
    accountType: 'Savings',
    branch: 'St. Luke’s Medical Hub, Quezon City',
    startingBalance: 1780000,
    currentBalance: 1780000,
    colorTheme: 'red',
    createdAt: '2026-02-01',
    notes: 'Pharmaceutical supplies and medical diagnostic operations.',
    transactions: [
      {
        id: 'tx-ms-01',
        date: '10/01/26',
        chequeNo: '—',
        particulars: 'Diagnostic Clinic Client Collections',
        deposit: 94000,
        category: 'Bank Transfer',
        netAmount: 94000,
      },
      {
        id: 'tx-ms-02',
        date: '10/03/26',
        chequeNo: 'CHQ-3310',
        particulars: 'Laboratory Reagents Procurement',
        withdrawal: 41200,
        category: 'Cheque',
        netAmount: 41200,
      },
    ],
  },
  // 6. Speedfire
  {
    id: 'bnk-sf-006',
    bankName: 'RCBC',
    accountName: 'Speedfire Express Logistics',
    accountNumber: '0912-7744-3319',
    companyName: 'Speedfire',
    accountType: 'Savings',
    branch: 'Novaliches Logistics Hub, Quezon City',
    startingBalance: 670000,
    currentBalance: 670000,
    colorTheme: 'red',
    createdAt: '2026-02-05',
    notes: 'Fleet maintenance and courier operational settlement.',
    transactions: [
      {
        id: 'tx-sf-01',
        date: '10/01/26',
        chequeNo: '—',
        particulars: 'E-commerce Delivery Remittance',
        deposit: 78500,
        category: 'Cash',
        netAmount: 78500,
      },
      {
        id: 'tx-sf-02',
        date: '10/02/26',
        chequeNo: 'CHQ-9901',
        particulars: 'Fleet Maintenance & Engine Overhaul',
        withdrawal: 35000,
        category: 'Cheque',
        netAmount: 35000,
      },
    ],
  },

  // ---------------- GREY / DARK CARDS STACK ----------------
  // 7. College Foundation
  {
    id: 'bnk-cf-007',
    bankName: 'SECURITY BANK',
    accountName: 'College Foundation Educational Institute',
    accountNumber: '0310-4491-7720',
    companyName: 'College Foundation',
    accountType: 'Checking',
    branch: 'Katipunan Ave., Loyola Heights, QC',
    startingBalance: 4200000,
    currentBalance: 4200000,
    colorTheme: 'grey',
    createdAt: '2026-02-10',
    notes: 'Tuition fees escrow and academic faculty payroll pool.',
    transactions: [
      {
        id: 'tx-cf-01',
        date: '10/01/26',
        chequeNo: '—',
        particulars: 'Semester Enrollment Tuition Remittance',
        deposit: 340000,
        category: 'Bank Transfer',
        netAmount: 340000,
      },
      {
        id: 'tx-cf-02',
        date: '10/03/26',
        chequeNo: 'CHQ-1205',
        particulars: 'Library Learning Software License',
        withdrawal: 52000,
        category: 'Cheque',
        netAmount: 52000,
      },
    ],
  },
  // 8. Trading Corp.
  {
    id: 'bnk-tc-008',
    bankName: 'LANDBANK',
    accountName: 'Trading Corp. Wholesale Distributors',
    accountNumber: '1840-2291-7703',
    companyName: 'Trading Corp.',
    accountType: 'Savings',
    branch: 'Bocaue Bulacan Commercial Hub',
    startingBalance: 1250000,
    currentBalance: 1250000,
    colorTheme: 'grey',
    createdAt: '2026-02-15',
    notes: 'Grain trading, bulk wholesale & food staples procurement.',
    transactions: [
      {
        id: 'tx-tc-01',
        date: '10/01/26',
        chequeNo: '—',
        particulars: 'Wholesale Rice & Flour Dispatch Deposit',
        deposit: 195000,
        category: 'Bank Transfer',
        netAmount: 195000,
      },
      {
        id: 'tx-tc-02',
        date: '10/02/26',
        chequeNo: 'CHQ-8810',
        particulars: 'Bulk Cargo Transport Freight',
        withdrawal: 48000,
        category: 'Cheque',
        netAmount: 48000,
      },
    ],
  },
  // 9. Filcam Prime
  {
    id: 'bnk-fp-009',
    bankName: 'METROBANK',
    accountName: 'FilCap Prime Holdings Corp. Lending',
    accountNumber: '2190-3382-7714',
    companyName: 'FilCap Prime Holdings Corp.',
    accountType: 'Checking',
    branch: 'Quezon Ave. Corporate Center, QC',
    startingBalance: 5200000,
    currentBalance: 5200000,
    colorTheme: 'grey',
    createdAt: '2026-02-20',
    notes: 'Micro-credit credit disbursement and daily repayments escrow.',
    transactions: [
      {
        id: 'tx-fp-01',
        date: '10/01/26',
        chequeNo: '—',
        particulars: 'Everyday Borrower Repayments Pool',
        deposit: 82500,
        category: 'Cash',
        netAmount: 82500,
      },
      {
        id: 'tx-fp-02',
        date: '10/02/26',
        chequeNo: 'CHQ-6601',
        particulars: 'SME Retail Facility Disbursal',
        withdrawal: 150000,
        category: 'Cheque',
        netAmount: 150000,
      },
    ],
  },
  // 10. Golden Jupiter
  {
    id: 'bnk-gj-010',
    bankName: 'CHINABANK',
    accountName: 'Golden Jupiter Holdings Corp.',
    accountNumber: '1088-5521-9944',
    companyName: 'Golden Jupiter',
    accountType: 'Checking',
    branch: 'Binondo Financial District, Manila',
    startingBalance: 2800000,
    currentBalance: 2800000,
    colorTheme: 'grey',
    createdAt: '2026-02-25',
    notes: 'Central holding investments & property asset management pool.',
    transactions: [
      {
        id: 'tx-gj-01',
        date: '10/01/26',
        chequeNo: '—',
        particulars: 'Commercial Unit Dividend Deposit',
        deposit: 160000,
        category: 'Bank Transfer',
        netAmount: 160000,
      },
      {
        id: 'tx-gj-02',
        date: '10/03/26',
        chequeNo: 'CHQ-2209',
        particulars: 'Corporate Audit & Legal Retainer',
        withdrawal: 75000,
        category: 'Cheque',
        netAmount: 75000,
      },
    ],
  },
  // 11. Bookworld Systems Solutions & Technologies
  {
    id: 'bnk-bw-011',
    bankName: 'PNB',
    accountName: 'Bookworld Systems Solutions & Tech Corp.',
    accountNumber: '1420-9981-6632',
    companyName: 'Bookworld Systems Solutions & Technologies',
    accountType: 'Checking',
    branch: 'Macapagal Blvd., Pasay City',
    startingBalance: 920000,
    currentBalance: 920000,
    colorTheme: 'grey',
    createdAt: '2026-03-01',
    notes: 'Enterprise IT infrastructure, POS terminals & cloud licenses.',
    transactions: [
      {
        id: 'tx-bw-01',
        date: '10/01/26',
        chequeNo: '—',
        particulars: 'ERP Cloud Maintenance Subscription',
        deposit: 110000,
        category: 'Bank Transfer',
        netAmount: 110000,
      },
      {
        id: 'tx-bw-02',
        date: '10/02/26',
        chequeNo: 'CHQ-4450',
        particulars: 'Data Center Colocation Hosting',
        withdrawal: 38500,
        category: 'Cheque',
        netAmount: 38500,
      },
    ],
  },
  // 12. Annex Nine
  {
    id: 'bnk-an-012',
    bankName: 'BDO UNIBANK',
    accountName: 'Annex Nine Commercial Hub',
    accountNumber: '0042-5510-9922',
    companyName: 'Annex Nine',
    accountType: 'Checking',
    branch: 'Fairview Regalado Branch, QC',
    startingBalance: 845000,
    currentBalance: 845000,
    colorTheme: 'grey',
    createdAt: '2026-03-05',
    notes: 'Retail strip utilities & maintenance escrow.',
    transactions: [
      {
        id: 'tx-an-01',
        date: '10/01/26',
        chequeNo: '—',
        particulars: 'Retail Stall Utility Reimbursement',
        deposit: 38000,
        category: 'Cash',
        netAmount: 38000,
      },
    ],
  },
  // 13. JK Cafe
  {
    id: 'bnk-jc-013',
    bankName: 'SECURITY BANK',
    accountName: 'JK Cafe Food & Beverages Corp.',
    accountNumber: '0310-9921-5542',
    companyName: 'JK Cafe',
    accountType: 'Checking',
    branch: 'UP Technohub Branch, Diliman, QC',
    startingBalance: 1120000,
    currentBalance: 1120000,
    colorTheme: 'red',
    createdAt: '2026-03-10',
    notes: 'Coffee beans, bakery commissary & daily POS collections.',
    transactions: [
      {
        id: 'tx-jc-01',
        date: '10/01/26',
        chequeNo: '—',
        particulars: 'Daily Storefront Cash Collections',
        deposit: 62000,
        category: 'Cash',
        netAmount: 62000,
      },
    ],
  },
  // 14. Merillon
  {
    id: 'bnk-mr-014',
    bankName: 'UNIONBANK',
    accountName: 'Merillon Printing & Packaging Hub',
    accountNumber: '1099-6612-3304',
    companyName: 'Merillon',
    accountType: 'Checking',
    branch: 'East Bank Road, Pasig City',
    startingBalance: 760000,
    currentBalance: 760000,
    colorTheme: 'grey',
    createdAt: '2026-03-15',
    notes: 'Industrial packaging paper stock & printing ink supplier payments.',
    transactions: [
      {
        id: 'tx-mr-01',
        date: '10/01/26',
        chequeNo: '—',
        particulars: 'Corrugated Box Order Batch Deposit',
        deposit: 89000,
        category: 'Bank Transfer',
        netAmount: 89000,
      },
    ],
  },
]

export const BankManagementPage: React.FC = () => {
  const { user } = useSession()
  const userRole = (user?.role || '').toLowerCase()
  const isAdmin = userRole === 'admin'
  const isFinance = userRole === 'finance'
  const isAudit = userRole === 'audit' || userRole.includes('auditor')
  const isCompanyScoped = !isAdmin && !isFinance && !isAudit
  const assignedCompany = user?.assignedCompany || 'MCT Kitchen'

  // Document title
  React.useEffect(() => {
    document.title = 'Bank Management - MCT Group'
  }, [])

  // Persistent storage for bank accounts
  const [accounts, setAccounts] = React.useState<BankAccount[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed
          }
        }
      } catch (err) {
        console.error('Error loading bank accounts:', err)
      }
    }
    return INITIAL_ACCOUNTS
  })

  // Synchronize with local storage
  const saveAccounts = React.useCallback((newAccounts: BankAccount[]) => {
    setAccounts(newAccounts)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newAccounts))
      } catch (err) {
        console.error('Error saving bank accounts:', err)
      }
    }
  }, [])

  // Company filtering state
  const [selectedCompany, setSelectedCompany] = React.useState<string>(() => {
    if (isCompanyScoped) return assignedCompany
    return 'All Companies'
  })

  React.useEffect(() => {
    if (isCompanyScoped) {
      setSelectedCompany(assignedCompany)
    }
  }, [isCompanyScoped, assignedCompany])

  // Active selected bank account (defaults to first account matching company scope)
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>(() => {
    if (isCompanyScoped) {
      const match = INITIAL_ACCOUNTS.find((a) =>
        a.companyName.toLowerCase().includes(assignedCompany.toLowerCase())
      )
      return match ? match.id : INITIAL_ACCOUNTS[0].id
    }
    return INITIAL_ACCOUNTS[0].id
  })

  // Toggle privacy of balance on the big card
  const [showBalance, setShowBalance] = React.useState(true)

  // Filters state
  const [tableSearchQuery, setTableSearchQuery] = React.useState('')
  const [txTypeFilter, setTxTypeFilter] = React.useState<'All' | 'Deposit' | 'Withdrawal'>('All')
  const [dateRange, setDateRange] = React.useState<DateRange>({
    startDate: '2026-10-01',
    endDate: '2026-10-05',
    label: '10/01/2026 - 10/05/2026',
    preset: 'Custom',
  })

  // Pagination for transaction table
  const [currentPage, setCurrentPage] = React.useState(1)

  // Dropdown states
  const [isExportDropdownOpen, setIsExportDropdownOpen] = React.useState(false)
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = React.useState(false)
  const [isTxTypeDropdownOpen, setIsTxTypeDropdownOpen] = React.useState(false)
  const exportDropdownRef = React.useRef<HTMLDivElement>(null)
  const companyDropdownRef = React.useRef<HTMLDivElement>(null)
  const txTypeDropdownRef = React.useRef<HTMLDivElement>(null)

  // Modals state
  const [isAddBankModalOpen, setIsAddBankModalOpen] = React.useState(false)
  const [isDepositModalOpen, setIsDepositModalOpen] = React.useState(false)
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = React.useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [isCardDetailsModalOpen, setIsCardDetailsModalOpen] = React.useState(false)
  const [isActivityLogOpen, setIsActivityLogOpen] = React.useState(false)
  const lastTapRef = React.useRef<number>(0)

  // Modal form states
  const [addBankSuccessMessage, setAddBankSuccessMessage] = React.useState<string | null>(null)
  const [addBankForm, setAddBankForm] = React.useState({
    bankName: 'CHINABANK',
    accountName: '',
    accountNumber: '',
    companyName: isCompanyScoped ? assignedCompany : '',
    accountType: 'Checking' as BankAccount['accountType'],
    branch: '',
    startingBalance: '',
    colorTheme: 'red' as 'red' | 'grey',
    notes: '',
  })

  const [depositForm, setDepositForm] = React.useState({
    amount: '',
    date: '10/01/26',
    particulars: '',
    category: 'Bank Transfer',
    referenceNo: '',
  })

  const [withdrawForm, setWithdrawForm] = React.useState({
    amount: '',
    date: '10/01/26',
    chequeNo: '',
    particulars: '',
    category: 'Cheque',
  })


  // Click outside listener for dropdowns
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(target)) {
        setIsExportDropdownOpen(false)
      }
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(target)) {
        setIsCompanyDropdownOpen(false)
      }
      if (txTypeDropdownRef.current && !txTypeDropdownRef.current.contains(target)) {
        setIsTxTypeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter accounts accessible by role
  const roleScopedAccounts = React.useMemo(() => {
    if (isCompanyScoped) {
      return accounts.filter((a) =>
        a.companyName.toLowerCase().includes(assignedCompany.toLowerCase())
      )
    }
    if (selectedCompany !== 'All Companies') {
      return accounts.filter((a) =>
        a.companyName.toLowerCase().trim() === selectedCompany.toLowerCase().trim()
      )
    }
    return accounts
  }, [accounts, isCompanyScoped, assignedCompany, selectedCompany])

  // Currently selected active bank account
  const activeAccount = React.useMemo(() => {
    const found = roleScopedAccounts.find((a) => a.id === selectedAccountId)
    if (found) return found
    return roleScopedAccounts[0] || accounts[0]
  }, [roleScopedAccounts, selectedAccountId, accounts])

  // Edit form state with accountName, branch, startingBalance (view-only), currentBalance, and notes
  const [editAccountForm, setEditAccountForm] = React.useState({
    accountName: '',
    branch: '',
    startingBalance: 0,
    currentBalance: '',
    notes: '',
  })

  React.useEffect(() => {
    if (activeAccount) {
      setEditAccountForm({
        accountName: activeAccount.accountName,
        branch: activeAccount.branch,
        startingBalance: activeAccount.startingBalance,
        currentBalance: activeAccount.currentBalance.toString(),
        notes: activeAccount.notes || '',
      })
    }
  }, [activeAccount])

  const handleSaveEditAccount = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAccount) return

    const parsedCurrent = parseFloat(editAccountForm.currentBalance)

    const updatedAccount: BankAccount = {
      ...activeAccount,
      accountName: editAccountForm.accountName.trim() || activeAccount.accountName,
      branch: editAccountForm.branch.trim() || activeAccount.branch,
      currentBalance: !isNaN(parsedCurrent) ? parsedCurrent : activeAccount.currentBalance,
      notes: editAccountForm.notes.trim(),
    }

    const updated = accounts.map((a) => (a.id === activeAccount.id ? updatedAccount : a))
    saveAccounts(updated)
    setIsEditModalOpen(false)
  }

  // Keep selectedAccountId valid when filter changes
  React.useEffect(() => {
    if (roleScopedAccounts.length > 0) {
      const exists = roleScopedAccounts.some((a) => a.id === selectedAccountId)
      if (!exists) {
        setSelectedAccountId(roleScopedAccounts[0].id)
      }
    }
  }, [roleScopedAccounts, selectedAccountId])

  // Canonical Red Deck Stack Accounts (Ordered matching screenshot: Bagong Bansa, JK Property, Hotel, Kitchen, MedSys, Speedfire)
  const redStackAccounts = React.useMemo(() => {
    const list = roleScopedAccounts.filter(
      (a) =>
        a.colorTheme === 'red' ||
        ['bagong', 'jk', 'hotel', 'kitchen', 'medsys', 'speedfire', 'annex', 'cafe'].some((term) =>
          a.companyName.toLowerCase().includes(term)
        )
    )
    const priority = ['bagong bansa', 'jk property', 'hotel', 'kitchen', 'medsys', 'speedfire']
    return [...list].sort((a, b) => {
      const idxA = priority.findIndex((p) => a.companyName.toLowerCase().includes(p))
      const idxB = priority.findIndex((p) => b.companyName.toLowerCase().includes(p))
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return 0
    })
  }, [roleScopedAccounts])

  // Canonical Grey Deck Stack Accounts (Ordered matching screenshot: College Foundation, Trading Corp., Filcam Prime, Golden Jupiter, Bookworld)
  const greyStackAccounts = React.useMemo(() => {
    const list = roleScopedAccounts.filter(
      (a) =>
        a.colorTheme === 'grey' ||
        ['college', 'trading', 'filc', 'jupiter', 'bookworld', 'merillon'].some((term) =>
          a.companyName.toLowerCase().includes(term)
        )
    )
    const priority = ['college', 'trading', 'filc', 'jupiter', 'bookworld']
    return [...list].sort((a, b) => {
      const idxA = priority.findIndex((p) => a.companyName.toLowerCase().includes(p))
      const idxB = priority.findIndex((p) => b.companyName.toLowerCase().includes(p))
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return 0
    })
  }, [roleScopedAccounts])

  // Single-account / single-company mode:
  // If role is company-scoped, or if Finance/Audit chose a specific company from the dropdown,
  // or if there is only 1 account, display as ONE full-width ATM card only.
  const isSingleAccount = isCompanyScoped || selectedCompany !== 'All Companies' || roleScopedAccounts.length <= 1

  // Accounts belonging to the active company (supports multi-bank up to 3 banks per company)
  const activeCompanyAccounts = React.useMemo(() => {
    if (!activeAccount) return []
    const targetComp = activeAccount.companyName.toLowerCase().trim()
    return accounts.filter((a) => a.companyName.toLowerCase().trim() === targetComp)
  }, [accounts, activeAccount])

  // Double-click and tap listeners for ATM Card
  const clickCountRef = React.useRef(0)
  const clickTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button')) return

    clickCountRef.current += 1
    if (clickCountRef.current === 1) {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0
      }, 450)
    } else if (clickCountRef.current >= 2) {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
      clickCountRef.current = 0
      setIsCardDetailsModalOpen(true)
    }
  }

  const handleCardTouch = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button')) return

    const now = Date.now()
    if (now - lastTapRef.current < 450) {
      setIsCardDetailsModalOpen(true)
    }
    lastTapRef.current = now
  }

  // Compute running historical balance for each transaction (newest to oldest)
  const transactionsWithRunningBalance = React.useMemo(() => {
    if (!activeAccount || !activeAccount.transactions) return []
    let current = activeAccount.currentBalance
    const result: (BankTransaction & { runningBalance: number })[] = []

    for (let i = 0; i < activeAccount.transactions.length; i++) {
      const tx = activeAccount.transactions[i]
      result.push({
        ...tx,
        runningBalance: current,
      })
      // Adjust balance backwards to calculate previous row's balance
      const dep = tx.deposit || 0
      const wth = tx.withdrawal || 0
      current = current - dep + wth
    }
    return result
  }, [activeAccount])

  // Filtered transactions of the currently selected bank account
  const filteredTransactions = React.useMemo(() => {
    let list = [...transactionsWithRunningBalance]

    if (txTypeFilter === 'Deposit') {
      list = list.filter((t) => typeof t.deposit === 'number' && t.deposit > 0)
    } else if (txTypeFilter === 'Withdrawal') {
      list = list.filter((t) => typeof t.withdrawal === 'number' && t.withdrawal > 0)
    }

    const q = tableSearchQuery.toLowerCase().trim()
    if (q) {
      list = list.filter((t) => {
        const matchParticulars = t.particulars.toLowerCase().includes(q)
        const matchCheque = (t.chequeNo || '').toLowerCase().includes(q)
        const matchCategory = t.category.toLowerCase().includes(q)
        const matchDate = t.date.toLowerCase().includes(q)
        const matchBal = t.runningBalance.toString().includes(q)
        return matchParticulars || matchCheque || matchCategory || matchDate || matchBal
      })
    }

    return list
  }, [transactionsWithRunningBalance, tableSearchQuery, txTypeFilter])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE))
  const paginatedTransactions = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredTransactions, currentPage])

  // Reset page when search, account, or tx type filter changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [selectedAccountId, tableSearchQuery, txTypeFilter])

  // Distinct company list for filter dropdown
  const companyOptions = React.useMemo(() => {
    const set = new Set<string>()
    accounts.forEach((a) => set.add(a.companyName))
    return ['All Companies', ...Array.from(set)]
  }, [accounts])

  // Handlers for Finance / Admin
  const createBankAccount = (keepModalOpen: boolean) => {
    if (isAudit || isCompanyScoped) return

    const startingNum = parseFloat(addBankForm.startingBalance) || 0
    const companyAssigned = addBankForm.companyName.trim() || 'General Treasury / Unassigned'
    const customAccNo = addBankForm.accountNumber.trim()
    const autoAccNo = `BNK-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`

    // Count existing banks for this company
    const existingCompanyBanks = accounts.filter(
      (a) => a.companyName.toLowerCase().trim() === companyAssigned.toLowerCase().trim()
    ).length

    const newAccount: BankAccount = {
      id: `bnk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bankName: addBankForm.bankName.trim().toUpperCase(),
      accountName: addBankForm.accountName.trim() || `${companyAssigned} (${addBankForm.bankName.toUpperCase()})`,
      accountNumber: customAccNo || autoAccNo,
      companyName: companyAssigned,
      cardLabel: addBankForm.accountName.trim() || companyAssigned,
      accountType: addBankForm.accountType,
      branch: addBankForm.branch.trim() || 'Central Corporate Branch',
      startingBalance: startingNum,
      currentBalance: startingNum,
      colorTheme: addBankForm.colorTheme,
      createdAt: new Date().toISOString().split('T')[0],
      notes: addBankForm.notes.trim(),
      transactions: [],
    }

    const updated = [newAccount, ...accounts]
    saveAccounts(updated)
    setSelectedAccountId(newAccount.id)

    if (keepModalOpen) {
      setAddBankSuccessMessage(
        `✓ ${newAccount.bankName} (${newAccount.accountType}) created for ${companyAssigned}! You can now register another bank facility (Account #${existingCompanyBanks + 2}).`
      )
      setAddBankForm((prev) => ({
        ...prev,
        bankName:
          prev.bankName === 'CHINABANK'
            ? 'BDO UNIBANK'
            : prev.bankName === 'BDO UNIBANK'
            ? 'BPI'
            : 'METROBANK',
        accountName: '',
        accountNumber: '',
        accountType: prev.accountType === 'Checking' ? 'Savings' : 'Checking',
        startingBalance: '',
        branch: prev.branch,
        notes: '',
      }))
    } else {
      setIsAddBankModalOpen(false)
      setAddBankSuccessMessage(null)
      setAddBankForm({
        bankName: 'CHINABANK',
        accountName: '',
        accountNumber: '',
        companyName: isCompanyScoped ? assignedCompany : '',
        accountType: 'Checking',
        branch: '',
        startingBalance: '',
        colorTheme: 'red',
        notes: '',
      })
    }
  }

  const handleCreateBank = (e: React.FormEvent) => {
    e.preventDefault()
    createBankAccount(false)
  }

  const handleCreateBankAndAddAnother = (e: React.MouseEvent) => {
    e.preventDefault()
    createBankAccount(true)
  }

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isAudit || isCompanyScoped || !activeAccount) return

    const amountNum = parseFloat(depositForm.amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid deposit amount.')
      return
    }

    const newTx: BankTransaction = {
      id: `tx-${Date.now()}`,
      date: depositForm.date || '10/01/26',
      chequeNo: depositForm.referenceNo.trim() || '—',
      particulars: depositForm.particulars.trim() || 'Deposit Remittance',
      deposit: amountNum,
      category: depositForm.category,
      netAmount: amountNum,
      timestamp: new Date().toISOString(),
    }

    const updatedAccount: BankAccount = {
      ...activeAccount,
      currentBalance: activeAccount.currentBalance + amountNum,
      transactions: [newTx, ...activeAccount.transactions],
    }

    const updated = accounts.map((a) => (a.id === activeAccount.id ? updatedAccount : a))
    saveAccounts(updated)
    setIsDepositModalOpen(false)
    setDepositForm({
      amount: '',
      date: '10/01/26',
      particulars: '',
      category: 'Bank Transfer',
      referenceNo: '',
    })
  }

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault()
    if (isAudit || isCompanyScoped || !activeAccount) return

    const amountNum = parseFloat(withdrawForm.amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid withdrawal amount.')
      return
    }

    if (amountNum > activeAccount.currentBalance) {
      alert(`Withdrawal amount (₱${amountNum.toLocaleString()}) cannot exceed the available bank balance of ₱${activeAccount.currentBalance.toLocaleString()}.`)
      return
    }

    const newTx: BankTransaction = {
      id: `tx-${Date.now()}`,
      date: withdrawForm.date || '10/01/26',
      chequeNo: withdrawForm.chequeNo.trim() || '—',
      particulars: withdrawForm.particulars.trim() || 'Withdrawal Settlement',
      withdrawal: amountNum,
      category: withdrawForm.category,
      netAmount: amountNum,
      timestamp: new Date().toISOString(),
    }

    const updatedAccount: BankAccount = {
      ...activeAccount,
      currentBalance: activeAccount.currentBalance - amountNum,
      transactions: [newTx, ...activeAccount.transactions],
    }

    const updated = accounts.map((a) => (a.id === activeAccount.id ? updatedAccount : a))
    saveAccounts(updated)
    setIsWithdrawModalOpen(false)
    setWithdrawForm({
      amount: '',
      date: '10/01/26',
      chequeNo: '',
      particulars: '',
      category: 'Cheque',
    })
  }

  // Export handlers
  const handleExportCsv = () => {
    setIsExportDropdownOpen(false)
    if (!activeAccount) return

    const headers = ['Date', 'Cheque No.', 'Particulars', 'Withdrawal', 'Deposit', 'Category', 'Current Balance']
    const rows = filteredTransactions.map((t) => [
      t.date,
      t.chequeNo || '—',
      `"${t.particulars.replace(/"/g, '""')}"`,
      t.withdrawal ? t.withdrawal : '',
      t.deposit ? t.deposit : '',
      t.category,
      t.runningBalance,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `bank_transactions_${activeAccount.bankName}_${activeAccount.companyName.replace(/\s+/g, '_')}_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportPdf = () => {
    setIsExportDropdownOpen(false)
    if (!activeAccount) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const rowsHtml =
      filteredTransactions.length === 0
        ? `<tr><td colspan="7" style="padding: 20px; text-align: center; color: #64748B;">No transactions recorded.</td></tr>`
        : filteredTransactions
            .map(
              (t) => `
          <tr>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">${t.date}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px; font-weight: 600;">${t.chequeNo || '—'}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${t.particulars}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #e11d48; font-weight: 600;">${t.withdrawal ? `₱${t.withdrawal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: #16a34a; font-weight: 600;">${t.deposit ? `₱${t.deposit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${t.category}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: 700;">₱${t.runningBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
          </tr>
        `
            )
            .join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${activeAccount.companyName} - ${activeAccount.bankName} Statement</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0F172A; padding: 24px; }
            h1 { font-size: 18px; margin: 0 0 4px; color: #960C01; }
            p { font-size: 12px; color: #64748B; margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #F8FAFC; text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748B; border-bottom: 2px solid #CBD5E1; }
            .summary { margin-top: 20px; padding: 12px 16px; background-color: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0; display: flex; justify-content: space-between; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>MCT Financial Management - Bank Management</h1>
          <p>Bank Statement for <strong>${activeAccount.companyName}</strong> · Bank: <strong>${activeAccount.bankName} (${activeAccount.accountNumber})</strong> · Current Balance: <strong>₱${activeAccount.currentBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Cheque No.</th>
                <th>Particulars</th>
                <th style="text-align: right;">Withdrawal</th>
                <th style="text-align: right;">Deposit</th>
                <th>Category</th>
                <th style="text-align: right;">Current Balance</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-6 pb-12 max-w-[1600px] mx-auto animate-in fade-in duration-300 select-none">
      {/* 1. Header & Controls (Matching Reference Screenshot) */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-focus tracking-tight">
            Bank Management
          </h1>
          <p className="text-sm sm:text-base text-muted-fg font-normal mt-1">
            {roleScopedAccounts.length} {roleScopedAccounts.length === 1 ? 'account.' : 'accounts.'}
          </p>
        </div>

        {/* Action Controls & Filters in 2 stacked rows (Matching screenshot) */}
        <div className="flex flex-col items-start sm:items-end gap-2.5 self-start sm:self-auto">
          {/* Row 1: Export and Add New Bank */}
          <div className="flex items-center gap-2.5">
            {/* Export Button matching System One UI red styling */}
            <div ref={exportDropdownRef} className="relative inline-block">
              <Button
                type="button"
                onClick={() => setIsExportDropdownOpen((prev) => !prev)}
                className="h-9 sm:h-9.5 px-4 sm:px-5 rounded-full bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer box-border border-transparent"
              >
                <Download className="h-4 w-4 text-white shrink-0" />
                <span>Export</span>
                <ChevronDown className="h-3.5 w-3.5 text-white/90 shrink-0" />
              </Button>

              {isExportDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-stroke/30 shadow-xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-focus/90 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Download as CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-focus/90 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Download as PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* Add New Bank Button (Finance & Admin only) */}
            {!isAudit && !isCompanyScoped && (
              <Button
                type="button"
                onClick={() => setIsAddBankModalOpen(true)}
                className="h-9 sm:h-9.5 px-4 sm:px-5 rounded-full bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer box-border"
              >
                <span>Add New Bank</span>
              </Button>
            )}
          </div>

          {/* Row 2: Date Range, Company Selector, and Activity Log */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Range Button / Display */}
            <DateRangePicker
              value={dateRange}
              onChange={(newRange) => setDateRange(newRange)}
              hidePresets
            />

            {/* Company Dropdown / Badge */}
            {isCompanyScoped ? (
              <div className="inline-flex items-center gap-1.5 h-9 sm:h-9.5 px-4 rounded-full border border-stroke/60 bg-slate-50 text-focus text-xs sm:text-sm font-medium shadow-xs shrink-0 whitespace-nowrap">
                <Building2 className="h-4 w-4 text-muted-fg shrink-0" />
                <span className="font-semibold text-focus/90 truncate max-w-[160px]">
                  {assignedCompany}
                </span>
              </div>
            ) : (
              <div ref={companyDropdownRef} className="relative inline-block">
                <button
                  type="button"
                  onClick={() => setIsCompanyDropdownOpen((prev) => !prev)}
                  className={cn(
                    'inline-flex items-center gap-2 h-9 sm:h-9.5 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border',
                    isCompanyDropdownOpen && 'ring-2 ring-slate-100 border-slate-300'
                  )}
                >
                  <span className="font-semibold text-focus/90 truncate max-w-[140px]">
                    {selectedCompany === 'All Companies' ? 'Company' : selectedCompany}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-fg shrink-0" />
                </button>

                {isCompanyDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-stroke/30 shadow-2xl p-2.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150 max-h-72 overflow-y-auto">
                    <div className="space-y-1">
                      {companyOptions.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setSelectedCompany(c)
                            setIsCompanyDropdownOpen(false)
                          }}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer',
                            selectedCompany === c
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'text-focus/80 hover:bg-slate-50'
                          )}
                        >
                          <span className="truncate">{c}</span>
                          {selectedCompany === c && (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Deposit / Withdraw Dropdown Filter (Replacing Activity Log button, applied to all: audit, finance, companies) */}
            <div ref={txTypeDropdownRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => {
                  setIsTxTypeDropdownOpen((prev) => !prev)
                  setIsCompanyDropdownOpen(false)
                  setIsExportDropdownOpen(false)
                }}
                className={cn(
                  'inline-flex items-center gap-2 h-9 sm:h-9.5 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border',
                  isTxTypeDropdownOpen && 'ring-2 ring-slate-100 border-slate-300'
                )}
              >
                <span className="font-semibold text-focus/90 truncate max-w-[150px]">
                  {txTypeFilter === 'All' ? 'Deposit / Withdraw' : txTypeFilter}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-fg shrink-0" />
              </button>

              {isTxTypeDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-stroke/30 shadow-2xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  <div className="space-y-1">
                    {[
                      { label: 'All Transactions', value: 'All' as const },
                      { label: 'Deposit', value: 'Deposit' as const },
                      { label: 'Withdrawal', value: 'Withdrawal' as const },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setTxTypeFilter(opt.value)
                          setIsTxTypeDropdownOpen(false)
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer',
                          txTypeFilter === opt.value
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-focus/80 hover:bg-slate-50'
                        )}
                      >
                        <span>{opt.label}</span>
                        {txTypeFilter === opt.value && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Bank Cards Hero Section: Full-Width for Single Account, Grid for Multi Accounts */}
      {isSingleAccount ? (
        /* SINGLE ACCOUNT FULL-WIDTH HERO CARD (Matching User's Reference Screenshot) */
        <div className="w-full space-y-3">
          {/* Multi-Bank Switcher Pill Bar (When company has 1, 2, or 3 banks) */}
          {activeCompanyAccounts.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2.5 px-1 py-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-fg uppercase tracking-wider mr-1">
                  Banks ({activeCompanyAccounts.length}/3):
                </span>
                {activeCompanyAccounts.map((acc) => {
                  const isActive = acc.id === activeAccount?.id
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setSelectedAccountId(acc.id)}
                      className={cn(
                        'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs',
                        isActive
                          ? 'bg-[#960C01] text-white ring-2 ring-[#960C01]/30 shadow-sm'
                          : 'bg-white hover:bg-slate-50 text-focus/80 border border-stroke/50'
                      )}
                    >
                      <CreditCard className="h-3.5 w-3.5 shrink-0 opacity-80" />
                      <span>
                        {acc.bankName}
                        <span className="ml-1 text-[11px] font-normal opacity-80">
                          ({acc.accountType})
                        </span>
                      </span>
                      {isActive && <Check className="h-3 w-3 text-white ml-0.5" />}
                    </button>
                  )
                })}
              </div>

              {/* Finance option to add another bank for this company */}
              {!isAudit && !isCompanyScoped && activeCompanyAccounts.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAddBankForm((prev) => ({
                      ...prev,
                      companyName: activeAccount?.companyName || '',
                    }))
                    setIsAddBankModalOpen(true)
                  }}
                  className="h-8 px-3 rounded-full border border-dashed border-[#960C01]/50 text-[#960C01] hover:bg-red-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Another Bank for this Company</span>
                </Button>
              )}
            </div>
          )}
          <div
            onClick={handleCardClick}
            onDoubleClick={() => setIsCardDetailsModalOpen(true)}
            onTouchEnd={handleCardTouch}
            title="Double-click or click 'View Details' to inspect complete bank facility details"
            className={cn(
              'w-full rounded-[28px] sm:rounded-[36px] p-6 sm:p-8 md:p-10 text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-[215px] sm:h-[245px] md:h-[260px] transition-all duration-300 border select-none cursor-pointer group',
              activeAccount?.colorTheme === 'grey'
                ? 'border-stone-700/60 hover:border-amber-400/50'
                : 'border-red-900/40 hover:border-amber-400/50'
            )}
            style={{
              background:
                activeAccount?.colorTheme === 'grey'
                  ? 'radial-gradient(ellipse at 42% 50%, rgba(254, 240, 138, 0.35) 0%, rgba(245, 158, 11, 0.2) 30%, transparent 60%), linear-gradient(115deg, #1c1917 0%, #292524 35%, #44403c 70%, #57534e 100%)'
                  : 'radial-gradient(ellipse at 42% 50%, rgba(254, 240, 138, 0.45) 0%, rgba(245, 158, 11, 0.28) 28%, transparent 58%), linear-gradient(115deg, #450300 0%, #680800 25%, #960C01 45%, #b91c1c 50%, #960C01 55%, #680800 80%, #450300 100%)',
            }}
          >
            {/* Luminous Diagonal Sunbeam / Gold Ray matching reference screenshot */}
            <div
              className="absolute -inset-y-16 left-[28%] sm:left-[32%] md:left-[35%] w-28 sm:w-36 md:w-48 -rotate-12 pointer-events-none opacity-60 mix-blend-screen blur-md"
              style={{
                background: 'linear-gradient(to right, transparent, rgba(254, 240, 138, 0.9), rgba(245, 158, 11, 0.65), transparent)',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-white/10 pointer-events-none" />

            {/* Top row: Bank Name only (Top Right, Clean & Bold, matching screenshot) */}
            <div className="flex items-start justify-end relative z-10">
              <span className="font-black text-sm sm:text-base md:text-lg tracking-widest uppercase text-white/95 text-right drop-shadow-sm">
                {activeAccount?.bankName}
              </span>
            </div>

            {/* Middle: Current Balance & Visibility Toggle */}
            <div className="my-auto relative z-10">
              <span className="text-xs sm:text-[13px] md:text-sm font-medium tracking-wide text-white/85 block">
                Current Balance
              </span>
              <div className="flex items-center gap-3 mt-1.5">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight tabular-nums text-white drop-shadow-md">
                  {showBalance
                    ? formatPHP(activeAccount?.currentBalance || 0)
                    : '₱ ••••••••'}
                </h2>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowBalance((prev) => !prev)
                  }}
                  className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                  title={showBalance ? 'Hide Balance' : 'Show Balance'}
                  aria-label="Toggle balance visibility"
                >
                  {showBalance ? (
                    <Eye className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : (
                    <EyeOff className="h-5 w-5 sm:h-6 sm:w-6" />
                  )}
                </button>
              </div>
            </div>

            {/* Bottom Row: White Circular Pen/Edit Action Button (Bottom Right) */}
            <div className="flex items-center justify-end relative z-10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditModalOpen(true)
                }}
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white text-[#960C01] hover:bg-slate-100 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer ml-auto"
                title="Edit Bank Details"
                aria-label="Edit Bank Details"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* MULTI-ACCOUNT TWO-COLUMN VIEW (Active Card on Left, Two Stacked Decks on Right) */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Selected Bank Card (ATM Format) */}
          <div className="md:col-span-5 flex flex-col gap-2.5">
            {/* ATM Card matching screenshot (Double click / double tap opens full details modal) */}
            <div
              onClick={handleCardClick}
              onDoubleClick={() => setIsCardDetailsModalOpen(true)}
              onTouchEnd={handleCardTouch}
              title="Double-click to view complete bank details"
              className={cn(
                'w-full rounded-[28px] p-6 sm:p-7 text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-[295px] sm:h-[315px] lg:h-[320px] transition-all duration-300 border select-none cursor-pointer group',
                activeAccount?.colorTheme === 'grey'
                  ? 'border-stone-700/60 hover:border-amber-400/50'
                  : 'border-red-900/40 hover:border-amber-400/50'
              )}
              style={{
                background:
                  activeAccount?.colorTheme === 'grey'
                    ? 'radial-gradient(circle at 25% 85%, rgba(245, 158, 11, 0.38) 0%, rgba(217, 119, 6, 0.22) 30%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(254, 240, 138, 0.18) 0%, transparent 40%), linear-gradient(135deg, #1c1917 0%, #292524 35%, #44403c 70%, #57534e 100%)'
                    : 'radial-gradient(circle at 85% 15%, rgba(255, 215, 0, 0.28) 0%, transparent 45%), linear-gradient(135deg, #4a0500 0%, #780b02 30%, #960C01 65%, #c52d14 100%)',
              }}
            >
              {/* Luminous Satin Sheen & Sunset Gold Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-white/10 pointer-events-none" />
              <div className="absolute -right-8 -bottom-8 w-56 h-56 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -left-12 -top-12 w-48 h-48 bg-stone-300/10 rounded-full blur-xl pointer-events-none" />
              {activeAccount?.colorTheme === 'grey' && (
                <div className="absolute left-6 bottom-4 w-44 h-44 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
              )}

              {/* Top row: Bank Name only (Top Right, Clean & Bold, matching screenshot) */}
              <div className="flex items-start justify-end relative z-10">
                <span className="font-black text-sm sm:text-base tracking-widest uppercase text-white/95 text-right drop-shadow-sm">
                  {activeAccount?.bankName}
                </span>
              </div>

              {/* Middle: Current Balance & Visibility Toggle */}
              <div className="my-auto relative z-10">
                <span className="text-xs sm:text-[13px] font-medium tracking-wide text-white/85 block">
                  Current Balance
                </span>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight tabular-nums text-white drop-shadow-md">
                    {showBalance
                      ? formatPHP(activeAccount?.currentBalance || 0)
                      : '₱ ••••••••'}
                  </h2>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowBalance((prev) => !prev)
                    }}
                    className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                    title={showBalance ? 'Hide Balance' : 'Show Balance'}
                    aria-label="Toggle balance visibility"
                  >
                    {showBalance ? (
                      <Eye className="h-5 w-5" />
                    ) : (
                      <EyeOff className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Bottom Row: White Circular Pen/Edit Action Button (Bottom Right) */}
              <div className="flex items-center justify-end relative z-10">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsEditModalOpen(true)
                  }}
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white text-[#960C01] hover:bg-slate-100 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer ml-auto"
                  title="Edit Bank Details"
                  aria-label="Edit Bank Details"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Two Stacked Decks of Overlapping Bank Cards (Red Stack & Warm Graphite Stack) */}
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Deck 1: Red Overlapping Cards */}
            <div className="relative w-full h-[295px] sm:h-[315px] lg:h-[320px] rounded-[28px] overflow-hidden shadow-xl bg-gradient-to-b from-[#4a0500] to-[#780b02] border border-red-900/40 select-none">
              {redStackAccounts.slice(0, 5).map((acc, index) => {
                const isSelected = acc.id === activeAccount?.id
                const topOffset = index * 32
                const isLast = index === Math.min(redStackAccounts.length, 5) - 1

                return (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={cn(
                      'absolute left-0 right-0 cursor-pointer transition-all duration-200 group',
                      isLast ? 'bottom-0 rounded-b-[28px]' : 'rounded-t-[20px]',
                      isSelected ? 'z-30' : ''
                    )}
                    style={{
                      top: `${topOffset}px`,
                      bottom: 0,
                      zIndex: isSelected ? 30 : 10 + index,
                    }}
                  >
                    <div
                      className={cn(
                        'w-full h-full relative overflow-hidden transition-all duration-200',
                        isLast ? 'rounded-b-[28px]' : 'rounded-t-[20px]',
                        'border-t border-white/25 shadow-[0_-3px_10px_rgba(0,0,0,0.35)]',
                        'group-hover:-translate-y-1.5',
                        isSelected ? 'border-t-2 border-amber-400' : ''
                      )}
                      style={{
                        background:
                          'radial-gradient(circle at 85% 20%, rgba(255, 215, 0, 0.22) 0%, transparent 45%), linear-gradient(135deg, #580600 0%, #7e0b02 30%, #960C01 65%, #c22d14 100%)',
                      }}
                    >
                      {/* Satin Sheen overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-white/10 pointer-events-none" />
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

                      {/* Card Tab Header with Company Name & Active indicator */}
                      <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between relative z-10">
                        <span className="font-semibold text-xs sm:text-[13px] text-white/95 tracking-wide truncate max-w-[70%] drop-shadow-xs group-hover:text-white">
                          {getAccountCardLabel(acc)}
                        </span>
                        {isSelected ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-stone-950 shadow-xs shrink-0">
                            Viewing
                          </span>
                        ) : (
                          <span className="text-[10px] text-white/50 opacity-0 group-hover:opacity-100 transition-opacity font-medium shrink-0">
                            Click to view
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Deck 2: Warm Graphite & Gold Overlapping Cards (Matching User's Reference Image) */}
            <div className="relative w-full h-[295px] sm:h-[315px] lg:h-[320px] rounded-[28px] overflow-hidden shadow-xl bg-gradient-to-b from-[#1c1917] to-[#292524] border border-stone-700/60 select-none">
              {greyStackAccounts.slice(0, 5).map((acc, index) => {
                const isSelected = acc.id === activeAccount?.id
                const topOffset = index * 32
                const isLast = index === Math.min(greyStackAccounts.length, 5) - 1

                return (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={cn(
                      'absolute left-0 right-0 cursor-pointer transition-all duration-200 group',
                      isLast ? 'bottom-0 rounded-b-[28px]' : 'rounded-t-[20px]',
                      isSelected ? 'z-30' : ''
                    )}
                    style={{
                      top: `${topOffset}px`,
                      bottom: 0,
                      zIndex: isSelected ? 30 : 10 + index,
                    }}
                  >
                    <div
                      className={cn(
                        'w-full h-full relative overflow-hidden transition-all duration-200',
                        isLast ? 'rounded-b-[28px]' : 'rounded-t-[20px]',
                        'border-t border-white/20 shadow-[0_-3px_10px_rgba(0,0,0,0.45)]',
                        'group-hover:-translate-y-1.5',
                        isSelected ? 'border-t-2 border-amber-400' : ''
                      )}
                      style={{
                        background:
                          'radial-gradient(circle at 25% 85%, rgba(245, 158, 11, 0.35) 0%, rgba(217, 119, 6, 0.18) 30%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(254, 240, 138, 0.15) 0%, transparent 40%), linear-gradient(135deg, #1c1917 0%, #292524 35%, #44403c 70%, #57534e 100%)',
                      }}
                    >
                      {/* Warm Graphite & Amber Sheen overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-white/10 pointer-events-none" />
                      <div className="absolute left-6 bottom-4 w-32 h-32 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />
                      <div className="absolute top-0 right-0 w-32 h-32 bg-stone-400/10 rounded-full blur-xl pointer-events-none" />

                      {/* Card Tab Header with Company Name & Active indicator */}
                      <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between relative z-10">
                        <span className="font-semibold text-xs sm:text-[13px] text-white/95 tracking-wide truncate max-w-[70%] drop-shadow-xs group-hover:text-white">
                          {getAccountCardLabel(acc)}
                        </span>
                        {isSelected ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-stone-950 shadow-xs shrink-0">
                            Viewing
                          </span>
                        ) : (
                          <span className="text-[10px] text-white/50 opacity-0 group-hover:opacity-100 transition-opacity font-medium shrink-0">
                            Click to view
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Bottom Section: Bank Banner Bar & Transactions Table */}
      <Card className="rounded-[24px] border border-stroke/20 bg-white shadow-xs overflow-hidden">
        {/* Grey Header Banner matching screenshot: "Bagong Bansa May Pagasa Movement" */}
        <div className="bg-[#E2E8F0] px-5 sm:px-6 py-3.5 border-b border-slate-300 flex items-center justify-between">
          <h3 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
            {activeAccount?.accountName || activeAccount?.companyName}
          </h3>
          <span className="text-xs font-semibold text-slate-700 bg-white/70 px-3 py-1 rounded-full border border-slate-300">
            {activeAccount?.bankName}
          </span>
        </div>

        {/* Table Search Bar Toolbar & Compact Deposit/Withdraw Action Buttons */}
        <div className="p-3.5 sm:px-6 sm:py-3.5 border-b border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by particulars, cheque no., or category..."
              value={tableSearchQuery}
              onChange={(e) => {
                setTableSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full h-9 sm:h-10 pl-10 pr-8 rounded-full border-slate-200 bg-slate-50/70 hover:bg-white text-xs sm:text-sm focus-visible:ring-2 focus-visible:ring-[#960C01] shadow-2xs"
            />
            {tableSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setTableSearchQuery('')
                  setCurrentPage(1)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg hover:text-focus cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Action buttons (Deposit & Withdraw) replacing "showing records" and "balance" */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {!isAudit && !isCompanyScoped && (
              <>
                <Button
                  type="button"
                  onClick={() => setIsDepositModalOpen(true)}
                  className="h-8 sm:h-8.5 px-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <ArrowDownLeft className="h-3.5 w-3.5 shrink-0" />
                  <span>Deposit</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="h-8 sm:h-8.5 px-3.5 rounded-full bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                  <span>Withdraw</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Unified Table matching screenshot columns: DATE, CHEQUE NO., PARTICULARS, WITHDRAWAL, DEPOSIT, CATEGORY, CURRENT BALANCE */}
        <div className="overflow-x-auto">
          <Table className="w-full text-xs sm:text-sm">
            <TableHeader className="bg-slate-50/70 border-b border-slate-200">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4 py-3 font-bold text-muted-fg uppercase tracking-wider text-xs text-left w-[12%]">
                  DATE
                </TableHead>
                <TableHead className="px-4 py-3 font-bold text-muted-fg uppercase tracking-wider text-xs text-left w-[15%]">
                  CHEQUE NO.
                </TableHead>
                <TableHead className="px-4 py-3 font-bold text-muted-fg uppercase tracking-wider text-xs text-left w-[28%]">
                  PARTICULARS
                </TableHead>
                <TableHead className="px-4 py-3 font-bold text-muted-fg uppercase tracking-wider text-xs text-right w-[13%]">
                  WITHDRAWAL
                </TableHead>
                <TableHead className="px-4 py-3 font-bold text-muted-fg uppercase tracking-wider text-xs text-right w-[13%]">
                  DEPOSIT
                </TableHead>
                <TableHead className="px-4 py-3 font-bold text-muted-fg uppercase tracking-wider text-xs text-left w-[14%]">
                  CATEGORY
                </TableHead>
                <TableHead className="px-4 py-3 font-bold text-muted-fg uppercase tracking-wider text-xs text-right w-[15%]">
                  CURRENT BALANCE
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-44 text-center py-8">
                    <div className="flex flex-col items-center justify-center text-muted-fg">
                      <CreditCard className="h-8 w-8 text-muted-fg/40 mb-2" />
                      <p className="text-sm font-semibold">No bank transactions found</p>
                      <p className="text-xs text-muted-fg/70 mt-0.5">
                        {tableSearchQuery ? 'Try clearing your search query' : 'Deposit or withdraw funds to record transactions'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((tx) => (
                  <TableRow
                    key={tx.id}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Date */}
                    <TableCell className="px-4 py-3 font-mono text-xs text-muted-fg whitespace-nowrap">
                      {tx.date}
                    </TableCell>

                    {/* Cheque No */}
                    <TableCell className="px-4 py-3 font-mono text-xs font-semibold text-focus whitespace-nowrap">
                      {tx.chequeNo || '—'}
                    </TableCell>

                    {/* Particulars */}
                    <TableCell className="px-4 py-3 font-medium text-xs text-focus">
                      {tx.particulars}
                    </TableCell>

                    {/* Withdrawal */}
                    <TableCell className="px-4 py-3 font-semibold text-xs text-rose-600 text-right whitespace-nowrap">
                      {tx.withdrawal ? `₱ ${tx.withdrawal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : ''}
                    </TableCell>

                    {/* Deposit */}
                    <TableCell className="px-4 py-3 font-semibold text-xs text-emerald-600 text-right whitespace-nowrap">
                      {tx.deposit ? `₱ ${tx.deposit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : ''}
                    </TableCell>

                    {/* Category */}
                    <TableCell className="px-4 py-3 text-xs text-muted-fg whitespace-nowrap">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-focus/80">
                        {tx.category}
                      </span>
                    </TableCell>

                    {/* Current Balance */}
                    <TableCell className="px-4 py-3 font-bold text-xs text-focus text-right whitespace-nowrap tabular-nums">
                      ₱ {tx.runningBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-fg border-t border-slate-100">
          <span>
            {filteredTransactions.length === 0
              ? 'Showing 0 of 0 records'
              : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of ${filteredTransactions.length} records`}
          </span>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="italic">
              Page {currentPage} out of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 p-0 flex items-center justify-center rounded-lg border-slate-200 text-focus hover:bg-slate-50 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 p-0 flex items-center justify-center rounded-lg border-slate-200 text-focus hover:bg-slate-50 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* 4. MODALS (Standardized UI matching System Modals) */}

      {/* Modal A: Add New Bank Account */}
      <Dialog open={isAddBankModalOpen} onOpenChange={setIsAddBankModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-[24px] p-6 shadow-2xl">
          <DialogHeader className="space-y-1.5 pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#0B0F2B] text-white flex items-center justify-center">
                <Landmark className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-focus">
                  Add Corporate Bank Account
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-fg">
                  Register a corporate bank facility for Treasury and Central Accounting.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {addBankSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{addBankSuccessMessage}</span>
            </div>
          )}

          <form onSubmit={handleCreateBank} className="space-y-3.5 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={addBankForm.bankName}
                  onChange={(e) => setAddBankForm({ ...addBankForm, bankName: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                >
                  <option value="CHINABANK">CHINABANK</option>
                  <option value="BDO UNIBANK">BDO UNIBANK</option>
                  <option value="BPI">BPI</option>
                  <option value="METROBANK">METROBANK</option>
                  <option value="UNIONBANK">UNIONBANK</option>
                  <option value="SECURITY BANK">SECURITY BANK</option>
                  <option value="RCBC">RCBC</option>
                  <option value="LANDBANK">LANDBANK</option>
                  <option value="PNB">PNB</option>
                  <option value="EASTWEST">EASTWEST</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Account Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={addBankForm.accountType}
                  onChange={(e) =>
                    setAddBankForm({
                      ...addBankForm,
                      accountType: e.target.value as BankAccount['accountType'],
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                >
                  <option value="Checking">Checking Account</option>
                  <option value="Savings">Savings Account</option>
                  <option value="Payroll">Payroll Account</option>
                  <option value="Time Deposit">Time Deposit</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={addBankForm.accountName}
                  onChange={(e) => setAddBankForm({ ...addBankForm, accountName: e.target.value })}
                  placeholder="e.g. Bagong Bansa May Pagasa Movement"
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Account Number <span className="text-xs text-muted-fg font-normal">(Optional)</span>
                </label>
                <Input
                  value={addBankForm.accountNumber}
                  onChange={(e) => setAddBankForm({ ...addBankForm, accountNumber: e.target.value })}
                  placeholder="e.g. 0042-8819-2041"
                  className="h-10 text-xs sm:text-sm rounded-xl font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-focus block mb-1">
                Company Owner <span className="text-xs text-muted-fg font-normal">(Optional)</span>
              </label>
              <select
                disabled={isCompanyScoped}
                value={addBankForm.companyName}
                onChange={(e) => setAddBankForm({ ...addBankForm, companyName: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
              >
                <option value="">None / Unassigned (General Treasury)</option>
                {companyOptions
                  .filter((c) => c !== 'All Companies')
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Initial / Starting Balance (₱) <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="number"
                  min="0"
                  step="any"
                  value={addBankForm.startingBalance}
                  onChange={(e) => setAddBankForm({ ...addBankForm, startingBalance: e.target.value })}
                  placeholder="1000000"
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Card Theme
                </label>
                <select
                  value={addBankForm.colorTheme}
                  onChange={(e) => setAddBankForm({ ...addBankForm, colorTheme: e.target.value as 'red' | 'grey' })}
                  className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                >
                  <option value="red">Crimson Red (Commercial)</option>
                  <option value="grey">Slate Metallic (Holdings/Tech)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-focus block mb-1">
                Branch Location
              </label>
              <Input
                value={addBankForm.branch}
                onChange={(e) => setAddBankForm({ ...addBankForm, branch: e.target.value })}
                placeholder="e.g. Quezon Avenue Branch, QC"
                className="h-10 text-xs sm:text-sm rounded-xl"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddBankModalOpen(false)
                  setAddBankSuccessMessage(null)
                }}
                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateBankAndAddAnother}
                className="h-10 px-4 rounded-xl text-xs font-semibold border-primary/60 text-primary hover:bg-primary/10 cursor-pointer"
              >
                + Save & Add Another Bank
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl text-xs font-semibold bg-[#960C01] hover:bg-[#800a01] text-white cursor-pointer"
              >
                Save Bank Account
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal B: Deposit Funds */}
      <Dialog open={isDepositModalOpen} onOpenChange={setIsDepositModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-[24px] p-6 shadow-2xl">
          <DialogHeader className="space-y-1.5 pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-focus">
                  Deposit to {activeAccount?.bankName}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-fg">
                  Crediting funds to {activeAccount?.companyName} ({activeAccount?.accountNumber}).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleDeposit} className="space-y-3.5 mt-2">
            <div>
              <label className="text-xs font-semibold text-focus block mb-1">
                Deposit Amount (₱) <span className="text-red-500">*</span>
              </label>
              <Input
                required
                type="number"
                min="0.01"
                step="any"
                value={depositForm.amount}
                onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                placeholder="e.g. 180000"
                className="h-10 text-xs sm:text-sm rounded-xl font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Transaction Date <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={depositForm.date}
                  onChange={(e) => setDepositForm({ ...depositForm, date: e.target.value })}
                  placeholder="10/01/26"
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Category
                </label>
                <select
                  value={depositForm.category}
                  onChange={(e) => setDepositForm({ ...depositForm, category: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque Deposit</option>
                  <option value="Cash">Cash Deposit</option>
                  <option value="Online Payment">Online Payment</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-focus block mb-1">
                Particulars / Description <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={depositForm.particulars}
                onChange={(e) => setDepositForm({ ...depositForm, particulars: e.target.value })}
                placeholder="e.g. Point-of-Sale Daily Remittance"
                className="h-10 text-xs sm:text-sm rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-focus block mb-1">
                Reference / Trace No.
              </label>
              <Input
                value={depositForm.referenceNo}
                onChange={(e) => setDepositForm({ ...depositForm, referenceNo: e.target.value })}
                placeholder="e.g. TR-99014"
                className="h-10 text-xs sm:text-sm rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDepositModalOpen(false)}
                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                Confirm Deposit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal C: Withdraw Funds */}
      <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-[24px] p-6 shadow-2xl">
          <DialogHeader className="space-y-1.5 pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-focus">
                  Withdraw from {activeAccount?.bankName}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-fg">
                  Available Balance: <strong className="text-focus">{formatPHP(activeAccount?.currentBalance || 0)}</strong>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleWithdraw} className="space-y-3.5 mt-2">
            <div>
              <label className="text-xs font-semibold text-focus block mb-1">
                Withdrawal Amount (₱) <span className="text-red-500">*</span>
              </label>
              <Input
                required
                type="number"
                min="0.01"
                step="any"
                value={withdrawForm.amount}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                placeholder="e.g. 45000"
                className="h-10 text-xs sm:text-sm rounded-xl font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Transaction Date <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={withdrawForm.date}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, date: e.target.value })}
                  placeholder="10/01/26"
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Category
                </label>
                <select
                  value={withdrawForm.category}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, category: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus"
                >
                  <option value="Cheque">Cheque</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Online Payment">Online Payment</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Cheque No. (or Ref No.)
                </label>
                <Input
                  value={withdrawForm.chequeNo}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, chequeNo: e.target.value })}
                  placeholder="e.g. CHQ-8895"
                  className="h-10 text-xs sm:text-sm rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Particulars <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={withdrawForm.particulars}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, particulars: e.target.value })}
                  placeholder="e.g. Warehouse Lease"
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsWithdrawModalOpen(false)}
                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white cursor-pointer"
              >
                Confirm Withdrawal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal D: Activity Log */}
      <Dialog open={isActivityLogOpen} onOpenChange={setIsActivityLogOpen}>
        <DialogContent className="sm:max-w-2xl bg-white rounded-[24px] p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="space-y-1 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#0B0F2B] text-white flex items-center justify-center">
                <History className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-focus">
                  Bank Treasury Activity Log
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-fg">
                  Chronological records of deposits, withdrawals, and balance movements across corporate accounts.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2.5 mt-3">
            {accounts.flatMap((acc) =>
              acc.transactions.map((tx) => ({
                ...tx,
                bankName: acc.bankName,
                companyName: acc.companyName,
              }))
            ).length === 0 ? (
              <p className="text-center text-xs text-muted-fg py-8">No recent activity logged.</p>
            ) : (
              accounts
                .flatMap((acc) =>
                  acc.transactions.map((tx) => ({
                    ...tx,
                    bankName: acc.bankName,
                    companyName: acc.companyName,
                  }))
                )
                .slice(0, 15)
                .map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-focus">{log.companyName}</span>
                        <span className="text-[10.5px] px-2 py-0.2 bg-white border rounded font-mono text-muted-fg">
                          {log.bankName}
                        </span>
                      </div>
                      <p className="text-muted-fg text-[11.5px] mt-0.5">
                        {log.particulars} {log.chequeNo && log.chequeNo !== '—' && `(${log.chequeNo})`} · {log.category}
                      </p>
                    </div>

                    <div className="text-right">
                      {log.withdrawal ? (
                        <span className="font-bold text-rose-600 block">
                          -₱{log.withdrawal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-600 block">
                          +₱{(log.deposit || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-fg font-mono">{log.date}</span>
                    </div>
                  </div>
                ))
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsActivityLogOpen(false)}
              className="h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal E: Edit Bank Account Details */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-[24px] p-6 shadow-2xl">
          <DialogHeader className="space-y-1.5 pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-100 text-focus flex items-center justify-center">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-focus">
                  Edit Bank Details
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-fg">
                  Update account information for {activeAccount?.bankName}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveEditAccount} className="space-y-3.5 mt-2">
            <div>
              <label className="text-xs font-semibold text-focus block mb-1">
                Account Name <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={editAccountForm.accountName}
                onChange={(e) => setEditAccountForm({ ...editAccountForm, accountName: e.target.value })}
                className="h-10 text-xs sm:text-sm rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-focus block mb-1">
                Branch Location
              </label>
              <Input
                value={editAccountForm.branch}
                onChange={(e) => setEditAccountForm({ ...editAccountForm, branch: e.target.value })}
                placeholder="e.g. Quezon Avenue Main Branch, Quezon City"
                className="h-10 text-xs sm:text-sm rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Starting Balance <span className="text-xs text-muted-fg font-normal">(View Only)</span>
                </label>
                <Input
                  disabled
                  value={formatPHP(editAccountForm.startingBalance)}
                  className="h-10 text-xs sm:text-sm rounded-xl bg-slate-50 text-slate-600 font-semibold cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Current Balance (₱) <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="number"
                  step="any"
                  value={editAccountForm.currentBalance}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, currentBalance: e.target.value })}
                  className="h-10 text-xs sm:text-sm rounded-xl font-semibold text-focus"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-focus block mb-1">
                Notes & Instructions
              </label>
              <Input
                value={editAccountForm.notes}
                onChange={(e) => setEditAccountForm({ ...editAccountForm, notes: e.target.value })}
                placeholder="Operating settlement instructions or remarks"
                className="h-10 text-xs sm:text-sm rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl text-xs font-semibold bg-[#960C01] hover:bg-[#800a01] text-white cursor-pointer"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal F: Full Pop-up ATM Card Details (Triggered on Double Click / Double Tap) */}
      <Dialog open={isCardDetailsModalOpen} onOpenChange={setIsCardDetailsModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white rounded-[28px] p-6 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto [&>button.absolute]:hidden [&>button:has(svg.lucide-x)]:hidden [&>button[aria-label=Close]]:hidden">
          <DialogHeader className="space-y-1.5 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#0B0F2B] text-white flex items-center justify-center">
                <Landmark className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-focus">
                  Bank Facility Specifications
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-fg">
                  Complete account profile and institutional parameters
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Visual ATM Card Replica */}
          <div
            className={cn(
              'w-full rounded-[24px] p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-[180px] my-3 border select-none',
              activeAccount?.colorTheme === 'grey'
                ? 'border-stone-700/60'
                : 'border-red-900/40'
            )}
            style={{
              background:
                activeAccount?.colorTheme === 'grey'
                  ? 'radial-gradient(circle at 25% 85%, rgba(245, 158, 11, 0.38) 0%, rgba(217, 119, 6, 0.22) 30%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(254, 240, 138, 0.18) 0%, transparent 40%), linear-gradient(135deg, #1c1917 0%, #292524 35%, #44403c 70%, #57534e 100%)'
                  : 'radial-gradient(circle at 85% 15%, rgba(255, 215, 0, 0.28) 0%, transparent 45%), linear-gradient(135deg, #4a0500 0%, #780b02 30%, #960C01 65%, #c52d14 100%)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-white/10 pointer-events-none" />
            {activeAccount?.colorTheme === 'grey' && (
              <div className="absolute left-6 bottom-4 w-40 h-40 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
            )}

            <div className="flex items-start justify-between relative z-10">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                {activeAccount?.companyName || 'General Treasury / Unassigned'}
              </span>
              <span className="font-black text-base tracking-widest uppercase text-white drop-shadow-sm">
                {activeAccount?.bankName}
              </span>
            </div>

            <div className="relative z-10 my-auto">
              <span className="text-[11px] text-white/70 block uppercase tracking-wider">Current Balance</span>
              <span className="text-3xl font-extrabold tracking-tight text-white tabular-nums drop-shadow-md">
                {formatPHP(activeAccount?.currentBalance || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-white/80 relative z-10 border-t border-white/15 pt-2">
              <span className="font-medium">{activeAccount?.accountType} Facility</span>
              <span className="truncate max-w-[220px]">{activeAccount?.branch}</span>
            </div>
          </div>

          {/* Full Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mt-1">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] text-muted-fg font-medium block">Bank Institution</span>
              <span className="font-bold text-focus text-sm mt-0.5 block">{activeAccount?.bankName}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] text-muted-fg font-medium block">Account Facility Type</span>
              <span className="font-bold text-focus text-sm mt-0.5 block">{activeAccount?.accountType} Account</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 sm:col-span-2">
              <span className="text-[11px] text-muted-fg font-medium block">Account Name</span>
              <span className="font-bold text-focus text-sm mt-0.5 block">{activeAccount?.accountName}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] text-muted-fg font-medium block">Company Ownership</span>
              <span className="font-semibold text-focus mt-0.5 block truncate">
                {activeAccount?.companyName || 'None / Unassigned (General Treasury)'}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] text-muted-fg font-medium block">Branch Location</span>
              <span className="font-semibold text-focus mt-0.5 block truncate">
                {activeAccount?.branch || 'Central Corporate Branch'}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] text-muted-fg font-medium block">Starting / Initial Balance</span>
              <span className="font-semibold text-slate-700 text-sm mt-0.5 block">
                {formatPHP(activeAccount?.startingBalance || 0)}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] text-muted-fg font-medium block">Current Balance</span>
              <span className="font-extrabold text-emerald-700 text-sm mt-0.5 block">
                {formatPHP(activeAccount?.currentBalance || 0)}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 sm:col-span-2">
              <span className="text-[11px] text-muted-fg font-medium block">Registered Notes & Purpose</span>
              <span className="text-focus/90 text-xs mt-1 block">
                {activeAccount?.notes || 'Operating settlement account for general corporate treasury management.'}
              </span>
            </div>
          </div>

          {!isAudit && !isCompanyScoped && (
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 mt-3">
              <Button
                type="button"
                onClick={() => {
                  setIsCardDetailsModalOpen(false)
                  setIsEditModalOpen(true)
                }}
                className="h-10 px-4 rounded-xl text-xs font-semibold bg-[#960C01] hover:bg-[#800a01] text-white cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit Bank Details
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BankManagementPage

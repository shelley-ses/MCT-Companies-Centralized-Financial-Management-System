import * as React from 'react'
import {
  Landmark,
  Building2,
  Plus,
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Star,
  Check,
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
import { LiveDateTimeBadge } from '@/components/common/LiveDateTimeBadge'
import { formatPHP } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface BankAccount {
  id: string
  bankName: string
  accountName: string
  accountNumber: string
  companyName: string
  accountType: 'Checking' | 'Savings' | 'Payroll' | 'Time Deposit'
  branch: string
  startingBalance: number
  currentBalance: number
  status: 'Active' | 'Inactive'
  isPrimary?: boolean
  swiftCode?: string
  notes?: string
  createdAt: string
}

const STORAGE_KEY = 'mct_bank_accounts_data_v1'

const INITIAL_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'bnk-bdo-001',
    bankName: 'BDO Unibank',
    accountName: 'MCT Kitchen Operations Corp.',
    accountNumber: '0042-8819-2041',
    companyName: 'MCT Kitchen',
    accountType: 'Checking',
    branch: 'Fairview Regalado Branch, Quezon City',
    startingBalance: 1500000,
    currentBalance: 2450000,
    status: 'Active',
    isPrimary: true,
    swiftCode: 'BNORPHMM',
    notes: 'Main commercial checking account for supply payments & daily sales deposits.',
    createdAt: '2026-01-15',
  },
  {
    id: 'bnk-bpi-002',
    bankName: 'BPI',
    accountName: 'MCT Hotel & Suites Corp.',
    accountNumber: '0821-4490-1123',
    companyName: 'MCT Hotel',
    accountType: 'Checking',
    branch: 'Commonwealth Ave. Branch, Quezon City',
    startingBalance: 2000000,
    currentBalance: 3890000,
    status: 'Active',
    isPrimary: true,
    swiftCode: 'BOPIPHMM',
    notes: 'Hotel front-desk merchant settlement & room operations account.',
    createdAt: '2026-01-20',
  },
  {
    id: 'bnk-mb-003',
    bankName: 'Metrobank',
    accountName: 'FilCap Prime Holdings Corp. - Lending Facility',
    accountNumber: '2190-3382-7714',
    companyName: 'FilCap Prime Holdings Corp.',
    accountType: 'Checking',
    branch: 'Quezon Ave. Corporate Center',
    startingBalance: 3500000,
    currentBalance: 5200000,
    status: 'Active',
    isPrimary: true,
    swiftCode: 'MBTCPHMM',
    notes: 'Micro-lending capital disbursal and daily collection escrow.',
    createdAt: '2026-02-01',
  },
  {
    id: 'bnk-sb-004',
    bankName: 'Security Bank',
    accountName: 'JK Cafe Food & Beverages',
    accountNumber: '0310-9921-5542',
    companyName: 'JK Cafe',
    accountType: 'Checking',
    branch: 'UP Technohub Branch, Diliman',
    startingBalance: 800000,
    currentBalance: 1120000,
    status: 'Active',
    isPrimary: true,
    swiftCode: 'SETCPHMM',
    notes: 'Bakery & cafe suppliers payment and pos collection.',
    createdAt: '2026-02-10',
  },
  {
    id: 'bnk-ubp-005',
    bankName: 'UnionBank',
    accountName: 'JK Property and Ventures Commercial',
    accountNumber: '1099-4412-8801',
    companyName: 'JK Property and Ventures',
    accountType: 'Checking',
    branch: 'Ortigas Center Corporate Branch, Pasig',
    startingBalance: 2200000,
    currentBalance: 3650000,
    status: 'Active',
    isPrimary: true,
    swiftCode: 'UBPHPHMM',
    notes: 'Tenant rental collections and property leasing maintenance pool.',
    createdAt: '2026-02-15',
  },
  {
    id: 'bnk-rcbc-006',
    bankName: 'RCBC',
    accountName: 'Speedbox Express Logistics Corp.',
    accountNumber: '0912-7744-3319',
    companyName: 'Speedbox',
    accountType: 'Savings',
    branch: 'Novaliches Branch, Quezon City',
    startingBalance: 500000,
    currentBalance: 670000,
    status: 'Active',
    isPrimary: false,
    swiftCode: 'RCBCPHMM',
    notes: 'Fleet maintenance and courier operational reserve.',
    createdAt: '2026-03-01',
  },
  {
    id: 'bnk-bdo-007',
    bankName: 'BDO Unibank',
    accountName: 'Annex Nine Commercial Hub',
    accountNumber: '0042-5510-9922',
    companyName: 'Annex Nine',
    accountType: 'Checking',
    branch: 'Fairview Regalado Branch, Quezon City',
    startingBalance: 600000,
    currentBalance: 845000,
    status: 'Active',
    isPrimary: false,
    swiftCode: 'BNORPHMM',
    notes: 'Commercial retail building utilities and lease operations.',
    createdAt: '2026-03-10',
  },
  {
    id: 'bnk-lbp-008',
    bankName: 'Landbank',
    accountName: 'Golden Sunburst Ventures Trading',
    accountNumber: '1840-2291-7703',
    companyName: 'Golden Sunburst Ventures',
    accountType: 'Savings',
    branch: 'Bocaue Bulacan Commercial Branch',
    startingBalance: 900000,
    currentBalance: 1250000,
    status: 'Active',
    isPrimary: false,
    swiftCode: 'TLBPPHMM',
    notes: 'Agricultural commodity trading & grain procurement.',
    createdAt: '2026-03-20',
  },
]

const COMPANY_OPTIONS = [
  'All Companies',
  'MCT Kitchen',
  'MCT Hotel',
  'FilCap Prime Holdings Corp.',
  'JK Cafe',
  'Annex Nine',
  'Merillon',
  'JK Printing',
  'Speedbox',
  'JK Property and Ventures',
  'Golden Sunburst Ventures',
]

const BANK_NAMES = [
  'BDO Unibank',
  'BPI',
  'Metrobank',
  'UnionBank',
  'Security Bank',
  'RCBC',
  'Landbank',
  'Chinabank',
  'Philippine National Bank (PNB)',
  'EastWest Bank',
  'Asia United Bank (AUB)',
]

const ACCOUNT_TYPES: Array<BankAccount['accountType']> = [
  'Checking',
  'Savings',
  'Payroll',
  'Time Deposit',
]

const ITEMS_PER_PAGE = 8

export const BankManagementPage: React.FC = () => {
  // Load bank accounts from local storage with initial fallback
  const [accounts, setAccounts] = React.useState<BankAccount[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed
          }
        }
      } catch (err) {
        console.error('Error loading bank accounts:', err)
      }
    }
    return INITIAL_BANK_ACCOUNTS
  })

  const saveAccounts = (newAccounts: BankAccount[]) => {
    setAccounts(newAccounts)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAccounts))
    } catch (err) {
      console.error('Error saving bank accounts:', err)
    }
  }

  // Filter toolbar state
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCompany, setSelectedCompany] = React.useState('All Companies')
  const [selectedType, setSelectedType] = React.useState('All')
  const [selectedStatus, setSelectedStatus] = React.useState('All')
  const [currentPage, setCurrentPage] = React.useState(1)

  // Dropdown states
  const [isExportDropdownOpen, setIsExportDropdownOpen] = React.useState(false)
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = React.useState(false)
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = React.useState(false)
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = React.useState(false)

  const exportDropdownRef = React.useRef<HTMLDivElement>(null)
  const companyDropdownRef = React.useRef<HTMLDivElement>(null)
  const typeDropdownRef = React.useRef<HTMLDivElement>(null)
  const statusDropdownRef = React.useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(target)) {
        setIsExportDropdownOpen(false)
      }
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(target)) {
        setIsCompanyDropdownOpen(false)
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(target)) {
        setIsTypeDropdownOpen(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
        setIsStatusDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false)
  const [isAdjustBalanceOpen, setIsAdjustBalanceOpen] = React.useState(false)
  const [activeAccount, setActiveAccount] = React.useState<BankAccount | null>(null)

  // Create Form State
  const [createForm, setCreateForm] = React.useState({
    bankName: 'BDO Unibank',
    accountName: '',
    accountNumber: '',
    companyName: 'MCT Kitchen',
    accountType: 'Checking' as BankAccount['accountType'],
    branch: '',
    startingBalance: '',
    status: 'Active' as BankAccount['status'],
    isPrimary: false,
    swiftCode: '',
    notes: '',
  })

  // Edit Form State
  const [editForm, setEditForm] = React.useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    companyName: '',
    accountType: 'Checking' as BankAccount['accountType'],
    branch: '',
    startingBalance: '',
    currentBalance: '',
    status: 'Active' as BankAccount['status'],
    isPrimary: false,
    swiftCode: '',
    notes: '',
  })

  // Balance Adjustment Form State
  const [adjustForm, setAdjustForm] = React.useState({
    type: 'deposit' as 'deposit' | 'withdrawal' | 'adjustment',
    amount: '',
    reference: '',
    notes: '',
  })

  // Filtered accounts
  const filteredAccounts = React.useMemo(() => {
    return accounts.filter((acc) => {
      // Company filter
      if (selectedCompany !== 'All Companies' && acc.companyName !== selectedCompany) {
        return false
      }
      // Type filter
      if (selectedType !== 'All' && acc.accountType !== selectedType) {
        return false
      }
      // Status filter
      if (selectedStatus !== 'All' && acc.status !== selectedStatus) {
        return false
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchesBank = acc.bankName.toLowerCase().includes(query)
        const matchesName = acc.accountName.toLowerCase().includes(query)
        const matchesNum = acc.accountNumber.toLowerCase().includes(query)
        const matchesBranch = acc.branch.toLowerCase().includes(query)
        const matchesComp = acc.companyName.toLowerCase().includes(query)
        if (!matchesBank && !matchesName && !matchesNum && !matchesBranch && !matchesComp) {
          return false
        }
      }
      return true
    })
  }, [accounts, selectedCompany, selectedType, selectedStatus, searchQuery])

  // Summary Metrics
  const metrics = React.useMemo(() => {
    const totalBalance = filteredAccounts.reduce((sum, a) => sum + a.currentBalance, 0)
    const activeCount = filteredAccounts.filter((a) => a.status === 'Active').length
    const primaryCount = filteredAccounts.filter((a) => a.isPrimary).length
    const uniqueBanks = new Set(filteredAccounts.map((a) => a.bankName)).size

    return {
      totalBalance,
      activeCount,
      primaryCount,
      uniqueBanks,
    }
  }, [filteredAccounts])

  // Pagination
  const totalPages = Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE) || 1
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredAccounts.length)
  const paginatedAccounts = React.useMemo(() => {
    return filteredAccounts.slice(startIndex, endIndex)
  }, [filteredAccounts, startIndex, endIndex])

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [selectedCompany, selectedType, selectedStatus, searchQuery])

  // Handlers
  const handleOpenCreateModal = () => {
    setCreateForm({
      bankName: 'BDO Unibank',
      accountName: '',
      accountNumber: '',
      companyName: selectedCompany !== 'All Companies' ? selectedCompany : 'MCT Kitchen',
      accountType: 'Checking',
      branch: '',
      startingBalance: '',
      status: 'Active',
      isPrimary: false,
      swiftCode: '',
      notes: '',
    })
    setIsCreateModalOpen(true)
  }

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault()
    const startBal = parseFloat(createForm.startingBalance)

    if (!createForm.accountName.trim() || !createForm.accountNumber.trim()) {
      alert('Please fill out the Account Name and Account Number.')
      return
    }

    if (isNaN(startBal) || startBal < 0) {
      alert('Please enter a valid starting balance (₱0 or more).')
      return
    }

    const newAcc: BankAccount = {
      id: `bnk-${Date.now()}`,
      bankName: createForm.bankName,
      accountName: createForm.accountName.trim(),
      accountNumber: createForm.accountNumber.trim(),
      companyName: createForm.companyName,
      accountType: createForm.accountType,
      branch: createForm.branch.trim() || 'Central Corporate Branch',
      startingBalance: startBal,
      currentBalance: startBal,
      status: createForm.status,
      isPrimary: createForm.isPrimary,
      swiftCode: createForm.swiftCode.trim(),
      notes: createForm.notes.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    }

    saveAccounts([newAcc, ...accounts])
    setIsCreateModalOpen(false)
  }

  const handleOpenEditModal = (acc: BankAccount, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveAccount(acc)
    setEditForm({
      bankName: acc.bankName,
      accountName: acc.accountName,
      accountNumber: acc.accountNumber,
      companyName: acc.companyName,
      accountType: acc.accountType,
      branch: acc.branch,
      startingBalance: String(acc.startingBalance),
      currentBalance: String(acc.currentBalance),
      status: acc.status,
      isPrimary: Boolean(acc.isPrimary),
      swiftCode: acc.swiftCode || '',
      notes: acc.notes || '',
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAccount) return

    const startBal = parseFloat(editForm.startingBalance)
    const currBal = parseFloat(editForm.currentBalance)

    if (isNaN(startBal) || startBal < 0 || isNaN(currBal) || currBal < 0) {
      alert('Please enter valid starting and current balance amounts.')
      return
    }

    const updated: BankAccount = {
      ...activeAccount,
      bankName: editForm.bankName,
      accountName: editForm.accountName.trim(),
      accountNumber: editForm.accountNumber.trim(),
      companyName: editForm.companyName,
      accountType: editForm.accountType,
      branch: editForm.branch.trim(),
      startingBalance: startBal,
      currentBalance: currBal,
      status: editForm.status,
      isPrimary: editForm.isPrimary,
      swiftCode: editForm.swiftCode.trim(),
      notes: editForm.notes.trim(),
    }

    saveAccounts(accounts.map((a) => (a.id === activeAccount.id ? updated : a)))
    setIsEditModalOpen(false)
    setActiveAccount(null)
  }

  const handleOpenDelete = (acc: BankAccount, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveAccount(acc)
    setIsDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!activeAccount) return
    saveAccounts(accounts.filter((a) => a.id !== activeAccount.id))
    setIsDeleteConfirmOpen(false)
    setActiveAccount(null)
  }

  const handleOpenAdjustBalance = (acc: BankAccount, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveAccount(acc)
    setAdjustForm({
      type: 'deposit',
      amount: '',
      reference: `ADJ-${Math.floor(10000 + Math.random() * 89999)}`,
      notes: '',
    })
    setIsAdjustBalanceOpen(true)
  }

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAccount) return

    const amountNum = parseFloat(adjustForm.amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid positive adjustment amount.')
      return
    }

    let newBal = activeAccount.currentBalance
    if (adjustForm.type === 'deposit') {
      newBal += amountNum
    } else if (adjustForm.type === 'withdrawal') {
      if (amountNum > activeAccount.currentBalance) {
        alert('Withdrawal amount cannot exceed the current available balance.')
        return
      }
      newBal -= amountNum
    } else {
      newBal = amountNum
    }

    const updated: BankAccount = {
      ...activeAccount,
      currentBalance: newBal,
    }

    saveAccounts(accounts.map((a) => (a.id === activeAccount.id ? updated : a)))
    setIsAdjustBalanceOpen(false)
    setActiveAccount(null)
  }

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Account ID',
      'Bank Name',
      'Account Name',
      'Account Number',
      'Company Name',
      'Account Type',
      'Branch',
      'Starting Balance',
      'Current Balance',
      'Status',
      'Primary',
    ]

    const rows = filteredAccounts.map((a) => [
      a.id,
      `"${a.bankName}"`,
      `"${a.accountName.replace(/"/g, '""')}"`,
      `"${a.accountNumber}"`,
      `"${a.companyName}"`,
      a.accountType,
      `"${a.branch.replace(/"/g, '""')}"`,
      a.startingBalance,
      a.currentBalance,
      a.status,
      a.isPrimary ? 'Yes' : 'No',
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `bank_accounts_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setIsExportDropdownOpen(false)
  }

  // Export PDF
  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups for this site to export PDF.')
      return
    }

    const rowsHtml = filteredAccounts
      .map(
        (a) => `
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-weight: 600;">${a.bankName}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${a.accountName}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-family: monospace;">${a.accountNumber}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${a.companyName}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${a.accountType}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right;">${formatPHP(a.startingBalance)}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 700;">${formatPHP(a.currentBalance)}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center;">${a.status}</td>
      </tr>
    `
      )
      .join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>MCT Group - Bank Accounts Directory</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; }
            h1 { font-size: 20px; margin: 0 0 4px; font-weight: 700; color: #0f172a; }
            p { font-size: 12px; color: #64748b; margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 12px; }
            th { background: #f8fafc; font-weight: 600; text-transform: uppercase; font-size: 10px; color: #475569; border: 1px solid #e2e8f0; padding: 6px 8px; }
            .summary { margin-top: 20px; display: flex; gap: 24px; font-size: 12px; background: #f1f5f9; padding: 12px 16px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>MCT Group of Companies</h1>
          <p>Bank Accounts & Treasury Management Directory · Generated on ${new Date().toLocaleDateString('en-PH', { dateStyle: 'full' })}</p>
          <table>
            <thead>
              <tr>
                <th>Bank Name</th>
                <th>Account Name</th>
                <th>Account Number</th>
                <th>Company</th>
                <th>Type</th>
                <th style="text-align: right;">Starting Balance</th>
                <th style="text-align: right;">Current Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="summary">
            <div><strong>Total Bank Accounts:</strong> ${filteredAccounts.length}</div>
            <div><strong>Total Corporate Bank Balance:</strong> ${formatPHP(metrics.totalBalance)}</div>
            <div><strong>Active Accounts:</strong> ${metrics.activeCount}</div>
          </div>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
    setIsExportDropdownOpen(false)
  }

  return (
    <div className="space-y-6 pb-12 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* 1. Header & Controls */}
      <div className="space-y-3">
        {/* Top Row: Action Buttons (Live Date/Time, Export & Add Account) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 ml-auto">
            <LiveDateTimeBadge />

            {/* Export Dropdown Button */}
            <div ref={exportDropdownRef} className="relative inline-block">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExportDropdownOpen((prev) => !prev)}
                className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer transition-all border border-stroke/50 bg-white text-focus hover:bg-surface box-border"
                aria-haspopup="true"
                aria-expanded={isExportDropdownOpen}
              >
                <Download className="h-4 w-4 text-focus/70 shrink-0" />
                <span>Export</span>
                <ChevronDown className="h-3.5 w-3.5 ml-0.5 text-muted-fg" />
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

            {/* Create Bank Account Button */}
            <Button
              type="button"
              onClick={handleOpenCreateModal}
              className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer box-border"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Create Bank Account</span>
            </Button>
          </div>
        </div>

        {/* Second Row: Page Title on Left, Filter Toolbar on Right */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-focus tracking-tight">
              Bank Management
            </h1>
            <p className="text-sm sm:text-base text-muted-fg font-normal mt-1">
              Consolidated corporate bank accounts and starting balances across MCT Group
            </p>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            {/* Company Scope Filter */}
            <div ref={companyDropdownRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => setIsCompanyDropdownOpen((prev) => !prev)}
                className={cn(
                  'inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border',
                  isCompanyDropdownOpen && 'ring-2 ring-focus/20 border-focus'
                )}
              >
                <Building2 className="h-4 w-4 text-muted-fg shrink-0" />
                <span className="font-medium text-focus/90 truncate max-w-[150px]">
                  {selectedCompany}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-fg shrink-0" />
                {selectedCompany !== 'All Companies' && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedCompany('All Companies')
                    }}
                    className="p-0.5 rounded-full hover:bg-slate-200 text-muted-fg hover:text-focus transition-colors ml-0.5 inline-flex items-center justify-center cursor-pointer"
                    title="Reset to All Companies"
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </button>

              {isCompanyDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-stroke/30 shadow-2xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150 max-h-72 overflow-y-auto">
                  {COMPANY_OPTIONS.map((c) => (
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
                      {selectedCompany === c && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Account Type Filter */}
            <div ref={typeDropdownRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
                className={cn(
                  'inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border',
                  isTypeDropdownOpen && 'ring-2 ring-focus/20 border-focus'
                )}
              >
                <CreditCard className="h-4 w-4 text-muted-fg shrink-0" />
                <span className="font-medium text-focus/90">
                  {selectedType === 'All' ? 'Account Type' : selectedType}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-fg shrink-0" />
              </button>

              {isTypeDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-stroke/30 shadow-xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  {['All', ...ACCOUNT_TYPES].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setSelectedType(t)
                        setIsTypeDropdownOpen(false)
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer',
                        selectedType === t
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-focus/80 hover:bg-slate-50'
                      )}
                    >
                      <span>{t === 'All' ? 'All Types' : t}</span>
                      {selectedType === t && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div ref={statusDropdownRef} className="relative inline-block">
              <button
                type="button"
                onClick={() => setIsStatusDropdownOpen((prev) => !prev)}
                className={cn(
                  'inline-flex items-center gap-2 h-11 px-4 rounded-full border border-stroke/60 bg-white hover:bg-surface text-focus text-xs sm:text-sm font-medium shadow-xs transition-colors cursor-pointer select-none box-border',
                  isStatusDropdownOpen && 'ring-2 ring-focus/20 border-focus'
                )}
              >
                <span className="font-medium text-focus/90">
                  {selectedStatus === 'All' ? 'Status' : selectedStatus}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-fg shrink-0" />
              </button>

              {isStatusDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-2xl border border-stroke/30 shadow-xl p-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                  {['All', 'Active', 'Inactive'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setSelectedStatus(st)
                        setIsStatusDropdownOpen(false)
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer',
                        selectedStatus === st
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-focus/80 hover:bg-slate-50'
                      )}
                    >
                      <span>{st === 'All' ? 'All Status' : st}</span>
                      {selectedStatus === st && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Corporate Bank Balance */}
        <Card className="bg-white rounded-2xl border border-stroke/20 p-4 sm:p-5 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <span className="text-xs font-medium text-muted-fg block">
              Total Corporate Bank Balance
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1 tabular-nums tracking-tight">
              {formatPHP(metrics.totalBalance)}
            </h3>
            <p className="text-2xs text-muted-fg font-normal mt-0.5">
              Consolidated across {filteredAccounts.length} corporate accounts
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
            <Landmark className="h-5 w-5" />
          </div>
        </Card>

        {/* Card 2: Active Bank Accounts */}
        <Card className="bg-white rounded-2xl border border-stroke/20 p-4 sm:p-5 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <span className="text-xs font-medium text-muted-fg block">
              Active Bank Accounts
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-focus mt-1 tabular-nums tracking-tight">
              {metrics.activeCount}
            </h3>
            <p className="text-2xs text-muted-fg font-normal mt-0.5">
              Operational accounts in good standing
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </Card>

        {/* Card 3: Primary Operating Accounts */}
        <Card className="bg-white rounded-2xl border border-stroke/20 p-4 sm:p-5 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <span className="text-xs font-medium text-muted-fg block">
              Primary Operating Accounts
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-amber-600 mt-1 tabular-nums tracking-tight">
              {metrics.primaryCount}
            </h3>
            <p className="text-2xs text-muted-fg font-normal mt-0.5">
              Designated settlement accounts
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
            <Star className="h-5 w-5" />
          </div>
        </Card>

        {/* Card 4: Partner Financial Institutions */}
        <Card className="bg-white rounded-2xl border border-stroke/20 p-4 sm:p-5 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div>
            <span className="text-xs font-medium text-muted-fg block">
              Partner Banks
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-focus mt-1 tabular-nums tracking-tight">
              {metrics.uniqueBanks}
            </h3>
            <p className="text-2xs text-muted-fg font-normal mt-0.5">
              Accredited banking partners in PH
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600 shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* 3. Table Container */}
      <Card className="bg-white rounded-[20px] border border-stroke/20 p-4 sm:p-6 shadow-xs space-y-4">
        {/* Table Toolbar: Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by bank, account name, number, branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-9 h-10 rounded-xl text-xs sm:text-sm border-stroke/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-fg hover:text-focus"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-muted-fg font-medium">
            Total Accounts: <strong className="text-focus">{filteredAccounts.length}</strong>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <Table className="w-full table-fixed min-w-[1100px]">
            <colgroup>
              <col style={{ width: '13%' }} /> {/* Bank Name */}
              <col style={{ width: '18%' }} /> {/* Account Name */}
              <col style={{ width: '13%' }} /> {/* Account Number */}
              <col style={{ width: '15%' }} /> {/* Company Name */}
              <col style={{ width: '9%' }} />  {/* Account Type */}
              <col style={{ width: '11%' }} /> {/* Starting Balance */}
              <col style={{ width: '11%' }} /> {/* Current Balance */}
              <col style={{ width: '8%' }} />  {/* Status */}
              <col style={{ width: '9%' }} />  {/* Actions */}
            </colgroup>
            <TableHeader>
              <TableRow className="border-b border-stroke/30 hover:bg-transparent">
                <TableHead className="w-[13%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left whitespace-nowrap">
                  BANK NAME
                </TableHead>
                <TableHead className="w-[18%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left whitespace-nowrap">
                  ACCOUNT NAME
                </TableHead>
                <TableHead className="w-[13%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left whitespace-nowrap">
                  ACCOUNT NUMBER
                </TableHead>
                <TableHead className="w-[15%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left whitespace-nowrap">
                  SUBSIDIARY / COMPANY
                </TableHead>
                <TableHead className="w-[9%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left whitespace-nowrap">
                  TYPE
                </TableHead>
                <TableHead className="w-[11%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left whitespace-nowrap">
                  STARTING BALANCE
                </TableHead>
                <TableHead className="w-[11%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-left whitespace-nowrap">
                  CURRENT BALANCE
                </TableHead>
                <TableHead className="w-[8%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center whitespace-nowrap">
                  STATUS
                </TableHead>
                <TableHead className="w-[9%] px-3.5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-fg text-center whitespace-nowrap">
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-44 text-center py-8">
                    <div className="flex flex-col items-center justify-center text-muted-fg">
                      <Landmark className="h-8 w-8 text-muted-fg/40 mb-2" />
                      <p className="text-sm font-semibold">No corporate bank accounts found</p>
                      <p className="text-xs text-muted-fg/70 mt-0.5">
                        Try adjusting your search query, company or status filter, or click "Create Bank Account".
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAccounts.map((acc) => (
                  <TableRow
                    key={acc.id}
                    className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors"
                  >
                    {/* 1. Bank Name */}
                    <TableCell className="w-[13%] px-3.5 py-3.5 text-left whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 shrink-0 font-bold text-2xs">
                          {acc.bankName.slice(0, 3).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-focus block truncate">
                            {acc.bankName}
                          </span>
                          {acc.isPrimary && (
                            <span className="text-[10px] font-semibold text-amber-600 block">
                              Primary Account
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* 2. Account Name */}
                    <TableCell className="w-[18%] px-3.5 py-3.5 text-left">
                      <div className="font-semibold text-xs text-focus truncate max-w-[220px]" title={acc.accountName}>
                        {acc.accountName}
                      </div>
                      <div className="text-[11px] text-muted-fg truncate max-w-[220px]">
                        {acc.branch}
                      </div>
                    </TableCell>

                    {/* 3. Account Number */}
                    <TableCell className="w-[13%] px-3.5 py-3.5 text-left font-mono text-xs font-semibold text-focus whitespace-nowrap">
                      {acc.accountNumber}
                    </TableCell>

                    {/* 4. Company */}
                    <TableCell className="w-[15%] px-3.5 py-3.5 text-left">
                      <span className="text-xs font-medium text-focus truncate block max-w-[180px]">
                        {acc.companyName}
                      </span>
                    </TableCell>

                    {/* 5. Type */}
                    <TableCell className="w-[9%] px-3.5 py-3.5 text-left whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                        {acc.accountType}
                      </span>
                    </TableCell>

                    {/* 6. Starting Balance */}
                    <TableCell className="w-[11%] px-3.5 py-3.5 text-left font-semibold text-xs text-muted-fg tabular-nums whitespace-nowrap">
                      {formatPHP(acc.startingBalance)}
                    </TableCell>

                    {/* 7. Current Balance */}
                    <TableCell className="w-[11%] px-3.5 py-3.5 text-left font-bold text-xs text-emerald-600 tabular-nums whitespace-nowrap">
                      {formatPHP(acc.currentBalance)}
                    </TableCell>

                    {/* 8. Status */}
                    <TableCell className="w-[8%] px-3.5 py-3.5 text-center whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border uppercase tracking-wider',
                          acc.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        )}
                      >
                        {acc.status}
                      </span>
                    </TableCell>

                    {/* 9. Actions */}
                    <TableCell className="w-[9%] px-3.5 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleOpenAdjustBalance(acc, e)}
                          className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                          title="Record Deposit or Balance Adjustment"
                        >
                          <Wallet className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleOpenEditModal(acc, e)}
                          className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-focus hover:bg-slate-100 cursor-pointer"
                          title="Edit Account Details"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleOpenDelete(acc, e)}
                          className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete Bank Account"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 4. Pagination Footer matching Sales & Lending pages */}
        <div className="pt-4 mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-fg">
          {/* Left: Record summary */}
          <span className="font-medium text-focus/80">
            {filteredAccounts.length === 0
              ? 'Showing 0 of 0 records'
              : `Showing ${startIndex + 1}-${endIndex} of ${filteredAccounts.length} records`}
          </span>

          {/* Right: Page Indicator & Navigation */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-muted-fg italic">
              Page {currentPage} out of {totalPages}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 p-0 flex items-center justify-center rounded-lg border-slate-200 text-focus hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 p-0 flex items-center justify-center rounded-lg border-slate-200 text-focus hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* 5. Modal: Create Bank Account */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-focus flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              <span>Create New Bank Account</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg">
              Add an authorized corporate bank account with its verified starting balance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAccount} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Bank Name */}
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.bankName}
                  onChange={(e) => setCreateForm({ ...createForm, bankName: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                >
                  {BANK_NAMES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subsidiary / Company */}
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Assigned Company <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.companyName}
                  onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                >
                  {COMPANY_OPTIONS.filter((c) => c !== 'All Companies').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Account Name */}
            <div>
              <label className="text-xs font-semibold text-focus block mb-1">
                Account Name / Holder <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={createForm.accountName}
                onChange={(e) => setCreateForm({ ...createForm, accountName: e.target.value })}
                placeholder="e.g. MCT Kitchen Operations Corp."
                className="h-10 text-xs sm:text-sm rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Account Number */}
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={createForm.accountNumber}
                  onChange={(e) => setCreateForm({ ...createForm, accountNumber: e.target.value })}
                  placeholder="e.g. 0042-8819-2041"
                  className="h-10 text-xs sm:text-sm rounded-xl font-mono"
                />
              </div>

              {/* Account Type */}
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Account Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.accountType}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      accountType: e.target.value as BankAccount['accountType'],
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Branch */}
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Branch Location
                </label>
                <Input
                  value={createForm.branch}
                  onChange={(e) => setCreateForm({ ...createForm, branch: e.target.value })}
                  placeholder="e.g. Fairview Regalado Branch, Quezon City"
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>

              {/* Starting Balance */}
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Starting Balance (₱) <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="number"
                  min="0"
                  step="any"
                  value={createForm.startingBalance}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, startingBalance: e.target.value })
                  }
                  placeholder="e.g. 1500000"
                  className="h-10 text-xs sm:text-sm rounded-xl font-semibold"
                />
              </div>
            </div>

            {/* Status & Primary Checkbox */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Account Status
                </label>
                <select
                  value={createForm.status}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      status: e.target.value as BankAccount['status'],
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-focus">
                  <input
                    type="checkbox"
                    checked={createForm.isPrimary}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, isPrimary: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                  />
                  <span>Designate as Primary Operating Account</span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-focus block mb-1">
                Account Purpose / Notes (Optional)
              </label>
              <Input
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="e.g. Dedicated checking for vendor checks and disbursement"
                className="h-10 text-xs sm:text-sm rounded-xl"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 px-5 rounded-xl text-xs font-semibold bg-[#960C01] hover:bg-[#800a01] text-white cursor-pointer"
              >
                Create Bank Account
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. Modal: Edit Bank Account */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-focus flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              <span>Edit Bank Account</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg">
              Update details or adjust balance for {activeAccount?.accountName}.
            </DialogDescription>
          </DialogHeader>

          {activeAccount && (
            <form onSubmit={handleSaveEdit} className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-focus block mb-1">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editForm.bankName}
                    onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                  >
                    {BANK_NAMES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-focus block mb-1">
                    Company
                  </label>
                  <select
                    value={editForm.companyName}
                    onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                  >
                    {COMPANY_OPTIONS.filter((c) => c !== 'All Companies').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={editForm.accountName}
                  onChange={(e) => setEditForm({ ...editForm, accountName: e.target.value })}
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-focus block mb-1">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={editForm.accountNumber}
                    onChange={(e) => setEditForm({ ...editForm, accountNumber: e.target.value })}
                    className="h-10 text-xs sm:text-sm rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-focus block mb-1">
                    Account Type
                  </label>
                  <select
                    value={editForm.accountType}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        accountType: e.target.value as BankAccount['accountType'],
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-focus block mb-1">
                    Current Balance (₱) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    type="number"
                    min="0"
                    step="any"
                    value={editForm.currentBalance}
                    onChange={(e) =>
                      setEditForm({ ...editForm, currentBalance: e.target.value })
                    }
                    className="h-10 text-xs sm:text-sm rounded-xl font-bold text-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-focus block mb-1">
                    Branch Location
                  </label>
                  <Input
                    value={editForm.branch}
                    onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                    className="h-10 text-xs sm:text-sm rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-focus block mb-1">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        status: e.target.value as BankAccount['status'],
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-stroke/60 bg-white text-xs sm:text-sm text-focus focus:outline-none focus:ring-2 focus:ring-focus/20"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-focus">
                    <input
                      type="checkbox"
                      checked={editForm.isPrimary}
                      onChange={(e) => setEditForm({ ...editForm, isPrimary: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                    />
                    <span>Primary Operating Account</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Notes
                </label>
                <Input
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
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
          )}
        </DialogContent>
      </Dialog>

      {/* 7. Modal: Record Deposit / Withdrawal / Balance Adjustment */}
      <Dialog open={isAdjustBalanceOpen} onOpenChange={setIsAdjustBalanceOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-focus flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-600" />
              <span>Record Bank Transaction</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg">
              Update balance for{' '}
              <strong className="text-focus">{activeAccount?.bankName}</strong> ({activeAccount?.accountNumber}).
            </DialogDescription>
          </DialogHeader>

          {activeAccount && (
            <form onSubmit={handleSaveAdjustment} className="space-y-4 mt-2">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                <span className="text-muted-fg font-medium">Current Available Balance:</span>
                <span className="font-bold text-emerald-600 text-sm">
                  {formatPHP(activeAccount.currentBalance)}
                </span>
              </div>

              {/* Transaction Type Segmented Toggle */}
              <div>
                <label className="text-xs font-semibold text-focus block mb-1.5">
                  Transaction Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, type: 'deposit' })}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      adjustForm.type === 'deposit'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-focus hover:bg-slate-200/60'
                    )}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Deposit / Inflow</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, type: 'withdrawal' })}
                    className={cn(
                      'flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      adjustForm.type === 'withdrawal'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-focus hover:bg-slate-200/60'
                    )}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Withdrawal / Outflow</span>
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Amount (₱) <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="number"
                  min="0.01"
                  step="any"
                  value={adjustForm.amount}
                  onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                  placeholder="e.g. 50000"
                  className="h-10 text-xs sm:text-sm rounded-xl font-bold"
                />
              </div>

              {/* Reference */}
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Reference No. / Check No.
                </label>
                <Input
                  value={adjustForm.reference}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reference: e.target.value })}
                  placeholder="e.g. DEP-2026-001"
                  className="h-10 text-xs sm:text-sm rounded-xl font-mono"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-focus block mb-1">
                  Remarks / Purpose
                </label>
                <Input
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  placeholder="e.g. End of day sales deposit"
                  className="h-10 text-xs sm:text-sm rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdjustBalanceOpen(false)}
                  className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-10 px-5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  Confirm Transaction
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 8. Modal: Delete Account Confirmation */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <span>Delete Bank Account</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-fg mt-1">
              Are you sure you want to remove bank account{' '}
              <strong className="text-focus">{activeAccount?.accountNumber}</strong> ({activeAccount?.bankName})?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2.5 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="h-10 px-4 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              className="h-10 px-5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
            >
              Delete Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BankManagementPage

import {
  LayoutDashboard,
  BarChart3,
  CircleDollarSign,
  HandCoins,
  ArrowLeftRight,
  Building2,
  Users,
  History,
  Settings,
  ReceiptText,
  Wallet,
  Landmark,
} from 'lucide-react'
import type * as React from 'react'
import { isLendingEnabledCompany } from '@/config/companyFeatures'

export interface NavSubItem {
  id: string
  title: string
  href: string
  roles?: string[]
}

export interface NavItem {
  id: string
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  subItems?: NavSubItem[]
  roles?: string[] // reserved for future role filtering per spec
  companyCheck?: (company: string) => boolean
}

export const MAIN_NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['Admin', 'Finance', 'Company', 'Company Auditor', 'Audit'],
  },
  {
    id: 'sales',
    title: 'Sales',
    href: '/sales',
    icon: BarChart3,
    roles: ['Admin', 'Finance', 'Company', 'Company Auditor', 'Audit'],
  },
  {
    id: 'expense',
    title: 'Expense',
    href: '/expense',
    icon: CircleDollarSign,
    roles: ['Admin', 'Finance', 'Company', 'Company Auditor', 'Audit'],
  },
  {
    id: 'loan',
    title: 'Loan',
    href: '/loan',
    icon: HandCoins,
    roles: ['Admin', 'Finance', 'Company', 'Company Auditor', 'Audit'],
    subItems: [
      {
        id: 'borrower',
        title: 'Borrower',
        href: '/loan/borrower',
        roles: ['Finance', 'Supervisor', 'Company', 'Company Auditor'],
      },
      {
        id: 'lender',
        title: 'Lender',
        href: '/loan/lender',
        roles: ['Finance', 'Supervisor', 'Company', 'Company Auditor'],
      },
    ],
  },
  {
    id: 'lending',
    title: 'Lending',
    href: '/lending',
    icon: Landmark,
    roles: ['Admin', 'Finance', 'Company', 'Company Auditor', 'Audit'],
    companyCheck: (company: string) => isLendingEnabledCompany(company),
  },
  {
    id: 'petty-cash',
    title: 'Petty Cash',
    href: '/petty-cash',
    icon: Wallet,
    roles: ['Admin', 'Finance', 'Supervisor', 'Company', 'Company Auditor', 'Audit'],
  },
  {
    id: 'bills',
    title: 'Bills',
    href: '/bills',
    icon: ReceiptText,
    roles: ['Admin', 'Finance', 'Supervisor', 'Company', 'Company Auditor', 'Audit'],
  },
  {
    id: 'transaction',
    title: 'Transaction',
    href: '/transaction',
    icon: ArrowLeftRight,
    roles: ['Admin', 'Finance', 'Company', 'Company Auditor', 'Audit'],
  },
] as const

export const SECONDARY_NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'employee',
    title: 'Company Management',
    href: '/employee',
    icon: Building2,
    roles: ['Admin'], // Exclusively for Admin (Company Management)
  },
  {
    id: 'users',
    title: 'User Management',
    href: '/users',
    icon: Users,
    roles: ['Admin'], // Exclusively for Admin (User Management)
  },
  {
    id: 'activity-log',
    title: 'Activity Log',
    href: '/activity-log',
    icon: History,
    roles: ['Admin'], // Exclusively for Admin
  },
  {
    id: 'settings',
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['Admin', 'Finance', 'Company', 'Company Auditor', 'Audit'],
  },
] as const

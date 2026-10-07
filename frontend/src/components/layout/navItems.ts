import {
  LayoutDashboard,
  BarChart3,
  CircleDollarSign,
  HandCoins,
  Users,
  Settings,
} from 'lucide-react'
import type * as React from 'react'

export interface NavSubItem {
  id: string
  title: string
  href: string
}

export interface NavItem {
  id: string
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  subItems?: NavSubItem[]
  roles?: string[] // reserved for future role filtering per spec
}

export const MAIN_NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['Admin', 'Company Auditor'],
  },
  {
    id: 'sales',
    title: 'Sales',
    href: '/sales',
    icon: BarChart3,
    roles: ['Admin', 'Company Auditor'],
  },
  {
    id: 'expense',
    title: 'Expense',
    href: '/expense',
    icon: CircleDollarSign,
    roles: ['Admin', 'Company Auditor'],
  },
  {
    id: 'loan',
    title: 'Loan',
    href: '/loan',
    icon: HandCoins,
    roles: ['Admin', 'Company Auditor'],
  },
] as const

export const SECONDARY_NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'employee',
    title: 'Employee',
    href: '/employee',
    icon: Users,
    roles: ['Admin'], // Exclusively for Admin (Company & User Management)
  },
  {
    id: 'settings',
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['Admin', 'Company Auditor'],
  },
] as const

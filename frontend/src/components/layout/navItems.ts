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
  },
  {
    id: 'sales',
    title: 'Sales',
    href: '/sales/daily',
    icon: BarChart3,
    subItems: [
      { id: 'sales-daily', title: 'Daily', href: '/sales/daily' },
      { id: 'sales-quarterly', title: 'Quarterly', href: '/sales/quarterly' },
      { id: 'sales-monthly', title: 'Monthly', href: '/sales/monthly' },
      { id: 'sales-annual', title: 'Annual', href: '/sales/annual' },
    ],
  },
  {
    id: 'expense',
    title: 'Expense',
    href: '/expense',
    icon: CircleDollarSign,
  },
  {
    id: 'loan',
    title: 'Loan',
    href: '/loan',
    icon: HandCoins,
  },
] as const

export const SECONDARY_NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'employee',
    title: 'Employee',
    href: '/employee',
    icon: Users,
  },
  {
    id: 'settings',
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
] as const

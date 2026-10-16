import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { SalesPage } from '@/pages/SalesPage'
import { ExpensePage } from '@/pages/ExpensePage'
import { LoanPage } from '@/pages/LoanPage'
import { TransactionPage } from '@/pages/TransactionPage'
import { EmployeePage } from '@/pages/EmployeePage'
import { ActivityLogPage } from '@/pages/ActivityLogPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AddTransactionSheetPage } from '@/pages/AddTransactionSheetPage'
import { AppShell } from '@/components/layout/AppShell'
import {
  ProtectedRoute,
  PublicOnlyRoute,
  AdminOnlyRoute,
} from '@/components/layout/RouteGuards'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  // Public Only routes (authenticated users redirected to /dashboard)
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/verify-2fa',
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  // Authenticated App Shell routes
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <AppShell>
          <DashboardPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  // Sales routes
  {
    path: '/sales',
    element: (
      <ProtectedRoute>
        <AppShell>
          <SalesPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/sales/daily',
    element: <Navigate to="/sales" replace />,
  },
  {
    path: '/sales/quarterly',
    element: <Navigate to="/sales" replace />,
  },
  {
    path: '/sales/monthly',
    element: <Navigate to="/sales" replace />,
  },
  {
    path: '/sales/annual',
    element: <Navigate to="/sales" replace />,
  },
  {
    path: '/sales/add',
    element: (
      <ProtectedRoute>
        <AppShell>
          <AddTransactionSheetPage initialType="Sales" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  // Expense, Loan, Employee, Activity Log, Settings
  {
    path: '/expense',
    element: (
      <ProtectedRoute>
        <AppShell>
          <ExpensePage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/expense/add',
    element: (
      <ProtectedRoute>
        <AppShell>
          <AddTransactionSheetPage initialType="Expense" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/loan',
    element: (
      <ProtectedRoute>
        <AppShell>
          <LoanPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/loan/company',
    element: <Navigate to="/loan" replace />,
  },
  {
    path: '/loan/borrower',
    element: (
      <ProtectedRoute>
        <AppShell>
          <LoanPage initialType="Borrower" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/loan/lender',
    element: (
      <ProtectedRoute>
        <AppShell>
          <LoanPage initialType="Lender" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/transaction',
    element: (
      <ProtectedRoute>
        <AppShell>
          <TransactionPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/transactions',
    element: <Navigate to="/transaction" replace />,
  },
  {
    path: '/employee',
    element: (
      <ProtectedRoute>
        <AdminOnlyRoute>
          <AppShell>
            <EmployeePage />
          </AppShell>
        </AdminOnlyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/user-management',
    element: <Navigate to="/employee" replace />,
  },
  {
    path: '/users',
    element: <Navigate to="/employee" replace />,
  },
  {
    path: '/activity-log',
    element: (
      <ProtectedRoute>
        <AdminOnlyRoute>
          <AppShell>
            <ActivityLogPage />
          </AppShell>
        </AdminOnlyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/activity',
    element: <Navigate to="/activity-log" replace />,
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <AppShell>
          <SettingsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  // Fallback
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
])

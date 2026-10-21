import * as React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import {
  ProtectedRoute,
  PublicOnlyRoute,
  AdminOnlyRoute,
  LendingRouteGuard,
} from '@/components/layout/RouteGuards'

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-xs font-medium text-muted-fg animate-pulse">Loading...</span>
      </div>
    </div>
  )
}

function lazyPage<P extends object>(
  importer: () => Promise<{ [key: string]: any }>,
  name: string
) {
  const LazyComponent = React.lazy(() =>
    importer().then((m) => ({ default: m[name] }))
  )
  return function Wrapped(props: P) {
    return (
      <React.Suspense fallback={<PageFallback />}>
        <LazyComponent {...props} />
      </React.Suspense>
    )
  }
}

// Lazy-loaded routes for code-splitting
const LandingPage = lazyPage(() => import('@/pages/LandingPage'), 'LandingPage')
const LoginPage = lazyPage(() => import('@/pages/LoginPage'), 'LoginPage')
const DashboardPage = lazyPage(() => import('@/pages/DashboardPage'), 'DashboardPage')
const SalesPage = lazyPage(() => import('@/pages/SalesPage'), 'SalesPage')
const ExpensePage = lazyPage(() => import('@/pages/ExpensePage'), 'ExpensePage')
const LoanPage = lazyPage(() => import('@/pages/LoanPage'), 'LoanPage')
const LendingPage = lazyPage(() => import('@/pages/LendingPage'), 'LendingPage')
const BillsPage = lazyPage(() => import('@/pages/BillsPage'), 'BillsPage')
const PettyCashPage = lazyPage(() => import('@/pages/PettyCashPage'), 'PettyCashPage')
const TransactionPage = lazyPage(() => import('@/pages/TransactionPage'), 'TransactionPage')
const EmployeePage = lazyPage(() => import('@/pages/EmployeePage'), 'EmployeePage')
const UserManagementPage = lazyPage(() => import('@/pages/UserManagementPage'), 'UserManagementPage')
const ActivityLogPage = lazyPage(() => import('@/pages/ActivityLogPage'), 'ActivityLogPage')
const SettingsPage = lazyPage(() => import('@/pages/SettingsPage'), 'SettingsPage')
const AddTransactionSheetPage = lazyPage(
  () => import('@/pages/AddTransactionSheetPage'),
  'AddTransactionSheetPage'
)

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
    path: '/lending',
    element: (
      <ProtectedRoute>
        <LendingRouteGuard>
          <AppShell>
            <LendingPage />
          </AppShell>
        </LendingRouteGuard>
      </ProtectedRoute>
    ),
  },
  {
    path: '/petty-cash',
    element: (
      <ProtectedRoute>
        <AppShell>
          <PettyCashPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/bills',
    element: (
      <ProtectedRoute>
        <AppShell>
          <BillsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/loan/bills',
    element: <Navigate to="/bills" replace />,
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
    path: '/users',
    element: (
      <ProtectedRoute>
        <AdminOnlyRoute>
          <AppShell>
            <UserManagementPage />
          </AppShell>
        </AdminOnlyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/user-management',
    element: <Navigate to="/users" replace />,
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

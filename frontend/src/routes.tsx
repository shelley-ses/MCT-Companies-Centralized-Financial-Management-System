import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { SalesPage } from '@/pages/SalesPage'
import { ExpensePage } from '@/pages/ExpensePage'
import { LoanPage } from '@/pages/LoanPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { EmployeePage } from '@/pages/EmployeePage'
import { AppShell } from '@/components/layout/AppShell'
import {
  ProtectedRoute,
  PublicOnlyRoute,
  AdminOnlyRoute,
} from '@/components/layout/RouteGuards'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
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
  // Expense, Loan, Employee, Settings
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
    path: '/settings',
    element: (
      <ProtectedRoute>
        <AppShell>
          <PlaceholderPage title="Settings" />
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

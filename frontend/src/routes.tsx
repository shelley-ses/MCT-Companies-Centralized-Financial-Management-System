import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { AppShell } from '@/components/layout/AppShell'
import {
  ProtectedRoute,
  PublicOnlyRoute,
} from '@/components/layout/RouteGuards'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
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
    element: <Navigate to="/sales/daily" replace />,
  },
  {
    path: '/sales/daily',
    element: (
      <ProtectedRoute>
        <AppShell>
          <PlaceholderPage title="Daily Sales" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/sales/quarterly',
    element: (
      <ProtectedRoute>
        <AppShell>
          <PlaceholderPage title="Quarterly Sales" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/sales/monthly',
    element: (
      <ProtectedRoute>
        <AppShell>
          <PlaceholderPage title="Monthly Sales" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/sales/annual',
    element: (
      <ProtectedRoute>
        <AppShell>
          <PlaceholderPage title="Annual Sales" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  // Expense, Loan, Employee, Settings
  {
    path: '/expense',
    element: (
      <ProtectedRoute>
        <AppShell>
          <PlaceholderPage title="Expense" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/loan',
    element: (
      <ProtectedRoute>
        <AppShell>
          <PlaceholderPage title="Loan" />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/employee',
    element: (
      <ProtectedRoute>
        <AppShell>
          <PlaceholderPage title="Employee" />
        </AppShell>
      </ProtectedRoute>
    ),
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
    element: <Navigate to="/dashboard" replace />,
  },
])

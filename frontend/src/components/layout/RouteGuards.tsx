import * as React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'
import { Skeleton } from '@/components/ui/skeleton'
import { isLendingEnabledCompany, isTenantEnabledCompany } from '@/config/companyFeatures'

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { status } = useSession()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div
        className="flex min-h-screen w-full items-center justify-center bg-surface p-8"
        aria-label="Loading application"
        aria-busy="true"
      >
        <div className="w-full max-w-5xl space-y-6">
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    // Redirect to login remembering the target pathname
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Skeleton className="h-96 w-96 rounded-lg" />
      </div>
    )
  }

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export const AdminOnlyRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-surface p-8">
        <Skeleton className="h-64 w-full max-w-4xl rounded-lg" />
      </div>
    )
  }

  // Only Admin has access to Company / User Management and Audit Activity Log
  if (user?.role !== 'Admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export const LendingRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useSession()
  const isCompanyUser = user?.role === 'Supervisor'

  // Company-scoped users assigned to non-lending companies are blocked immediately
  if (isCompanyUser && !isLendingEnabledCompany(user?.assignedCompany)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export const TenantRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useSession()
  const isCompanyUser = user?.role === 'Supervisor'

  // Company-scoped users assigned to non-tenant companies are blocked immediately
  if (isCompanyUser && !isTenantEnabledCompany(user?.assignedCompany)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}


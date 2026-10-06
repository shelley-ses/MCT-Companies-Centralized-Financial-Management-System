import * as React from 'react'
import { useLocation } from 'react-router-dom'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { SignInForm } from '@/components/auth/SignInForm'
import { RecoveryDialog } from '@/components/auth/recovery/RecoveryDialog'
import { TwoFactorDialog } from '@/components/auth/TwoFactorDialog'

export const LoginPage: React.FC = () => {
  const location = useLocation()
  const isForgotPassword = location.pathname === '/forgot-password'
  const is2FA = location.pathname === '/verify-2fa'

  return (
    <AuthLayout>
      <SignInForm />
      <RecoveryDialog open={isForgotPassword} />
      <TwoFactorDialog open={is2FA} />
    </AuthLayout>
  )
}

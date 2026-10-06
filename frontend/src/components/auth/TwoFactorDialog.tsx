import * as React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2, AlertCircle, Check, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/useSession'

interface TwoFactorDialogProps {
  open: boolean
}

export const TwoFactorDialog: React.FC<TwoFactorDialogProps> = ({ open }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { verify2FA, complete2FA } = useSession()
  const [code, setCode] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  // Retrieve remembered path if available
  const fromState = (location.state as { from?: string | { pathname?: string } })?.from
  const fromPath = typeof fromState === 'string' ? fromState : fromState?.pathname
  const safeRedirectPath =
    fromPath &&
    fromPath.startsWith('/') &&
    !fromPath.startsWith('//') &&
    fromPath !== '/login' &&
    fromPath !== '/verify-2fa'
      ? fromPath
      : '/dashboard'

  const resetState = React.useCallback(() => {
    setCode('')
    setError(null)
    setIsLoading(false)
    setIsSuccess(false)
  }, [])

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState()
      navigate('/login')
    }
  }

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (code.length !== 6 || isLoading) return

    try {
      setError(null)
      setIsLoading(true)
      await verify2FA(code)
      setIsSuccess(true)
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Invalid authentication code. Please try again.'
      setError(message)
      if (inputRef.current) {
        inputRef.current.focus()
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinue = async () => {
    await complete2FA()
    resetState()
    navigate(safeRedirectPath, { replace: true })
  }

  const isVerifyDisabled = code.length !== 6 || isLoading

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        {isSuccess ? (
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface border border-stroke/50 text-focus shadow-sm">
              <Check className="h-8 w-8 stroke-[2.5]" aria-hidden="true" />
            </div>

            <DialogHeader className="text-center sm:text-center">
              <DialogTitle className="text-2xl font-bold text-focus text-center">
                Authentication Successful
              </DialogTitle>
              <DialogDescription className="text-center text-muted-fg">
                Your identity has been verified. Welcome to the MCT Financial
                Management System.
              </DialogDescription>
            </DialogHeader>

            <div className="pt-2">
              <Button
                type="button"
                onClick={handleContinue}
                className="w-full h-12 text-base font-semibold bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white"
              >
                Continue to System
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Security Verification
                </span>
              </div>
              <DialogTitle>Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Enter the 6-digit code from your authenticator app to complete
                signing in.
              </DialogDescription>
            </DialogHeader>

            {/* Error Alert */}
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-center gap-3 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error"
              >
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 6-digit OTP Form */}
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                <InputOTP
                  ref={inputRef}
                  maxLength={6}
                  value={code}
                  onChange={(val) => {
                    setCode(val)
                    if (error) setError(null)
                  }}
                  pattern="^[0-9]*$"
                  autoComplete="one-time-code"
                  aria-label="6-digit two-factor authentication code"
                  disabled={isLoading}
                >
                  <InputOTPGroup aria-label="First 3 digits">
                    <InputOTPSlot index={0} isError={!!error} />
                    <InputOTPSlot index={1} isError={!!error} />
                    <InputOTPSlot index={2} isError={!!error} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup aria-label="Last 3 digits">
                    <InputOTPSlot index={3} isError={!!error} />
                    <InputOTPSlot index={4} isError={!!error} />
                    <InputOTPSlot index={5} isError={!!error} />
                  </InputOTPGroup>
                </InputOTP>

              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <Button
                  type="submit"
                  disabled={isVerifyDisabled}
                  className="w-full h-12 text-base font-semibold bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    'Verify & Sign In'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetState()
                    navigate('/login')
                  }}
                  disabled={isLoading}
                  className="w-full h-12 text-base font-medium"
                >
                  Back to Sign In
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

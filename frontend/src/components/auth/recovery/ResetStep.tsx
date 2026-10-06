import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Circle, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { PasswordInput } from '@/components/auth/PasswordInput'
import {
  resetPasswordSchema,
  validatePasswordRules,
  type ResetPasswordFormValues,
} from '@/lib/validation/recovery'
import { passwordRecoveryService } from '@/services/passwordRecoveryService'
import { cn } from '@/lib/utils'

interface ResetStepProps {
  resetToken: string
  onResetComplete: () => void
}

export const ResetStep: React.FC<ResetStepProps> = ({
  resetToken,
  onResetComplete,
}) => {
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const passwordValue = form.watch('password') || ''
  const confirmPasswordValue = form.watch('confirmPassword') || ''

  const rules = validatePasswordRules(passwordValue)
  const passwordsMatch =
    passwordValue.length > 0 &&
    confirmPasswordValue.length > 0 &&
    passwordValue === confirmPasswordValue

  const areAllRulesMet = rules.minLength && rules.hasLetterAndNumber && passwordsMatch
  const isDoneDisabled = !areAllRulesMet || isLoading

  const onSubmit = async (values: ResetPasswordFormValues) => {
    try {
      setServerError(null)
      setIsLoading(true)
      await passwordRecoveryService.resetPassword(resetToken, values.password)
      onResetComplete()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unable to reset password. Please try again.'
      setServerError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogDescription>
          Create a new, strong password for your account.
        </DialogDescription>
      </DialogHeader>

      {serverError && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-center gap-3 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* New Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <FormItem>
                <Label htmlFor="new-password">New Password</Label>
                <FormControl>
                  <PasswordInput
                    id="new-password"
                    placeholder="New Password"
                    autoComplete="new-password"
                    error={!!fieldState.error}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Confirm Password */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <FormItem>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <FormControl>
                  <PasswordInput
                    id="confirm-password"
                    placeholder="Confirm Password"
                    autoComplete="new-password"
                    error={!!fieldState.error}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Live Requirements Checklist */}
          <div
            className="rounded-lg border-[0.5px] border-stroke/50 bg-surface/50 p-4 space-y-2.5 text-sm"
            aria-label="Password requirements"
          >
            <p className="font-semibold text-focus text-xs tracking-wider uppercase">
              Password Requirements
            </p>

            <ul className="space-y-2">
              {/* Requirement 1: Minimum of 8 characters */}
              <li
                className={cn(
                  'flex items-center gap-2.5 transition-colors',
                  rules.minLength ? 'text-focus font-medium' : 'text-muted-fg'
                )}
              >
                {rules.minLength ? (
                  <Check className="h-4 w-4 stroke-[3] text-focus shrink-0" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 text-stroke shrink-0" aria-hidden="true" />
                )}
                <span>Minimum of 8 characters</span>
                <span className="sr-only">
                  {rules.minLength ? '(Requirement met)' : '(Requirement not met)'}
                </span>
              </li>

              {/* Requirement 2: Must include letters and numbers */}
              <li
                className={cn(
                  'flex items-center gap-2.5 transition-colors',
                  rules.hasLetterAndNumber ? 'text-focus font-medium' : 'text-muted-fg'
                )}
              >
                {rules.hasLetterAndNumber ? (
                  <Check className="h-4 w-4 stroke-[3] text-focus shrink-0" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 text-stroke shrink-0" aria-hidden="true" />
                )}
                <span>Must include letters and numbers</span>
                <span className="sr-only">
                  {rules.hasLetterAndNumber
                    ? '(Requirement met)'
                    : '(Requirement not met)'}
                </span>
              </li>

              {/* Requirement 3: Passwords match */}
              {confirmPasswordValue.length > 0 && (
                <li
                  className={cn(
                    'flex items-center gap-2.5 transition-colors',
                    passwordsMatch ? 'text-focus font-medium' : 'text-error'
                  )}
                >
                  {passwordsMatch ? (
                    <Check className="h-4 w-4 stroke-[3] text-focus shrink-0" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 text-error shrink-0" aria-hidden="true" />
                  )}
                  <span>Passwords match</span>
                  <span className="sr-only">
                    {passwordsMatch ? '(Requirement met)' : '(Requirement not met)'}
                  </span>
                </li>
              )}
            </ul>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isDoneDisabled}
              className="w-full h-12 text-base font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Resetting password…
                </>
              ) : (
                'Done'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

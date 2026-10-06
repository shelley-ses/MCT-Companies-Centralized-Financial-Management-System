import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { IconInput } from '@/components/auth/IconInput'
import {
  requestResetSchema,
  type RequestResetFormValues,
} from '@/lib/validation/recovery'
import { passwordRecoveryService } from '@/services/passwordRecoveryService'

interface RequestStepProps {
  onCodeSent: (email: string) => void
}

export const RequestStep: React.FC<RequestStepProps> = ({ onCodeSent }) => {
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<RequestResetFormValues>({
    resolver: zodResolver(requestResetSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
    },
  })

  const { isValid, isSubmitting } = form.formState
  const isSubmitDisabled = !isValid || isSubmitting || isLoading

  const onSubmit = async (values: RequestResetFormValues) => {
    try {
      setServerError(null)
      setIsLoading(true)
      await passwordRecoveryService.requestCode(values.email)
      onCodeSent(values.email)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unable to send code. Please try again.'
      setServerError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle>Forgot Password</DialogTitle>
        <DialogDescription>
          Enter your registered email address to receive a 4-digit verification code.
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <FormItem>
                <Label htmlFor="recovery-email" className="sr-only">
                  Email Address
                </Label>
                <FormControl>
                  <IconInput
                    id="recovery-email"
                    type="email"
                    placeholder="Email Address"
                    autoComplete="email"
                    leadingIcon={<Mail className="h-5 w-5" />}
                    error={!!fieldState.error}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full h-12 text-base font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Sending code…
              </>
            ) : (
              'Send Code'
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}

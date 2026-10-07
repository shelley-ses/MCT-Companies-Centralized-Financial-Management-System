import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import {
  createUserSchema,
  type CreateUserFormValues,
} from '@/lib/validation/employee'
import {
  employeeService,
  type Company,
  type EmployeeUser,
} from '@/services/employeeService'

import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'

interface CreateUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companies: Company[]
  onSuccess?: (user: EmployeeUser) => void
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  open,
  onOpenChange,
  companies,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [pendingValues, setPendingValues] = React.useState<CreateUserFormValues | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false)

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      fullName: '',
      email: '',
      assignedCompany: companies[0]?.name || 'MCT Head Office',
    },
  })

  // Update default assignedCompany once companies load
  React.useEffect(() => {
    if (companies.length > 0 && !form.getValues('assignedCompany')) {
      form.setValue('assignedCompany', companies[0].name)
    }
  }, [companies, form])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset({
        fullName: '',
        email: '',
        assignedCompany: companies[0]?.name || 'MCT Head Office',
      })
      setPendingValues(null)
      setIsConfirmOpen(false)
    }
    onOpenChange(nextOpen)
  }

  const onSubmit = (values: CreateUserFormValues) => {
    setPendingValues(values)
    setIsConfirmOpen(true)
  }

  const handleConfirmCreate = async () => {
    if (!pendingValues) return
    try {
      setIsSubmitting(true)
      const created = await employeeService.createUser(pendingValues)
      onSuccess?.(created)
      setIsConfirmOpen(false)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-[24px] p-6 sm:p-8 bg-white border border-stroke/30 shadow-2xl">
        <DialogHeader className="text-left sm:text-left space-y-1">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-focus">
            Create User
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-fg font-normal">
            Add a new user
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Full Name */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field, fieldState }) => (
                <FormItem className="space-y-1.5">
                  <Label htmlFor="create-full-name" className="text-xs sm:text-sm font-medium text-focus/90">
                    Full Name
                  </Label>
                  <FormControl>
                    <Input
                      id="create-full-name"
                      placeholder="e.g. John Doe"
                      className="h-11 rounded-xl border-[0.5px] border-stroke/60 text-sm focus-visible:ring-1 focus-visible:ring-focus"
                      aria-invalid={!!fieldState.error}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-error" />
                </FormItem>
              )}
            />

            {/* Email Address */}
            <FormField
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <FormItem className="space-y-1.5">
                  <Label htmlFor="create-email-address" className="text-xs sm:text-sm font-medium text-focus/90">
                    Email Address
                  </Label>
                  <FormControl>
                    <Input
                      id="create-email-address"
                      type="email"
                      placeholder="e.g. john.doe@example.com"
                      className="h-11 rounded-xl border-[0.5px] border-stroke/60 text-sm focus-visible:ring-1 focus-visible:ring-focus"
                      aria-invalid={!!fieldState.error}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-error" />
                </FormItem>
              )}
            />

            {/* Assigned Company */}
            <FormField
              control={form.control}
              name="assignedCompany"
              render={({ field, fieldState }) => (
                <FormItem className="space-y-1.5">
                  <Label htmlFor="assigned-company" className="text-xs sm:text-sm font-medium text-focus/90">
                    Assigned Company
                  </Label>
                  <FormControl>
                    <div className="relative">
                      <select
                        id="assigned-company"
                        className="flex h-11 w-full rounded-xl border-[0.5px] border-stroke/60 bg-background px-4 py-2.5 text-sm text-focus shadow-none transition-colors appearance-none focus-visible:border-focus focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
                        aria-invalid={!!fieldState.error}
                        {...field}
                      >
                        {companies.map((comp) => (
                          <option key={comp.id} value={comp.name}>
                            {comp.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-fg">
                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs text-error" />
                </FormItem>
              )}
            />

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="h-11 px-7 rounded-xl border border-stroke/50 text-focus hover:bg-surface font-medium text-sm transition-colors"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 px-6 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating…</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Create User</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Confirmation Modal */}
    <ConfirmationDialog
      open={isConfirmOpen}
      onOpenChange={setIsConfirmOpen}
      title="Confirm User Creation"
      description={
        <span>
          Are you sure you want to add{' '}
          <strong className="text-focus">{pendingValues?.fullName}</strong>{' '}
          assigned to{' '}
          <strong className="text-focus">{pendingValues?.assignedCompany}</strong>?
        </span>
      }
      confirmLabel="Yes, Create User"
      actionType="add"
      variant="primary"
      isLoading={isSubmitting}
      onConfirm={handleConfirmCreate}
    />
  </>
  )
}

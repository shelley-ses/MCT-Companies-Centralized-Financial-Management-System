import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Loader2 } from 'lucide-react'
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
  createCompanySchema,
  type CreateCompanyFormValues,
} from '@/lib/validation/employee'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { employeeService, type Company } from '@/services/employeeService'

interface CreateCompanyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (company: Company) => void
}

export const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<CreateCompanyFormValues>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      name: '',
      email: '',
      address: '',
      contactPerson: '',
      contactNumber: '',
      telephoneNumber: '',
      startingBalance: 0,
      currentBalance: 0,
    },
  })

  const [pendingValues, setPendingValues] = React.useState<CreateCompanyFormValues | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset()
      setPendingValues(null)
      setIsConfirmOpen(false)
    }
    onOpenChange(nextOpen)
  }

  const onSubmit = (values: CreateCompanyFormValues) => {
    setPendingValues(values)
    setIsConfirmOpen(true)
  }

  const handleConfirmCreate = async () => {
    if (!pendingValues) return
    try {
      setIsSubmitting(true)
      const created = await employeeService.createCompany(pendingValues)
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
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto rounded-[24px] p-6 sm:p-8 bg-white border border-stroke/30 shadow-2xl">
        <DialogHeader className="text-left sm:text-left space-y-1">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-focus">
            Create Company
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-fg font-normal">
            Add company to the group
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Company Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <FormItem className="space-y-1.5">
                  <Label htmlFor="company-name" className="text-xs sm:text-sm font-medium text-focus/90">
                    Company Name
                  </Label>
                  <FormControl>
                    <Input
                      id="company-name"
                      placeholder="e.g. MCT Logistics"
                      className="h-11 rounded-xl border-[0.5px] border-stroke/60 text-sm focus-visible:ring-1 focus-visible:ring-focus"
                      aria-invalid={!!fieldState.error}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-error" />
                </FormItem>
              )}
            />

            {/* Company Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <FormItem className="space-y-1.5">
                  <Label htmlFor="company-email" className="text-xs sm:text-sm font-medium text-focus/90">
                    Company Email
                  </Label>
                  <FormControl>
                    <Input
                      id="company-email"
                      type="email"
                      placeholder="e.g. logistics@mctgroup.com"
                      className="h-11 rounded-xl border-[0.5px] border-stroke/60 text-sm focus-visible:ring-1 focus-visible:ring-focus"
                      aria-invalid={!!fieldState.error}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-error" />
                </FormItem>
              )}
            />

            {/* Address & Contact Person */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <Label htmlFor="company-address" className="text-xs sm:text-sm font-medium text-focus/90">
                      Address
                    </Label>
                    <FormControl>
                      <Input
                        id="company-address"
                        placeholder="e.g. Pasig City"
                        className="h-11 rounded-xl border-[0.5px] border-stroke/60 text-sm focus-visible:ring-1 focus-visible:ring-focus"
                        aria-invalid={!!fieldState.error}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-error" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <Label htmlFor="contact-person" className="text-xs sm:text-sm font-medium text-focus/90">
                      Contact Person
                    </Label>
                    <FormControl>
                      <Input
                        id="contact-person"
                        placeholder="e.g. Juan dela Cruz"
                        className="h-11 rounded-xl border-[0.5px] border-stroke/60 text-sm focus-visible:ring-1 focus-visible:ring-focus"
                        aria-invalid={!!fieldState.error}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-error" />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Number & Telephone Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <Label htmlFor="contact-number" className="text-xs sm:text-sm font-medium text-focus/90">
                      Contact Number
                    </Label>
                    <FormControl>
                      <Input
                        id="contact-number"
                        placeholder="e.g. +63 917 123 4567"
                        className="h-11 rounded-xl border-[0.5px] border-stroke/60 text-sm focus-visible:ring-1 focus-visible:ring-focus"
                        aria-invalid={!!fieldState.error}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-error" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telephoneNumber"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <Label htmlFor="telephone-number" className="text-xs sm:text-sm font-medium text-focus/90">
                      Telephone Number
                    </Label>
                    <FormControl>
                      <Input
                        id="telephone-number"
                        placeholder="e.g. (02) 8123-4567"
                        className="h-11 rounded-xl border-[0.5px] border-stroke/60 text-sm focus-visible:ring-1 focus-visible:ring-focus"
                        aria-invalid={!!fieldState.error}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-error" />
                  </FormItem>
                )}
              />
            </div>

            {/* Starting Balance & Current Balance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startingBalance"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <Label htmlFor="starting-balance" className="text-xs sm:text-sm font-medium text-focus/90">
                      Starting Balance
                    </Label>
                    <FormControl>
                      <Input
                        id="starting-balance"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="h-11 rounded-xl border-[0.5px] border-stroke/60 text-sm focus-visible:ring-1 focus-visible:ring-focus"
                        aria-invalid={!!fieldState.error}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-error" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentBalance"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <Label htmlFor="current-balance" className="text-xs sm:text-sm font-medium text-focus/90">
                      Current Balance
                    </Label>
                    <FormControl>
                      <Input
                        id="current-balance"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="h-11 rounded-xl border-[0.5px] border-stroke/60 text-sm focus-visible:ring-1 focus-visible:ring-focus"
                        aria-invalid={!!fieldState.error}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-error" />
                  </FormItem>
                )}
              />
            </div>

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
                    <Building2 className="h-4 w-4" />
                    <span>Create Company</span>
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
      title="Confirm Company Creation"
      description={
        <span>
          Are you sure you want to register{' '}
          <strong className="text-focus">{pendingValues?.name}</strong> to the
          MCT Group of Companies?
        </span>
      }
      confirmLabel="Yes, Create Company"
      actionType="add"
      variant="primary"
      isLoading={isSubmitting}
      onConfirm={handleConfirmCreate}
    />
  </>
  )
}

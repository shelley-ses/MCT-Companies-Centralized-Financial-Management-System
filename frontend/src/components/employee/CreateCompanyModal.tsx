import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Loader2, Camera, Upload } from 'lucide-react'
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
import logo2Url from '@/assets/LOGO2.png'

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
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [profilePreview, setProfilePreview] = React.useState<string | null>(null)

  const form = useForm<CreateCompanyFormValues>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      name: '',
      address: '',
      contactNumber: '',
      telephoneNumber: '',
      startingBalance: 0,
      logoUrl: '',
    },
  })

  const [pendingValues, setPendingValues] = React.useState<CreateCompanyFormValues | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false)

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setProfilePreview(result)
        form.setValue('logoUrl', result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset()
      setProfilePreview(null)
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
      const created = await employeeService.createCompany({
        name: pendingValues.name,
        address: pendingValues.address,
        contactPerson: pendingValues.name,
        email: '',
        contactNumber: pendingValues.contactNumber,
        telephoneNumber: pendingValues.telephoneNumber || '',
        startingBalance: pendingValues.startingBalance,
        currentBalance: pendingValues.startingBalance,
        logoUrl: pendingValues.logoUrl,
      })
      onSuccess?.(created)
      setIsConfirmOpen(false)
      onOpenChange(false)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to create company.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[720px] md:max-w-[760px] max-h-[90vh] overflow-y-auto rounded-[24px] p-6 sm:p-8 bg-white border border-stroke/30 shadow-2xl">
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
              {/* Company Profile Picture / Logo Upload */}
              <div className="flex flex-col items-center justify-center py-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-dashed border-primary/50 hover:border-primary flex items-center justify-center p-3 bg-white shadow-xs cursor-pointer transition-all overflow-hidden"
                  title="Click to upload company logo"
                >
                  <img
                    src={profilePreview || logo2Url}
                    alt="Company Logo Preview"
                    className="h-14 w-14 sm:h-16 sm:w-16 object-contain"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white rounded-full">
                    <Camera className="h-5 w-5" />
                    <span className="text-[10px] font-semibold mt-1">Upload</span>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/*"
                  className="hidden"
                />

                <div className="flex items-center gap-2 mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-7 px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10 font-semibold cursor-pointer"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Upload Logo
                  </Button>
                  {profilePreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setProfilePreview(null)
                        form.setValue('logoUrl', undefined)
                      }}
                      className="h-7 px-2 text-xs text-muted-fg hover:text-focus cursor-pointer"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Company Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <Label htmlFor="company-name" className="text-xs sm:text-sm font-medium text-focus/90">
                      Company Name <span className="text-red-500">*</span>
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

              {/* Address */}
              <FormField
                control={form.control}
                name="address"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <Label htmlFor="company-address" className="text-xs sm:text-sm font-medium text-focus/90">
                      Address <span className="text-red-500">*</span>
                    </Label>
                    <FormControl>
                      <Input
                        id="company-address"
                        placeholder="e.g. Blk 43, Lot 24 Regalado Highway, Fairview, Quezon City"
                        className="h-11 rounded-xl border-[0.5px] border-stroke/60 text-sm focus-visible:ring-1 focus-visible:ring-focus"
                        aria-invalid={!!fieldState.error}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-error" />
                  </FormItem>
                )}
              />

              {/* Contact Number & Telephone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactNumber"
                  render={({ field, fieldState }) => (
                    <FormItem className="space-y-1.5">
                      <Label htmlFor="contact-number" className="text-xs sm:text-sm font-medium text-focus/90">
                        Contact Number <span className="text-red-500">*</span> <span className="text-muted-fg text-xs font-normal">(11 digits)</span>
                      </Label>
                      <FormControl>
                        <Input
                          id="contact-number"
                          type="tel"
                          inputMode="numeric"
                          maxLength={11}
                          placeholder="e.g. 09171234567"
                          value={field.value}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 11)
                            field.onChange(val)
                          }}
                          className="h-11 rounded-xl border-[0.5px] border-stroke/60 text-sm focus-visible:ring-1 focus-visible:ring-focus"
                          aria-invalid={!!fieldState.error}
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
                        Telephone Number <span className="text-muted-fg text-xs font-normal">(Optional, 8 digits)</span>
                      </Label>
                      <FormControl>
                        <Input
                          id="telephone-number"
                          type="tel"
                          inputMode="numeric"
                          maxLength={8}
                          placeholder="e.g. 81234567"
                          value={field.value}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 8)
                            field.onChange(val)
                          }}
                          className="h-11 rounded-xl border-[0.5px] border-stroke/60 text-sm focus-visible:ring-1 focus-visible:ring-focus"
                          aria-invalid={!!fieldState.error}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-error" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Starting Balance */}
              <FormField
                control={form.control}
                name="startingBalance"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <Label htmlFor="starting-balance" className="text-xs sm:text-sm font-medium text-focus/90">
                      Starting Balance (₱) <span className="text-red-500">*</span>
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
                        onChange={(event) => field.onChange(event.target.valueAsNumber || 0)}
                      />
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
                  className="h-11 px-7 rounded-xl border border-stroke/50 text-focus hover:bg-surface font-medium text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 px-6 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
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

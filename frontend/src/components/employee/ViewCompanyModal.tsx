import * as React from 'react'
import {
  Pencil,
  Trash2,
  Loader2,
  Check,
  Camera,
  Upload,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import logo2Url from '@/assets/LOGO2.png'
import {
  employeeService,
  type Company,
  type CreateCompanyPayload,
} from '@/services/employeeService'
import { formatPHP } from '@/lib/format'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'

interface ViewCompanyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: Company | null
  onUpdate?: (updated: Company) => void
  onDelete?: (companyId: string) => void
}

export const ViewCompanyModal: React.FC<ViewCompanyModalProps> = ({
  open,
  onOpenChange,
  company,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = React.useState(false)
  const [isConfirmEditOpen, setIsConfirmEditOpen] = React.useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [profilePreview, setProfilePreview] = React.useState<string | null>(null)
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})

  // Edit form state
  const [formData, setFormData] = React.useState<CreateCompanyPayload>({
    name: '',
    email: '',
    address: '',
    contactPerson: '',
    contactPersonEmail: '',
    contactNumber: '',
    telephoneNumber: '',
    startingBalance: 0,
    currentBalance: 0,
    logoUrl: undefined,
  })

  const handleStartEdit = () => {
    if (company) {
      setFormData({
        name: company.name,
        email: company.email,
        address: company.address,
        contactPerson: company.contactPerson,
        contactPersonEmail: company.contactPersonEmail || '',
        contactNumber: company.contactNumber,
        telephoneNumber: company.telephoneNumber || '',
        startingBalance: company.startingBalance,
        currentBalance: company.currentBalance,
        logoUrl: company.logoUrl,
      })
      setProfilePreview(company.logoUrl || null)
      setFormErrors({})
      setIsEditing(true)
    }
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setProfilePreview(result)
        setFormData((prev) => ({ ...prev, logoUrl: result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setIsEditing(false)
      setIsConfirmEditOpen(false)
      setIsConfirmDeleteOpen(false)
      setProfilePreview(null)
      setFormErrors({})
    }
    onOpenChange(nextOpen)
  }

  if (!company) return null

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}
    if (!formData.contactNumber || !/^\d{11}$/.test(formData.contactNumber)) {
      errors.contactNumber = 'Contact number must be exactly 11 digits'
    }
    if (formData.telephoneNumber && !/^\d{8}$/.test(formData.telephoneNumber)) {
      errors.telephoneNumber = 'Telephone number must be exactly 8 digits'
    }
    if (formData.contactPersonEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactPersonEmail)) {
      errors.contactPersonEmail = 'Please enter a valid email address'
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})
    setIsConfirmEditOpen(true)
  }

  const handleConfirmSave = async () => {
    try {
      setIsSubmitting(true)
      const updated = await employeeService.updateCompany(company.id, formData)
      onUpdate?.(updated)
      setIsConfirmEditOpen(false)
      setIsEditing(false)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to update company.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    try {
      setIsSubmitting(true)
      await employeeService.deleteCompany(company.id)
      onDelete?.(company.id)
      setIsConfirmDeleteOpen(false)
      onOpenChange(false)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to delete company.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleModalOpenChange}>
        <DialogContent className="sm:max-w-[480px] md:max-w-[500px] rounded-[24px] p-6 sm:p-7 bg-white border border-stroke/30 shadow-2xl max-h-[92vh] overflow-y-auto">
          <DialogTitle className="sr-only">
            {company.name} Details
          </DialogTitle>

          {isEditing ? (
            /* Edit Form View in Portrait Orientation */
            <form onSubmit={handleFormSubmit} className="space-y-4 pt-1">
              <div className="border-b border-stroke/20 pb-3 text-center sm:text-left">
                <h3 className="text-lg font-bold text-focus">Edit Company Profile</h3>
                <p className="text-xs text-muted-fg mt-0.5">Update company branding and information</p>
              </div>

              {/* Editable Company Profile Picture / Logo */}
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
                    <span className="text-[10px] font-semibold mt-1">Change</span>
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
                    className="h-7 px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10 font-semibold"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Upload Logo
                  </Button>
                  {profilePreview && profilePreview !== company.logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setProfilePreview(company.logoUrl || null)
                        setFormData((prev) => ({ ...prev, logoUrl: company.logoUrl }))
                      }}
                      className="h-7 px-2 text-xs text-muted-fg hover:text-focus"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-comp-name" className="text-xs font-medium text-focus/80">Company Name</Label>
                  <Input
                    id="edit-comp-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-10 rounded-xl text-sm"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-comp-email" className="text-xs font-medium text-focus/80">Email</Label>
                  <Input
                    id="edit-comp-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-10 rounded-xl text-sm"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-comp-addr" className="text-xs font-medium text-focus/80">Address</Label>
                  <Input
                    id="edit-comp-addr"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="h-10 rounded-xl text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-comp-contact-person" className="text-xs font-medium text-focus/80">
                      Contact Person <span className="text-primary">*</span>
                    </Label>
                    <Input
                      id="edit-comp-contact-person"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="h-10 rounded-xl text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-comp-contact-email" className="text-xs font-medium text-focus/80">
                      Contact Person Email
                    </Label>
                    <Input
                      id="edit-comp-contact-email"
                      type="email"
                      value={formData.contactPersonEmail || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, contactPersonEmail: e.target.value })
                        if (formErrors.contactPersonEmail) setFormErrors((prev) => ({ ...prev, contactPersonEmail: '' }))
                      }}
                      placeholder="person@company.com"
                      className="h-10 rounded-xl text-sm"
                    />
                    {formErrors.contactPersonEmail && (
                      <p className="text-xs text-rose-500">{formErrors.contactPersonEmail}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-comp-contact-num" className="text-xs font-medium text-focus/80">
                      Contact Number <span className="text-primary">*</span>
                      <span className="text-[10px] text-muted-fg ml-1">(11 digits)</span>
                    </Label>
                    <Input
                      id="edit-comp-contact-num"
                      type="tel"
                      inputMode="numeric"
                      maxLength={11}
                      value={formData.contactNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 11)
                        setFormData({ ...formData, contactNumber: val })
                        if (formErrors.contactNumber) setFormErrors((prev) => ({ ...prev, contactNumber: '' }))
                      }}
                      placeholder="09171234567"
                      className="h-10 rounded-xl text-sm"
                      required
                    />
                    {formErrors.contactNumber && (
                      <p className="text-xs text-rose-500">{formErrors.contactNumber}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-comp-tel-num" className="text-xs font-medium text-focus/80">
                      Telephone Number
                      <span className="text-[10px] text-muted-fg ml-1">(Optional, 8 digits)</span>
                    </Label>
                    <Input
                      id="edit-comp-tel-num"
                      type="tel"
                      inputMode="numeric"
                      maxLength={8}
                      value={formData.telephoneNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 8)
                        setFormData({ ...formData, telephoneNumber: val })
                        if (formErrors.telephoneNumber) setFormErrors((prev) => ({ ...prev, telephoneNumber: '' }))
                      }}
                      placeholder="81234567"
                      className="h-10 rounded-xl text-sm"
                    />
                    {formErrors.telephoneNumber && (
                      <p className="text-xs text-rose-500">{formErrors.telephoneNumber}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-comp-start-bal" className="text-xs font-medium text-focus/80">Starting Balance (₱)</Label>
                    <Input
                      id="edit-comp-start-bal"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.startingBalance}
                      onChange={(e) => setFormData({ ...formData, startingBalance: Number(e.target.value) })}
                      className="h-10 rounded-xl text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-comp-curr-bal" className="text-xs font-medium text-focus/80">Current Balance (₱)</Label>
                    <Input
                      id="edit-comp-curr-bal"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.currentBalance}
                      onChange={(e) => setFormData({ ...formData, currentBalance: Number(e.target.value) })}
                      className="h-10 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons: Both on right side */}
              <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-stroke/20">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setIsEditing(false)}
                  className="h-11 px-7 rounded-xl border border-stroke/50 text-focus hover:bg-surface font-medium text-sm transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 px-7 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            /* View Mode in Portrait Orientation */
            <div className="flex flex-col items-center pt-2">
              {/* Centered Circular Logo/Profile Badge */}
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-primary flex items-center justify-center p-3 bg-white shadow-xs overflow-hidden">
                <img
                  src={company.logoUrl || logo2Url}
                  alt={company.name}
                  className="h-14 w-14 sm:h-16 sm:w-16 object-contain"
                />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-focus mt-3.5 tracking-tight text-center">
                {company.name}
              </h2>

              {/* Properly Aligned Key-Value Details */}
              <div className="w-full space-y-3 pt-5 mt-4 border-t border-stroke/20 text-sm">
                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="font-medium text-muted-fg text-sm shrink-0">
                    Contact Person:
                  </span>
                  <span className="font-semibold text-focus text-sm text-right">
                    {company.contactPerson || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="font-medium text-muted-fg text-sm shrink-0">
                    Contact Person Email:
                  </span>
                  <span className="font-semibold text-focus text-sm text-right break-all">
                    {company.contactPersonEmail || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="font-medium text-muted-fg text-sm shrink-0">
                    Contact Number:
                  </span>
                  <span className="font-semibold text-focus text-sm text-right tabular-nums">
                    {company.contactNumber || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="font-medium text-muted-fg text-sm shrink-0">
                    Telephone Number:
                  </span>
                  <span className="font-semibold text-focus text-sm text-right tabular-nums">
                    {company.telephoneNumber || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="font-medium text-muted-fg text-sm shrink-0">
                    Company Email:
                  </span>
                  <span className="font-semibold text-focus text-sm text-right break-all">
                    {company.email || '—'}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4 py-0.5">
                  <span className="font-medium text-muted-fg text-sm shrink-0 mt-0.5">
                    Address:
                  </span>
                  <span className="font-semibold text-focus text-right text-xs sm:text-sm leading-relaxed max-w-[240px]">
                    {company.address || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="font-medium text-muted-fg text-sm shrink-0">
                    Starting Balance:
                  </span>
                  <span className="font-semibold text-focus text-sm text-right tabular-nums">
                    {company.startingBalance ? formatPHP(company.startingBalance) : '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="font-medium text-muted-fg text-sm shrink-0">
                    Current Balance:
                  </span>
                  <span className="font-semibold text-focus text-sm text-right tabular-nums">
                    {company.currentBalance ? formatPHP(company.currentBalance) : '—'}
                  </span>
                </div>
              </div>

              {/* Modal Actions Footer: Both buttons on right side, Cancel removed */}
              <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-stroke/20 w-full">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className="h-11 px-5 rounded-xl border border-stroke/50 text-focus hover:text-primary hover:border-primary/40 hover:bg-primary/5 font-medium text-sm flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-primary" />
                  <span>Delete Company</span>
                </Button>

                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleStartEdit}
                  className="h-11 px-6 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition-all"
                >
                  <Pencil className="h-4 w-4" />
                  <span>Edit Company</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Edit / Save Changes */}
      <ConfirmationDialog
        open={isConfirmEditOpen}
        onOpenChange={setIsConfirmEditOpen}
        title="Confirm Profile Changes"
        description={
          <span>
            Are you sure you want to update the company profile for{' '}
            <strong className="text-focus">{formData.name}</strong>?
          </span>
        }
        confirmLabel="Yes, Save Changes"
        actionType="edit"
        variant="primary"
        isLoading={isSubmitting}
        onConfirm={handleConfirmSave}
      />

      {/* Confirmation Dialog for Delete */}
      <ConfirmationDialog
        open={isConfirmDeleteOpen}
        onOpenChange={setIsConfirmDeleteOpen}
        title="Delete Company"
        description={
          <span>
            Are you sure you want to permanently remove{' '}
            <strong className="text-focus">{company.name}</strong> from the MCT
            Group of Companies? This action cannot be undone.
          </span>
        }
        confirmLabel="Yes, Delete Company"
        actionType="delete"
        variant="destructive"
        isLoading={isSubmitting}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}

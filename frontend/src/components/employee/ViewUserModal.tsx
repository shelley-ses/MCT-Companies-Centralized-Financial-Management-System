import * as React from 'react'
import {
  Pencil,
  Trash2,
  Loader2,
  Check,
  ShieldCheck,
  Building2,
  Mail,
  Upload,
  User as UserIcon,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  employeeService,
  type Company,
  type EmployeeUser,
  type UpdateUserPayload,
} from '@/services/employeeService'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { cn } from '@/lib/utils'

interface ViewUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: EmployeeUser | null
  companies: Company[]
  onUpdate?: (updated: EmployeeUser) => void
  onDelete?: (userId: string) => void
}

const ROLES = [
  'Finance',
  'Audit',
  'Supervisor',
] as const


export const ViewUserModal: React.FC<ViewUserModalProps> = ({
  open,
  onOpenChange,
  user,
  companies,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = React.useState(false)
  const [isConfirmEditOpen, setIsConfirmEditOpen] = React.useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Photo upload in edit mode
  const [editProfilePreview, setEditProfilePreview] = React.useState<string | null>(null)
  const [editAvatarFile, setEditAvatarFile] = React.useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Multi-company selection state
  const [editSelectedCompanies, setEditSelectedCompanies] = React.useState<string[]>([])

  // Edit form state
  const [formData, setFormData] = React.useState<UpdateUserPayload>({
    fullName: '',
    email: '',
    assignedCompany: '',
    role: 'Supervisor',
  })


  const isProtectedAdmin = Boolean(
    user?.isProtected ||
    user?.id === '1' ||
    (user?.email && user.email.toLowerCase() === 'admin@mct.com')
  )

  React.useEffect(() => {
    if (user && open) {
      const initialCompanies = user.companyNames && user.companyNames.length > 0
        ? user.companyNames
        : (user.companyName ? [user.companyName] : [])

      setFormData({
        fullName: user.fullName,
        email: user.email,
        assignedCompany: user.companyName,
        assignedCompanies: initialCompanies,
        role: user.role || (user.isAdmin ? 'Admin' : 'Supervisor'),
        avatarUrl: user.avatarUrl,
      })
      setEditSelectedCompanies(initialCompanies)
      setEditProfilePreview(user.avatarUrl || null)
      setEditAvatarFile(null)
    }
  }, [user, open])

  const handleStartEdit = () => {
    if (user && !isProtectedAdmin) {
      const initialCompanies = user.companyNames && user.companyNames.length > 0
        ? user.companyNames
        : (user.companyName ? [user.companyName] : [])

      setFormData({
        fullName: user.fullName,
        email: user.email,
        assignedCompany: user.companyName,
        assignedCompanies: initialCompanies,
        role: user.role || (user.isAdmin ? 'Admin' : 'Supervisor'),
        avatarUrl: user.avatarUrl,
      })
      setEditSelectedCompanies(initialCompanies)
      setEditProfilePreview(user.avatarUrl || null)
      setEditAvatarFile(null)
      setIsEditing(true)
    }
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setEditAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditProfilePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  const handleRoleChange = (role: string) => {
    setFormData((prev) => ({ ...prev, role }))
  }

  const handleModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setIsEditing(false)
      setIsConfirmEditOpen(false)
      setIsConfirmDeleteOpen(false)
      setEditAvatarFile(null)
    }
    onOpenChange(nextOpen)
  }

  if (!user) return null

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.role !== 'Admin' && formData.role !== 'Audit' && editSelectedCompanies.length === 0) {
      window.alert('Please select at least one assigned company.')
      return
    }
    setIsConfirmEditOpen(true)
  }

  const handleConfirmSave = async () => {
    try {
      setIsSubmitting(true)
      const updated = await employeeService.updateUser(user.id, {
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
        assignedCompany: editSelectedCompanies[0] || '',
        assignedCompanies: editSelectedCompanies,
        avatarFile: editAvatarFile || undefined,
      })
      setIsConfirmEditOpen(false)
      setIsEditing(false)
      setEditAvatarFile(null)
      onOpenChange(false)
      onUpdate?.(updated)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to update user.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (isProtectedAdmin) {
      window.alert('The primary administrator account is protected and cannot be deleted.')
      return
    }
    try {
      setIsSubmitting(true)
      await employeeService.deleteUser(user.id)
      onDelete?.(user.id)
      setIsConfirmDeleteOpen(false)
      onOpenChange(false)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to delete user.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <>
      <Dialog open={open} onOpenChange={handleModalOpenChange}>
        <DialogContent className="sm:max-w-[500px] md:max-w-[520px] rounded-[24px] p-6 sm:p-7 bg-white border border-stroke/30 shadow-2xl max-h-[92vh] overflow-y-auto">
          <DialogTitle className="sr-only">
            {user.fullName} Details
          </DialogTitle>

          {isEditing ? (
            /* Edit Form View in Portrait Orientation */
            <form onSubmit={handleFormSubmit} className="space-y-4 pt-1">
              <div className="border-b border-stroke/20 pb-3 text-center sm:text-left">
                <h3 className="text-lg font-bold text-focus">Edit User Profile</h3>
                <p className="text-xs text-muted-fg mt-0.5">Update user account, role and assigned company</p>
              </div>

              {/* Photo Upload in Edit Mode */}
              <div className="flex items-center gap-3.5 pb-2 border-b border-stroke/15">
                <div className="h-14 w-14 rounded-full border-2 border-primary/90 flex items-center justify-center shrink-0 bg-red-50 text-primary font-bold text-base shadow-xs overflow-hidden">
                  {editProfilePreview ? (
                    <img
                      src={editProfilePreview}
                      alt="Avatar Preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.innerText = initials || 'U'
                        }
                      }}
                    />
                  ) : (
                    initials || <UserIcon className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 px-3 text-xs text-primary font-semibold hover:bg-red-50 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    Change Photo
                  </Button>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-user-name" className="text-xs font-medium text-focus/80">Full Name</Label>
                  <Input
                    id="edit-user-name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="h-10 rounded-xl text-sm"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-user-email" className="text-xs font-medium text-focus/80">Email Address</Label>
                  <Input
                    id="edit-user-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-10 rounded-xl text-sm"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-user-role" className="text-xs font-medium text-focus/80">Role</Label>
                  <div className="relative">
                    <select
                      id="edit-user-role"
                      value={formData.role}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-stroke/60 bg-white px-3 py-2 text-xs sm:text-sm text-focus shadow-none transition-colors appearance-none focus:outline-none focus:ring-1 focus:ring-focus cursor-pointer"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
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
                </div>

                {/* Companies Assigned - Multi-Select Checkboxes */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-focus/80">
                      Companies Assigned ({editSelectedCompanies.length} selected)
                    </Label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setEditSelectedCompanies(companies.map((c) => c.name))}
                        className="text-primary hover:underline font-medium text-[11px] cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setEditSelectedCompanies([])}
                        className="text-muted-fg hover:text-focus text-[11px] cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="max-h-36 overflow-y-auto pr-1 space-y-1.5 rounded-xl border border-stroke/40 p-2 bg-slate-50/50">
                    {companies.map((comp) => {
                      const isSelected = editSelectedCompanies.includes(comp.name)
                      return (
                        <div
                          key={comp.id}
                          onClick={() =>
                            setEditSelectedCompanies((prev) =>
                              prev.includes(comp.name)
                                ? prev.filter((c) => c !== comp.name)
                                : [...prev, comp.name]
                            )
                          }
                          className={cn(
                            'flex items-center justify-between p-2 rounded-lg border text-xs font-medium transition-all cursor-pointer select-none',
                            isSelected
                              ? 'border-[#960C01] bg-red-50/70 text-focus ring-1 ring-[#960C01]'
                              : 'border-stroke/50 bg-white hover:bg-slate-100/70 text-focus/80'
                          )}
                          role="checkbox"
                          aria-checked={isSelected}
                          tabIndex={0}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div
                              className={cn(
                                'h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition-colors',
                                isSelected ? 'border-[#960C01] bg-[#960C01]' : 'border-slate-300 bg-white'
                              )}
                            >
                              {isSelected && <Check className="h-2.5 w-2.5 text-white stroke-[3]" />}
                            </div>
                            <span className="truncate">{comp.name}</span>
                          </div>
                          {isSelected && (
                            <span className="text-[9px] font-bold text-primary uppercase px-1.5 py-0.5 rounded bg-red-100/70 shrink-0">
                              Selected
                            </span>
                          )}
                        </div>
                      )
                    })}
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
                  className="h-11 px-7 rounded-xl border border-stroke/50 text-focus hover:bg-surface font-medium text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 px-7 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
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
              {/* Centered Circular User Avatar Badge */}
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-primary flex items-center justify-center p-1 bg-red-50 text-primary shadow-xs font-bold text-2xl sm:text-3xl overflow-hidden">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="h-full w-full object-cover rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      if (e.currentTarget.parentElement) {
                        e.currentTarget.parentElement.innerText = initials || 'U'
                      }
                    }}
                  />
                ) : (
                  initials || <UserIcon className="h-10 w-10 text-primary" />
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-focus mt-3.5 tracking-tight text-center">
                {user.fullName}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-primary/10 text-primary border border-primary/20">
                  {user.role || (user.isAdmin ? 'Admin' : 'Supervisor')}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {user.status}
                </span>
              </div>

              {/* Key-Value Details */}
              <div className="w-full space-y-3 pt-5 mt-4 border-t border-stroke/20 text-sm">
                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="font-medium text-muted-fg text-sm shrink-0 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-fg" />
                    Email:
                  </span>
                  <span className="font-semibold text-focus text-sm text-right break-all">
                    {user.email || '—'}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4 py-0.5">
                  <span className="font-medium text-muted-fg text-sm shrink-0 mt-0.5 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-fg" />
                    Appointed Companies:
                  </span>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[280px]">
                    {user.companyNames && user.companyNames.length > 0 ? (
                      user.companyNames.map((cName) => (
                        <span
                          key={cName}
                          className="text-xs px-2.5 py-0.5 rounded font-medium bg-slate-100 text-focus border border-slate-200"
                        >
                          {cName}
                        </span>
                      ))
                    ) : (
                      <span className="font-semibold text-focus text-sm text-right">
                        {user.companyName || '—'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="font-medium text-muted-fg text-sm shrink-0 flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5 text-muted-fg" />
                    Role:
                  </span>
                  <span className="font-semibold text-focus text-sm text-right">
                    {user.role || (user.isAdmin ? 'Admin' : 'Supervisor')}
                  </span>
                </div>



                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="font-medium text-muted-fg text-sm shrink-0">
                    Last Login:
                  </span>
                  <span className="font-normal text-muted-fg text-xs text-right">
                    {user.lastLogin || 'Never'}
                  </span>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-stroke/20 w-full">
                {isProtectedAdmin ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium w-full">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>Primary System Administrator account is protected (read-only)</span>
                  </div>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => setIsConfirmDeleteOpen(true)}
                      className="h-11 px-5 rounded-xl border border-stroke/50 text-focus hover:text-primary hover:border-primary/40 hover:bg-primary/5 font-medium text-sm flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 text-primary" />
                      <span>Delete User</span>
                    </Button>

                    <Button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleStartEdit}
                      className="h-11 px-6 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Pencil className="h-4 w-4" />
                      <span>Edit User</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Edit / Save Changes */}
      <ConfirmationDialog
        open={isConfirmEditOpen}
        onOpenChange={setIsConfirmEditOpen}
        title="Confirm User Changes"
        description={
          <span>
            Are you sure you want to update the profile for{' '}
            <strong className="text-focus">{formData.fullName}</strong>?
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
        title="Delete User"
        description={
          <span>
            Are you sure you want to permanently remove{' '}
            <strong className="text-focus">{user.fullName}</strong> ({user.email})?
            This action cannot be undone.
          </span>
        }
        confirmLabel="Yes, Delete User"
        actionType="delete"
        variant="destructive"
        isLoading={isSubmitting}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}

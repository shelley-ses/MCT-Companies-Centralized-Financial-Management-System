import * as React from 'react'
import {
  Pencil,
  Trash2,
  Loader2,
  Check,
  ShieldCheck,
  Building2,
  Mail,
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
  type UserPermissionActions,
  type UpdateUserPayload,
} from '@/services/employeeService'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'

interface ViewUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: EmployeeUser | null
  companies: Company[]
  onUpdate?: (updated: EmployeeUser) => void
  onDelete?: (userId: string) => void
}

const ROLES = [
  'Admin',
  'Audit',
  'Finance',
  'Supervisor',
  'Company Employee',
  'Cashier',
] as const

const DEFAULT_PERMISSIONS: UserPermissionActions = {
  addSales: true,
  addExpense: true,
  requestLoans: false,
  exportData: true,
  viewRecords: true,
  deleteRecords: false,
  editRecords: false,
  view: true,
  create: true,
  edit: false,
  delete: false,
  export: true,
}

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

  // Edit form state
  const [formData, setFormData] = React.useState<UpdateUserPayload>({
    fullName: '',
    email: '',
    assignedCompany: '',
    role: 'Company Employee',
  })

  const [permissions, setPermissions] = React.useState<UserPermissionActions>(DEFAULT_PERMISSIONS)

  React.useEffect(() => {
    if (user && open) {
      setFormData({
        fullName: user.fullName,
        email: user.email,
        assignedCompany: user.companyName,
        role: user.role || (user.isAdmin ? 'Admin' : 'Company Employee'),
        avatarUrl: user.avatarUrl,
      })

      // Load user's permissions
      employeeService.getUserPermissions(user.id).then((map) => {
        const rawPerm = map[user.companyName] || (user.isAdmin ? {
          addSales: true, addExpense: true, requestLoans: true, exportData: true, viewRecords: true, deleteRecords: true, editRecords: true,
          view: true, create: true, edit: true, delete: true, export: true
        } : DEFAULT_PERMISSIONS)

        const normalizedPerm: UserPermissionActions = {
          addSales: Boolean(rawPerm.addSales ?? rawPerm.create),
          addExpense: Boolean(rawPerm.addExpense ?? rawPerm.create),
          requestLoans: Boolean(rawPerm.requestLoans ?? false),
          exportData: Boolean(rawPerm.exportData ?? rawPerm.export ?? true),
          viewRecords: Boolean(rawPerm.viewRecords ?? rawPerm.view ?? true),
          deleteRecords: Boolean(rawPerm.deleteRecords ?? rawPerm.delete ?? false),
          editRecords: Boolean(rawPerm.editRecords ?? rawPerm.edit ?? false),
          view: Boolean(rawPerm.viewRecords ?? rawPerm.view ?? true),
          create: Boolean(rawPerm.addSales ?? rawPerm.create),
          edit: Boolean(rawPerm.editRecords ?? rawPerm.edit ?? false),
          delete: Boolean(rawPerm.deleteRecords ?? rawPerm.delete ?? false),
          export: Boolean(rawPerm.exportData ?? rawPerm.export ?? true),
        }
        setPermissions(normalizedPerm)
      }).catch(() => {
        setPermissions(DEFAULT_PERMISSIONS)
      })
    }
  }, [user, open])

  const handleStartEdit = () => {
    if (user) {
      setFormData({
        fullName: user.fullName,
        email: user.email,
        assignedCompany: user.companyName,
        role: user.role || (user.isAdmin ? 'Admin' : 'Company Employee'),
        avatarUrl: user.avatarUrl,
      })
      setIsEditing(true)
    }
  }

  const handleRoleChange = (role: string) => {
    setFormData((prev) => ({ ...prev, role }))
    if (role === 'Admin') {
      setPermissions({
        addSales: true, addExpense: true, requestLoans: true, exportData: true, viewRecords: true, deleteRecords: true, editRecords: true,
        view: true, create: true, edit: true, delete: true, export: true
      })
    } else if (role === 'Audit') {
      setPermissions({
        addSales: false, addExpense: false, requestLoans: false, exportData: true, viewRecords: true, editRecords: false, deleteRecords: false,
        view: true, create: false, edit: false, delete: false, export: true
      })
    } else if (role === 'Finance' || role === 'Supervisor') {
      setPermissions({
        addSales: true, addExpense: true, requestLoans: true, exportData: true, viewRecords: true, editRecords: true, deleteRecords: false,
        view: true, create: true, edit: true, delete: false, export: true
      })
    } else if (role === 'Cashier') {
      setPermissions({
        addSales: true, addExpense: false, requestLoans: false, exportData: false, viewRecords: true, editRecords: false, deleteRecords: false,
        view: true, create: true, edit: false, delete: false, export: false
      })
    } else {
      setPermissions({
        addSales: true, addExpense: true, requestLoans: false, exportData: true, viewRecords: true, editRecords: false, deleteRecords: false,
        view: true, create: true, edit: false, delete: false, export: true
      })
    }
  }

  const handleModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setIsEditing(false)
      setIsConfirmEditOpen(false)
      setIsConfirmDeleteOpen(false)
    }
    onOpenChange(nextOpen)
  }

  if (!user) return null

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsConfirmEditOpen(true)
  }

  const handleConfirmSave = async () => {
    try {
      setIsSubmitting(true)
      const permsMap: Record<string, UserPermissionActions> = {
        [formData.assignedCompany || user.companyName]: permissions,
      }
      const updated = await employeeService.updateUser(user.id, {
        ...formData,
        permissions: permsMap,
      })
      await employeeService.saveUserPermissions(user.id, permsMap)
      onUpdate?.(updated)
      setIsConfirmEditOpen(false)
      setIsEditing(false)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to update user.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                  <div className="space-y-1">
                    <Label htmlFor="edit-user-company" className="text-xs font-medium text-focus/80">
                      Company Assigned
                    </Label>
                    <div className="relative">
                      <select
                        id="edit-user-company"
                        value={formData.assignedCompany}
                        onChange={(e) => setFormData({ ...formData, assignedCompany: e.target.value })}
                        className="flex h-10 w-full rounded-xl border border-stroke/60 bg-white px-3 py-2 text-xs sm:text-sm text-focus shadow-none transition-colors appearance-none focus:outline-none focus:ring-1 focus:ring-focus cursor-pointer"
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
                  </div>
                </div>

                {/* Permissions checklist */}
                <div className="space-y-2 pt-1 border-t border-stroke/20">
                  <div className="flex items-center gap-1.5 pt-1">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <Label className="text-xs font-semibold text-focus">
                      Assigned Permissions
                    </Label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                    <label className="flex items-center gap-2 text-xs font-medium text-focus/90 cursor-pointer select-none">
                      <Checkbox
                        checked={permissions.addSales}
                        onCheckedChange={(checked) =>
                          setPermissions((p) => ({ ...p, addSales: Boolean(checked) }))
                        }
                      />
                      <span>Add Sales</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-focus/90 cursor-pointer select-none">
                      <Checkbox
                        checked={permissions.addExpense}
                        onCheckedChange={(checked) =>
                          setPermissions((p) => ({ ...p, addExpense: Boolean(checked) }))
                        }
                      />
                      <span>Add Expense</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-focus/90 cursor-pointer select-none">
                      <Checkbox
                        checked={permissions.requestLoans}
                        onCheckedChange={(checked) =>
                          setPermissions((p) => ({ ...p, requestLoans: Boolean(checked) }))
                        }
                      />
                      <span>Request Loans</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-focus/90 cursor-pointer select-none">
                      <Checkbox
                        checked={permissions.exportData}
                        onCheckedChange={(checked) =>
                          setPermissions((p) => ({ ...p, exportData: Boolean(checked) }))
                        }
                      />
                      <span>Export Data</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-focus/90 cursor-pointer select-none">
                      <Checkbox
                        checked={permissions.viewRecords}
                        onCheckedChange={(checked) =>
                          setPermissions((p) => ({ ...p, viewRecords: Boolean(checked) }))
                        }
                      />
                      <span>View Records</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-focus/90 cursor-pointer select-none">
                      <Checkbox
                        checked={permissions.editRecords}
                        onCheckedChange={(checked) =>
                          setPermissions((p) => ({ ...p, editRecords: Boolean(checked) }))
                        }
                      />
                      <span>Edit Records</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-focus/90 cursor-pointer select-none">
                      <Checkbox
                        checked={permissions.deleteRecords}
                        onCheckedChange={(checked) =>
                          setPermissions((p) => ({ ...p, deleteRecords: Boolean(checked) }))
                        }
                      />
                      <span>Delete Records</span>
                    </label>
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
                  <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover rounded-full" />
                ) : (
                  initials || <UserIcon className="h-10 w-10 text-primary" />
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-focus mt-3.5 tracking-tight text-center">
                {user.fullName}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-primary/10 text-primary border border-primary/20">
                  {user.role || (user.isAdmin ? 'Admin' : 'Company Employee')}
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

                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="font-medium text-muted-fg text-sm shrink-0 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-fg" />
                    Appointed Company:
                  </span>
                  <span className="font-semibold text-focus text-sm text-right">
                    {user.companyName || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="font-medium text-muted-fg text-sm shrink-0 flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5 text-muted-fg" />
                    Role:
                  </span>
                  <span className="font-semibold text-focus text-sm text-right">
                    {user.role || (user.isAdmin ? 'Admin' : 'Company Employee')}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4 py-0.5">
                  <span className="font-medium text-muted-fg text-sm shrink-0 mt-0.5 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-fg" />
                    Permissions:
                  </span>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[260px]">
                    {permissions.addSales && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-focus font-medium">Add Sales</span>
                    )}
                    {permissions.addExpense && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-focus font-medium">Add Expense</span>
                    )}
                    {permissions.requestLoans && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-focus font-medium">Request Loans</span>
                    )}
                    {permissions.exportData && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-focus font-medium">Export Data</span>
                    )}
                    {permissions.viewRecords && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-focus font-medium">View Records</span>
                    )}
                    {permissions.editRecords && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-focus font-medium">Edit Records</span>
                    )}
                    {permissions.deleteRecords && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-focus font-medium">Delete Records</span>
                    )}
                  </div>
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

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  UserPlus,
  Loader2,
  ShieldCheck,
  Camera,
  Upload,
  Building2,
  User as UserIcon,
} from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
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
  type UserPermissionActions,
} from '@/services/employeeService'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { cn } from '@/lib/utils'

interface CreateUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companies: Company[]
  onSuccess?: (user: EmployeeUser) => void
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

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  open,
  onOpenChange,
  companies,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [pendingValues, setPendingValues] = React.useState<CreateUserFormValues | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false)

  // Profile image upload state
  const [profilePreview, setProfilePreview] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Permissions state
  const [permissions, setPermissions] = React.useState<UserPermissionActions>(DEFAULT_PERMISSIONS)

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      fullName: '',
      email: '',
      assignedCompany: companies[0]?.name || 'MCT Head Office',
      role: 'Company Employee',
      avatarUrl: '',
    },
  })

  // Watch full name to generate avatar initials preview
  const watchedName = form.watch('fullName')
  const initials = React.useMemo(() => {
    return watchedName
      .trim()
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }, [watchedName])

  // Update default assignedCompany once companies load
  React.useEffect(() => {
    if (companies.length > 0 && !form.getValues('assignedCompany')) {
      form.setValue('assignedCompany', companies[0].name)
    }
  }, [companies, form])

  // Handle image upload with FileReader preview
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setProfilePreview(result)
        form.setValue('avatarUrl', result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Adjust permissions template when role changes
  const handleRoleChange = (role: string) => {
    form.setValue('role', role)
    if (role === 'Admin') {
      setPermissions({
        addSales: true,
        addExpense: true,
        requestLoans: true,
        exportData: true,
        viewRecords: true,
        deleteRecords: true,
        editRecords: true,
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true,
      })
    } else if (role === 'Audit') {
      form.setValue('assignedCompany', 'All Companies')
      setPermissions({
        addSales: false,
        addExpense: false,
        requestLoans: false,
        exportData: true,
        viewRecords: true,
        deleteRecords: false,
        editRecords: false,
        view: true,
        create: false,
        edit: false,
        delete: false,
        export: true,
      })
    } else if (role === 'Finance') {
      setPermissions({
        addSales: true,
        addExpense: true,
        requestLoans: true,
        exportData: true,
        viewRecords: true,
        editRecords: true,
        deleteRecords: false,
        view: true,
        create: true,
        edit: true,
        delete: false,
        export: true,
      })
    } else if (role === 'Supervisor') {
      setPermissions({
        addSales: true,
        addExpense: true,
        requestLoans: true,
        exportData: true,
        viewRecords: true,
        editRecords: true,
        deleteRecords: false,
        view: true,
        create: true,
        edit: true,
        delete: false,
        export: true,
      })
    } else if (role === 'Cashier') {
      setPermissions({
        addSales: true,
        addExpense: false,
        requestLoans: false,
        exportData: false,
        viewRecords: true,
        editRecords: false,
        deleteRecords: false,
        view: true,
        create: true,
        edit: false,
        delete: false,
        export: false,
      })
    } else {
      // Company Employee
      setPermissions({
        addSales: true,
        addExpense: true,
        requestLoans: false,
        exportData: true,
        viewRecords: true,
        editRecords: false,
        deleteRecords: false,
        view: true,
        create: true,
        edit: false,
        delete: false,
        export: true,
      })
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset({
        fullName: '',
        email: '',
        assignedCompany: companies[0]?.name || 'MCT Head Office',
        role: 'Company Employee',
        avatarUrl: '',
      })
      setProfilePreview(null)
      setPermissions(DEFAULT_PERMISSIONS)
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
      const permsMap: Record<string, UserPermissionActions> = {
        [pendingValues.assignedCompany]: permissions,
      }
      const created = await employeeService.createUser({
        fullName: pendingValues.fullName,
        email: pendingValues.email,
        assignedCompany: pendingValues.assignedCompany,
        role: pendingValues.role,
        password: 'password123',
        avatarUrl: pendingValues.avatarUrl || profilePreview || undefined,
        permissions: permsMap,
      })
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
              Create User
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-fg font-normal">
              Register an employee and appoint them to a company
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              {/* 1. Display Profile Image Upload */}
              <div className="flex flex-col items-center justify-center py-1">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-dashed border-primary/50 hover:border-primary flex items-center justify-center p-1 bg-red-50/40 shadow-xs cursor-pointer transition-all overflow-hidden"
                  title="Click to upload display profile photo"
                >
                  {profilePreview ? (
                    <img
                      src={profilePreview}
                      alt="Profile Preview"
                      className="h-full w-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-primary">
                      {initials ? (
                        <span className="text-2xl font-bold tracking-tight">{initials}</span>
                      ) : (
                        <UserIcon className="h-10 w-10 text-primary/70" />
                      )}
                    </div>
                  )}
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
                    Upload Photo
                  </Button>
                  {profilePreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setProfilePreview(null)
                        form.setValue('avatarUrl', undefined)
                      }}
                      className="h-7 px-2 text-xs text-muted-fg hover:text-focus cursor-pointer"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* 2. Full Name */}
              <FormField
                control={form.control}
                name="fullName"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <Label htmlFor="create-full-name" className="text-xs sm:text-sm font-medium text-focus/90">
                      Full Name <span className="text-red-500">*</span>
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

              {/* 3. Email Address */}
              <FormField
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <Label htmlFor="create-email-address" className="text-xs sm:text-sm font-medium text-focus/90">
                      Email Address <span className="text-red-500">*</span>
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

              {/* 4. Role Selection */}
              <FormField
                control={form.control}
                name="role"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <Label htmlFor="create-user-role" className="text-xs sm:text-sm font-medium text-focus/90">
                      Role <span className="text-red-500">*</span>
                    </Label>
                    <FormControl>
                      <div className="relative">
                        <select
                          id="create-user-role"
                          value={field.value}
                          onChange={(e) => handleRoleChange(e.target.value)}
                          className="flex h-11 w-full rounded-xl border-[0.5px] border-stroke/60 bg-background px-3.5 py-2.5 text-sm text-focus shadow-none transition-colors appearance-none focus-visible:border-focus focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus cursor-pointer"
                          aria-invalid={!!fieldState.error}
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
                    </FormControl>
                    <FormMessage className="text-xs text-error" />
                  </FormItem>
                )}
              />

              {/* 5. Company Assigned - Radio Button Selector */}
              <FormField
                control={form.control}
                name="assignedCompany"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs sm:text-sm font-medium text-focus/90">
                        Company Assigned <span className="text-red-500">*</span>
                      </Label>
                      <span className="text-[11px] text-muted-fg">Choose where company to appoint</span>
                    </div>
                    <FormControl>
                      <div className="max-h-48 overflow-y-auto pr-1 space-y-2 rounded-xl border border-stroke/40 p-2.5 bg-slate-50/50">
                        {companies.map((comp) => {
                          const isSelected = field.value === comp.name
                          return (
                            <div
                              key={comp.id}
                              onClick={() => field.onChange(comp.name)}
                              className={cn(
                                'flex items-center justify-between p-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer select-none',
                                isSelected
                                  ? 'border-[#960C01] bg-red-50/70 text-focus shadow-2xs ring-1 ring-[#960C01]'
                                  : 'border-stroke/50 bg-white hover:bg-slate-100/70 text-focus/80'
                              )}
                              role="radio"
                              aria-checked={isSelected}
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === ' ' || e.key === 'Enter') {
                                  e.preventDefault()
                                  field.onChange(comp.name)
                                }
                              }}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <div
                                  className={cn(
                                    'h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                                    isSelected ? 'border-[#960C01]' : 'border-slate-300'
                                  )}
                                >
                                  {isSelected && (
                                    <div className="h-2 w-2 rounded-full bg-[#960C01]" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 truncate">
                                  <Building2
                                    className={cn(
                                      'h-4 w-4 shrink-0',
                                      isSelected ? 'text-primary' : 'text-muted-fg'
                                    )}
                                  />
                                  <span className="text-xs sm:text-sm font-semibold truncate">
                                    {comp.name}
                                  </span>
                                </div>
                              </div>

                              {isSelected && (
                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100/70 shrink-0">
                                  Selected
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-error" />
                  </FormItem>
                )}
              />

              {/* 6. Appointed Permissions Checklist */}
              <div className="space-y-2 pt-2 border-t border-stroke/20">
                <div className="flex items-center gap-1.5 pt-1">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <Label className="text-xs sm:text-sm font-semibold text-focus">
                    Appointed Permissions
                  </Label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                  {/* Add Sales */}
                  <label className="flex items-center gap-2 text-xs font-medium text-focus/90 cursor-pointer select-none">
                    <Checkbox
                      checked={permissions.addSales}
                      onCheckedChange={(checked) =>
                        setPermissions((p) => ({ ...p, addSales: Boolean(checked) }))
                      }
                    />
                    <span>Add Sales</span>
                  </label>

                  {/* Add Expense */}
                  <label className="flex items-center gap-2 text-xs font-medium text-focus/90 cursor-pointer select-none">
                    <Checkbox
                      checked={permissions.addExpense}
                      onCheckedChange={(checked) =>
                        setPermissions((p) => ({ ...p, addExpense: Boolean(checked) }))
                      }
                    />
                    <span>Add Expense</span>
                  </label>

                  {/* Request Loans */}
                  <label className="flex items-center gap-2 text-xs font-medium text-focus/90 cursor-pointer select-none">
                    <Checkbox
                      checked={permissions.requestLoans}
                      onCheckedChange={(checked) =>
                        setPermissions((p) => ({ ...p, requestLoans: Boolean(checked) }))
                      }
                    />
                    <span>Request Loans</span>
                  </label>

                  {/* Export Data */}
                  <label className="flex items-center gap-2 text-xs font-medium text-focus/90 cursor-pointer select-none">
                    <Checkbox
                      checked={permissions.exportData}
                      onCheckedChange={(checked) =>
                        setPermissions((p) => ({ ...p, exportData: Boolean(checked) }))
                      }
                    />
                    <span>Export Data</span>
                  </label>

                  {/* View Records */}
                  <label className="flex items-center gap-2 text-xs font-medium text-focus/90 cursor-pointer select-none">
                    <Checkbox
                      checked={permissions.viewRecords}
                      onCheckedChange={(checked) =>
                        setPermissions((p) => ({ ...p, viewRecords: Boolean(checked) }))
                      }
                    />
                    <span>View Records</span>
                  </label>

                  {/* Edit Records */}
                  <label className="flex items-center gap-2 text-xs font-medium text-focus/90 cursor-pointer select-none">
                    <Checkbox
                      checked={permissions.editRecords}
                      onCheckedChange={(checked) =>
                        setPermissions((p) => ({ ...p, editRecords: Boolean(checked) }))
                      }
                    />
                    <span>Edit Records</span>
                  </label>

                  {/* Delete Records */}
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
            appointed to{' '}
            <strong className="text-focus">{pendingValues?.assignedCompany}</strong> as{' '}
            <strong className="text-focus">{pendingValues?.role}</strong>?
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

import * as React from 'react'
import { FileCheck, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  employeeService,
  PERMISSION_COMPANIES,
  type UserPermissionActions,
  type EmployeeUser,
} from '@/services/employeeService'

import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'

interface PermissionSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetUser: EmployeeUser | null
  onSuccess?: () => void
}

export const PermissionSettingsModal: React.FC<PermissionSettingsModalProps> = ({
  open,
  onOpenChange,
  targetUser,
  onSuccess,
}) => {
  const [loadedUserId, setLoadedUserId] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false)
  const [permissions, setPermissions] = React.useState<
    Record<string, UserPermissionActions>
  >({})

  const isLoading = open && !!targetUser && loadedUserId !== targetUser.id

  // Load user's permissions when modal opens
  React.useEffect(() => {
    if (open && targetUser && loadedUserId !== targetUser.id) {
      let isMounted = true

      employeeService
        .getUserPermissions(targetUser.id)
        .then((data) => {
          if (isMounted) {
            setPermissions(data)
            setLoadedUserId(targetUser.id)
          }
        })
        .catch(() => {
          if (isMounted) {
            setLoadedUserId(targetUser.id)
          }
        })

      return () => {
        isMounted = false
      }
    }
  }, [open, targetUser, loadedUserId])

  const handleToggle = (
    companyName: string,
    action: keyof UserPermissionActions
  ) => {
    setPermissions((prev) => {
      const current = prev[companyName] || {
        view: false,
        create: false,
        edit: false,
        delete: false,
        export: false,
      }

      return {
        ...prev,
        [companyName]: {
          ...current,
          [action]: !current[action],
        },
      }
    })
  }

  const handleRequestSave = () => {
    setIsConfirmOpen(true)
  }

  const handleConfirmSave = async () => {
    if (!targetUser) return
    try {
      setIsSaving(true)
      await employeeService.saveUserPermissions(targetUser.id, permissions)
      onSuccess?.()
      setIsConfirmOpen(false)
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[760px] md:max-w-[820px] max-h-[90vh] overflow-y-auto rounded-[24px] p-6 sm:p-8 bg-white border border-stroke/30 shadow-2xl">
          <DialogHeader className="text-left sm:text-left space-y-1">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-focus">
              Permission Settings
            </DialogTitle>
            {targetUser && (
              <p className="text-sm text-muted-fg font-normal">
                Manage module and company permissions for{' '}
                <span className="font-semibold text-focus">{targetUser.fullName}</span>{' '}
                ({targetUser.email})
              </p>
            )}
          </DialogHeader>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="pt-2">
              {/* Permission Table */}
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-stroke/30">
                      <th className="py-3 px-3 text-sm font-normal text-muted-fg min-w-[200px]">
                        Company
                      </th>
                      <th className="py-3 px-4 text-center text-sm font-normal text-muted-fg w-20">
                        View
                      </th>
                      <th className="py-3 px-4 text-center text-sm font-normal text-muted-fg w-20">
                        Create
                      </th>
                      <th className="py-3 px-4 text-center text-sm font-normal text-muted-fg w-20">
                        Edit
                      </th>
                      <th className="py-3 px-4 text-center text-sm font-normal text-muted-fg w-20">
                        Delete
                      </th>
                      <th className="py-3 px-4 text-center text-sm font-normal text-muted-fg w-20">
                        Export
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke/20">
                    {PERMISSION_COMPANIES.map((comp) => {
                      const rowPerms = permissions[comp.name] || {
                        view: false,
                        create: false,
                        edit: false,
                        delete: false,
                        export: false,
                      }

                      return (
                        <tr
                          key={comp.id}
                          className="hover:bg-surface/50 transition-colors"
                        >
                          <td className="py-3.5 px-3 text-sm font-medium text-focus/90">
                            {comp.name}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={rowPerms.view}
                                onCheckedChange={() =>
                                  handleToggle(comp.name, 'view')
                                }
                                aria-label={`View permission for ${comp.name}`}
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={rowPerms.create}
                                onCheckedChange={() =>
                                  handleToggle(comp.name, 'create')
                                }
                                aria-label={`Create permission for ${comp.name}`}
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={rowPerms.edit}
                                onCheckedChange={() =>
                                  handleToggle(comp.name, 'edit')
                                }
                                aria-label={`Edit permission for ${comp.name}`}
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={rowPerms.delete}
                                onCheckedChange={() =>
                                  handleToggle(comp.name, 'delete')
                                }
                                aria-label={`Delete permission for ${comp.name}`}
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={rowPerms.export}
                                onCheckedChange={() =>
                                  handleToggle(comp.name, 'export')
                                }
                                aria-label={`Export permission for ${comp.name}`}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-stroke/20 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                  className="h-11 px-7 rounded-xl border border-stroke/50 text-focus hover:bg-surface font-medium text-sm transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleRequestSave}
                  disabled={isSaving}
                  className="h-11 px-6 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition-all"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="h-4 w-4" />
                      <span>Save Permission</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Confirm Permission Changes"
        description={
          <span>
            Are you sure you want to save the updated permission matrix for{' '}
            <strong className="text-focus">{targetUser?.fullName}</strong>?
          </span>
        }
        confirmLabel="Yes, Save Permissions"
        actionType="edit"
        variant="primary"
        isLoading={isSaving}
        onConfirm={handleConfirmSave}
      />
    </>
  )
}

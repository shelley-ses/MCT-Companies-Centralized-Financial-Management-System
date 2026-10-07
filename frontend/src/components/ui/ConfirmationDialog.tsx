import * as React from 'react'
import {
  CheckCircle2,
  Trash2,
  Pencil,
  PlusCircle,
  Loader2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string | React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'destructive' | 'default'
  actionType?: 'add' | 'edit' | 'delete' | 'default'
  onConfirm: () => void | Promise<void>
  isLoading?: boolean
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  actionType = 'default',
  onConfirm,
  isLoading = false,
}) => {
  const getIcon = () => {
    switch (actionType) {
      case 'delete':
        return (
          <div className="h-14 w-14 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-primary shadow-xs">
            <Trash2 className="h-7 w-7 text-primary" />
          </div>
        )
      case 'edit':
        return (
          <div className="h-14 w-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-xs">
            <Pencil className="h-7 w-7 text-amber-700" />
          </div>
        )
      case 'add':
        return (
          <div className="h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs">
            <PlusCircle className="h-7 w-7 text-emerald-700" />
          </div>
        )
      default:
        return (
          <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
        )
    }
  }

  const getConfirmButtonClasses = () => {
    if (variant === 'destructive') {
      return 'bg-primary hover:bg-[#800a01] active:bg-[#700801] text-white'
    }
    return 'bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] rounded-[24px] p-6 sm:p-8 bg-white border border-stroke/30 shadow-2xl text-center">
        <div className="flex flex-col items-center space-y-4 pt-1">
          {getIcon()}

          <DialogHeader className="text-center sm:text-center space-y-1.5">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-focus text-center">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-fg leading-relaxed text-center max-w-sm">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center gap-3 pt-4 w-full">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 rounded-xl border border-stroke/50 text-focus hover:bg-surface text-sm font-medium transition-colors"
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`flex-1 h-11 rounded-xl text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-all ${getConfirmButtonClasses()}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing…</span>
                </>
              ) : (
                <span>{confirmLabel}</span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

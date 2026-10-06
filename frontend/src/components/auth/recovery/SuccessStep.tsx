import * as React from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface SuccessStepProps {
  onLoginClick: () => void
}

export const SuccessStep: React.FC<SuccessStepProps> = ({ onLoginClick }) => {
  return (
    <div className="space-y-6 text-center py-4">
      {/* Neutral check icon per DESIGN.md and AGENT_RULES.md (no invented green success color) */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface border border-stroke/50 text-focus shadow-sm">
        <Check className="h-8 w-8 stroke-[2.5]" aria-hidden="true" />
      </div>

      <DialogHeader className="text-center sm:text-center">
        <DialogTitle className="text-2xl font-bold text-focus text-center">
          Password changed successfully!
        </DialogTitle>
        <DialogDescription className="text-center text-muted-fg">
          Your password has been securely updated. You can now log in with your
          new credentials.
        </DialogDescription>
      </DialogHeader>

      <div className="pt-4">
        <Button
          type="button"
          onClick={onLoginClick}
          className="w-full h-12 text-base font-semibold"
        >
          Log In
        </Button>
      </div>
    </div>
  )
}

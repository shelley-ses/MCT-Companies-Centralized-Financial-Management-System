import * as React from 'react'
import { useSession } from '@/hooks/useSession'
import { cn } from '@/lib/utils'

interface WelcomeBannerProps {
  className?: string
  greetingName?: string
  dateString?: string
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  className,
  greetingName,
  dateString = 'Monday, October 5, 2026',
}) => {
  const { user } = useSession()
  const name = greetingName || user?.fullName || 'Remi Lee'

  return (
    <div
      className={cn(
        'w-full bg-primary text-white rounded-[15px] px-5 py-3.5 sm:px-6 sm:py-4 shadow-xs relative overflow-hidden transition-all flex flex-col justify-center',
        className
      )}
    >
      <div className="relative z-10 flex flex-col justify-center">
        <div>
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold tracking-tight text-white leading-tight">
            Welcome Back, {name}!
          </h2>
          <p className="text-xs text-white/80 font-normal mt-0.5">
            {dateString}
          </p>
        </div>
      </div>

      {/* Subtle brand glow overlay */}
      <div className="absolute -right-10 -top-10 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />
    </div>
  )
}

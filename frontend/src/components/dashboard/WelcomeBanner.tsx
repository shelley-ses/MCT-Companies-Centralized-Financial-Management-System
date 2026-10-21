import * as React from 'react'
import { Calendar, Clock, Sparkles } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { cn } from '@/lib/utils'

interface WelcomeBannerProps {
  className?: string
  greetingName?: string
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  className,
  greetingName,
}) => {
  const { user } = useSession()
  const name = greetingName || user?.fullName || 'Remi Lee'

  const [now, setNow] = React.useState<Date>(() => new Date())

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Live updated date: e.g. "Wednesday, October 21, 2026"
  const dateStr = React.useMemo(() => {
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }, [now])

  // Live updated timestamp: e.g. "03:15:20 PM"
  const timeStr = React.useMemo(() => {
    return now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  }, [now])

  return (
    <div
      className={cn(
        'w-full bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-red-500/10 border border-amber-200/70 rounded-[18px] sm:rounded-[20px] px-5 py-4 sm:px-6 sm:py-5 shadow-xs relative overflow-hidden transition-all',
        className
      )}
    >
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-neutral-900 leading-tight">
              Welcome Back, {name}!
            </h2>
            <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
          </div>
          <p className="text-xs sm:text-sm text-neutral-600 font-normal mt-1">
            MCT centralized financial operations and performance monitor
          </p>
        </div>

        {/* Live Today's Date & Timestamp Badge */}
        <div className="inline-flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 bg-white/95 backdrop-blur-sm px-4 py-2 sm:py-2.5 rounded-xl border border-amber-200/80 shadow-xs shrink-0 self-start md:self-auto">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-800 font-semibold">
            <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{dateStr}</span>
          </div>
          <span className="hidden sm:inline text-neutral-300 font-light">|</span>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-800 font-semibold">
            <Clock className="h-4 w-4 text-[#960C01] shrink-0" />
            <span className="tabular-nums tracking-wide">{timeStr}</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" title="Live system clock" />
          </div>
        </div>
      </div>

      {/* Subtle warm glow overlay */}
      <div className="absolute -right-8 -top-8 w-40 h-40 bg-gradient-to-br from-amber-400/20 via-rose-400/15 to-transparent rounded-full blur-2xl pointer-events-none" />
    </div>
  )
}

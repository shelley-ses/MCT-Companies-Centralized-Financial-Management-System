import * as React from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface DashboardKpiCardProps {
  label: string
  value: string
  icon: React.ElementType
  className?: string
  subtext?: string
  valueClassName?: string
  iconContainerClassName?: string
}

export const DashboardKpiCard: React.FC<DashboardKpiCardProps> = ({
  label,
  value,
  icon: Icon,
  className,
  subtext,
  valueClassName,
  iconContainerClassName,
}) => {
  return (
    <Card
      className={cn(
        'bg-white rounded-[15px] border border-stroke/20 p-4 sm:p-5 shadow-xs flex items-center justify-between transition-all hover:shadow-md hover:border-stroke/40',
        className
      )}
    >
      <div>
        <span className="text-xs font-medium text-muted-fg block">
          {label}
        </span>
        <h3
          className={cn(
            'text-lg sm:text-xl lg:text-2xl font-semibold text-focus mt-1 tabular-nums tracking-tight',
            valueClassName
          )}
        >
          {value}
        </h3>
        {subtext && (
          <p className="text-2xs sm:text-xs text-muted-fg font-normal mt-0.5">
            {subtext}
          </p>
        )}
      </div>

      <div
        className={cn(
          'h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-[#E5E5E5] flex items-center justify-center text-focus/70 shrink-0 shadow-2xs',
          iconContainerClassName
        )}
      >
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
    </Card>
  )
}

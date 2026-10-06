import * as React from 'react'
import { cn } from '@/lib/utils'

export interface GradientCircleProps {
  className?: string
  style?: React.CSSProperties
}

export const GradientCircle: React.FC<GradientCircleProps> = ({
  className,
  style,
}) => {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute rounded-full select-none aspect-square',
        className
      )}
      style={{
        background:
          'radial-gradient(circle at 36% 36%, #FFFFFF 0%, #FFFFFF 8%, #F7D2CF 24%, #E06157 46%, #BE2B20 68%, #960C01 88%, #960C01 100%)',
        ...style,
      }}
    />
  )
}

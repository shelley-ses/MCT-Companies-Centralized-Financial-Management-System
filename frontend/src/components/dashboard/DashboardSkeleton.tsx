import * as React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 animate-pulse max-w-7xl mx-auto">
      {/* Welcome Banner Skeleton */}
      <Skeleton className="h-16 w-full rounded-[15px] bg-primary/20" />

      {/* Header and Filters Skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48 rounded-md" />
          <Skeleton className="h-3.5 w-80 rounded-md" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-10 w-44 rounded-full" />
          <Skeleton className="h-10 w-36 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>

      {/* 4 KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-24 rounded-[15px]" />
        <Skeleton className="h-24 rounded-[15px]" />
        <Skeleton className="h-24 rounded-[15px]" />
        <Skeleton className="h-24 rounded-[15px]" />
      </div>

      {/* 2x2 Clean Diagrams Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton className="h-80 rounded-[20px]" />
        <Skeleton className="h-80 rounded-[20px]" />
        <Skeleton className="h-80 rounded-[20px]" />
        <Skeleton className="h-80 rounded-[20px]" />
      </div>

      {/* Recent Transactions Table Skeleton */}
      <Skeleton className="h-64 w-full rounded-[20px]" />
    </div>
  )
}

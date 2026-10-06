import * as React from 'react'
import { GradientCircle } from '@/components/auth/GradientCircle'
import logoIconUrl from '@/assets/LOGO.png'
import mctTextUrl from '@/assets/MCT.png'

export const BrandPanel: React.FC = () => {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden bg-[#960C01] text-white p-8 md:p-14 lg:p-16 min-h-[420px] lg:min-h-screen select-none">
      {/* Circle 1: Top-Right (fully in-frame, soft highlight at top-left) */}
      <GradientCircle
        className="w-[36%] max-w-[280px] min-w-[160px] top-[4%] right-[10%] z-0"
      />

      {/* Circle 2: Middle-Left (large, bleeding off left edge behind headline) */}
      <GradientCircle
        className="w-[70%] max-w-[540px] min-w-[320px] top-[18%] -left-[30%] z-0"
      />

      {/* Circle 3: Bottom-Right/Center (large, bleeding off bottom edge) */}
      <GradientCircle
        className="w-[64%] max-w-[500px] min-w-[300px] -bottom-[14%] right-[4%] z-0"
      />

      {/* Header / Logo Lockup: LOGO.png + MCT.png + Group of Companies */}
      <header className="relative z-10">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <img
            src={logoIconUrl}
            alt="MCT Logo Icon"
            className="h-11 sm:h-11 w-auto object-contain shrink-0"
          />
          <div className="flex flex-col justify-center">
            <img
              src={mctTextUrl}
              alt="MCT"
              className="h-6 sm:h-6.5 w-auto object-contain"
            />
            <span className="text-[11px] font-semibold text-white/90 tracking-wider uppercase pl-0.5 mt-0.5">
              Group of Companies
            </span>
          </div>
        </div>
      </header>

      {/* Center/Lower Brand Copy */}
      <main className="relative z-10 my-auto py-12 lg:py-0 max-w-xl">
        <h1 className="text-3xl sm:text-4xl lg:text-[54px] font-bold text-white tracking-tight leading-[1.1] mb-5">
          One Vision.<br />
          Diverse Ventures.<br />
          Shared Success.
        </h1>
        <p className="text-sm sm:text-base lg:text-[18px] text-white/90 leading-relaxed font-normal max-w-md">
          One place to track sales, expenses and loans across all MCT companies.
        </p>
      </main>

      {/* Footer / Copyright */}
      <footer className="relative z-10 pt-4 text-xs sm:text-sm text-white/80 font-normal">
        <p>© 2026 MCT Group of Companies</p>
      </footer>
    </div>
  )
}

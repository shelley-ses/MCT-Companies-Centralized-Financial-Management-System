import * as React from 'react'
import { GradientCircle } from '@/components/auth/GradientCircle'
import logoIconUrl from '@/assets/LOGO.png'
import mctTextUrl from '@/assets/MCT.png'

export const BrandPanel: React.FC = () => {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const [mouseOffset, setMouseOffset] = React.useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!panelRef.current) return
    const rect = panelRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    setMouseOffset({ x, y })
  }

  const handleMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 })
  }

  return (
    <div
      ref={panelRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex flex-col justify-between overflow-hidden bg-[#960C01] text-white p-8 md:p-14 lg:p-16 min-h-[420px] lg:min-h-screen select-none"
    >
      {/* Background Animated Spheres Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {/* Circle 1: Top-Right (fully in-frame, moving orbit & breathing) */}
        <div
          className="absolute top-[4%] right-[10%] w-[36%] max-w-[280px] min-w-[160px] transition-transform duration-700 ease-out will-change-transform"
          style={{
            transform: `translate3d(${mouseOffset.x * 24}px, ${mouseOffset.y * 24}px, 0)`,
          }}
        >
          <GradientCircle variant="1" className="w-full h-full" />
        </div>

        {/* Circle 2: Middle-Left (large, bleeding off left edge behind headline) */}
        <div
          className="absolute top-[18%] -left-[30%] w-[70%] max-w-[540px] min-w-[320px] transition-transform duration-1000 ease-out will-change-transform"
          style={{
            transform: `translate3d(${mouseOffset.x * -28}px, ${mouseOffset.y * -20}px, 0)`,
          }}
        >
          <GradientCircle variant="2" className="w-full h-full" />
        </div>

        {/* Circle 3: Bottom-Right/Center (large, bleeding off bottom edge) */}
        <div
          className="absolute -bottom-[14%] right-[4%] w-[64%] max-w-[500px] min-w-[300px] transition-transform duration-800 ease-out will-change-transform"
          style={{
            transform: `translate3d(${mouseOffset.x * 30}px, ${mouseOffset.y * 32}px, 0)`,
          }}
        >
          <GradientCircle variant="3" className="w-full h-full" />
        </div>

        {/* Circle 4 (Accent): Subtle floating accent sphere */}
        <div
          className="absolute top-[46%] right-[8%] w-[18%] max-w-[130px] min-w-[80px] opacity-80 transition-transform duration-600 ease-out will-change-transform"
          style={{
            transform: `translate3d(${mouseOffset.x * -16}px, ${mouseOffset.y * 18}px, 0)`,
          }}
        >
          <GradientCircle variant="accent" className="w-full h-full" />
        </div>
      </div>

      {/* Header / Logo Lockup: LOGO.png + MCT.png + Group of Companies */}
      <header className="relative z-10">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <img
            src={logoIconUrl}
            alt="MCT Logo Icon"
            className="h-11 sm:h-11 w-auto object-contain shrink-0"
          />
          <div className="flex flex-col justify-center items-start">
            <img
              src={mctTextUrl}
              alt="MCT"
              className="h-6 sm:h-6.5 w-auto object-contain object-left block"
            />
            <span className="text-[11px] font-semibold text-white/90 tracking-wider uppercase mt-0.5 leading-tight">
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

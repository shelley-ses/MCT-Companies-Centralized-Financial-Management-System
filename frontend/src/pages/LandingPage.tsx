import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { GradientCircle } from '@/components/auth/GradientCircle'
import { useSession } from '@/hooks/useSession'
import logo2Url from '@/assets/LOGO2.png'
import mct2Url from '@/assets/MCT2.png'
import v1Url from '@/assets/v1.png'
import v2Url from '@/assets/v2.png'
import v3Url from '@/assets/v3.png'
import mctBuildingClean from '@/assets/mct_building_clean.jpg'
import mctBuildingFacade from '@/assets/mct_building_facade.jpg'
import mctHotelBuilding from '@/assets/mct_hotel_building.jpg'
import mctCorporateOffice from '@/assets/mct_corporate_office.jpg'

type NavSection = 'hero' | 'features' | 'companies'

interface FeatureCardItem {
  id: string
  title: string
  description: string
}

const FEATURE_CARDS: FeatureCardItem[] = [
  {
    id: 'centralized-financial',
    title: 'Centralized Financial Management',
    description:
      'Consolidates financial oversight across all MCT subsidiaries into a unified executive dashboard in real-time, for complete visibility into group-wide cash flows, balances, and multi-tenant performance metrics.',
  },
  {
    id: 'sales-management',
    title: 'Sales Management',
    description:
      'Tracks revenue inflows, customer deposits, and billings/collections across diverse multi-industry business units. Features flexible period filtering, payment status monitoring, and run-rate financial trend reports.',
  },
  {
    id: 'expense-management',
    title: 'Expense Management',
    description:
      'Streamlines operational outflow tracking by categorizing departmental and entity-level expenditures. Enables prompt verification and audit review to keep company spending transparent and accountable.',
  },
  {
    id: 'inter-company-loans',
    title: 'Inter-Company Loans',
    description:
      'Facilitates internal financing between subsidiaries with dedicated borrower and lender perspectives. Provides customizable repayment tracking, due date alerts, and comprehensive historical audit trails to minimize conflict of interest.',
  },
  {
    id: 'transaction-ledger',
    title: 'Transaction Ledger',
    description:
      'Archives sales, expenses, and loan records into an upright, comprehensive multi-lingual ledger. Offers multi-parameter search sorting, export of ready financial statements for effortless reporting and compliance.',
  },
]

interface CarouselCompany {
  id: string
  name: string
  tag: string
  image: string
}

const CAROUSEL_COMPANIES: CarouselCompany[] = [
  {
    id: 'foundation',
    name: 'MC. Tolentino College Foundation, Inc.',
    tag: 'Education & Foundation',
    image: mctBuildingClean,
  },
  {
    id: 'hospitality',
    name: 'MCTolentino Hospitality Business Corp.',
    tag: 'Hospitality & Leisure',
    image: mctBuildingClean,
  },
  {
    id: 'property',
    name: 'JK Property Ventures Corp.',
    tag: 'Real Estate & Development',
    image: mctCorporateOffice,
  },
  {
    id: 'construction',
    name: 'Speedfire Construction & Trading Corp.',
    tag: 'Construction & Engineering',
    image: mctBuildingClean,
  },
  {
    id: 'kitchen',
    name: 'MYCity. Kitchen. Corp.',
    tag: 'Food & Beverage',
    image: mctBuildingFacade,
  },
  {
    id: 'medsys',
    name: 'MedSys Uni Horizon Pharma Corp.',
    tag: 'Healthcare & Pharma',
    image: mctHotelBuilding,
  },
]

const ASSOCIATED_COMPANIES_COLUMNS = [
  [
    'JK Property Ventures Corp.',
    'MCTolentino Hospitality Business Corp.',
    'MYCity. Kitchen. Corp.',
    'MedSys Uni Horizon Pharma Corp.',
  ],
  [
    'Speedfire Construction & Trading Corp.',
    'Far East Asia Trading Corp.',
    'MC. Tolentino College Foundation, Inc.',
    'Bagong Bansa May Pagasa Movement, Inc.',
  ],
  [
    'JK Global Headways Business Solutions Corp.',
    'Bookworld Systems Solutions & Technologies Corp.',
    'Filcam Prime Holdings Corp.',
    'Golden Jupiter Property Ventures Corp.',
  ],
]

export const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useSession()
  const [activeNav, setActiveNav] = React.useState<NavSection>('hero')
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [isCarouselPaused, setIsCarouselPaused] = React.useState(false)
  const [featuresInView, setFeaturesInView] = React.useState(false)

  const [mouseOffset, setMouseOffset] = React.useState({ x: 0, y: 0 })
  const heroRef = React.useRef<HTMLElement>(null)
  const featuresRef = React.useRef<HTMLElement>(null)
  const carouselTrackRef = React.useRef<HTMLDivElement>(null)

  // Document title
  React.useEffect(() => {
    document.title = 'MCT Group of Companies - Centralized Financial Management System'
  }, [])

  // Dynamic active section spy on scroll
  React.useEffect(() => {
    const sections: NavSection[] = ['hero', 'features', 'companies']
    const handleScroll = () => {
      const scrollPos = window.scrollY + 160
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i])
        if (el && el.offsetTop <= scrollPos) {
          setActiveNav(sections[i])
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // IntersectionObserver for features animation
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setFeaturesInView(true)
        }
      },
      { threshold: 0.15 }
    )

    if (featuresRef.current) {
      observer.observe(featuresRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    setMouseOffset({ x, y })
  }

  const handleHeroMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 })
  }

  const handleScrollTo = (id: NavSection) => {
    setActiveNav(id)
    setMobileMenuOpen(false)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleAuthAction = () => {
    if (user) {
      navigate('/dashboard')
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans select-none overflow-x-hidden">
      {/* 1. Header Navigation: Permanently fixed on top with active state underline */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-2xs transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo Lockup using LOGO2.png & MCT2.png (Left) */}
          <button
            type="button"
            onClick={() => handleScrollTo('hero')}
            className="flex items-center gap-3 cursor-pointer group text-left"
            title="MCT Group of Companies"
          >
            <img
              src={logo2Url}
              alt="MCT Logo"
              className="h-10 sm:h-11 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col justify-center items-start">
              <img
                src={mct2Url}
                alt="MCT"
                className="h-4.5 sm:h-5 w-auto object-contain object-left block"
              />
              <span className="text-[10px] font-semibold text-muted-fg tracking-tight leading-tight mt-0.5 whitespace-nowrap">
                Group of Companies
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links moved to the RIGHT alongside Login */}
          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-7 text-sm font-semibold">
              {/* Home Link */}
              <button
                type="button"
                onClick={() => handleScrollTo('hero')}
                className={`relative transition-colors cursor-pointer py-1 ${
                  activeNav === 'hero'
                    ? 'text-[#960C01] font-bold'
                    : 'text-slate-700 hover:text-[#960C01] font-semibold'
                }`}
              >
                Home
                {activeNav === 'hero' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#960C01] rounded-full transition-all duration-300" />
                )}
              </button>

              {/* Features Link */}
              <button
                type="button"
                onClick={() => handleScrollTo('features')}
                className={`relative transition-colors cursor-pointer py-1 ${
                  activeNav === 'features'
                    ? 'text-[#960C01] font-bold'
                    : 'text-slate-700 hover:text-[#960C01] font-semibold'
                }`}
              >
                Features
                {activeNav === 'features' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#960C01] rounded-full transition-all duration-300" />
                )}
              </button>

              {/* MCT Companies Link */}
              <button
                type="button"
                onClick={() => handleScrollTo('companies')}
                className={`relative transition-colors cursor-pointer py-1 ${
                  activeNav === 'companies'
                    ? 'text-[#960C01] font-bold'
                    : 'text-slate-700 hover:text-[#960C01] font-semibold'
                }`}
              >
                MCT Companies
                {activeNav === 'companies' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#960C01] rounded-full transition-all duration-300" />
                )}
              </button>
            </nav>

            {/* Right Action: Login -> Button with radius 15 */}
            <button
              type="button"
              onClick={handleAuthAction}
              className="inline-flex items-center gap-1.5 h-9 px-5 rounded-[15px] bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <span>{user ? 'Dashboard' : 'Login'}</span>
              <span className="text-sm font-bold leading-none">→</span>
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-6 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 shadow-lg">
            <button
              type="button"
              onClick={() => handleScrollTo('hero')}
              className={`w-full text-left py-2 font-bold ${
                activeNav === 'hero' ? 'text-[#960C01]' : 'text-slate-700'
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo('features')}
              className={`w-full text-left py-2 font-bold ${
                activeNav === 'features' ? 'text-[#960C01]' : 'text-slate-700'
              }`}
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => handleScrollTo('companies')}
              className={`w-full text-left py-2 font-bold ${
                activeNav === 'companies' ? 'text-[#960C01]' : 'text-slate-700'
              }`}
            >
              MCT Companies
            </button>
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleAuthAction}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[15px] bg-[#960C01] text-white font-bold text-sm shadow-xs"
              >
                <span>{user ? 'Go to Dashboard' : 'Login'}</span>
                <span className="text-sm font-bold leading-none">→</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section with Exact Login Spheres & Assets v1.png, v2.png, v3.png */}
      <section
        ref={heroRef}
        id="hero"
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
        className="relative overflow-hidden bg-white min-h-[580px] sm:min-h-[640px] lg:min-h-[720px] flex items-center justify-start pt-28 sm:pt-32 pb-16 sm:pb-24 scroll-mt-20"
      >
        {/* Floating Gradient Spheres: Re-using the exact GradientCircle from auth/login with lively parallax */}
        {/* Sphere 1: Top-Left (cutting off top-left corner) */}
        <div
          className="absolute top-20 sm:top-24 -left-12 sm:-left-16 lg:-left-20 w-36 sm:w-48 lg:w-56 aspect-square pointer-events-none z-0 transition-transform duration-700 ease-out will-change-transform"
          style={{
            transform: `translate3d(${mouseOffset.x * 24}px, ${mouseOffset.y * 24}px, 0)`,
          }}
        >
          <GradientCircle variant="1" hasShadow={false} className="w-full h-full opacity-90" />
        </div>

        {/* Sphere 2: Massive Right Sphere (dominating right half) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -right-24 sm:-right-16 lg:right-[-60px] w-[360px] sm:w-[500px] lg:w-[620px] aspect-square pointer-events-none z-0 transition-transform duration-1000 ease-out will-change-transform"
          style={{
            transform: `translate3d(${mouseOffset.x * -28}px, ${mouseOffset.y * -20}px, 0)`,
          }}
        >
          <GradientCircle variant="2" hasShadow={false} className="w-full h-full opacity-95" />
        </div>

        {/* Sphere 3: Bottom-Left (large, clean sphere, no text) */}
        <div
          className="absolute -bottom-20 sm:-bottom-24 left-6 sm:left-16 lg:left-24 w-56 sm:w-72 lg:w-84 aspect-square pointer-events-none z-0 transition-transform duration-800 ease-out will-change-transform"
          style={{
            transform: `translate3d(${mouseOffset.x * 30}px, ${mouseOffset.y * 32}px, 0)`,
          }}
        >
          <GradientCircle variant="3" hasShadow={false} className="w-full h-full opacity-90" />
        </div>

        {/* Sphere 4: Bottom-Right (partially offscreen at bottom right) */}
        <div
          className="absolute -bottom-24 sm:-bottom-28 right-8 sm:right-24 lg:right-36 w-60 sm:w-76 lg:w-96 aspect-square pointer-events-none z-0 transition-transform duration-600 ease-out will-change-transform"
          style={{
            transform: `translate3d(${mouseOffset.x * -16}px, ${mouseOffset.y * 18}px, 0)`,
          }}
        >
          <GradientCircle variant="accent" hasShadow={false} className="w-full h-full opacity-85" />
        </div>

        {/* Floating Outline Icons using authentic user assets v1.png, v2.png, v3.png */}
        {/* v3.png: Tilted 3-Bar Chart (above headline, towards right) */}
        <div className="absolute top-[22%] sm:top-[24%] left-[48%] sm:left-[50%] lg:left-[48%] pointer-events-none z-10 transition-transform duration-300">
          <img
            src={v3Url}
            alt="Growth Metrics"
            className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 object-contain"
          />
        </div>

        {/* v1.png: Currency Cycle Circle (left of headline) */}
        <div className="absolute top-[48%] sm:top-[50%] left-[2%] sm:left-[4%] lg:left-[5%] pointer-events-none z-10 transition-transform duration-300">
          <img
            src={v1Url}
            alt="Currency Cycle"
            className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 object-contain"
          />
        </div>

        {/* v2.png: Hand Holding Coin (to the right of Get Started button) */}
        <div className="absolute bottom-[24%] sm:bottom-[26%] left-[54%] sm:left-[56%] lg:left-[54%] pointer-events-none z-10 transition-transform duration-300">
          <img
            src={v2Url}
            alt="Hand Holding Coin"
            className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 object-contain"
          />
        </div>

        {/* Hero Content Container - aligned to the left */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl text-left">
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[62px] font-black text-[#960C01] leading-[1.08] tracking-tight">
              One Vision.
              <br />
              Diverse Ventures.
              <br />
              Shared Success.
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base md:text-lg text-[#960C01]/85 font-medium mt-4 sm:mt-5 leading-relaxed max-w-lg">
              One place to track sales, expenses and loans across all MCT companies.
            </p>

            {/* Get Started Button with radius 15 - positioned on the left */}
            <div className="mt-6 sm:mt-7 flex items-center justify-start">
              <button
                type="button"
                onClick={handleAuthAction}
                className="inline-flex items-center justify-center px-8 py-2.5 rounded-[15px] bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white text-sm sm:text-base font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Section with Interactive Staggered Animations */}
      <section
        ref={featuresRef}
        id="features"
        className="relative bg-[#960C01] text-white py-18 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden scroll-mt-20"
      >
        {/* Soft Ambient Floating Orbs in Background */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none animate-pulse"
          style={{ animationDuration: '6s' }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-96 h-96 bg-black/20 rounded-full blur-3xl pointer-events-none animate-pulse"
          style={{ animationDuration: '8s' }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Section Header with smooth entrance */}
          <div
            className={`text-center max-w-3xl mx-auto transition-all duration-700 ease-out ${
              featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-widest uppercase">
              FEATURES
            </h2>
            <p className="text-white/85 text-xs sm:text-sm md:text-base font-normal mt-2.5 leading-relaxed">
              A unified financial command center designed for the MCT Group of Companies,
              consolidating multi-entity revenue, operational disbursements, and inter-company lending
              into a single, audit-ready platform.
            </p>
          </div>

          {/* 5 Feature Cards Grid with Staggered Entrance & Micro-animations */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 mt-10 sm:mt-12">
            {FEATURE_CARDS.map((card, idx) => (
              <div
                key={card.id}
                style={{ transitionDelay: `${idx * 110}ms` }}
                className={`rounded-2xl bg-white text-slate-800 p-5 sm:p-6 shadow-xl flex flex-col justify-between border border-white/40 hover:-translate-y-3 hover:shadow-2xl hover:shadow-black/30 transition-all duration-300 group cursor-pointer ${
                  featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
              >
                <div>
                  {/* Decorative Top Slider Node Graphic with hover expansion */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-3.5 h-3.5 rounded-full bg-slate-300 group-hover:bg-[#960C01] group-hover:scale-125 transition-all duration-300 shrink-0" />
                    <div className="h-0.5 w-16 group-hover:w-24 bg-slate-200 group-hover:bg-[#960C01]/30 transition-all duration-300 rounded" />
                  </div>

                  {/* Card Title */}
                  <h3 className="text-sm sm:text-base font-extrabold text-[#960C01] leading-snug tracking-tight group-hover:translate-x-0.5 transition-transform duration-300">
                    {card.title}
                  </h3>

                  {/* Card Body Description */}
                  <p className="text-xs text-slate-600 font-normal leading-relaxed mt-3">
                    {card.description}
                  </p>
                </div>

                {/* Decorative Bottom Slider Node Graphic with hover expansion */}
                <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-100">
                  <div className="h-0.5 w-16 group-hover:w-24 bg-slate-200 group-hover:bg-[#960C01]/30 transition-all duration-300 rounded" />
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-300 group-hover:bg-[#960C01] group-hover:scale-125 transition-all duration-300 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. One Name, Many Companies / Built on Trust and Service (Curved Carousel Centered) */}
      <section
        id="companies"
        className="relative bg-white min-h-[calc(100vh-80px)] flex flex-col justify-center pt-16 sm:pt-20 md:pt-24 pb-10 sm:pb-14 overflow-hidden scroll-mt-20"
      >
        {/* Section Heading Centered with comfortable spacing */}
        <div className="max-w-4xl mx-auto text-center px-4 mb-4 sm:mb-6 shrink-0">
          <span className="text-xs sm:text-sm font-semibold text-slate-800 tracking-tight block">
            One Name, Many Companies
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#960C01] mt-0.5 tracking-tight">
            Built on Trust and Service
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl mx-auto leading-relaxed">
            Explore the companies under the <strong className="text-slate-700 font-semibold">MCT Group</strong>,
            each committed to delivering dependable service, together.
          </p>
        </div>

        {/* Carousel Curved Container: Full-bleed horizontal photo ribbon under top & bottom concave white waves */}
        <div
          className="relative w-full overflow-hidden bg-white group cursor-pointer my-auto"
          onMouseEnter={() => setIsCarouselPaused(true)}
          onMouseLeave={() => setIsCarouselPaused(false)}
        >
          {/* Top White Curved Cutout (Dips down towards center) */}
          <div className="absolute top-0 left-0 right-0 w-full overflow-hidden leading-none z-20 pointer-events-none">
            <svg
              className="relative block w-full h-10 sm:h-14 md:h-20 text-white fill-current"
              viewBox="0 0 1440 90"
              preserveAspectRatio="none"
            >
              <path d="M 0,0 L 1440,0 L 1440,25 Q 720,90 0,25 Z" />
            </svg>
          </div>

          {/* Bottom White Curved Cutout (Arches up towards center) */}
          <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-20 pointer-events-none">
            <svg
              className="relative block w-full h-10 sm:h-14 md:h-20 text-white fill-current"
              viewBox="0 0 1440 90"
              preserveAspectRatio="none"
            >
              <path d="M 0,90 L 1440,90 L 1440,65 Q 720,0 0,65 Z" />
            </svg>
          </div>

          {/* Infinite Moving Marquee Track */}
          <div
            ref={carouselTrackRef}
            className="flex items-center overflow-x-hidden select-none"
          >
            {/* Duplicated list for seamless infinite horizontal scroll */}
            <div
              className="flex items-center gap-0 animate-marquee"
              style={{
                animationPlayState: isCarouselPaused ? 'paused' : 'running',
              }}
            >
              {[...CAROUSEL_COMPANIES, ...CAROUSEL_COMPANIES, ...CAROUSEL_COMPANIES].map((company, index) => (
                <div
                  key={`${company.id}-${index}`}
                  className="relative w-[220px] sm:w-[260px] md:w-[300px] lg:w-[340px] h-[300px] sm:h-[360px] md:h-[400px] shrink-0 overflow-hidden group/item cursor-pointer"
                >
                  <img
                    src={company.image}
                    alt={company.name}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/item:scale-115"
                  />
                  {/* Subtle darkening tint on hover for depth */}
                  <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/10 transition-colors duration-300 pointer-events-none" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Footer: Incorporating MCT Associated Companies with Company Logo and Copyright bar */}
      <footer className="bg-slate-50/90 border-t border-slate-200/80 pt-10 sm:pt-12 pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Row: Company Logo Lockup */}
          <div className="flex items-center mb-8">
            <button
              type="button"
              onClick={() => handleScrollTo('hero')}
              className="flex items-center gap-3 cursor-pointer group text-left"
              title="MCT Group of Companies"
            >
              <img
                src={logo2Url}
                alt="MCT Logo"
                className="h-8 sm:h-9 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col justify-center items-start text-left">
                <img
                  src={mct2Url}
                  alt="MCT"
                  className="h-4 w-auto object-contain object-left block"
                />
                <span className="text-[9px] font-semibold text-muted-fg tracking-tight leading-tight mt-0.5 whitespace-nowrap">
                  Group of Companies
                </span>
              </div>
            </button>
          </div>

          {/* 3 Columns of Companies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-8 text-xs sm:text-sm text-slate-600 pb-10 sm:pb-12">
            {ASSOCIATED_COMPANIES_COLUMNS.map((col, cIdx) => (
              <div key={cIdx} className="space-y-2.5">
                {col.map((companyName, idx) => (
                  <div
                    key={idx}
                    className="font-medium text-slate-700 hover:text-[#960C01] transition-colors cursor-default"
                  >
                    <span>{companyName}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Gray Copyright Bar matching media_1792028445138.png */}
        <div className="bg-slate-200/80 border-t border-slate-300/70 py-4 px-4 text-center">
          <p className="text-[11px] sm:text-xs text-slate-600 font-normal">
            &copy; 2026 MCT Group of Companies. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage

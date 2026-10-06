import * as React from 'react'

export interface CompanyLinkItem {
  id: string
  name: string
  href?: string
}

export const COMPANY_LINKS: readonly CompanyLinkItem[] = [
  { id: 'kitchen', name: 'MCT Kitchen' },
  { id: 'hotel', name: 'MCT Hotel' },
  { id: 'golden-jupiter', name: 'Golden Jupiter Ventures' },
  { id: 'jk-property', name: 'JK Property Ventures' },
  { id: 'medsys', name: 'MedSys' },
  { id: 'speedfire', name: 'SpeedFire' },
  { id: 'terisitos', name: 'Terisitos' },
  { id: 'jk-printing', name: 'JK Printing' },
] as const

export const CompanyLinks: React.FC = () => {
  return (
    <footer className="w-full py-4 text-center">
      <nav aria-label="MCT Companies" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs md:text-sm text-muted-fg">
        {COMPANY_LINKS.map((company) => (
          <span
            key={company.id}
            className="transition-colors hover:text-focus select-none cursor-default"
          >
            {company.name}
          </span>
        ))}
      </nav>
    </footer>
  )
}

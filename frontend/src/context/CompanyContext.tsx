import * as React from 'react'
import { useSession } from '@/hooks/useSession'
import { isLendingEnabledCompany } from '@/config/companyFeatures'

export interface CompanyContextValue {
  activeCompany: string
  setActiveCompany: (company: string) => void
  isLendingEnabled: boolean
  isCompanyScoped: boolean
  allCompanies: string[]
}

export const ALL_COMPANIES_LIST = [
  'All Companies',
  'MCT Kitchen',
  'MCT Hotel',
  'JK Cafe',
  'Annex Nine',
  'Merillon',
  'JK Printing',
  'Speedbox',
  'JK Property and Ventures',
  'FilCap Prime Holdings Corp.',
  'Golden Sunburst Ventures',
]

const COMPANY_STORAGE_KEY = 'mct_selected_company'

export const CompanyContext = React.createContext<CompanyContextValue | undefined>(undefined)

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useSession()

  const isCompanyScoped = Boolean(
    user?.assignedCompany &&
      user.assignedCompany !== 'All Companies' &&
      user?.role !== 'Admin' &&
      user?.role !== 'Audit' &&
      user?.role !== 'Finance'
  )

  const [activeCompany, setActiveCompanyState] = React.useState<string>(() => {
    if (user?.assignedCompany && user.assignedCompany !== 'All Companies') {
      return user.assignedCompany
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(COMPANY_STORAGE_KEY)
      if (saved) return saved
    }
    return user?.assignedCompany || 'All Companies'
  })

  // Keep in sync when user session changes
  React.useEffect(() => {
    if (user?.assignedCompany && user.assignedCompany !== 'All Companies') {
      setActiveCompanyState(user.assignedCompany)
    }
  }, [user?.assignedCompany])

  const [dynamicCompanies, setDynamicCompanies] = React.useState<string[]>([])

  // Dynamically load all registered companies from backend database
  React.useEffect(() => {
    let mounted = true
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('mct_access_token') : null
    fetch('/api/v1/companies', {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          const names = data
            .map((c: any) => c.company_name || c.name)
            .filter(Boolean)
          setDynamicCompanies(Array.from(new Set(['All Companies', ...names])))
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch dynamic companies in CompanyContext:', err)
      })
    return () => {
      mounted = false
    }
  }, [])

  const allCompanies = React.useMemo(() => {
    if (dynamicCompanies.length > 0) return dynamicCompanies
    return ALL_COMPANIES_LIST
  }, [dynamicCompanies])

  const setActiveCompany = React.useCallback((company: string) => {
    setActiveCompanyState(company)
    if (typeof window !== 'undefined') {
      localStorage.setItem(COMPANY_STORAGE_KEY, company)
    }
  }, [])

  const isLendingEnabled = React.useMemo(() => {
    return isLendingEnabledCompany(activeCompany)
  }, [activeCompany])

  const value = React.useMemo<CompanyContextValue>(
    () => ({
      activeCompany,
      setActiveCompany,
      isLendingEnabled,
      isCompanyScoped,
      allCompanies,
    }),
    [activeCompany, setActiveCompany, isLendingEnabled, isCompanyScoped, allCompanies]
  )

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
}

export function useCompany(): CompanyContextValue {
  const context = React.useContext(CompanyContext)
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider')
  }
  return context
}

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

  const userRole = (user?.role || '').trim().toLowerCase()
  const isCompanyScoped = Boolean(
    user?.assignedCompany &&
      user.assignedCompany !== 'All Companies' &&
      userRole !== 'admin' &&
      userRole !== 'audit' &&
      !userRole.includes('auditor') &&
      userRole !== 'finance'
  )

  const [activeCompany, setActiveCompanyState] = React.useState<string>(() => {
    if (isCompanyScoped && user?.assignedCompany && user.assignedCompany !== 'All Companies') {
      return user.assignedCompany
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(COMPANY_STORAGE_KEY)
      if (saved) return saved
    }
    return (isCompanyScoped ? user?.assignedCompany : 'All Companies') || 'All Companies'
  })

  // Keep in sync when user session changes
  React.useEffect(() => {
    if (isCompanyScoped && user?.assignedCompany && user.assignedCompany !== 'All Companies') {
      setActiveCompanyState(user.assignedCompany)
    }
  }, [isCompanyScoped, user?.assignedCompany])

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
      allCompanies: ALL_COMPANIES_LIST,
    }),
    [activeCompany, setActiveCompany, isLendingEnabled, isCompanyScoped]
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

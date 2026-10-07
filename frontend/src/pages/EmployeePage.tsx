import * as React from 'react'
import {
  Search,
  Building2,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CreateCompanyModal } from '@/components/employee/CreateCompanyModal'
import { CreateUserModal } from '@/components/employee/CreateUserModal'
import { PermissionSettingsModal } from '@/components/employee/PermissionSettingsModal'
import { ViewCompanyModal } from '@/components/employee/ViewCompanyModal'
import { DateRangeFilter, type DateRange } from '@/components/employee/DateRangeFilter'
import { Skeleton } from '@/components/ui/skeleton'
import {
  employeeService,
  type Company,
  type EmployeeUser,
  type ActivityLogItem,
} from '@/services/employeeService'
import logo2Url from '@/assets/LOGO2.png'

type TabType = 'user' | 'company' | 'activity'

// Helper to parse date string like "Oct 6, 2026 · 9:15 AM" or "2026-10-05 08:14"
function parseDateForFilter(dateStr: string): Date | null {
  if (!dateStr) return null
  if (dateStr === 'Just now') return new Date('2026-10-06')
  const datePart = dateStr.includes('·') ? dateStr.split('·')[0].trim() : dateStr.split(' ')[0].trim()
  const parsed = Date.parse(datePart)
  if (!isNaN(parsed)) return new Date(parsed)
  return null
}

export const EmployeePage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<TabType>('user')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [dateRange, setDateRange] = React.useState<DateRange>({
    startDate: null,
    endDate: null,
    label: 'All Dates',
  })

  // Data states
  const [users, setUsers] = React.useState<EmployeeUser[]>([])
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [activityLogs, setActivityLogs] = React.useState<ActivityLogItem[]>([])
  const [loading, setLoading] = React.useState(true)

  // Modals state
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = React.useState(false)
  const [isCreateUserOpen, setIsCreateUserOpen] = React.useState(false)
  const [isPermissionOpen, setIsPermissionOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<EmployeeUser | null>(null)

  // View / Edit / Delete Company Modal state
  const [isViewCompanyOpen, setIsViewCompanyOpen] = React.useState(false)
  const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(null)

  // Success message toast/banner
  const [successBanner, setSuccessBanner] = React.useState<string | null>(null)

  // Pagination state
  const [userPage, setUserPage] = React.useState(1)
  const [logPage, setLogPage] = React.useState(1)
  const itemsPerPage = 14
  const logsPerPage = 10

  // Load initial data
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const [userList, companyList, logList] = await Promise.all([
        employeeService.getUsers(),
        employeeService.getCompanies(),
        employeeService.getActivityLogs(),
      ])
      setUsers(userList)
      setCompanies(companyList)
      setActivityLogs(logList)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Clear banner after 4 seconds
  React.useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successBanner])

  // Filtered users for User Tab with Search + Date Range
  const filteredUsers = React.useMemo(() => {
    let result = users

    const q = searchQuery.toLowerCase().trim()
    if (q) {
      result = result.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.companyName.toLowerCase().includes(q)
      )
    }

    if (dateRange.startDate && dateRange.endDate) {
      const start = new Date(`${dateRange.startDate}T00:00:00`)
      const end = new Date(`${dateRange.endDate}T23:59:59`)
      result = result.filter((u) => {
        const uDate = parseDateForFilter(u.lastLogin)
        if (!uDate) return true
        return uDate >= start && uDate <= end
      })
    }

    return result
  }, [users, searchQuery, dateRange])

  // Filtered companies for Company Tab (Search query)
  const filteredCompanies = React.useMemo(() => {
    let result = companies

    const q = searchQuery.toLowerCase().trim()
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          c.contactPerson.toLowerCase().includes(q)
      )
    }

    return result
  }, [companies, searchQuery])

  // Filtered Activity Logs (Search + Date Range)
  const filteredLogs = React.useMemo(() => {
    let result = activityLogs

    const q = searchQuery.toLowerCase().trim()
    if (q) {
      result = result.filter(
        (l) =>
          l.company.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.module.toLowerCase().includes(q) ||
          l.target.toLowerCase().includes(q)
      )
    }

    if (dateRange.startDate && dateRange.endDate) {
      const start = new Date(`${dateRange.startDate}T00:00:00`)
      const end = new Date(`${dateRange.endDate}T23:59:59`)
      result = result.filter((l) => {
        const lDate = parseDateForFilter(l.time)
        if (!lDate) return true
        return lDate >= start && lDate <= end
      })
    }

    return result
  }, [activityLogs, searchQuery, dateRange])

  // User tab pagination calculation
  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage))
  const displayedUsers = React.useMemo(() => {
    const start = (userPage - 1) * itemsPerPage
    return filteredUsers.slice(start, start + itemsPerPage)
  }, [filteredUsers, userPage, itemsPerPage])

  // Activity Log pagination calculation
  const totalLogPages = Math.max(1, Math.ceil(filteredLogs.length / logsPerPage))
  const displayedLogs = React.useMemo(() => {
    const start = (logPage - 1) * logsPerPage
    return filteredLogs.slice(start, start + logsPerPage)
  }, [filteredLogs, logPage, logsPerPage])

  const handleOpenPermission = (user: EmployeeUser) => {
    setSelectedUser(user)
    setIsPermissionOpen(true)
  }

  const handleCardClickCompany = (comp: Company) => {
    setSelectedCompany(comp)
    setIsViewCompanyOpen(true)
  }

  const handleCompanyCreated = (newCompany: Company) => {
    setCompanies((prev) => [newCompany, ...prev])
    setSuccessBanner(`Company "${newCompany.name}" has been created successfully.`)
  }

  const handleCompanyUpdated = (updated: Company) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    )
    setSelectedCompany(updated)
    setSuccessBanner(`Company "${updated.name}" updated successfully.`)
  }

  const handleCompanyDeleted = (companyId: string) => {
    const deletedName = companies.find((c) => c.id === companyId)?.name || 'Company'
    setCompanies((prev) => prev.filter((c) => c.id !== companyId))
    setSuccessBanner(`"${deletedName}" has been removed from companies.`)
  }

  const handleUserCreated = (newUser: EmployeeUser) => {
    setUsers((prev) => [newUser, ...prev])
    setSuccessBanner(`User "${newUser.fullName}" has been added successfully.`)
  }

  const handlePermissionSaved = () => {
    if (selectedUser) {
      setSuccessBanner(
        `Permissions for "${selectedUser.fullName}" updated successfully.`
      )
    }
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Top Header Block matching Image 1, 3, 4 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-focus tracking-tight">
            User Management
          </h1>
          <p className="text-sm sm:text-base text-muted-fg font-normal mt-1">
            {users.length} users · {companies.length} companies
          </p>
        </div>

        {/* Top Right Action Buttons: Create Company & Create User */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCreateCompanyOpen(true)}
            className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl border border-stroke/50 bg-white text-focus hover:bg-surface font-semibold text-sm shadow-xs flex items-center gap-2"
          >
            <Building2 className="h-4 w-4 text-focus/70 shrink-0" />
            <span>Create Company</span>
          </Button>

          <Button
            type="button"
            onClick={() => setIsCreateUserOpen(true)}
            className="h-10 sm:h-11 px-4 sm:px-5 rounded-xl bg-[#960C01] hover:bg-[#800a01] active:bg-[#700801] text-white font-semibold text-sm shadow-xs flex items-center gap-2 transition-all"
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            <span>Create User</span>
          </Button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successBanner && (
        <div
          role="status"
          className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-medium animate-in fade-in-50 duration-200"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Filters and Tabs Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left Side: Extended Width Search Bar */}
        <div className="relative flex-1 max-w-full lg:max-w-xl xl:max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg" />
          <Input
            type="search"
            placeholder="Search by Ref No. or Cheque No. (or customer)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setUserPage(1)
              setLogPage(1)
            }}
            className="h-10 sm:h-11 pl-11 pr-4 rounded-full border border-stroke/40 bg-white text-sm text-focus placeholder:text-muted-fg/80 shadow-xs focus-visible:ring-1 focus-visible:ring-focus w-full"
          />
        </div>

        {/* Right Side: Date Filter + Outlined Tab Buttons */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          {/* Working Date Filter (displayed on User and Activity Log tabs) */}
          {activeTab !== 'company' && (
            <DateRangeFilter
              value={dateRange}
              onChange={(newRange) => {
                setDateRange(newRange)
                setUserPage(1)
                setLogPage(1)
              }}
            />
          )}

          {/* Outlined Tab Switcher (User, Company, Activity Log) */}
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('user')}
              className={`px-5 py-2 rounded-full text-sm transition-all cursor-pointer shadow-xs ${
                activeTab === 'user'
                  ? 'bg-[#960C01] text-white border border-[#960C01] font-semibold'
                  : 'bg-white text-focus border border-stroke/60 hover:bg-surface hover:border-stroke font-medium'
              }`}
            >
              User
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('company')}
              className={`px-5 py-2 rounded-full text-sm transition-all cursor-pointer shadow-xs ${
                activeTab === 'company'
                  ? 'bg-[#960C01] text-white border border-[#960C01] font-semibold'
                  : 'bg-white text-focus border border-stroke/60 hover:bg-surface hover:border-stroke font-medium'
              }`}
            >
              Company
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`px-5 py-2 rounded-full text-sm transition-all cursor-pointer shadow-xs ${
                activeTab === 'activity'
                  ? 'bg-[#960C01] text-white border border-[#960C01] font-semibold'
                  : 'bg-white text-focus border border-stroke/60 hover:bg-surface hover:border-stroke font-medium'
              }`}
            >
              Activity Log
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area based on Tab */}

      {/* 1. USER TAB (matching Image 4) */}
      {activeTab === 'user' && (
        <div className="bg-white rounded-[20px] border border-stroke/30 shadow-xs p-4 sm:p-6 lg:p-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left">
              <thead>
                <tr className="border-b border-stroke/20">
                  <th className="pb-4 pt-1 px-6 w-[25%] text-xs font-bold text-focus uppercase tracking-wider">
                    Company
                  </th>
                  <th className="pb-4 pt-1 px-6 w-[28%] text-xs font-bold text-focus uppercase tracking-wider">
                    Email
                  </th>
                  <th className="pb-4 pt-1 px-6 w-[12%] text-xs font-bold text-focus uppercase tracking-wider">
                    Status
                  </th>
                  <th className="pb-4 pt-1 px-6 w-[20%] text-xs font-bold text-focus uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="pb-4 pt-1 px-6 w-[15%] text-xs font-bold text-focus uppercase tracking-wider text-right sm:text-left">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke/15">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-4 px-6"><Skeleton className="h-4 w-36 rounded-md" /></td>
                      <td className="py-4 px-6"><Skeleton className="h-4 w-48 rounded-md" /></td>
                      <td className="py-4 px-6"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="py-4 px-6"><Skeleton className="h-4 w-36 rounded-md" /></td>
                      <td className="py-4 px-6"><Skeleton className="h-7 w-28 rounded-full" /></td>
                    </tr>
                  ))
                ) : displayedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-fg text-sm">
                      No users found matching your search.
                    </td>
                  </tr>
                ) : (
                  displayedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-surface/40 transition-colors group"
                    >
                      {/* COMPANY */}
                      <td className="py-4 px-6 text-sm font-medium text-focus whitespace-nowrap">
                        {user.companyName}
                      </td>

                      {/* EMAIL */}
                      <td className="py-4 px-6 text-sm text-focus/80 whitespace-nowrap">
                        {user.email}
                      </td>

                      {/* STATUS */}
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-emerald-600 bg-emerald-50">
                          {user.status}
                        </span>
                      </td>

                      {/* LAST LOGIN */}
                      <td className="py-4 px-6 text-sm text-focus/80 tabular-nums whitespace-nowrap">
                        {user.lastLogin}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-4 px-6 text-right sm:text-left whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenPermission(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-stroke/40 hover:border-stroke hover:bg-surface text-focus text-xs font-semibold tracking-wider transition-colors cursor-pointer select-none"
                          aria-label={`Configure permissions for ${user.fullName}`}
                        >
                          <Lock className="h-3 w-3 text-focus/70 shrink-0" />
                          <span>PERMISSION</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-4 border-t border-stroke/20">
            <p className="text-xs sm:text-sm text-muted-fg font-normal">
              Showing {displayedUsers.length} of {filteredUsers.length} users
            </p>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs sm:text-sm text-muted-fg font-normal">
                Page {userPage} out of {totalUserPages}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={userPage <= 1}
                  onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 p-0 rounded-lg text-focus hover:bg-surface disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={userPage >= totalUserPages}
                  onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                  className="h-8 w-8 p-0 rounded-lg text-focus hover:bg-surface disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. COMPANY TAB (matching Image 1 - 3 Column Card Grid) */}
      {activeTab === 'company' && (
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-rose-200/60 p-4 sm:p-5 flex items-center gap-4 shadow-xs"
                >
                  <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-full shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <Skeleton className="h-5 w-3/4 rounded-md" />
                    <Skeleton className="h-3.5 w-full rounded-md" />
                    <Skeleton className="h-3.5 w-2/3 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stroke/30 p-12 text-center text-muted-fg text-sm">
              No companies found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCompanies.map((comp) => (
                <div
                  key={comp.id}
                  onClick={() => handleCardClickCompany(comp)}
                  className="bg-white rounded-2xl border border-rose-200/90 hover:border-primary/80 hover:shadow-md p-4 sm:p-5 transition-all duration-200 cursor-pointer flex items-center gap-4 group shadow-xs select-none"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleCardClickCompany(comp)
                    }
                  }}
                  aria-label={`View details for ${comp.name}`}
                >
                  {/* Left circular badge matching Image 1 */}
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-primary/90 flex items-center justify-center p-2.5 shrink-0 bg-white shadow-xs group-hover:scale-105 transition-transform duration-200">
                    <img
                      src={comp.logoUrl || logo2Url}
                      alt={comp.name}
                      className="h-9 w-9 sm:h-12 sm:w-12 object-contain"
                    />
                  </div>

                  {/* Right side: Company Name & Address */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-focus group-hover:text-primary transition-colors truncate">
                      {comp.name}
                    </h3>
                    <p className="text-xs text-muted-fg leading-relaxed mt-1 line-clamp-2">
                      {comp.address || 'Blk 43, Lot 24 Regalado Highway, Fairview, Quezon City, Metro Manila'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. ACTIVITY LOG TAB (matching Image 3 - Read-Only Table) */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-[20px] border border-stroke/30 shadow-xs p-4 sm:p-6 lg:p-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead>
                <tr className="border-b border-stroke/20">
                  <th className="pb-4 pt-1 px-6 w-[25%] text-xs font-bold text-focus uppercase tracking-wider">
                    Company
                  </th>
                  <th className="pb-4 pt-1 px-6 w-[22%] text-xs font-bold text-focus uppercase tracking-wider">
                    Action
                  </th>
                  <th className="pb-4 pt-1 px-6 w-[16%] text-xs font-bold text-focus uppercase tracking-wider">
                    Module
                  </th>
                  <th className="pb-4 pt-1 px-6 w-[17%] text-xs font-bold text-focus uppercase tracking-wider">
                    Target
                  </th>
                  <th className="pb-4 pt-1 px-6 w-[20%] text-xs font-bold text-focus uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke/15">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-4 px-6"><Skeleton className="h-4 w-36 rounded-md" /></td>
                      <td className="py-4 px-6"><Skeleton className="h-4 w-32 rounded-md" /></td>
                      <td className="py-4 px-6"><Skeleton className="h-4 w-24 rounded-md" /></td>
                      <td className="py-4 px-6"><Skeleton className="h-4 w-24 rounded-md" /></td>
                      <td className="py-4 px-6"><Skeleton className="h-4 w-36 rounded-md" /></td>
                    </tr>
                  ))
                ) : displayedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-fg text-sm">
                      No activity logs found matching your filters.
                    </td>
                  </tr>
                ) : (
                  displayedLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-surface/40 transition-colors"
                    >
                      {/* COMPANY */}
                      <td className="py-4 px-6 text-sm font-medium text-focus whitespace-nowrap">
                        {log.company}
                      </td>

                      {/* ACTION */}
                      <td className="py-4 px-6 text-sm text-focus/90 whitespace-nowrap">
                        {log.action}
                      </td>

                      {/* MODULE */}
                      <td className="py-4 px-6 text-sm text-focus/80 whitespace-nowrap">
                        {log.module}
                      </td>

                      {/* TARGET */}
                      <td className="py-4 px-6 text-sm font-mono text-xs text-focus/80 whitespace-nowrap">
                        {log.target}
                      </td>

                      {/* TIME */}
                      <td className="py-4 px-6 text-sm text-focus/70 tabular-nums whitespace-nowrap">
                        {log.time}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Activity Log Pagination matching Image 3 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-4 border-t border-stroke/20">
            <p className="text-xs sm:text-sm text-muted-fg font-normal">
              Showing {displayedLogs.length} of {filteredLogs.length} activity records
            </p>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs sm:text-sm text-muted-fg font-normal">
                Page {logPage} out of {totalLogPages}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={logPage <= 1}
                  onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 p-0 rounded-lg text-focus hover:bg-surface disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={logPage >= totalLogPages}
                  onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))}
                  className="h-8 w-8 p-0 rounded-lg text-focus hover:bg-surface disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}

      {/* 1. Create Company Modal (matching Image 1 of previous turn) */}
      <CreateCompanyModal
        open={isCreateCompanyOpen}
        onOpenChange={setIsCreateCompanyOpen}
        onSuccess={handleCompanyCreated}
      />

      {/* 2. Create User Modal (matching Image 2 of previous turn) */}
      <CreateUserModal
        open={isCreateUserOpen}
        onOpenChange={setIsCreateUserOpen}
        companies={companies}
        onSuccess={handleUserCreated}
      />

      {/* 3. Permission Settings Modal (matching Image 3 of previous turn) */}
      <PermissionSettingsModal
        open={isPermissionOpen}
        onOpenChange={setIsPermissionOpen}
        targetUser={selectedUser}
        onSuccess={handlePermissionSaved}
      />

      {/* 4. View / Edit / Delete Company Modal (matching new Image 2) */}
      <ViewCompanyModal
        open={isViewCompanyOpen}
        onOpenChange={setIsViewCompanyOpen}
        company={selectedCompany}
        onUpdate={handleCompanyUpdated}
        onDelete={handleCompanyDeleted}
      />
    </div>
  )
}

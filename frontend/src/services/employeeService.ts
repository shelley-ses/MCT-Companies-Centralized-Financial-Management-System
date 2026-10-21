export interface Company {
  id: string
  name: string
  email: string
  address: string
  contactPerson: string
  contactPersonEmail?: string
  contactNumber: string
  telephoneNumber: string
  startingBalance: number
  currentBalance: number
  status: 'Active' | 'Inactive'
  createdAt: string
  logoUrl?: string
}

export interface UserPermissionActions {
  addSales: boolean
  addExpense: boolean
  requestLoans: boolean
  exportData: boolean
  viewRecords: boolean
  deleteRecords: boolean
  editRecords: boolean
  // Backward compatibility aliases
  view?: boolean
  create?: boolean
  edit?: boolean
  delete?: boolean
  export?: boolean
}

export interface CompanyPermissionRow {
  companyId: string
  companyName: string
  permissions: UserPermissionActions
}

export interface EmployeeUser {
  id: string
  fullName: string
  email: string
  companyId: string
  companyName: string
  role?: string
  status: 'Active' | 'Inactive'
  lastLogin: string
  isAdmin?: boolean
  avatarUrl?: string
  permissions?: Record<string, UserPermissionActions>
}

export interface CreateCompanyPayload {
  name: string
  email?: string
  address: string
  contactPerson?: string
  contactPersonEmail?: string
  contactNumber: string
  telephoneNumber?: string
  startingBalance: number
  currentBalance?: number
  logoUrl?: string
  logoFile?: File
}

export interface CreateUserPayload {
  fullName: string
  email: string
  assignedCompany: string
  role: string
  password?: string
  avatarUrl?: string
  permissions?: Record<string, UserPermissionActions>
}

export interface UpdateUserPayload {
  fullName?: string
  email?: string
  assignedCompany?: string
  role?: string
  password?: string
  avatarUrl?: string
  status?: 'Active' | 'Inactive'
  permissions?: Record<string, UserPermissionActions>
}

export interface ActivityLogItem {
  id: string
  company: string
  action: string
  module: string
  target: string
  time: string
}

export const INITIAL_ACTIVITY_LOGS: ActivityLogItem[] = [
  {
    id: 'act_1',
    company: 'MCT Head Office',
    action: 'Created sale record',
    module: 'Sales',
    target: 'SV-202609-131',
    time: '2026-10-05 08:14',
  },
  {
    id: 'act_2',
    company: 'MCT North Branch',
    action: 'Updated expense category',
    module: 'Expense',
    target: 'EX-202610-042',
    time: '2026-10-05 09:30',
  },
  {
    id: 'act_3',
    company: 'MCT South Branch',
    action: 'Approved loan application',
    module: 'Loan',
    target: 'LN-202610-118',
    time: '2026-10-05 10:45',
  },
  {
    id: 'act_4',
    company: 'MCT West Branch',
    action: 'Added new employee profile',
    module: 'Employee',
    target: 'EMP-202610-005',
    time: '2026-10-05 11:20',
  },
  {
    id: 'act_5',
    company: 'MCT Head Office',
    action: 'Generated quarterly report',
    module: 'Sales',
    target: 'RPT-Q3-2026',
    time: '2026-10-05 12:05',
  },
  {
    id: 'act_6',
    company: 'MCT North Branch',
    action: 'Edited company profile',
    module: 'Company',
    target: 'CMP-001',
    time: '2026-10-05 13:15',
  },
  {
    id: 'act_7',
    company: 'MCT South Branch',
    action: 'Processed payroll batch',
    module: 'Employee',
    target: 'PAY-202610-01',
    time: '2026-10-05 14:30',
  },
  {
    id: 'act_8',
    company: 'MCT West Branch',
    action: 'Reconciled bank statement',
    module: 'Expense',
    target: 'BNK-202610-04',
    time: '2026-10-05 15:45',
  },
  {
    id: 'act_9',
    company: 'MCT Head Office',
    action: 'Locked user account',
    module: 'Security',
    target: 'USER-REMILEE',
    time: '2026-10-05 16:10',
  },
  {
    id: 'act_10',
    company: 'MCT North Branch',
    action: 'Archived old records',
    module: 'System',
    target: 'ARCH-2026-10',
    time: '2026-10-05 17:00',
  },
]

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp_mct_kitchen',
    name: 'MCT Kitchen',
    email: 'kitchen@mctgroup.com',
    address: 'Building 1, Complex A, Pasig City',
    contactPerson: 'Chef Marco Antonio',
    contactNumber: '+63 917 123 4567',
    telephoneNumber: '(02) 8123-4567',
    startingBalance: 1500000,
    currentBalance: 1820000,
    status: 'Active',
    createdAt: '2026-01-10',
  },
  {
    id: 'comp_mct_hotel',
    name: 'MCT Hotel',
    email: 'hotel@mctgroup.com',
    address: 'Grand Avenue, Bonifacio Global City, Taguig',
    contactPerson: 'Elena Rostova',
    contactNumber: '+63 918 234 5678',
    telephoneNumber: '(02) 8234-5678',
    startingBalance: 5000000,
    currentBalance: 6420500,
    status: 'Active',
    createdAt: '2026-01-15',
  },
  {
    id: 'comp_golden_jupiter',
    name: 'Golden Jupiter Ventures',
    email: 'gjv@mctgroup.com',
    address: 'Ayala Ave, Makati City',
    contactPerson: 'Arthur Vance',
    contactNumber: '+63 919 345 6789',
    telephoneNumber: '(02) 8345-6789',
    startingBalance: 2500000,
    currentBalance: 3100200,
    status: 'Active',
    createdAt: '2026-02-01',
  },
  {
    id: 'comp_jk_property',
    name: 'JK Property Ventures',
    email: 'jkp@mctgroup.com',
    address: 'Ortigas Center, Pasig City',
    contactPerson: 'Jessica Kho',
    contactNumber: '+63 920 456 7890',
    telephoneNumber: '(02) 8456-7890',
    startingBalance: 8000000,
    currentBalance: 9850000,
    status: 'Active',
    createdAt: '2026-02-10',
  },
  {
    id: 'comp_medsys',
    name: 'MedSys',
    email: 'medsys@mctgroup.com',
    address: 'Medical Plaza, Quezon City',
    contactPerson: 'Dr. Raymond Reyes',
    contactNumber: '+63 921 567 8901',
    telephoneNumber: '(02) 8567-8901',
    startingBalance: 3200000,
    currentBalance: 4120000,
    status: 'Active',
    createdAt: '2026-02-15',
  },
  {
    id: 'comp_speed_fire',
    name: 'Speed Fire',
    email: 'speedfire@mctgroup.com',
    address: 'Industrial Valley, Marikina City',
    contactPerson: 'Carlos Mendez',
    contactNumber: '+63 922 678 9012',
    telephoneNumber: '(02) 8678-9012',
    startingBalance: 1200000,
    currentBalance: 1450000,
    status: 'Active',
    createdAt: '2026-02-20',
  },
  {
    id: 'comp_teresitos',
    name: 'Teresitos',
    email: 'teresitos@mctgroup.com',
    address: 'Heritage Blvd, San Juan City',
    contactPerson: 'Teresa Santos',
    contactNumber: '+63 923 789 0123',
    telephoneNumber: '(02) 8789-0123',
    startingBalance: 950000,
    currentBalance: 1105000,
    status: 'Active',
    createdAt: '2026-03-01',
  },
  {
    id: 'comp_jk_printing',
    name: 'JK Printing',
    email: 'printing@mctgroup.com',
    address: 'Press Road, Mandaluyong City',
    contactPerson: 'Jonathan King',
    contactNumber: '+63 924 890 1234',
    telephoneNumber: '(02) 8890-1234',
    startingBalance: 1800000,
    currentBalance: 2050000,
    status: 'Active',
    createdAt: '2026-03-05',
  },
  {
    id: 'comp_mct_head_office',
    name: 'MCT Head Office',
    email: 'headoffice@mctgroup.com',
    address: 'MCT Tower, Global City',
    contactPerson: 'Remi Lee',
    contactNumber: '+63 925 901 2345',
    telephoneNumber: '(02) 8901-2345',
    startingBalance: 12000000,
    currentBalance: 15400000,
    status: 'Active',
    createdAt: '2026-01-01',
  },
  {
    id: 'comp_mct_north',
    name: 'MCT North Branch',
    email: 'north@mctgroup.com',
    address: 'North Edsa, Quezon City',
    contactPerson: 'Alex Chen',
    contactNumber: '+63 926 012 3456',
    telephoneNumber: '(02) 8012-3456',
    startingBalance: 2000000,
    currentBalance: 2450000,
    status: 'Active',
    createdAt: '2026-03-10',
  },
  {
    id: 'comp_mct_south',
    name: 'MCT South Branch',
    email: 'south@mctgroup.com',
    address: 'Alabang, Muntinlupa City',
    contactPerson: 'Maya Patel',
    contactNumber: '+63 927 123 7890',
    telephoneNumber: '(02) 8123-7890',
    startingBalance: 2200000,
    currentBalance: 2600000,
    status: 'Active',
    createdAt: '2026-03-12',
  },
  {
    id: 'comp_mct_east',
    name: 'MCT East Branch',
    email: 'east@mctgroup.com',
    address: 'Blk 43, Lot 24 Regalado Highway, Fairview, Quezon City, Metro Manila',
    contactPerson: 'Jordan Smith',
    contactNumber: '+63 928 234 8901',
    telephoneNumber: '(02) 8234-8901',
    startingBalance: 1800000,
    currentBalance: 2150000,
    status: 'Active',
    createdAt: '2026-03-15',
  },
  {
    id: 'comp_mct_west',
    name: 'MCT West Branch',
    email: 'west@mctgroup.com',
    address: 'Blk 43, Lot 24 Regalado Highway, Fairview, Quezon City, Metro Manila',
    contactPerson: 'Sam Rivera',
    contactNumber: '+63 929 345 6789',
    telephoneNumber: '(02) 8345-6789',
    startingBalance: 2100000,
    currentBalance: 2550000,
    status: 'Active',
    createdAt: '2026-03-18',
  },
  {
    id: 'comp_mct_express',
    name: 'MCT Express Logistics',
    email: 'express@mctgroup.com',
    address: 'Blk 43, Lot 24 Regalado Highway, Fairview, Quezon City, Metro Manila',
    contactPerson: 'Dominic Cruz',
    contactNumber: '+63 930 456 7890',
    telephoneNumber: '(02) 8456-7890',
    startingBalance: 3400000,
    currentBalance: 3950000,
    status: 'Active',
    createdAt: '2026-03-20',
  },
  {
    id: 'comp_mct_central',
    name: 'MCT Central Hub',
    email: 'central@mctgroup.com',
    address: 'Blk 43, Lot 24 Regalado Highway, Fairview, Quezon City, Metro Manila',
    contactPerson: 'Clara Del Rosario',
    contactNumber: '+63 931 567 8901',
    telephoneNumber: '(02) 8567-8901',
    startingBalance: 4500000,
    currentBalance: 5200000,
    status: 'Active',
    createdAt: '2026-03-22',
  },
]

export const INITIAL_USERS: EmployeeUser[] = [
  {
    id: 'usr_1',
    fullName: 'Remi Lee',
    email: 'remi.lee@example.com',
    companyId: 'comp_mct_head_office',
    companyName: 'MCT Head Office',
    role: 'Admin',
    status: 'Active',
    lastLogin: 'Oct 6, 2026 · 9:15 AM',
  },
  {
    id: 'usr_2',
    fullName: 'Alex Chen',
    email: 'alex.chen@example.com',
    companyId: 'comp_mct_north',
    companyName: 'MCT North Branch',
    role: 'Finance',
    status: 'Active',
    lastLogin: 'Oct 5, 2026 · 4:30 PM',
  },
  {
    id: 'usr_3',
    fullName: 'Maya Patel',
    email: 'maya.patel@example.com',
    companyId: 'comp_mct_south',
    companyName: 'MCT South Branch',
    role: 'Supervisor',
    status: 'Active',
    lastLogin: 'Oct 6, 2026 · 8:45 AM',
  },
  {
    id: 'usr_4',
    fullName: 'Jordan Smith',
    email: 'jordan.smith@example.com',
    companyId: 'comp_mct_east',
    companyName: 'MCT East Branch',
    role: 'Company Employee',
    status: 'Active',
    lastLogin: 'Oct 5, 2026 · 8:45 AM',
  },
  {
    id: 'usr_5',
    fullName: 'Sam Rivera',
    email: 'sam.rivera@example.com',
    companyId: 'comp_mct_west',
    companyName: 'MCT West Branch',
    role: 'Cashier',
    status: 'Active',
    lastLogin: 'Sep 22, 2026 · 2:10 PM',
  },
  {
    id: 'usr_6',
    fullName: 'Elena Rostova',
    email: 'elena.rostova@example.com',
    companyId: 'comp_mct_hotel',
    companyName: 'MCT Hotel',
    role: 'Supervisor',
    status: 'Active',
    lastLogin: 'Oct 6, 2026 · 11:30 AM',
  },
  {
    id: 'usr_7',
    fullName: 'Arthur Vance',
    email: 'arthur.vance@example.com',
    companyId: 'comp_golden_jupiter',
    companyName: 'Golden Jupiter Ventures',
    role: 'Finance',
    status: 'Active',
    lastLogin: 'Oct 4, 2026 · 2:15 PM',
  },
  {
    id: 'usr_8',
    fullName: 'Jessica Kho',
    email: 'jessica.kho@example.com',
    companyId: 'comp_jk_property',
    companyName: 'JK Property Ventures',
    role: 'Supervisor',
    status: 'Active',
    lastLogin: 'Oct 5, 2026 · 1:20 PM',
  },
  {
    id: 'usr_9',
    fullName: 'Carlos Mendez',
    email: 'carlos.mendez@example.com',
    companyId: 'comp_speed_fire',
    companyName: 'Speed Fire',
    role: 'Company Employee',
    status: 'Active',
    lastLogin: 'Oct 6, 2026 · 10:00 AM',
  },
]

// The companies configured for the permission modal as displayed in Image 3
export const PERMISSION_COMPANIES = [
  { id: 'comp_kitchen', name: 'MCT Kitchen' },
  { id: 'comp_hotel', name: 'MCT Hotel' },
  { id: 'comp_golden_jupiter', name: 'Golden Jupiter Ventures' },
  { id: 'comp_jk_property', name: 'JK Property Ventures' },
  { id: 'comp_medsys', name: 'MedSys' },
  { id: 'comp_speed_fire', name: 'Speed Fire' },
  { id: 'comp_teresitos', name: 'Teresitos' },
  { id: 'comp_jk_printing', name: 'JK Printing' },
]

let inMemoryCompanies: Company[] = [...INITIAL_COMPANIES]
let inMemoryUsers: EmployeeUser[] = [...INITIAL_USERS]
const inMemoryPermissions: Record<string, Record<string, UserPermissionActions>> = {}

function getAuthHeaders(): HeadersInit {
  const token = sessionStorage.getItem(['mct', 'access', 'token'].join('_'))
  return token ? { Authorization: 'Bearer ' + token } : {}
}

async function getApiError(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (typeof body?.detail === 'string') return body.detail
    if (Array.isArray(body?.detail)) {
      const messages = body.detail
        .map((item: { loc?: unknown[]; msg?: string }) => {
          const field = item.loc?.at(-1)
          return field && item.msg ? `${String(field)}: ${item.msg}` : item.msg
        })
        .filter(Boolean)
      if (messages.length > 0) return messages.join('; ')
    }
  } catch {
    // Use the generic fallback below when the response is not JSON.
  }
  return `Request failed (${response.status})`
}

async function mapApiResponse<T>(
  response: Response,
  mapper: (value: unknown) => T
): Promise<T> {
  if (!response.ok) throw new Error(await getApiError(response))
  return mapper(await response.json())
}

function mapUser(value: unknown): EmployeeUser {
  const user = value as {
    user_id: number
    name: string
    email: string
    company_id: number | null
    company_name: string | null
    is_admin: boolean
    role?: string
    last_login_at: string | null
  }

  const roleName = user.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : user.is_admin
    ? 'Admin'
    : 'Company Employee'

  return {
    id: String(user.user_id),
    fullName: user.name,
    email: user.email,
    companyId: user.company_id === null ? '' : String(user.company_id),
    companyName: user.company_name || 'MCT Head Office',
    role: roleName,
    status: 'Active',
    lastLogin: user.last_login_at
      ? new Date(user.last_login_at).toLocaleString()
      : 'Never',
    isAdmin: user.is_admin,
  }
}

function mapCompany(value: unknown): Company {
  const company = value as {
    id: number
    name: string
    location: string
    contact_person: string
    contact_number: string | null
    phone: string | null
    email: string
    starting_balance: number
    current_balance: number
    created_at: string | null
    logo_url?: string | null
  }
  return {
    id: String(company.id),
    name: company.name,
    email: company.email,
    address: company.location,
    contactPerson: company.contact_person,
    contactNumber: company.contact_number || '',
    telephoneNumber: company.phone || '',
    startingBalance: Number(company.starting_balance),
    currentBalance: Number(company.current_balance),
    status: 'Active',
    createdAt: company.created_at || '',
    logoUrl: company.logo_url || undefined,
  }
}

export const employeeService = {
  async getUsers(): Promise<EmployeeUser[]> {
    try {
      const response = await fetch('/api/v1/users', {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const users = await mapApiResponse(response, (value) =>
          (value as unknown[]).map(mapUser)
        )
        if (users && users.length > 0) {
          inMemoryUsers = users
          return users
        }
      }
    } catch {
      // Fallback to inMemoryUsers
    }
    return [...inMemoryUsers]
  },

  async getCompanies(): Promise<Company[]> {
    try {
      const response = await fetch('/api/v1/companies', {
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        const companies = await mapApiResponse(response, (value) =>
          (value as unknown[]).map(mapCompany)
        )
        if (companies && companies.length > 0) {
          inMemoryCompanies = companies
          return companies
        }
      }
    } catch {
      // Fallback
    }
    return [...inMemoryCompanies]
  },

  async createUser(payload: CreateUserPayload): Promise<EmployeeUser> {
    const company = inMemoryCompanies.find((item) => item.name === payload.assignedCompany)
    const companyId = company?.id || 'comp_mct_head_office'
    const companyName = company?.name || payload.assignedCompany

    let created: EmployeeUser | null = null

    try {
      const response = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.fullName,
          email: payload.email,
          password: payload.password || 'Password123!',
          company_id: company && !isNaN(Number(company.id)) ? Number(company.id) : null,
          is_admin: payload.role === 'Admin',
          role: payload.role.toLowerCase(),
        }),
      })
      if (response.ok) {
        created = await mapApiResponse(response, mapUser)
        created.role = payload.role
      }
    } catch {
      // Fallback below
    }

    if (!created) {
      created = {
        id: `usr_${Date.now()}`,
        fullName: payload.fullName,
        email: payload.email,
        companyId: String(companyId),
        companyName,
        role: payload.role,
        status: 'Active',
        lastLogin: 'Never',
        isAdmin: payload.role === 'Admin',
        avatarUrl: payload.avatarUrl,
        permissions: payload.permissions,
      }
    }

    inMemoryUsers = [created, ...inMemoryUsers]

    if (payload.permissions) {
      inMemoryPermissions[created.id] = { ...payload.permissions }
    }

    return created
  },

  async updateUser(id: string, payload: UpdateUserPayload): Promise<EmployeeUser> {
    const existing = inMemoryUsers.find((u) => u.id === id)
    const company = payload.assignedCompany
      ? inMemoryCompanies.find((item) => item.name === payload.assignedCompany)
      : undefined

    const updatedUser: EmployeeUser = {
      ...(existing || {
        id,
        fullName: payload.fullName || 'User',
        email: payload.email || '',
        companyId: company ? String(company.id) : '',
        companyName: company ? company.name : payload.assignedCompany || '',
        status: 'Active',
        lastLogin: 'Never',
      }),
      ...(payload.fullName ? { fullName: payload.fullName } : {}),
      ...(payload.email ? { email: payload.email } : {}),
      ...(payload.assignedCompany ? { companyName: payload.assignedCompany, companyId: company ? String(company.id) : '' } : {}),
      ...(payload.role ? { role: payload.role, isAdmin: payload.role === 'Admin' } : {}),
      ...(payload.avatarUrl ? { avatarUrl: payload.avatarUrl } : {}),
      ...(payload.status ? { status: payload.status } : {}),
      ...(payload.permissions ? { permissions: payload.permissions } : {}),
    }

    inMemoryUsers = inMemoryUsers.map((u) => (u.id === id ? updatedUser : u))

    if (payload.permissions) {
      inMemoryPermissions[id] = { ...payload.permissions }
    }

    try {
      const body: Record<string, unknown> = {}
      if (payload.fullName !== undefined) body.name = payload.fullName
      if (payload.email !== undefined) body.email = payload.email
      if (company && !isNaN(Number(company.id))) body.company_id = Number(company.id)
      if (payload.role) body.role = payload.role.toLowerCase()
      if (payload.password) body.password = payload.password

      await fetch(`/api/v1/users/${id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      // Handled via inMemoryUsers
    }

    return updatedUser
  },

  async deleteUser(id: string): Promise<void> {
    inMemoryUsers = inMemoryUsers.filter((u) => u.id !== id)
    delete inMemoryPermissions[id]

    try {
      await fetch(`/api/v1/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
    } catch {
      // Handled via inMemoryUsers
    }
  },

  async createCompany(payload: CreateCompanyPayload): Promise<Company> {
    let comp: Company | null = null
    try {
      let endpoint = '/api/v1/companies'
      let headers: HeadersInit = {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      }
      let body: BodyInit = JSON.stringify({
        name: payload.name,
        location: payload.address,
        contact_person: payload.contactPerson || payload.name,
        contact_number: payload.contactNumber || null,
        phone: payload.telephoneNumber || null,
        email: payload.email || '',
        starting_balance: payload.startingBalance,
        current_balance: payload.currentBalance ?? payload.startingBalance,
      })

      if (payload.logoFile) {
        const formData = new FormData()
        formData.append('name', payload.name)
        formData.append('location', payload.address)
        formData.append('contact_person', payload.contactPerson || payload.name)
        formData.append('contact_number', payload.contactNumber || '')
        formData.append('phone', payload.telephoneNumber || '')
        formData.append('email', payload.email || '')
        formData.append('starting_balance', String(payload.startingBalance))
        formData.append(
          'current_balance',
          String(payload.currentBalance ?? payload.startingBalance)
        )
        formData.append('picture', payload.logoFile)
        endpoint = '/api/v1/companies/with-picture'
        headers = getAuthHeaders()
        body = formData
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
      })
      if (payload.logoFile) {
        comp = await mapApiResponse(response, mapCompany)
      } else if (response.ok) {
        comp = await mapApiResponse(response, mapCompany)
      }
    } catch (error) {
      if (payload.logoFile) throw error
      // Handled below
    }

    if (!comp) {
      comp = {
        id: `comp_${Date.now()}`,
        name: payload.name,
        address: payload.address,
        email: payload.email || '',
        contactPerson: payload.contactPerson || payload.name,
        contactNumber: payload.contactNumber,
        telephoneNumber: payload.telephoneNumber || '',
        startingBalance: payload.startingBalance,
        currentBalance: payload.currentBalance ?? payload.startingBalance,
        status: 'Active',
        createdAt: new Date().toISOString().slice(0, 10),
        logoUrl: payload.logoUrl,
      }
    }

    if (payload.logoUrl) {
      comp.logoUrl = payload.logoUrl
    }

    inMemoryCompanies = [comp, ...inMemoryCompanies]
    return comp
  },

  async updateCompany(
    id: string,
    payload: Partial<CreateCompanyPayload>
  ): Promise<Company> {
    const existing = inMemoryCompanies.find((c) => c.id === id)
    const updated: Company = {
      ...(existing || {
        id,
        name: payload.name || 'Company',
        email: payload.email || '',
        address: payload.address || '',
        contactPerson: payload.contactPerson || '',
        contactNumber: payload.contactNumber || '',
        telephoneNumber: payload.telephoneNumber || '',
        startingBalance: payload.startingBalance || 0,
        currentBalance: payload.currentBalance || 0,
        status: 'Active',
        createdAt: '',
      }),
      ...(payload.name ? { name: payload.name } : {}),
      ...(payload.address ? { address: payload.address } : {}),
      ...(payload.contactNumber ? { contactNumber: payload.contactNumber } : {}),
      ...(payload.telephoneNumber !== undefined ? { telephoneNumber: payload.telephoneNumber } : {}),
      ...(payload.startingBalance !== undefined ? { startingBalance: payload.startingBalance } : {}),
      ...(payload.logoUrl !== undefined ? { logoUrl: payload.logoUrl } : {}),
    }

    inMemoryCompanies = inMemoryCompanies.map((c) => (c.id === id ? updated : c))

    try {
      const body: Record<string, unknown> = {}
      if (payload.name !== undefined) body.name = payload.name
      if (payload.address !== undefined) body.location = payload.address
      if (payload.contactNumber !== undefined) body.contact_number = payload.contactNumber || null
      if (payload.telephoneNumber !== undefined) body.phone = payload.telephoneNumber || null
      if (payload.startingBalance !== undefined) body.starting_balance = payload.startingBalance

      await fetch(`/api/v1/companies/${id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      // Handled via inMemoryCompanies
    }

    return updated
  },

  async deleteCompany(id: string): Promise<void> {
    inMemoryCompanies = inMemoryCompanies.filter((c) => c.id !== id)
    try {
      await fetch(`/api/v1/companies/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
    } catch {
      // Handled
    }
  },

  async getActivityLogs(): Promise<ActivityLogItem[]> {
    await new Promise((resolve) => setTimeout(resolve, 80))
    return [...INITIAL_ACTIVITY_LOGS]
  },

  async getUserPermissions(userId: string): Promise<Record<string, UserPermissionActions>> {
    await new Promise((resolve) => setTimeout(resolve, 80))
    if (!inMemoryPermissions[userId]) {
      // Initialize with default unchecked or semi-checked permissions per company
      const defaultMap: Record<string, UserPermissionActions> = {}
      PERMISSION_COMPANIES.forEach((comp) => {
        defaultMap[comp.name] = {
          addSales: false,
          addExpense: false,
          requestLoans: false,
          exportData: false,
          viewRecords: false,
          deleteRecords: false,
          editRecords: false,
          view: false,
          create: false,
          edit: false,
          delete: false,
          export: false,
        }
      })
      inMemoryPermissions[userId] = defaultMap
    }
    return { ...inMemoryPermissions[userId] }
  },

  async saveUserPermissions(
    userId: string,
    permissions: Record<string, UserPermissionActions>
  ): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    inMemoryPermissions[userId] = { ...permissions }
  },
}

export interface Company {
  id: string
  name: string
  email: string
  address: string
  contactPerson: string
  contactNumber: string
  telephoneNumber: string
  startingBalance: number
  currentBalance: number
  status: 'Active' | 'Inactive'
  createdAt: string
  logoUrl?: string
}

export interface UserPermissionActions {
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
  export: boolean
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
  status: 'Active' | 'Inactive'
  lastLogin: string
  isAdmin?: boolean
  permissions?: Record<string, UserPermissionActions>
}

export interface CreateCompanyPayload {
  name: string
  email: string
  address: string
  contactPerson: string
  contactNumber: string
  telephoneNumber: string
  startingBalance: number
  currentBalance: number
  logoUrl?: string
}

export interface CreateUserPayload {
  fullName: string
  email: string
  assignedCompany: string
  password: string
}

export interface UpdateUserPayload {
  fullName?: string
  email?: string
  assignedCompany?: string
  password?: string
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
    status: 'Active',
    lastLogin: 'Oct 6, 2026 · 9:15 AM',
  },
  {
    id: 'usr_2',
    fullName: 'Alex Chen',
    email: 'alex.chen@example.com',
    companyId: 'comp_mct_north',
    companyName: 'MCT North Branch',
    status: 'Active',
    lastLogin: 'Oct 5, 2026 · 4:30 PM',
  },
  {
    id: 'usr_3',
    fullName: 'Maya Patel',
    email: 'maya.patel@example.com',
    companyId: 'comp_mct_south',
    companyName: 'MCT South Branch',
    status: 'Active',
    lastLogin: 'Oct 6, 2026 · 8:45 AM',
  },
  {
    id: 'usr_4',
    fullName: 'Jordan Smith',
    email: 'jordan.smith@example.com',
    companyId: 'comp_mct_east',
    companyName: 'MCT East Branch',
    status: 'Active',
    lastLogin: 'Oct 5, 2026 · 8:45 AM',
  },
  {
    id: 'usr_5',
    fullName: 'Sam Rivera',
    email: 'sam.rivera@example.com',
    companyId: 'comp_mct_west',
    companyName: 'MCT West Branch',
    status: 'Active',
    lastLogin: 'Sep 22, 2026 · 2:10 PM',
  },
  {
    id: 'usr_6',
    fullName: 'Remi Lee',
    email: 'remi.lee@example.com',
    companyId: 'comp_mct_head_office',
    companyName: 'MCT Head Office',
    status: 'Active',
    lastLogin: 'Oct 6, 2026 · 9:15 AM',
  },
  {
    id: 'usr_7',
    fullName: 'Alex Chen',
    email: 'alex.chen@example.com',
    companyId: 'comp_mct_north',
    companyName: 'MCT North Branch',
    status: 'Active',
    lastLogin: 'Oct 5, 2026 · 4:30 PM',
  },
  {
    id: 'usr_8',
    fullName: 'Maya Patel',
    email: 'maya.patel@example.com',
    companyId: 'comp_mct_south',
    companyName: 'MCT South Branch',
    status: 'Active',
    lastLogin: 'Oct 6, 2026 · 8:45 AM',
  },
  {
    id: 'usr_9',
    fullName: 'Jordan Smith',
    email: 'jordan.smith@example.com',
    companyId: 'comp_mct_east',
    companyName: 'MCT East Branch',
    status: 'Active',
    lastLogin: 'Oct 5, 2026 · 8:45 AM',
  },
  {
    id: 'usr_10',
    fullName: 'Sam Rivera',
    email: 'sam.rivera@example.com',
    companyId: 'comp_mct_west',
    companyName: 'MCT West Branch',
    status: 'Active',
    lastLogin: 'Oct 3, 2026 · 2:10 PM',
  },
  {
    id: 'usr_11',
    fullName: 'Remi Lee',
    email: 'remi.lee@example.com',
    companyId: 'comp_mct_head_office',
    companyName: 'MCT Head Office',
    status: 'Active',
    lastLogin: 'Oct 3, 2026 · 9:15 AM',
  },
  {
    id: 'usr_12',
    fullName: 'Alex Chen',
    email: 'alex.chen@example.com',
    companyId: 'comp_mct_north',
    companyName: 'MCT North Branch',
    status: 'Active',
    lastLogin: 'Oct 3, 2026 · 4:30 PM',
  },
  {
    id: 'usr_13',
    fullName: 'Maya Patel',
    email: 'maya.patel@example.com',
    companyId: 'comp_mct_south',
    companyName: 'MCT South Branch',
    status: 'Active',
    lastLogin: 'Oct 3, 2026 · 8:45 AM',
  },
  {
    id: 'usr_14',
    fullName: 'Jordan Smith',
    email: 'jordan.smith@example.com',
    companyId: 'comp_mct_east',
    companyName: 'MCT East Branch',
    status: 'Active',
    lastLogin: 'Oct 2, 2026 · 8:45 AM',
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

let inMemoryCompanies: Company[] = []
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
    last_login_at: string | null
  }

  return {
    id: String(user.user_id),
    fullName: user.name,
    email: user.email,
    companyId: user.company_id === null ? '' : String(user.company_id),
    companyName: user.company_name || 'MCT Head Office',
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
  }
}

export const employeeService = {
  async getUsers(): Promise<EmployeeUser[]> {
    const response = await fetch('/api/v1/users', {
      headers: getAuthHeaders(),
    })
    return mapApiResponse(response, (value) =>
      (value as unknown[]).map(mapUser)
    )
  },

  async getCompanies(): Promise<Company[]> {
    const response = await fetch('/api/v1/companies', {
      headers: getAuthHeaders(),
    })
    return mapApiResponse(response, (value) => {
      const companies = (value as unknown[]).map(mapCompany)
      inMemoryCompanies = companies
      return companies
    })
  },

  async createUser(payload: CreateUserPayload): Promise<EmployeeUser> {
    const company = inMemoryCompanies.find((item) => item.name === payload.assignedCompany)
    if (!company) throw new Error('Please select a valid company.')
    const response = await fetch('/api/v1/users', {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.fullName,
        email: payload.email,
        password: payload.password,
        company_id: Number(company.id),
        is_admin: false,
      }),
    })
    return mapApiResponse(response, mapUser)
  },

  async updateUser(id: string, payload: UpdateUserPayload): Promise<EmployeeUser> {
    const body: Record<string, unknown> = {}
    if (payload.fullName !== undefined) body.name = payload.fullName
    if (payload.email !== undefined) body.email = payload.email
    if (payload.assignedCompany !== undefined) body.company_id = Number(payload.assignedCompany)
    if (payload.password) body.password = payload.password
    const response = await fetch(`/api/v1/users/${id}`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return mapApiResponse(response, mapUser)
  },

  async deleteUser(id: string): Promise<void> {
    const response = await fetch(`/api/v1/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    if (!response.ok) {
      throw new Error(await getApiError(response))
    }
  },

  async createCompany(payload: CreateCompanyPayload): Promise<Company> {
    const response = await fetch('/api/v1/companies', {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.name,
        location: payload.address,
        contact_person: payload.contactPerson,
        contact_number: payload.contactNumber || null,
        phone: payload.telephoneNumber || null,
        email: payload.email,
        starting_balance: payload.startingBalance,
        current_balance: payload.currentBalance,
      }),
    })
    return mapApiResponse(response, mapCompany)
  },

  async updateCompany(
    id: string,
    payload: Partial<CreateCompanyPayload>
  ): Promise<Company> {
    const body: Record<string, unknown> = {}
    if (payload.name !== undefined) body.name = payload.name
    if (payload.address !== undefined) body.location = payload.address
    if (payload.contactPerson !== undefined) body.contact_person = payload.contactPerson
    if (payload.contactNumber !== undefined) body.contact_number = payload.contactNumber || null
    if (payload.telephoneNumber !== undefined) body.phone = payload.telephoneNumber || null
    if (payload.email !== undefined) body.email = payload.email
    if (payload.startingBalance !== undefined) body.starting_balance = payload.startingBalance
    if (payload.currentBalance !== undefined) body.current_balance = payload.currentBalance

    const response = await fetch(`/api/v1/companies/${id}`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return mapApiResponse(response, mapCompany)
  },

  async deleteCompany(id: string): Promise<void> {
    const response = await fetch(`/api/v1/companies/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    if (!response.ok) {
      throw new Error(await getApiError(response))
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

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

let inMemoryUsers: EmployeeUser[] = [...INITIAL_USERS]
let inMemoryCompanies: Company[] = [...INITIAL_COMPANIES]
const inMemoryPermissions: Record<string, Record<string, UserPermissionActions>> = {}

export const employeeService = {
  async getUsers(): Promise<EmployeeUser[]> {
    await new Promise((resolve) => setTimeout(resolve, 80))
    return [...inMemoryUsers]
  },

  async getCompanies(): Promise<Company[]> {
    await new Promise((resolve) => setTimeout(resolve, 60))
    return [...inMemoryCompanies]
  },

  async createUser(payload: CreateUserPayload): Promise<EmployeeUser> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const assignedComp = inMemoryCompanies.find((c) => c.name === payload.assignedCompany) || {
      id: `comp_${Date.now()}`,
      name: payload.assignedCompany,
    }

    const newUser: EmployeeUser = {
      id: `usr_${Date.now()}`,
      fullName: payload.fullName,
      email: payload.email,
      companyId: assignedComp.id,
      companyName: assignedComp.name,
      status: 'Active',
      lastLogin: 'Just now',
    }

    inMemoryUsers = [newUser, ...inMemoryUsers]
    return newUser
  },

  async createCompany(payload: CreateCompanyPayload): Promise<Company> {
    await new Promise((resolve) => setTimeout(resolve, 350))
    const newCompany: Company = {
      id: `comp_${Date.now()}`,
      name: payload.name,
      email: payload.email,
      address: payload.address,
      contactPerson: payload.contactPerson,
      contactNumber: payload.contactNumber,
      telephoneNumber: payload.telephoneNumber,
      startingBalance: payload.startingBalance,
      currentBalance: payload.currentBalance,
      logoUrl: payload.logoUrl,
      status: 'Active',
      createdAt: new Date().toISOString().split('T')[0],
    }

    inMemoryCompanies = [newCompany, ...inMemoryCompanies]
    return newCompany
  },

  async updateCompany(
    id: string,
    payload: Partial<CreateCompanyPayload>
  ): Promise<Company> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    const index = inMemoryCompanies.findIndex((c) => c.id === id)
    if (index === -1) {
      throw new Error('Company not found')
    }
    const updated: Company = {
      ...inMemoryCompanies[index],
      ...payload,
    }
    inMemoryCompanies[index] = updated
    return updated
  },

  async deleteCompany(id: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    inMemoryCompanies = inMemoryCompanies.filter((c) => c.id !== id)
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

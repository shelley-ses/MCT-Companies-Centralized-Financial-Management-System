import type { SignInFormValues } from '@/lib/validation/auth'
import logo2Url from '@/assets/LOGO2.png'

export type UserRole = 'Admin' | 'Company Auditor'

/**
 * User session model
 */
export interface User {
  id: string
  fullName: string
  email: string
  role: UserRole | string
  assignedCompany?: string
  avatarUrl?: string
}

export type SignInResult =
  | { status: 'authenticated'; user: User }
  | { status: '2fa_required' }

export interface Verify2FAResponse {
  success: boolean
  token: string
}

// Seeded accounts in the system
export interface SeededAccount {
  id: string
  fullName: string
  email: string
  role: UserRole
  assignedCompany?: string
  avatarUrl?: string
}

export const SEEDED_ACCOUNTS: SeededAccount[] = [
  // Admin accounts (Head of Audit and company owner)
  {
    id: 'usr_admin_01',
    fullName: 'Remi Lee',
    email: 'admin@mct.com',
    role: 'Admin',
    assignedCompany: 'All Companies',
    avatarUrl: logo2Url,
  },
  {
    id: 'usr_admin_02',
    fullName: 'Remi Lee',
    email: 'remi.lee@mct.com',
    role: 'Admin',
    assignedCompany: 'All Companies',
    avatarUrl: logo2Url,
  },
  // Company Auditor accounts (audits transactions and tracks records)
  {
    id: 'usr_auditor_01',
    fullName: 'Alex Cruz',
    email: 'auditor@mct.com',
    role: 'Company Auditor',
    assignedCompany: 'MCT Kitchen',
    avatarUrl: logo2Url,
  },
  {
    id: 'usr_auditor_02',
    fullName: 'Alex Cruz',
    email: 'alex.cruz@mct.com',
    role: 'Company Auditor',
    assignedCompany: 'MCT Kitchen',
    avatarUrl: logo2Url,
  },
]

export const ADMIN_USER: User = SEEDED_ACCOUNTS[0]
export const AUDITOR_USER: User = SEEDED_ACCOUNTS[2]
export const DEFAULT_MOCK_USER: User = AUDITOR_USER

const SESSION_STORAGE_KEY = 'mct_session_user'

function getInitialUser(): User {
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {
      // ignore
    }
  }
  return DEFAULT_MOCK_USER
}

/**
 * Automatically detects whether an authenticated user is Admin or Company Auditor
 * based on their seeded account and email credentials.
 */
export function detectUserByEmail(email: string): User {
  const normalized = email.trim().toLowerCase()
  const matched = SEEDED_ACCOUNTS.find(
    (acc) => acc.email.toLowerCase() === normalized
  )

  if (matched) {
    return {
      id: matched.id,
      fullName: matched.fullName,
      email: matched.email,
      role: matched.role,
      assignedCompany: matched.assignedCompany,
      avatarUrl: matched.avatarUrl,
    }
  }

  // Detection by role keyword
  if (normalized.includes('auditor') || normalized.includes('audit')) {
    return {
      id: `usr_auditor_${Date.now()}`,
      fullName: 'Alex Cruz',
      email: email.trim(),
      role: 'Company Auditor',
      assignedCompany: 'MCT Kitchen',
      avatarUrl: logo2Url,
    }
  }

  // Default to Admin
  return {
    id: `usr_admin_${Date.now()}`,
    fullName: 'Remi Lee',
    email: email.trim(),
    role: 'Admin',
    assignedCompany: 'All Companies',
    avatarUrl: logo2Url,
  }
}

let inMemorySessionUser: User | null = getInitialUser()
let pendingUserEmail: string | null = null

export const authService = {
  /**
   * Mock signIn: Validates credentials and prompts for 2FA.
   * Returns { status: '2fa_required' } on successful credentials.
   */
  async signIn(values: SignInFormValues): Promise<SignInResult> {
    // Artificial latency for realistic async experience
    await new Promise((resolve) => setTimeout(resolve, 600))

    // Never log passwords. Basic validation check:
    if (values.password === 'wrong' || values.password === 'error') {
      throw new Error('Invalid email or password.')
    }

    // Keep pending user email for 2FA completion
    pendingUserEmail = values.email || DEFAULT_MOCK_USER.email

    return {
      status: '2fa_required',
    }
  },

  /**
   * Retrieves the current user session.
   */
  async getSession(): Promise<User | null> {
    await new Promise((resolve) => setTimeout(resolve, 50))
    if (!inMemorySessionUser && typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
        if (stored) {
          inMemorySessionUser = JSON.parse(stored)
        }
      } catch {
        // ignore
      }
    }
    return inMemorySessionUser ?? DEFAULT_MOCK_USER
  },

  /**
   * Mock signOut: Clears session.
   */
  async signOut(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 400))
    inMemorySessionUser = null
    pendingUserEmail = null
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY)
      } catch {
        // ignore
      }
    }
  },

  /**
   * 2FA verification stub
   */
  async verify2FA(code: string): Promise<Verify2FAResponse> {
    await new Promise((resolve) => setTimeout(resolve, 600))

    if (code === '000000') {
      throw new Error('Invalid authentication code. Please try again.')
    }

    if (code.length !== 6) {
      throw new Error('Please enter a valid 6-digit code.')
    }

    // System automatically detects user role from credentials
    const authenticatedUser = detectUserByEmail(pendingUserEmail || DEFAULT_MOCK_USER.email)
    inMemorySessionUser = authenticatedUser
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authenticatedUser))
      } catch {
        // ignore
      }
    }

    return {
      success: true,
      token: `auth_token_${Date.now()}`,
    }
  },
}

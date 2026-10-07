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
  | { status: '2fa_required'; email: string }

export interface Verify2FAResponse {
  success: boolean
  token: string
}

export interface Resend2FAResponse {
  expiresIn: number
  resendAvailableIn: number
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

async function request<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api/v1/auth${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await response.json()) as { detail?: string }
  if (!response.ok) {
    throw new Error(data.detail || 'Authentication request failed.')
  }
  return data as T
}

function mapUser(user: {
  user_id: number
  email: string
  name: string
  is_admin: boolean
}): User {
  const role: UserRole = user.is_admin ? 'Admin' : 'Company Auditor'
  return {
    id: String(user.user_id),
    fullName: user.name,
    email: user.email,
    role: role,
    assignedCompany: user.is_admin ? 'All Companies' : 'MCT Kitchen',
    avatarUrl: logo2Url,
  }
}

export const authService = {
  /**
   * Validates credentials and starts an email OTP challenge.
   */
  async signIn(values: SignInFormValues): Promise<SignInResult> {
    pendingUserEmail = values.email || DEFAULT_MOCK_USER.email
    try {
      const response = await request<{
        email: string
      }>('/login', { email: values.email, password: values.password })
      return { status: '2fa_required', email: response.email }
    } catch (err: unknown) {
      // If server returned a business validation error (e.g. invalid credentials)
      if (
        err instanceof Error &&
        err.message &&
        !err.message.toLowerCase().includes('failed to fetch') &&
        !err.message.toLowerCase().includes('network')
      ) {
        throw err
      }

      // Fallback for standalone frontend mock mode
      await new Promise((resolve) => setTimeout(resolve, 400))
      if (values.password === 'wrong' || values.password === 'error') {
        throw new Error('Invalid email or password.')
      }

      return {
        status: '2fa_required',
        email: values.email,
      }
    }
  },

  /**
   * Retrieves the current user session from memory or storage.
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
   * Clears session.
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
   * Verify the email OTP and complete authentication.
   */
  async verify2FA(code: string): Promise<Verify2FAResponse> {
    if (code.length !== 6) {
      throw new Error('Please enter a valid 6-digit code.')
    }

    try {
      const response = await request<{
        access_token: string
        user: { user_id: number; email: string; name: string; is_admin: boolean }
      }>('/login/verify-otp', { otp: code })
      const mapped = mapUser(response.user)
      inMemorySessionUser = mapped
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(mapped))
        } catch {
          // ignore
        }
      }
      return { success: true, token: response.access_token }
    } catch (err: unknown) {
      // If error is actual invalid code from backend, rethrow
      if (
        err instanceof Error &&
        err.message &&
        !err.message.toLowerCase().includes('failed to fetch') &&
        !err.message.toLowerCase().includes('network')
      ) {
        throw err
      }

      // Fallback for standalone mock environment
      await new Promise((resolve) => setTimeout(resolve, 400))
      if (code === '000000') {
        throw new Error('Invalid authentication code. Please try again.')
      }

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
    }
  },

  /**
   * Resend 2FA OTP code.
   */
  async resend2FA(): Promise<Resend2FAResponse> {
    try {
      const response = await request<{
        expires_in: number
        resend_available_in: number
      }>('/login/resend-otp', {})
      return {
        expiresIn: response.expires_in,
        resendAvailableIn: response.resend_available_in,
      }
    } catch {
      // Fallback stub for dev without backend
      return {
        expiresIn: 300,
        resendAvailableIn: 60,
      }
    }
  },
}

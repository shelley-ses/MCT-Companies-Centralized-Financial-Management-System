import type { SignInFormValues } from '@/lib/validation/auth'
import logo2Url from '@/assets/LOGO2.png'
import { encryptPayload } from '@/services/payloadEncryption'

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
  // Company Auditor account for MCT Kitchen
  {
    id: 'usr_kitchen_01',
    fullName: 'Temporary Employee',
    email: 'temporary.employee@mct.com',
    role: 'Company Auditor',
    assignedCompany: 'MCT Kitchen',
    avatarUrl: logo2Url,
  },
  // Company Auditor account for MCT Hotel
  {
    id: 'usr_hotel_01',
    fullName: 'Temporary Employee 1',
    email: 'temporary.employee1@mct.com',
    role: 'Company Auditor',
    assignedCompany: 'MCT Hotel',
    avatarUrl: logo2Url,
  },
]

export const ADMIN_USER: User = SEEDED_ACCOUNTS[0]
export const AUDITOR_USER: User = SEEDED_ACCOUNTS[2]
const SESSION_STORAGE_KEY = 'mct_session_user'
const ACCESS_TOKEN_KEY = 'mct_access_token'
const LAST_ACTIVITY_KEY = 'mct_last_activity'
const SESSION_IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000

function getInitialUser(): User | null {
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
      const token = sessionStorage.getItem(ACCESS_TOKEN_KEY)
      const lastActivity = Number(sessionStorage.getItem(LAST_ACTIVITY_KEY))
      const tokenPayload = token
        ? JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
        : null
      const tokenIsValid =
        tokenPayload &&
        typeof tokenPayload.exp === 'number' &&
        tokenPayload.exp * 1000 > Date.now()
      if (
        stored &&
        tokenIsValid &&
        Number.isFinite(lastActivity) &&
        Date.now() - lastActivity < SESSION_IDLE_TIMEOUT_MS
      ) {
        return JSON.parse(stored)
      }
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
      sessionStorage.removeItem(ACCESS_TOKEN_KEY)
      sessionStorage.removeItem(LAST_ACTIVITY_KEY)
    } catch {
      // ignore
    }
  }
  return null
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
async function request<T>(path: string, body: unknown): Promise<T> {
  const token =
    typeof window !== 'undefined'
      ? sessionStorage.getItem(ACCESS_TOKEN_KEY)
      : null
  const response = await fetch(`/api/v1/auth${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  const responseText = await response.text()
  let data: { detail?: string } = {}
  try {
    data = responseText ? (JSON.parse(responseText) as { detail?: string }) : {}
  } catch {
    data = {}
  }
  if (!response.ok) {
    throw new Error(
      data.detail ||
        responseText ||
        `Authentication request failed (${response.status}).`
    )
  }
  return data as T
}

function mapUser(user: {
  user_id: number
  email: string
  name: string
  is_admin: boolean
  company_name?: string | null
}): User {
  const role: UserRole = user.is_admin ? 'Admin' : 'Company Auditor'
  return {
    id: String(user.user_id),
    fullName: user.name,
    email: user.email,
    role: role,
    assignedCompany: user.is_admin ? 'All Companies' : (user.company_name || 'MCT Kitchen'),
    avatarUrl: logo2Url,
  }
}

export const authService = {
  touchSessionActivity(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
    }
  },
  /**
   * Validates credentials and starts an email OTP challenge.
   */
  async signIn(values: SignInFormValues): Promise<SignInResult> {
    const encryptedPayload = await encryptPayload({
      email: values.email,
      password: values.password,
    })
    const response = await request<{
      email: string
    }>('/login', { encrypted_payload: encryptedPayload })
    return { status: '2fa_required', email: response.email }
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
    return inMemorySessionUser
  },

  /**
   * Clears session.
   */
  async signOut(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem(ACCESS_TOKEN_KEY)) {
        await request('/logout', {})
      }
    } finally {
      inMemorySessionUser = null
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem(ACCESS_TOKEN_KEY)
          sessionStorage.removeItem(SESSION_STORAGE_KEY)
          sessionStorage.removeItem(LAST_ACTIVITY_KEY)
        } catch {
          // ignore storage cleanup failures
        }
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

    const response = await request<{
      access_token: string
      user: {
        user_id: number
        email: string
        name: string
        is_admin: boolean
        company_name?: string | null
      }
    }>('/login/verify-otp', { otp: code })
    const mapped = mapUser(response.user)
    inMemorySessionUser = mapped
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(ACCESS_TOKEN_KEY, response.access_token)
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(mapped))
        sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
      } catch {
        // ignore
      }
    }
    return { success: true, token: response.access_token }
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
    } catch (error) {
      throw error
    }
  },
}

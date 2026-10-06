import type { SignInFormValues } from '@/lib/validation/auth'
import logo2Url from '@/assets/LOGO2.png'

/**
 * User session model
 */
export interface User {
  id: string
  fullName: string
  email: string
  role: string
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

// Default mock user defined in the specification
export const DEFAULT_MOCK_USER: User = {
  id: 'usr_remi_lee',
  fullName: 'Remi Lee',
  email: 'remi.lee@mct.com',
  role: 'Financial Officer',
  avatarUrl: logo2Url,
}

/**
 * In-memory session store (never stored in localStorage/sessionStorage per security spec).
 * TODO: Replace with real API and httpOnly cookie-based session management when backend endpoints are ready.
 */
let inMemorySessionUser: User | null = null

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
  return {
    id: String(user.user_id),
    fullName: user.name,
    email: user.email,
    role: user.is_admin ? 'Administrator' : 'Financial Officer',
  }
}

export const authService = {
  /**
   * Validates credentials and starts an email OTP challenge.
   */
  async signIn(values: SignInFormValues): Promise<SignInResult> {
    const response = await request<{
      email: string
    }>('/login', { email: values.email, password: values.password })
    return { status: '2fa_required', email: response.email }
  },

  /**
   * Retrieves the current user session from memory.
   */
  async getSession(): Promise<User | null> {
    // Small microtask latency
    await new Promise((resolve) => setTimeout(resolve, 50))
    return inMemorySessionUser
  },

  /**
   * Mock signOut: Clears in-memory session.
   */
  async signOut(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 400))
    inMemorySessionUser = null
  },

  /**
   * Verify the email OTP and receive the real bearer token.
   */
  async verify2FA(code: string): Promise<Verify2FAResponse> {
    if (code.length !== 6) {
      throw new Error('Please enter a valid 6-digit code.')
    }
    const response = await request<{
      access_token: string
      user: { user_id: number; email: string; name: string; is_admin: boolean }
    }>('/login/verify-otp', { otp: code })
    inMemorySessionUser = mapUser(response.user)
    return { success: true, token: response.access_token }
  },

  async resend2FA(): Promise<Resend2FAResponse> {
    const response = await request<{
      expires_in: number
      resend_available_in: number
    }>('/login/resend-otp', {})
    return {
      expiresIn: response.expires_in,
      resendAvailableIn: response.resend_available_in,
    }
  },
}

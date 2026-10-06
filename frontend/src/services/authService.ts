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
  | { status: '2fa_required' }

export interface Verify2FAResponse {
  success: boolean
  token: string
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
    pendingUserEmail = null
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

    // Set authenticated user in memory
    inMemorySessionUser = {
      ...DEFAULT_MOCK_USER,
      email: pendingUserEmail || DEFAULT_MOCK_USER.email,
    }

    return {
      success: true,
      token: `auth_token_${Date.now()}`,
    }
  },
}

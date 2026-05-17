import { api } from './api'
import type { ApiEnvelope } from '../types/auth.types'
import type { AuthTokens, AuthUser, LoginRequest, RegisterRequest } from '../types/auth.types'
import { useAuthStore } from '../store/authStore'

interface RegisterResponseData {
  user: AuthUser
  tokens: {
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
  }
}

interface LoginResponseData {
  user: AuthUser
  tokens: {
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
  }
}

interface RefreshResponseData {
  access_token: string
  refresh_token: string
  expires_in: number
}

function mapTokens(payload: RegisterResponseData['tokens']): AuthTokens {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    tokenType: payload.token_type,
    expiresIn: payload.expires_in,
  }
}

export async function register(
  body: RegisterRequest
): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  const { data } = await api.post<ApiEnvelope<RegisterResponseData>>(
    '/api/v1/auth/register',
    body
  )

  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'Registration failed')
  }

  return {
    user: data.data.user,
    tokens: mapTokens(data.data.tokens),
  }
}

export async function login(
  body: LoginRequest
): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  const { data } = await api.post<ApiEnvelope<LoginResponseData>>(
    '/api/v1/auth/login',
    body
  )

  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'Login failed')
  }

  return {
    user: data.data.user,
    tokens: mapTokens(data.data.tokens),
  }
}

export async function refreshSession(): Promise<AuthTokens | null> {
  const refreshToken = useAuthStore.getState().refreshToken
  if (!refreshToken) {
    return null
  }

  const { data } = await api.post<ApiEnvelope<RefreshResponseData>>(
    '/api/v1/auth/refresh',
    { refresh_token: refreshToken }
  )

  if (!data.success || !data.data) {
    return null
  }

  return {
    accessToken: data.data.access_token,
    refreshToken: data.data.refresh_token,
    tokenType: 'bearer',
    expiresIn: data.data.expires_in,
  }
}

export async function googleAuth(
  credential: string
): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  const { data } = await api.post<ApiEnvelope<RegisterResponseData>>(
    '/api/v1/auth/google',
    { credential }
  )

  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'Google authentication failed')
  }

  return {
    user: data.data.user,
    tokens: mapTokens(data.data.tokens),
  }
}

export async function logout(refreshToken: string | null): Promise<void> {
  if (!refreshToken) {
    return
  }

  try {
    await api.post<ApiEnvelope<null>>('/api/v1/auth/logout', {
      refresh_token: refreshToken,
    })
  } catch {
    // best-effort logout
  }
}

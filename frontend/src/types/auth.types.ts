export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

export interface AuthUser {
  id: string
  email: string
  fullName: string
  isActive: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  fullName: string
}

export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T | null
  error: ApiError | null
}

export interface ApiError {
  code?: string
  details?: unknown
}

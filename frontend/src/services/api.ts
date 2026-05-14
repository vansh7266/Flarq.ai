import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import toast from 'react-hot-toast'
import { API_BASE_URL } from '../utils/constants'
import { useAuthStore } from '../store/authStore'

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken
  if (!refreshToken) {
    return null
  }

  try {
    const response = await axios.post<{
      success: boolean
      message: string
      data: { access_token: string; refresh_token: string; expires_in: number } | null
      error: { code?: string } | null
    }>(`${API_BASE_URL}/api/v1/auth/refresh`, {
      refresh_token: refreshToken,
    })

    if (!response.data.success || !response.data.data) {
      return null
    }

    const accessToken = response.data.data.access_token
    const nextRefreshToken = response.data.data.refresh_token
    useAuthStore.getState().setAccessToken(accessToken)
    useAuthStore.getState().setRefreshToken(nextRefreshToken)
    return accessToken
  } catch {
    useAuthStore.getState().logout()
    return null
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined

    const status = error.response?.status

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      refreshPromise ??= refreshAccessToken()
      const newToken = await refreshPromise
      refreshPromise = null

      if (newToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      }
    }

    const data = error.response?.data as
      | { message?: string; success?: boolean }
      | undefined

    if (data?.message && error.response?.status !== 401) {
      toast.error(data.message)
    }

    return Promise.reject(error)
  }
)

export async function apiRequest<T>(
  config: AxiosRequestConfig
): Promise<T> {
  const response = await api.request<T>(config)
  return response.data
}

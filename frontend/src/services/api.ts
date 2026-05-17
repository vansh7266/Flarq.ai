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

/* ── SSE Streaming Chat API ── */

export interface StreamChatCallbacks {
  onThinking?: (message: string) => void
  onToolStart?: (tool: string, message: string) => void
  onToolComplete?: (tool: string) => void
  onToken?: (content: string) => void
  onDone?: (data: { conversation_id: string; tools_used: string[]; suggestions: string[] }) => void
  onError?: (message: string) => void
}

/**
 * Stream agent chat responses via SSE.
 * Uses fetch() to POST to `/agent/chat/stream` and reads the response
 * body as a ReadableStream, parsing SSE events and dispatching to callbacks.
 *
 * Returns an AbortController so the caller can cancel the stream.
 */
export function streamChat(
  message: string,
  conversationId: string | null | undefined,
  callbacks: StreamChatCallbacks,
  externalSignal?: AbortSignal
): AbortController {
  const controller = new AbortController()
  const combinedSignal = externalSignal
    ? AbortSignal.any([externalSignal, controller.signal])
    : controller.signal

  const doStream = async () => {
    const token = useAuthStore.getState().accessToken
    const response = await fetch(`${API_BASE_URL}/api/v1/agent/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message,
        conversationId: conversationId ?? undefined,
      }),
      signal: combinedSignal,
    })

    if (!response.ok) {
      callbacks.onError?.(`Server error: ${response.status}`)
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      callbacks.onError?.('No response stream')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        const jsonStr = trimmed.slice(6)
        try {
          const event = JSON.parse(jsonStr)
          dispatchSSEEvent(event, callbacks)
        } catch {
          // skip malformed JSON
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim().startsWith('data: ')) {
      const jsonStr = buffer.trim().slice(6)
      try {
        const event = JSON.parse(jsonStr)
        dispatchSSEEvent(event, callbacks)
      } catch {
        // skip
      }
    }
  }

  doStream().catch((err) => {
    if (err instanceof DOMException && err.name === 'AbortError') return
    callbacks.onError?.(err instanceof Error ? err.message : 'Stream failed')
  })

  return controller
}

function dispatchSSEEvent(event: { type: string }, callbacks: StreamChatCallbacks) {
  const e = event as Record<string, unknown>
  switch (e.type) {
    case 'thinking':
      callbacks.onThinking?.(e.message as string)
      break
    case 'tool_start':
      callbacks.onToolStart?.(e.tool as string, e.message as string)
      break
    case 'tool_complete':
      callbacks.onToolComplete?.(e.tool as string)
      break
    case 'token':
      callbacks.onToken?.(e.content as string)
      break
    case 'done':
      callbacks.onDone?.({
        conversation_id: e.conversation_id as string,
        tools_used: e.tools_used as string[],
        suggestions: e.suggestions as string[],
      })
      break
    case 'error':
      callbacks.onError?.(e.message as string)
      break
  }
}

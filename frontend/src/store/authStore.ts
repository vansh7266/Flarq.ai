import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AuthUser, AuthTokens } from '../types/auth.types'
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from '../utils/constants'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isHydrated: boolean
  setHydrated: (value: boolean) => void
  setSession: (payload: { user: AuthUser; tokens: AuthTokens }) => void
  setAccessToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isHydrated: false,
      setHydrated: (value) => {
        set({ isHydrated: value })
      },
      setSession: ({ user, tokens }) => {
        localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        })
      },
      setAccessToken: (token) => {
        localStorage.setItem(ACCESS_TOKEN_KEY, token)
        set({ accessToken: token })
      },
      logout: () => {
        localStorage.removeItem(ACCESS_TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        })
      },
    }),
    {
      name: 'flarq-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      storage: createJSONStorage(() => localStorage),
    }
  )
)

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AuthUser, AuthTokens } from '../types/auth.types'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isHydrated: boolean
  setHydrated: (value: boolean) => void
  setSession: (payload: { user: AuthUser; tokens: AuthTokens }) => void
  setAccessToken: (token: string) => void
  setRefreshToken: (token: string) => void
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
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        })
      },
      setAccessToken: (token) => {
        set({ accessToken: token })
      },
      setRefreshToken: (token) => {
        set({ refreshToken: token })
      },
      logout: () => {
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

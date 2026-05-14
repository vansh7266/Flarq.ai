import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import * as authService from '../services/authService'
import { useAuthStore } from '../store/authStore'
import type { LoginRequest, RegisterRequest } from '../types/auth.types'

export function useAuth() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const isHydrated = useAuthStore((s) => s.isHydrated)
  const setSession = useAuthStore((s) => s.setSession)
  const logoutStore = useAuthStore((s) => s.logout)

  const loginMutation = useMutation({
    mutationFn: (payload: LoginRequest) => authService.login(payload),
    onSuccess: (result) => {
      setSession(result)
      toast.success('Welcome back')
      void queryClient.invalidateQueries()
      navigate('/dashboard', { replace: true })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterRequest) => authService.register(payload),
    onSuccess: (result) => {
      setSession(result)
      toast.success('Account created')
      void queryClient.invalidateQueries()
      navigate('/dashboard', { replace: true })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const logout = async () => {
    try {
      await authService.logout(refreshToken)
    } finally {
      logoutStore()
      void queryClient.clear()
      navigate('/', { replace: true })
    }
  }

  return {
    user,
    accessToken,
    refreshToken,
    isHydrated,
    isAuthenticated: Boolean(user && accessToken),
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    logout,
  }
}

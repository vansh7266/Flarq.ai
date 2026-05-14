import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { loginSchema, type LoginFormValues } from '../../utils/validators'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => Promise<void>
  isSubmitting: boolean
}

export function LoginForm({ onSubmit, isSubmitting }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values)
      })}
      noValidate
    >
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <div className="relative">
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          error={errors.password?.message}
          className="pr-11"
          {...register('password')}
        />
        <button
          type="button"
          className="absolute right-3 top-9 text-text-muted transition-colors hover:text-primary"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          onClick={() => setShowPassword((value) => !value)}
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      <Button type="submit" className="h-12 w-full" isLoading={isSubmitting}>
        Sign in
      </Button>
    </form>
  )
}

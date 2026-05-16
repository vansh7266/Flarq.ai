import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { signupSchema, type SignupFormValues } from '../../utils/validators'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

interface SignupFormProps {
  onSubmit: (values: SignupFormValues) => Promise<void>
  isSubmitting: boolean
}

export function SignupForm({ onSubmit, isSubmitting }: SignupFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
    },
  })
  const password = watch('password')
  const strength =
    password.length >= 12 && /[A-Z]/.test(password) && /\d/.test(password)
      ? 3
      : password.length >= 8
        ? 2
        : password.length > 0
          ? 1
          : 0

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(async (values) => {
        await onSubmit({
          email: values.email,
          password: values.password,
          confirmPassword: values.confirmPassword,
          fullName: values.fullName,
        })
      })}
      noValidate
    >
      <Input
        label="Full name"
        autoComplete="name"
        error={errors.fullName?.message}
        {...register('fullName')}
      />
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
          autoComplete="new-password"
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
        <div className="mt-2 grid grid-cols-3 gap-1">
          {[1, 2, 3].map((segment) => (
            <span
              key={segment}
              className={`h-1 rounded-full ${
                strength >= segment
                  ? segment === 1
                    ? 'bg-rose'
                    : segment === 2
                      ? 'bg-amber'
                      : 'bg-emerald'
                  : 'bg-border'
              }`}
            />
          ))}
        </div>
      </div>
      <Input
        label="Confirm password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <Button type="submit" className="h-12 w-full" isLoading={isSubmitting}>
        Create account
      </Button>
      <Button type="button" variant="secondary" className="h-12 w-full">
        Continue with Google
      </Button>
    </form>
  )
}

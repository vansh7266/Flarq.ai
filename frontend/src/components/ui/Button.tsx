import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/helpers'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  isLoading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'teal-cta text-white shadow-glow hover:scale-[1.02] disabled:opacity-60',
  secondary:
    'border border-primary/40 bg-white text-primary hover:border-primary hover:bg-primary-light/40',
  ghost: 'text-text-secondary hover:bg-surface-elevated hover:text-primary',
  danger: 'bg-danger/90 text-white hover:bg-danger',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      isLoading,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none active:scale-[0.98]',
          variantClasses[variant],
          className
        )}
        disabled={disabled ?? isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

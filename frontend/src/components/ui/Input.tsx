import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../utils/helpers'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? props.name

    return (
      <label className="flex w-full flex-col gap-2 text-sm text-text-secondary">
        {label ? <span className="font-medium">{label}</span> : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-xl border border-border bg-white px-3 py-2 text-text-primary transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
            error && 'border-danger focus:ring-danger/40',
            className
          )}
          {...props}
        />
        {error ? <span className="text-xs text-danger">{error}</span> : null}
      </label>
    )
  }
)

Input.displayName = 'Input'

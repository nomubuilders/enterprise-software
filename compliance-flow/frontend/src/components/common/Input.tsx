import { memo, forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = memo(forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-[var(--nomu-text-muted)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full rounded-lg border bg-[var(--nomu-surface)] px-3 py-2 text-sm text-[var(--nomu-text)]
            placeholder-[var(--nomu-text-muted)] transition
            focus:outline-none focus:ring-2 focus:border-[var(--nomu-primary)] focus:ring-[var(--nomu-primary)]/20
            ${error ? 'border-red-500' : 'border-[var(--nomu-border)] hover:border-[var(--nomu-border)]'}
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">{helperText}</p>
        )}
      </div>
    )
  }
))

Input.displayName = 'Input'

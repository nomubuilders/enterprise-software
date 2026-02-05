import { memo, forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
}

export const Select = memo(forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-[var(--nomu-text-muted)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full rounded-lg border bg-[var(--nomu-surface)] px-3 py-2 text-sm text-[var(--nomu-text)]
            transition cursor-pointer
            focus:outline-none focus:ring-2 focus:border-[var(--nomu-primary)] focus:ring-[var(--nomu-primary)]/20
            ${error ? 'border-red-500' : 'border-[var(--nomu-border)] hover:border-[var(--nomu-border)]'}
            ${className}
          `}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    )
  }
))

Select.displayName = 'Select'

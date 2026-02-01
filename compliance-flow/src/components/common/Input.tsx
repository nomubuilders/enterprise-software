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
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full rounded-lg border bg-slate-900 px-3 py-2 text-sm text-white
            placeholder-slate-500 transition
            focus:outline-none focus:ring-2 focus:ring-purple-500
            ${error ? 'border-red-500' : 'border-slate-600 hover:border-slate-500'}
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    )
  }
))

Input.displayName = 'Input'

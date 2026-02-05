import { memo } from 'react'
import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children: ReactNode
}

export const Button = memo(({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--nomu-bg)]'

  const variantClasses = {
    primary: 'bg-[var(--nomu-primary)] text-white hover:bg-[var(--nomu-primary-hover)] focus:ring-[var(--nomu-primary)] disabled:opacity-60',
    secondary: 'bg-[var(--nomu-surface)] text-[var(--nomu-text)] hover:bg-[var(--nomu-surface-hover)] focus:ring-[var(--nomu-primary)] disabled:opacity-60',
    danger: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500 disabled:bg-red-800',
    ghost: 'bg-transparent text-[var(--nomu-text)] hover:bg-[var(--nomu-surface)] focus:ring-[var(--nomu-primary)]',
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className} ${
        disabled || isLoading ? 'cursor-not-allowed opacity-60' : ''
      }`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  )
})

Button.displayName = 'Button'

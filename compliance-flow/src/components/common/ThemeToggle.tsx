import { memo } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'

interface ThemeToggleProps {
  className?: string
}

export const ThemeToggle = memo(({ className = '' }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useThemeStore()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className={`rounded-lg p-2 transition-colors bg-transparent hover:bg-[var(--nomu-surface)] text-current ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
})

ThemeToggle.displayName = 'ThemeToggle'

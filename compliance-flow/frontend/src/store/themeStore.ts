import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const getInitialTheme = (): Theme => {
  // Check localStorage first
  const stored = localStorage.getItem('nomu-theme')
  if (stored === 'dark' || stored === 'light') {
    return stored
  }

  // Check system preference
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light'
  }

  // Default to light
  return 'light'
}

const applyTheme = (theme: Theme) => {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  root.classList.add(theme)

  // Update meta theme-color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#000000' : '#FEFCFD')
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => {
      const initialTheme = getInitialTheme()
      // Apply theme on store creation
      applyTheme(initialTheme)

      return {
        theme: initialTheme,

        toggleTheme: () => {
          set((state) => {
            const newTheme: Theme = state.theme === 'dark' ? 'light' : 'dark'
            applyTheme(newTheme)
            return { theme: newTheme }
          })
        },

        setTheme: (theme: Theme) => {
          applyTheme(theme)
          set({ theme })
        },
      }
    },
    {
      name: 'nomu-theme',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => {
        return (rehydratedState?: ThemeState) => {
          if (rehydratedState) {
            applyTheme(rehydratedState.theme)
          }
        }
      },
    }
  )
)

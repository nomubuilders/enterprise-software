import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TutorialState {
  isActive: boolean
  currentStep: number
  completed: boolean
  start: () => void
  next: () => void
  skip: () => void
  reset: () => void
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentStep: 0,
      completed: false,
      start: () => set({ isActive: true, currentStep: 0 }),
      next: () => {
        const { currentStep } = get()
        // tutorialSteps has 12 steps (0-11)
        if (currentStep >= 11) {
          set({ isActive: false, completed: true })
        } else {
          set({ currentStep: currentStep + 1 })
        }
      },
      skip: () => set({ isActive: false, completed: true }),
      reset: () => set({ isActive: false, currentStep: 0, completed: false }),
    }),
    {
      name: 'nomu-tutorial',
      partialize: (state) => ({ completed: state.completed }),
    }
  )
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ApprovedImage, ContainerExecution } from '../types/docker'

interface DockerState {
  // State
  approvedImages: ApprovedImage[]
  activeContainers: Record<string, ContainerExecution>
  executionHistory: ContainerExecution[]

  // Actions
  loadAllowlist: (images: ApprovedImage[]) => void
  isImageApproved: (image: string, tag: string) => boolean
  getApprovedImage: (image: string, tag: string) => ApprovedImage | undefined
  startExecution: (execution: ContainerExecution) => void
  updateExecution: (id: string, updates: Partial<ContainerExecution>) => void
  completeExecution: (id: string, exitCode: number, output?: Record<string, unknown>) => void
  getActiveExecution: (nodeId: string) => ContainerExecution | undefined
}

export const useDockerStore = create<DockerState>()(
  persist(
    (set, get) => ({
      approvedImages: [],
      activeContainers: {},
      executionHistory: [],

      loadAllowlist: (images) => set({ approvedImages: images }),

      isImageApproved: (image, tag) => {
        return get().approvedImages.some(
          (img) => img.name === image && img.tag === tag
        )
      },

      getApprovedImage: (image, tag) => {
        return get().approvedImages.find(
          (img) => img.name === image && img.tag === tag
        )
      },

      startExecution: (execution) => {
        set({
          activeContainers: {
            ...get().activeContainers,
            [execution.id]: execution,
          },
        })
      },

      updateExecution: (id, updates) => {
        const existing = get().activeContainers[id]
        if (existing) {
          set({
            activeContainers: {
              ...get().activeContainers,
              [id]: { ...existing, ...updates },
            },
          })
        }
      },

      completeExecution: (id, exitCode, output) => {
        const execution = get().activeContainers[id]
        if (execution) {
          const completed = {
            ...execution,
            status: exitCode === 0 ? 'completed' as const : 'error' as const,
            exitCode,
            output,
            completedAt: new Date().toISOString(),
          }
          const { [id]: _, ...remaining } = get().activeContainers
          void _
          set({
            activeContainers: remaining,
            executionHistory: [...get().executionHistory, completed],
          })
        }
      },

      getActiveExecution: (nodeId) => {
        for (const exec of Object.values(get().activeContainers)) {
          if (exec.nodeId === nodeId) return exec
        }
        return undefined
      },
    }),
    {
      name: 'docker-container-storage',
      partialize: (state) => ({
        approvedImages: state.approvedImages,
        executionHistory: state.executionHistory,
      }),
    }
  )
)
